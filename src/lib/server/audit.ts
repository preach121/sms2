import { getSql } from "@/lib/db";
import { newId } from "@/lib/utils";

export async function writeAudit(input: {
  userId?: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: unknown;
}): Promise<void> {
  const sql = await getSql();
  await sql`
    insert into audit_logs (id, user_id, action, entity_type, entity_id, metadata)
    values (
      ${newId()},
      ${input.userId ?? null},
      ${input.action},
      ${input.entityType ?? null},
      ${input.entityId ?? null},
      ${input.metadata ? JSON.stringify(input.metadata) : null}
    )
  `;
}
