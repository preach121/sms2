import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { num, newId, roundMoney } from "@/lib/utils";
import { requireAdmin } from "@/lib/server/identity";
import { writeAudit } from "@/lib/server/audit";
import { getSmsProvider, resetSmsProvider } from "@/lib/n1sms";
import { stripSupplierName } from "@/lib/n1sms/client";

export const getAdminOverview = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireAdmin(context.userId);
    const sql = await getSql();
    const users = await sql<{ n: number }>`select count(*)::int as n from user_profiles`;
    const sales = await sql<{ n: number; revenue: string; cost: string }>`
      select count(*)::int as n,
             coalesce(sum(customer_price), 0) as revenue,
             coalesce(sum(wholesale_price), 0) as cost
      from orders
      where status in ('active','sms_received','completed')
    `;
    const failed = await sql<{ n: number }>`select count(*)::int as n from orders where status = 'failed'`;
    const refunds = await sql<{ n: number; amount: string }>`
      select count(*)::int as n, coalesce(sum(amount), 0) as amount from refunds
    `;
    const deposits = await sql<{
      status: string;
      n: number;
      amount: string;
    }>`
      select status, count(*)::int as n, coalesce(sum(amount), 0) as amount
      from deposits group by status
    `;
    const markup = await sql<{ value: string }>`select value from settings where key = 'markup_multiplier'`;
    const supplier = await sql<{ key: string; value: string }>`
      select key, value from settings where key in ('supplier_email', 'supplier_password')
    `;
    const supplierMap = Object.fromEntries(supplier.map((row) => [row.key, row.value]));
    const provider = await getSmsProvider().getStatus();
    const dep = Object.fromEntries(deposits.map((d) => [d.status, { n: d.n, amount: num(d.amount) }]));
    const revenue = num(sales[0]?.revenue);
    const cost = num(sales[0]?.cost);
    return {
      users: users[0]?.n ?? 0,
      orders: sales[0]?.n ?? 0,
      revenue,
      cost,
      profit: roundMoney(revenue - cost),
      failedOrders: failed[0]?.n ?? 0,
      refunds: { count: refunds[0]?.n ?? 0, amount: num(refunds[0]?.amount) },
      deposits: {
        pending: dep.pending ?? { n: 0, amount: 0 },
        approved: dep.approved ?? { n: 0, amount: 0 },
        rejected: dep.rejected ?? { n: 0, amount: 0 },
      },
      markup: num(markup[0]?.value) || 1.5,
      supplierEmail: supplierMap.supplier_email ?? null,
      supplierConfigured: Boolean(supplierMap.supplier_email && supplierMap.supplier_password),
      provider: {
        ...provider,
        lastError: provider.lastError ? stripSupplierName(provider.lastError) : null,
      },
    };
  });

export const listAdminUsers = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireAdmin(context.userId);
    const sql = await getSql();
    const rows = await sql<{
      user_id: string;
      display_name: string | null;
      phone: string | null;
      role: string;
      status: string;
      created_at: string;
      email: string | null;
      balance: string;
    }>`
      select p.user_id, p.display_name, p.phone, p.role, p.status, p.created_at,
             u.email, coalesce(w.balance, 0) as balance
      from user_profiles p
      left join "user" u on u.id = p.user_id
      left join wallets w on w.user_id = p.user_id
      order by p.created_at desc
      limit 200
    `;
    return rows.map((row) => ({
      id: row.user_id,
      displayName: row.display_name,
      email: row.email,
      phone: row.phone,
      role: row.role,
      status: row.status,
      balance: num(row.balance),
      createdAt: String(row.created_at),
    }));
  });

export const setUserStatus = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ userId: z.string().min(1), status: z.enum(["active", "suspended"]) }))
  .handler(async ({ context, data }) => {
    await requireAdmin(context.userId);
    if (data.userId === context.userId) throw new Error("You cannot suspend your own account.");
    const sql = await getSql();
    await sql`
      update user_profiles set status = ${data.status}, updated_at = now()
      where user_id = ${data.userId}
    `;
    await writeAudit({
      userId: context.userId,
      action: `user.${data.status}`,
      entityType: "user",
      entityId: data.userId,
    });
    return { ok: true };
  });

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ userId: z.string().min(1), role: z.enum(["customer", "admin"]) }))
  .handler(async ({ context, data }) => {
    await requireAdmin(context.userId);
    const sql = await getSql();
    await sql`
      update user_profiles set role = ${data.role}, updated_at = now()
      where user_id = ${data.userId}
    `;
    if (data.role === "admin") {
      await sql`
        insert into admin_users (user_id, granted_by) values (${data.userId}, ${context.userId})
        on conflict (user_id) do nothing
      `;
    } else {
      await sql`delete from admin_users where user_id = ${data.userId}`;
    }
    await writeAudit({
      userId: context.userId,
      action: "user.role",
      entityType: "user",
      entityId: data.userId,
      metadata: { role: data.role },
    });
    return { ok: true };
  });

export const listAdminDeposits = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireAdmin(context.userId);
    const sql = await getSql();
    const rows = await sql<{
      id: string;
      user_id: string;
      amount: string;
      status: string;
      payer_name: string | null;
      payer_phone: string | null;
      reference: string;
      note: string | null;
      created_at: string;
      review_note: string | null;
      email: string | null;
    }>`
      select d.id, d.user_id, d.amount, d.status, d.payer_name, d.payer_phone, d.reference,
             d.note, d.created_at, d.review_note, u.email
      from deposits d
      left join "user" u on u.id = d.user_id
      order by d.created_at desc
      limit 200
    `;
    return rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      email: row.email,
      amount: num(row.amount),
      status: row.status,
      payerName: row.payer_name,
      payerPhone: row.payer_phone,
      reference: row.reference,
      note: row.note,
      createdAt: String(row.created_at),
      reviewNote: row.review_note,
    }));
  });

export const reviewDeposit = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      depositId: z.string().min(1),
      action: z.enum(["approve", "reject"]),
      reviewNote: z.string().trim().max(240).optional(),
    }),
  )
  .handler(async ({ context, data }) => {
    await requireAdmin(context.userId);
    const sql = await getSql();
    const rows = await sql<{
      id: string;
      user_id: string;
      amount: string;
      status: string;
    }>`
      select id, user_id, amount, status from deposits where id = ${data.depositId}
    `;
    const deposit = rows[0];
    if (!deposit) throw new Error("Deposit not found.");
    if (deposit.status !== "pending") throw new Error("This deposit was already reviewed.");

    if (data.action === "reject") {
      await sql`
        update deposits set
          status = 'rejected',
          reviewed_by = ${context.userId},
          reviewed_at = now(),
          review_note = ${data.reviewNote ?? null}
        where id = ${deposit.id} and status = 'pending'
      `;
      await writeAudit({
        userId: context.userId,
        action: "deposit.rejected",
        entityType: "deposit",
        entityId: deposit.id,
      });
      return { status: "rejected" as const };
    }

    const amount = num(deposit.amount);
    const claimed = await sql<{ id: string; user_id: string; amount: string }>`
      update deposits set
        status = 'approved',
        reviewed_by = ${context.userId},
        reviewed_at = now(),
        review_note = ${data.reviewNote ?? null}
      where id = ${deposit.id} and status = 'pending'
      returning id, user_id, amount
    `;
    if (!claimed[0]) throw new Error("This deposit was already reviewed.");

    const credited = await sql<{ balance: string }>`
      update wallets set balance = balance + ${amount}, updated_at = now()
      where user_id = ${deposit.user_id}
      returning balance
    `;
    if (!credited[0]) {
      await sql`
        update deposits set
          status = 'pending',
          reviewed_by = null,
          reviewed_at = null,
          review_note = null
        where id = ${deposit.id}
      `;
      throw new Error("Wallet not found for this customer.");
    }
    await sql`
      insert into wallet_transactions (
        id, user_id, type, amount, balance_after, reference_type, reference_id, description
      ) values (
        ${newId()}, ${deposit.user_id}, 'deposit', ${amount}, ${num(credited[0].balance)},
        'deposit', ${deposit.id}, ${"Wallet deposit · Telecel MoMo"}
      )
    `;
    await writeAudit({
      userId: context.userId,
      action: "deposit.approved",
      entityType: "deposit",
      entityId: deposit.id,
      metadata: { amount },
    });
    return { status: "approved" as const };
  });

export const listAdminOrders = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireAdmin(context.userId);
    const sql = await getSql();
    const rows = await sql<{
      id: string;
      user_id: string;
      service_name: string;
      country_name: string;
      phone_number: string | null;
      customer_price: string;
      wholesale_price: string;
      status: string;
      created_at: string;
      email: string | null;
    }>`
      select o.id, o.user_id, o.service_name, o.country_name, o.phone_number,
             o.customer_price, o.wholesale_price, o.status, o.created_at, u.email
      from orders o
      left join "user" u on u.id = o.user_id
      order by o.created_at desc
      limit 200
    `;
    return rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      email: row.email,
      serviceName: row.service_name,
      countryName: row.country_name,
      phoneNumber: row.phone_number,
      customerPrice: num(row.customer_price),
      wholesalePrice: num(row.wholesale_price),
      profit: roundMoney(num(row.customer_price) - num(row.wholesale_price)),
      status: row.status,
      createdAt: String(row.created_at),
    }));
  });

export const updateMarkup = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ multiplier: z.number().min(1).max(5) }))
  .handler(async ({ context, data }) => {
    await requireAdmin(context.userId);
    const sql = await getSql();
    const value = String(roundMoney(data.multiplier));
    await sql`
      insert into settings (key, value, updated_at)
      values ('markup_multiplier', ${value}, now())
      on conflict (key) do update set value = excluded.value, updated_at = now()
    `;
    await writeAudit({
      userId: context.userId,
      action: "settings.markup",
      entityType: "settings",
      entityId: "markup_multiplier",
      metadata: { multiplier: data.multiplier },
    });
    return { multiplier: num(value) };
  });

export const updateSupplierLogin = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      email: z.string().trim().email(),
      password: z.string().min(4).max(120),
    }),
  )
  .handler(async ({ context, data }) => {
    await requireAdmin(context.userId);
    const sql = await getSql();
    await sql`
      insert into settings (key, value, updated_at)
      values ('supplier_email', ${data.email.toLowerCase()}, now())
      on conflict (key) do update set value = excluded.value, updated_at = now()
    `;
    await sql`
      insert into settings (key, value, updated_at)
      values ('supplier_password', ${data.password}, now())
      on conflict (key) do update set value = excluded.value, updated_at = now()
    `;
    resetSmsProvider();
    await writeAudit({
      userId: context.userId,
      action: "settings.supplier",
      entityType: "settings",
      entityId: "supplier_email",
      metadata: { email: data.email.toLowerCase() },
    });
    const provider = await getSmsProvider().getStatus();
    return {
      email: data.email.toLowerCase(),
      connected: provider.connected,
      balance: provider.balance,
    };
  });

export const listAuditLogs = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireAdmin(context.userId);
    const sql = await getSql();
    const rows = await sql<{
      id: string;
      user_id: string | null;
      action: string;
      entity_type: string | null;
      entity_id: string | null;
      metadata: string | null;
      created_at: string;
    }>`
      select id, user_id, action, entity_type, entity_id, metadata, created_at
      from audit_logs
      order by created_at desc
      limit 80
    `;
    return rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      action: row.action,
      entityType: row.entity_type,
      entityId: row.entity_id,
      metadata: row.metadata,
      createdAt: String(row.created_at),
    }));
  });
