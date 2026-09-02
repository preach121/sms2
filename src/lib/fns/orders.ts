import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { newId, num, roundMoney } from "@/lib/utils";
import { writeAudit } from "@/lib/server/audit";
import { rateLimit } from "@/lib/server/rate-limit";
import { requireActiveAccount } from "@/lib/server/identity";
import { getSmsProvider } from "@/lib/n1sms";
import { extractCode} from "@/lib/n1sms/client";
import { findOfferForBuy, matchCountry, phoneMatchesDial } from "@/lib/n1sms/countries";

export type OrderDto = {
  id: string;
  countryId: string;
  countryName: string;
  serviceId: string;
  serviceName: string;
  phoneNumber: string | null;
  customerPrice: number;
  wholesalePrice: number;
  status: string;
  smsCode: string | null;
  expiresAt: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  messages: Array<{ id: string; sender: string | null; body: string; code: string | null; receivedAt: string }>;
};

function mapStatus(upstream: string, hasCode: boolean): string {
  const s = upstream.toLowerCase();
  if (["cancel", "cancelled", "canceled"].some((k) => s.includes(k))) return "cancelled";
  if (["fail", "error", "unavailable"].some((k) => s.includes(k))) return "failed";
  if (["expire", "timeout"].some((k) => s.includes(k))) return "failed";
  if (hasCode || ["received", "sms", "ok", "completed", "success"].some((k) => s.includes(k))) {
    return hasCode ? "sms_received" : "completed";
  }
  return "active";
}

async function loadOrder(userId: string, orderId: string): Promise<OrderDto> {
  const sql = await getSql();
  const rows = await sql<{
    id: string;
    country_id: string;
    country_name: string;
    service_id: string;
    service_name: string;
    phone_number: string | null;
    customer_price: string;
    wholesale_price: string;
    status: string;
    sms_code: string | null;
    expires_at: string | null;
    error_message: string | null;
    created_at: string;
    updated_at: string;
  }>`
    select id, country_id, country_name, service_id, service_name, phone_number,
           customer_price, wholesale_price, status, sms_code, expires_at, error_message,
           created_at, updated_at
    from orders
    where id = ${orderId} and user_id = ${userId}
  `;
  const row = rows[0];
  if (!row) throw new Error("Order not found.");
  const messages = await sql<{
    id: string;
    sender: string | null;
    body: string;
    code: string | null;
    received_at: string;
  }>`
    select id, sender, body, code, received_at
    from sms_messages where order_id = ${orderId}
    order by received_at asc
  `;
  return {
    id: row.id,
    countryId: row.country_id,
    countryName: row.country_name,
    serviceId: row.service_id,
    serviceName: row.service_name,
    phoneNumber: row.phone_number,
    customerPrice: num(row.customer_price),
    wholesalePrice: num(row.wholesale_price),
    status: row.status,
    smsCode: row.sms_code,
    expiresAt: row.expires_at ? String(row.expires_at) : null,
    errorMessage: row.error_message,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    messages: messages.map((m) => ({
      id: m.id,
      sender: m.sender,
      body: m.body,
      code: m.code,
      receivedAt: String(m.received_at),
    })),
  };
}

export const getDashboardStats = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireActiveAccount(context.userId);
    const sql = await getSql();
    const wallet = await sql<{ balance: string }>`select balance from wallets where user_id = ${context.userId}`;
    const counts = await sql<{ active: number; completed: number }>`
      select
        coalesce(sum(case when status in ('active','processing','sms_received') then 1 else 0 end), 0)::int as active,
        coalesce(sum(case when status = 'completed' then 1 else 0 end), 0)::int as completed
      from orders
      where user_id = ${context.userId}
    `;
    const spent = await sql<{ total: string }>`
      select coalesce(sum(customer_price), 0) as total
      from orders
      where user_id = ${context.userId} and status in ('active','sms_received','completed')
    `;
    return {
      balance: num(wallet[0]?.balance),
      activeOrders: Number(counts[0]?.active ?? 0),
      completedOrders: Number(counts[0]?.completed ?? 0),
      totalSpent: num(spent[0]?.total),
    };
  });

export const listMyOrders = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireActiveAccount(context.userId);
    const sql = await getSql();
    const rows = await sql<{
      id: string;
      country_name: string;
      service_name: string;
      phone_number: string | null;
      customer_price: string;
      status: string;
      sms_code: string | null;
      expires_at: string | null;
      created_at: string;
    }>`
      select id, country_name, service_name, phone_number, customer_price, status, sms_code, expires_at, created_at
      from orders where user_id = ${context.userId}
      order by created_at desc
      limit 60
    `;
    return rows.map((row) => ({
      id: row.id,
      countryName: row.country_name,
      serviceName: row.service_name,
      phoneNumber: row.phone_number,
      price: num(row.customer_price),
      status: row.status,
      smsCode: row.sms_code,
      expiresAt: row.expires_at ? String(row.expires_at) : null,
      createdAt: String(row.created_at),
    }));
  });

export const getOrder = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(z.object({ orderId: z.string().min(1) }))
  .handler(async ({ context, data }) => {
    await requireActiveAccount(context.userId);
    return loadOrder(context.userId, data.orderId);
  });

export const purchaseNumber = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      countryId: z.string().min(1),
      countryName:z.string().min(1).optional(),
      countryIso2:z.string().min(2).max(2).optional(),
      serviceId: z.string().min(1),
      idempotencyKey: z.string().uuid(),
    }),
  )
  .handler(async ({ context, data }) => {
    rateLimit(`buy:${context.userId}`, 10, 60_000);
    await requireActiveAccount(context.userId);
    const sql = await getSql();

    const existing = await sql<{ id: string }>`
      select id from orders where idempotency_key = ${data.idempotencyKey} and user_id = ${context.userId}
    `;
    if (existing[0]) return loadOrder(context.userId, existing[0].id);

    const provider = getSmsProvider();
    const offers = await provider.getOffers(data.serviceId);
    const offer = findOfferForBuy(offers, {
  serviceId: data.serviceId,
  countryId: data.countryId,
  countryName: data.countryName,
  countryIso2: data.countryIso2,
});
    if (!offer || !offer.available) {
      throw new Error("That number is currently unavailable. Please pick another country or service.");
    }
   const countries = await provider.getCountries();
const liveCountry = matchCountry(countries, {
  countryId: offer.countryId,
  countryName: offer.countryName,
  countryIso2: offer.countryIso2 || data.countryIso2,
});
if (!liveCountry) {
  throw new Error("That country is not available. Pick another country.");
}
    const stock = await provider.getStock({
      countryId: liveCountry.id,
      serviceId: offer.serviceId,
    });
    if (!stock.available || stock.stock <= 0) {
      throw new Error("That number is currently unavailable. Please pick another country or service.");
    }
    const price = roundMoney(offer.customerPrice);
    const wholesale = roundMoney(offer.wholesalePrice);
    const orderId = newId();

    const debit = await sql<{ balance: string }>`
      update wallets
      set balance = balance - ${price}, updated_at = now()
      where user_id = ${context.userId} and balance >= ${price}
      returning balance
    `;
    if (!debit[0]) {
      throw new Error("Insufficient wallet balance. Add funds before purchasing.");
    }
    const balanceAfter = num(debit[0].balance);
    const txId = newId();
    await sql`
      insert into wallet_transactions (
        id, user_id, type, amount, balance_after, reference_type, reference_id, description
      ) values (
        ${txId}, ${context.userId}, 'purchase', ${-price}, ${balanceAfter},
        'order', ${orderId}, ${`Number purchase · ${offer.serviceName} · ${offer.countryName}`}
      )
    `;
    await sql`
      insert into orders (
        id, user_id, country_id, country_name, service_id, service_name,
        customer_price, wholesale_price, status, idempotency_key, provider_mode
      ) values (
        ${orderId}, ${context.userId}, ${offer.countryId}, ${offer.countryName},
        ${offer.serviceId}, ${offer.serviceName}, ${price}, ${wholesale},
        'processing', ${data.idempotencyKey}, 'live'
      )
    `;

    let purchased;
    try {
      purchased = await provider.purchase({
        countryId: liveCountry.id,
        serviceId: offer.serviceId,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upstream purchase failed";
      const refunded = await sql<{ balance: string }>`
        update wallets
        set balance = balance + ${price}, updated_at = now()
        where user_id = ${context.userId}
        returning balance
      `;
      await sql`
        insert into wallet_transactions (
          id, user_id, type, amount, balance_after, reference_type, reference_id, description
        ) values (
          ${newId()}, ${context.userId}, 'refund', ${price}, ${num(refunded[0]?.balance)},
          'order', ${orderId}, ${"Refund · upstream purchase failed"}
        )
      `;
      await sql`
        insert into refunds (id, order_id, user_id, amount, reason, status)
        values (${newId()}, ${orderId}, ${context.userId}, ${price}, ${message}, 'completed')
      `;
      await sql`
        update orders set
          status = 'failed',
          error_message = ${message},
          updated_at = now()
        where id = ${orderId}
      `;
      await writeAudit({
        userId: context.userId,
        action: "order.failed",
        entityType: "order",
        entityId: orderId,
        metadata: { message },
      });
      throw new Error(message);
    }

    const status = mapStatus(purchased.status, Boolean(purchased.smsCode));
    const expiresAt =
      purchased.expiresAt ?? new Date(Date.now() + 20 * 60 * 1000).toISOString();
    await sql`
      update orders set
        phone_number = ${purchased.phoneNumber},
        n1sms_order_id = ${purchased.providerOrderId},
        status = ${status},
        sms_code = ${purchased.smsCode},
        expires_at = ${expiresAt},
        provider_mode = ${purchased.providerOrderId.startsWith("fb_") ? "fallback" : "live"},
        updated_at = now()
      where id = ${orderId}
    `;
    for (const message of purchased.messages) {
      await sql`
        insert into sms_messages (id, order_id, sender, body, code)
        values (${newId()}, ${orderId}, ${message.sender ?? null}, ${message.body}, ${message.code ?? extractCode(message.body)})
      `;
    }
    await writeAudit({
      userId: context.userId,
      action: "order.purchased",
      entityType: "order",
      entityId: orderId,
      metadata: { service: offer.serviceName, country: offer.countryName, price },
    });
    return loadOrder(context.userId, orderId);
  });

export const refreshOrder = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ orderId: z.string().min(1) }))
  .handler(async ({ context, data }) => {
    rateLimit(`refresh:${context.userId}`, 30, 60_000);
    await requireActiveAccount(context.userId);
    const sql = await getSql();
    const rows = await sql<{
      id: string;
      n1sms_order_id: string | null;
      status: string;
      sms_code: string | null;
    }>`
      select id, n1sms_order_id, status, sms_code from orders
      where id = ${data.orderId} and user_id = ${context.userId}
    `;
    const row = rows[0];
    if (!row) throw new Error("Order not found.");
    if (
      !row.n1sms_order_id ||
      ["failed", "refunded", "cancelled", "completed"].includes(row.status) ||
      (row.status === "sms_received" && row.sms_code)
    ) {
      return loadOrder(context.userId, data.orderId);
    }
    const provider = getSmsProvider();
    let upstream;
    try {
      upstream = await provider.getOrder(row.n1sms_order_id);
    } catch {
      return loadOrder(context.userId, data.orderId);
    }
    const status = mapStatus(upstream.status, Boolean(upstream.smsCode));
    await sql`
      update orders set
        phone_number = coalesce(${upstream.phoneNumber || null}, phone_number),
        sms_code = coalesce(${upstream.smsCode}, sms_code),
        status = ${status === "active" && row.sms_code ? "sms_received" : status},
        expires_at = coalesce(${upstream.expiresAt}, expires_at),
        updated_at = now()
      where id = ${data.orderId}
    `;
    for (const message of upstream.messages) {
      const exists = await sql<{ id: string }>`
        select id from sms_messages where order_id = ${data.orderId} and body = ${message.body} limit 1
      `;
      if (exists[0]) continue;
      await sql`
        insert into sms_messages (id, order_id, sender, body, code)
        values (${newId()}, ${data.orderId}, ${message.sender ?? null}, ${message.body}, ${message.code ?? extractCode(message.body)})
      `;
    }
    if (upstream.smsCode && status !== "failed") {
      await sql`
        update orders set status = 'sms_received' where id = ${data.orderId} and status = 'active'
      `;
    }
    return loadOrder(context.userId, data.orderId);
  });

export const cancelOrder = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ orderId: z.string().min(1) }))
  .handler(async ({ context, data }) => {
    await requireActiveAccount(context.userId);
    const sql = await getSql();
    const rows = await sql<{
      id: string;
      n1sms_order_id: string | null;
      customer_price: string;
      status: string;
      sms_code: string | null;
    }>`
      select id, n1sms_order_id, customer_price, status, sms_code
      from orders where id = ${data.orderId} and user_id = ${context.userId}
    `;
    const row = rows[0];
    if (!row) throw new Error("Order not found.");
    if (row.sms_code || row.status === "sms_received" || row.status === "completed") {
      throw new Error("This order already received an SMS and cannot be cancelled.");
    }
    if (["failed", "refunded", "cancelled"].includes(row.status)) {
      return loadOrder(context.userId, data.orderId);
    }
    let refunded = false;
    if (row.n1sms_order_id) {
      try {
        const result = await getSmsProvider().cancelOrder(row.n1sms_order_id);
        refunded = result.refunded;
      } catch {
        refunded = false;
      }
    } else {
      refunded = true;
    }
    if (!refunded) throw new Error("The upstream provider did not refund this order.");
    const price = num(row.customer_price);
    const credited = await sql<{ balance: string }>`
      update wallets set balance = balance + ${price}, updated_at = now()
      where user_id = ${context.userId}
      returning balance
    `;
    await sql`
      insert into wallet_transactions (
        id, user_id, type, amount, balance_after, reference_type, reference_id, description
      ) values (
        ${newId()}, ${context.userId}, 'refund', ${price}, ${num(credited[0]?.balance)},
        'order', ${data.orderId}, ${"Refund · cancelled number"}
      )
    `;
    await sql`
      insert into refunds (id, order_id, user_id, amount, reason, status)
      values (${newId()}, ${data.orderId}, ${context.userId}, ${price}, 'cancelled', 'completed')
    `;
    await sql`
      update orders set status = 'refunded', updated_at = now() where id = ${data.orderId}
    `;
    await writeAudit({
      userId: context.userId,
      action: "order.refunded",
      entityType: "order",
      entityId: data.orderId,
    });
    return loadOrder(context.userId, data.orderId);
  });

export const completeOrder = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ orderId: z.string().min(1) }))
  .handler(async ({ context, data }) => {
    await requireActiveAccount(context.userId);
    const sql = await getSql();
    await sql`
      update orders set status = 'completed', updated_at = now()
      where id = ${data.orderId} and user_id = ${context.userId}
        and status in ('sms_received', 'active')
    `;
    return loadOrder(context.userId, data.orderId);
  });
