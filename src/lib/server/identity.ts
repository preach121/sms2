import { getSql } from "@/lib/db";
import { writeAudit } from "./audit";

export type AccountProfile = {
  userId: string;
  email: string | null;
  displayName: string | null;
  phone: string | null;
  role: "customer" | "admin";
  status: "active" | "suspended";
  twoFactorEnabled: boolean;
  emailVerified: boolean;
  createdAt: string;
};

function envList(name: string): string[] {
  const raw = typeof process !== "undefined" ? process.env[name] : undefined;
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export async function ensureAccount(userId: string): Promise<AccountProfile> {
  const sql = await getSql();
  const users = await sql<{
    email: string | null;
    name: string | null;
    emailVerified: boolean;
  }>`select email, name, "emailVerified" as "emailVerified" from "user" where id = ${userId}`;
  const authUser = users[0];
  const email = authUser?.email ?? null;
  const displayName = authUser?.name ?? null;

  await sql`
    insert into user_profiles (user_id, display_name, role, status)
    values (${userId}, ${displayName}, 'customer', 'active')
    on conflict (user_id) do nothing
  `;
  await sql`
    insert into wallets (user_id, balance) values (${userId}, 0)
    on conflict (user_id) do nothing
  `;

  const admins = await sql<{ n: number }>`select count(*)::int as n from admin_users`;
  const isFirst = (admins[0]?.n ?? 0) === 0;
  const emailIsAdmin = email ? envList("ADMIN_EMAILS").includes(email.toLowerCase()) : false;

  if (isFirst || emailIsAdmin) {
    await sql`
      update user_profiles set role = 'admin', updated_at = now()
      where user_id = ${userId} and role <> 'admin'
    `;
    await sql`
      insert into admin_users (user_id, granted_by)
      values (${userId}, ${isFirst ? "bootstrap" : "env"})
      on conflict (user_id) do nothing
    `;
    if (isFirst) {
      await writeAudit({
        userId,
        action: "admin.bootstrap",
        entityType: "user",
        entityId: userId,
      });
    }
  }

  const rows = await sql<{
    display_name: string | null;
    phone: string | null;
    role: string;
    status: string;
    two_factor_enabled: boolean;
    created_at: string;
  }>`
    select display_name, phone, role, status, two_factor_enabled, created_at
    from user_profiles where user_id = ${userId}
  `;
  const row = rows[0];
  if (!row) throw new Error("Unable to load account.");
  return {
    userId,
    email,
    displayName: row.display_name ?? displayName,
    phone: row.phone,
    role: row.role === "admin" ? "admin" : "customer",
    status: row.status === "suspended" ? "suspended" : "active",
    twoFactorEnabled: Boolean(row.two_factor_enabled),
    emailVerified: Boolean(authUser?.emailVerified),
    createdAt: String(row.created_at),
  };
}

export async function requireActiveAccount(userId: string): Promise<AccountProfile> {
  const profile = await ensureAccount(userId);
  if (profile.status === "suspended") {
    throw new Error("This account has been suspended. Contact support.");
  }
  return profile;
}

export async function requireAdmin(userId: string): Promise<AccountProfile> {
  const profile = await requireActiveAccount(userId);
  if (profile.role !== "admin") throw new Error("Forbidden");
  return profile;
}
