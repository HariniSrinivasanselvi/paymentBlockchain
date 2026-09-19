import type { Request } from "express";
import { db, auditLogsTable, type User } from "@workspace/db";

/** Records an entry in the audit trail. Accepts an optional actor -- some
 * events (e.g. inbound webhooks) have no authenticated user. */
export async function recordAudit(
  req: Request,
  actor: User | undefined,
  action: string,
  entityType: string,
  entityId?: string | null,
): Promise<void> {
  await db.insert(auditLogsTable).values({
    userId: actor?.id ?? null,
    userName: actor?.name ?? null,
    action,
    entityType,
    entityId: entityId ?? null,
    ipAddress: req.ip ?? null,
  });
}
