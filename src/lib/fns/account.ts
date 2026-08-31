import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { generateTotpSecret, totpUri, verifyTotp } from "@/lib/server/totp";
import { ensureAccount, requireActiveAccount } from "@/lib/server/identity";
import { writeAudit } from "@/lib/server/audit";

export const getAccount = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    return ensureAccount(context.userId);
  });

export const updateAccount = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      displayName: z.string().trim().min(2).max(80).optional(),
      phone: z.string().trim().max(20).optional(),
    }),
  )
  .handler(async ({ context, data }) => {
    const profile = await requireActiveAccount(context.userId);
    const sql = await getSql();
    await sql`
      update user_profiles set
        display_name = coalesce(${data.displayName ?? null}, display_name),
        phone = coalesce(${data.phone ?? null}, phone),
        updated_at = now()
      where user_id = ${context.userId}
    `;
    await writeAudit({
      userId: context.userId,
      action: "account.updated",
      entityType: "user",
      entityId: context.userId,
    });
    return { ...profile, displayName: data.displayName ?? profile.displayName, phone: data.phone ?? profile.phone };
  });

export const beginTwoFactor = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const profile = await requireActiveAccount(context.userId);
    const secret = generateTotpSecret();
    const sql = await getSql();
    await sql`
      update user_profiles
      set two_factor_secret = ${secret}, two_factor_enabled = false, updated_at = now()
      where user_id = ${context.userId}
    `;
    return {
      secret,
      uri: totpUri(secret, profile.email || profile.userId),
    };
  });

export const confirmTwoFactor = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ code: z.string().trim() }))
  .handler(async ({ context, data }) => {
    await requireActiveAccount(context.userId);
    const sql = await getSql();
    const rows = await sql<{ two_factor_secret: string | null }>`
      select two_factor_secret from user_profiles where user_id = ${context.userId}
    `;
    const secret = rows[0]?.two_factor_secret;
    if (!secret) throw new Error("Start 2FA setup first.");
    if (!verifyTotp(secret, data.code)) throw new Error("That code is not valid. Try again.");
    await sql`
      update user_profiles set two_factor_enabled = true, updated_at = now()
      where user_id = ${context.userId}
    `;
    await writeAudit({
      userId: context.userId,
      action: "account.2fa.enabled",
      entityType: "user",
      entityId: context.userId,
    });
    return { enabled: true };
  });

export const disableTwoFactor = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ code: z.string().trim() }))
  .handler(async ({ context, data }) => {
    await requireActiveAccount(context.userId);
    const sql = await getSql();
    const rows = await sql<{ two_factor_secret: string | null; two_factor_enabled: boolean }>`
      select two_factor_secret, two_factor_enabled from user_profiles where user_id = ${context.userId}
    `;
    const row = rows[0];
    if (!row?.two_factor_enabled || !row.two_factor_secret) return { enabled: false };
    if (!verifyTotp(row.two_factor_secret, data.code)) throw new Error("That code is not valid.");
    await sql`
      update user_profiles
      set two_factor_enabled = false, two_factor_secret = null, updated_at = now()
      where user_id = ${context.userId}
    `;
    await writeAudit({
      userId: context.userId,
      action: "account.2fa.disabled",
      entityType: "user",
      entityId: context.userId,
    });
    return { enabled: false };
  });

export const verifyTwoFactor = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ code: z.string().trim() }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const rows = await sql<{ two_factor_secret: string | null; two_factor_enabled: boolean }>`
      select two_factor_secret, two_factor_enabled from user_profiles where user_id = ${context.userId}
    `;
    const row = rows[0];
    if (!row?.two_factor_enabled) return { ok: true, required: false };
    if (!row.two_factor_secret || !verifyTotp(row.two_factor_secret, data.code)) {
      throw new Error("Invalid authenticator code.");
    }
    return { ok: true, required: true };
  });
