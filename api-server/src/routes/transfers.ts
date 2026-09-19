import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, transfersTable, vendorsTable, paymentsTable } from "@workspace/db";
import {
  ListTransfersResponse,
  GetTransferParams,
  GetTransferResponse,
  ReverseTransferParams,
  ReverseTransferResponse,
} from "@workspace/api-zod";
import { requireAuth, requireRole } from "../lib/auth";
import { recordAudit } from "../lib/audit";
import { withVendorName } from "../lib/serializers";
import { appendBlock } from "../lib/blockchain";

const router: IRouter = Router();

router.get("/transfers", requireAuth, async (req, res): Promise<void> => {
  const allTransfers = await db.select().from(transfersTable).orderBy(transfersTable.createdAt);
  let dtos = await withVendorName(allTransfers);

  if (req.user!.role === "VENDOR") {
    dtos = dtos.filter((t) => t.vendorId === req.user!.vendorId);
  }

  res.json(ListTransfersResponse.parse(dtos.reverse()));
});

router.get("/transfers/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetTransferParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [transfer] = await db
    .select()
    .from(transfersTable)
    .where(eq(transfersTable.id, params.data.id));
  if (!transfer) {
    res.status(404).json({ error: "Transfer not found" });
    return;
  }

  if (req.user!.role === "VENDOR" && transfer.vendorId !== req.user!.vendorId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const [dto] = await withVendorName([transfer]);
  res.json(GetTransferResponse.parse(dto));
});

router.post(
  "/transfers/:id/reverse",
  requireAuth,
  requireRole("ADMIN"),
  async (req, res): Promise<void> => {
    const params = ReverseTransferParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const [transfer] = await db
      .select()
      .from(transfersTable)
      .where(eq(transfersTable.id, params.data.id));
    if (!transfer) {
      res.status(404).json({ error: "Transfer not found" });
      return;
    }

    const wasProcessed = transfer.status === "PROCESSED";

    const [updated] = await db
      .update(transfersTable)
      .set({ status: "REVERSED" })
      .where(eq(transfersTable.id, transfer.id))
      .returning();

    if (wasProcessed && transfer.vendorId != null) {
      const [vendor] = await db
        .select()
        .from(vendorsTable)
        .where(eq(vendorsTable.id, transfer.vendorId));
      if (vendor) {
        await db
          .update(vendorsTable)
          .set({ totalReceived: Math.max(0, vendor.totalReceived - transfer.amount) })
          .where(eq(vendorsTable.id, vendor.id));
      }
    }

    const [payment] = await db
      .select()
      .from(paymentsTable)
      .where(eq(paymentsTable.id, transfer.paymentId));

    await appendBlock({
      transactionId: payment?.internalPaymentId ?? `PAY-${transfer.paymentId}`,
      eventType: "TRANSFER_REVERSED",
      entityId: `TRF-${transfer.id}`,
      amount: transfer.amount,
    });

    await recordAudit(req, req.user, "transfer.reversed", "transfer", String(transfer.id));

    const [dto] = await withVendorName([updated!]);
    res.json(ReverseTransferResponse.parse(dto));
  },
);

export default router;
