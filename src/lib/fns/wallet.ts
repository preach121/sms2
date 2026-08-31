import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { newId, num, roundMoney } from "@/lib/utils";
import { writeAudit } from "@/lib/server/audit";
import { rateLimit } from "@/lib/server/rate-limit";
import { requireActiveAccount } from "@/lib/server/identity";

const TELECEL_NUMBER = "0508158717";
const TELECEL_NETWORK = "Telecel Mobile Money";

export type WalletSnapshot = {
  balance: number;
  currency: "GHS";
  destination: { network: string; number: string };
};

export const getWallet = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireActiveAccount(context.userId);
    const sql = await getSql();
    const rows = await sql<{ balance: string }>`
      select balance from wallets where user_id = ${context.userId}
    `;
    return {
      balance: num(rows[0]?.balance),
      currency: "GHS" as const,
      destination: { network: TELECEL_NETWORK, number: TELECEL_NUMBER },
    } satisfies WalletSnapshot;
  });

export const getWalletHistory = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireActiveAccount(context.userId);
    const sql = await getSql();
    const tx = await sql<{
      id: string;
      type: string;
      amount: string;
      balance_after: string;
      description: string;
      created_at: string;
      reference_type: string | null;
      reference_id: string | null;
    }>`
      select id, type, amount, balance_after, description, created_at, reference_type, reference_id
      from wallet_transactions
      where user_id = ${context.userId}
      order by created_at desc
      limit 80
    `;
    const deposits = await sql<{
      id: string;
      amount: string;
      status: string;
      reference: string;
      payer_name: string | null;
      payer_phone: string | null;
      note: string | null;
      created_at: string;
      review_note: string | null;
    }>`
      select id, amount, status, reference, payer_name, payer_phone, note, created_at, review_note
      from deposits
      where user_id = ${context.userId}
      order by created_at desc
      limit 40
    `;
    const purchases = await sql<{
      id: string;
      service_name: string;
      country_name: string;
      phone_number: string | null;
      customer_price: string;
      status: string;
      created_at: string;
    }>`
      select id, service_name, country_name, phone_number, customer_price, status, created_at
      from orders
      where user_id = ${context.userId}
      order by created_at desc
      limit 40
    `;
    return {
      transactions: tx.map((row) => ({
        id: row.id,
        type: row.type,
        amount: num(row.amount),
        balanceAfter: num(row.balance_after),
        description: row.description,
        createdAt: String(row.created_at),
        referenceType: row.reference_type,
        referenceId: row.reference_id,
      })),
      deposits: deposits.map((row) => ({
        id: row.id,
        amount: num(row.amount),
        status: row.status,
        reference: row.reference,
        payerName: row.payer_name,
        payerPhone: row.payer_phone,
        note: row.note,
        createdAt: String(row.created_at),
        reviewNote: row.review_note,
      })),
      purchases: purchases.map((row) => ({
        id: row.id,
        serviceName: row.service_name,
        countryName: row.country_name,
        phoneNumber: row.phone_number,
        price: num(row.customer_price),
        status: row.status,
        createdAt: String(row.created_at),
      })),
    };
  });

export const createDeposit = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      amount: z.number().positive().max(50_000),
      payerName: z.string().trim().min(2).max(80),
      payerPhone: z.string().trim().min(8).max(20),
      reference: z.string().trim().min(4).max(80),
      note: z.string().trim().max(240).optional(),
      idempotencyKey: z.string().uuid(),
    }),
  )
  .handler(async ({ context, data }) => {
    rateLimit(`deposit:${context.userId}`, 8, 60_000);
    await requireActiveAccount(context.userId);
    const amount = roundMoney(data.amount);
    if (amount < 1) throw new Error("Minimum deposit is GH₵1.00.");
    const sql = await getSql();
    const existing = await sql<{ id: string; status: string }>`
      select id, status from deposits where idempotency_key = ${data.idempotencyKey}
    `;
    if (existing[0]) return { id: existing[0].id, status: existing[0].status };
    const id = newId();
    await sql`
      insert into deposits (
        id, user_id, amount, status, payer_name, payer_phone, reference, note, idempotency_key
      ) values (
        ${id}, ${context.userId}, ${amount}, 'pending', ${data.payerName},
        ${data.payerPhone}, ${data.reference}, ${data.note ?? null}, ${data.idempotencyKey}
      )
    `;
    await writeAudit({
      userId: context.userId,
      action: "deposit.submitted",
      entityType: "deposit",
      entityId: id,
      metadata: { amount, reference: data.reference },
    });
    return { id, status: "pending" as const, destination: { network: TELECEL_NETWORK, number: TELECEL_NUMBER } };
  });
