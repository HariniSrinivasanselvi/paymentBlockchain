import { Router, type IRouter } from "express";
import { desc } from "drizzle-orm";
import { db, auditLogsTable } from "@workspace/db";
import { ListAuditLogsResponse } from "@workspace/api-zod";
import { requireAuth, requireRole } from "../lib/auth";

const router: IRouter = Router();

router.get(
  "/audit-logs",
  requireAuth,
  requireRole("ADMIN", "AUDITOR"),
  async (_req, res): Promise<void> => {
    const logs = await db
      .select()
      .from(auditLogsTable)
      .orderBy(desc(auditLogsTable.timestamp))
      .limit(200);
    res.json(ListAuditLogsResponse.parse(logs));
  },
);

export default router;
