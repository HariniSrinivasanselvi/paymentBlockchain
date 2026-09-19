import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import {
  db,
  paymentsTable,
  paymentAllocationsTable,
  transfersTable,
  reconciliationRecordsTable,
} from "@workspace/db";
import { ListReconciliationResponse, RunReconciliationResponse } from "@workspace/api-zod";
import { requireAuth, requireRole } from "../lib/auth";
import { recordAudit } from "../lib/audit";

const router: IRouter = Router();

router.get(
  "/reconciliation",
  requireAuth,
  requireRole("ADMIN", "AUDITOR"),
  async (_req, res): Promise<void> => {
    const records = await db
      .select({
        record: reconciliationRecordsTable,
        internalPaymentId: paymentsTable.internalPaymentId,
      })
      .from(reconciliationRecordsTable)
      .innerJoin(paymentsTable, eq(reconciliationRecordsTable.paymentId, paymentsTable.id))
      .orderBy(reconciliationRecordsTable.checkedAt);

    const dtos = records.map((r) => ({ ...r.record, internalPaymentId: r.internalPaymentId }));
    res.json(ListReconciliationResponse.parse(dtos.reverse()));
  },
);

router.post(
  "/reconciliation/run",
  requireAuth,
  requireRole("ADMIN", "AUDITOR"),
  async (req, res): Promise<void> => {
    const capturedPayments = await db
      .select()
      .from(paymentsTable)
      .where(eq(paymentsTable.status, "CAPTURED"));

    await db.delete(reconciliationRecordsTable);

    const dtos: {
      id: number;
      paymentId: number;
      internalPaymentId: string;
      label: string;
      internalAmount: number;
      externalAmount: number;
      difference: number;
      status: "MATCH" | "MISMATCH";
      checkedAt: Date;
    }[] = [];

    for (const payment of capturedPayments) {
      const allocations = await db
        .select()
        .from(paymentAllocationsTable)
        .where(eq(paymentAllocationsTable.paymentId, payment.id));

      const transfers = await db
        .select()
        .from(transfersTable)
        .where(eq(transfersTable.paymentId, payment.id));

      for (const allocation of allocations) {
        if (allocation.vendorId == null) continue;

        const matchingTransfer = transfers.find((t) => t.vendorId === allocation.vendorId);
        const externalAmount =
          matchingTransfer && matchingTransfer.status === "PROCESSED"
            ? matchingTransfer.amount
            : 0;
        const difference = allocation.amount - externalAmount;
        const status: "MATCH" | "MISMATCH" = difference === 0 ? "MATCH" : "MISMATCH";

        const [inserted] = await db
          .insert(reconciliationRecordsTable)
          .values({
            paymentId: payment.id,
            label: allocation.label,
            internalAmount: allocation.amount,
            externalAmount,
            difference,
            status,
          })
          .returning();

        dtos.push({ ...inserted!, internalPaymentId: payment.internalPaymentId });
      }
    }

    await recordAudit(req, req.user, "reconciliation.run", "reconciliation", null);
    res.json(RunReconciliationResponse.parse(dtos.reverse()));
  },
);

export default router;
