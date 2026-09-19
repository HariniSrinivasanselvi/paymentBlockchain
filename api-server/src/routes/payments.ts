import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, paymentsTable, paymentAllocationsTable } from "@workspace/db";
import {
  CreatePaymentBody,
  ListPaymentsResponse,
  CreatePaymentResponse,
  GetPaymentParams,
  GetPaymentResponse,
  CapturePaymentParams,
  CapturePaymentBody,
  CapturePaymentResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import { recordAudit } from "../lib/audit";
import { withAllocations } from "../lib/serializers";
import { createPaymentWithAllocations, captureAndFanOut } from "../lib/ledger";

const router: IRouter = Router();

router.get("/payments", requireAuth, async (req, res): Promise<void> => {
  const allPayments = await db.select().from(paymentsTable).orderBy(paymentsTable.createdAt);
  let dtos = await withAllocations(allPayments);

  if (req.user!.role === "VENDOR") {
    dtos = dtos.filter((p) => p.allocations.some((a) => a.vendorId === req.user!.vendorId));
  }

  res.json(ListPaymentsResponse.parse(dtos.reverse()));
});

router.post("/payments", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreatePaymentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const result = await createPaymentWithAllocations(parsed.data);
  if (!result.ok) {
    res.status(400).json({ error: result.error });
    return;
  }

  await recordAudit(req, req.user, "payment.created", "payment", result.payment.internalPaymentId);

  const [dto] = await withAllocations([result.payment]);
  res.status(201).json(CreatePaymentResponse.parse(dto));
});

router.get("/payments/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetPaymentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [payment] = await db.select().from(paymentsTable).where(eq(paymentsTable.id, params.data.id));
  if (!payment) {
    res.status(404).json({ error: "Payment not found" });
    return;
  }

  const [dto] = await withAllocations([payment]);

  if (
    req.user!.role === "VENDOR" &&
    !dto!.allocations.some((a) => a.vendorId === req.user!.vendorId)
  ) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  res.json(GetPaymentResponse.parse(dto));
});

router.post("/payments/:id/capture", requireAuth, async (req, res): Promise<void> => {
  const params = CapturePaymentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = CapturePaymentBody.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const result = await captureAndFanOut(params.data.id, parsed.data);
  if (result.status === "not_found") {
    res.status(404).json({ error: "Payment not found" });
    return;
  }
  if (result.status === "conflict") {
    res.status(409).json({ error: "Payment already processed" });
    return;
  }

  await recordAudit(
    req,
    req.user,
    "payment.captured",
    "payment",
    result.payment.internalPaymentId,
  );

  const [dto] = await withAllocations([result.payment]);
  res.json(CapturePaymentResponse.parse(dto));
});

export default router;
