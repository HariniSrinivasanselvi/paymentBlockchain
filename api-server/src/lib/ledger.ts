import { eq } from "drizzle-orm";
import {
  db,
  paymentsTable,
  paymentAllocationsTable,
  transfersTable,
  vendorsTable,
  type Payment,
} from "@workspace/db";
import { appendBlock } from "./blockchain";
import { razorpayConfigured, razorpayClient } from "./razorpay";

export interface AllocationInput {
  vendorId?: number | null;
  label: string;
  amount: number;
}

/** Creates a payment order plus its vendor allocations. Validates that the
 * allocations sum exactly to the payment amount before touching the DB. */
export async function createPaymentWithAllocations(input: {
  customerReference: string;
  amount: number;
  currency: string;
  description?: string;
  allocations: AllocationInput[];
}): Promise<{ ok: true; payment: Payment } | { ok: false; error: string }> {
  const allocationTotal = input.allocations.reduce((sum, a) => sum + a.amount, 0);
  if (allocationTotal !== input.amount) {
    return {
      ok: false,
      error: `Allocations must sum to the payment amount: expected ${input.amount}, got ${allocationTotal}`,
    };
  }

  const payment = await db.transaction(async (tx) => {
    const [inserted] = await tx
      .insert(paymentsTable)
      .values({
        internalPaymentId: `PENDING-${Date.now()}`,
        customerReference: input.customerReference,
        amount: input.amount,
        currency: input.currency.toUpperCase(),
        description: input.description ?? null,
        status: "CREATED",
        simulated: !razorpayConfigured,
      })
      .returning();
    if (!inserted) throw new Error("Failed to create payment");

    const internalPaymentId = `PAY-${1000 + inserted.id}`;

    let razorpayOrderId: string;
    if (razorpayConfigured && razorpayClient) {
      const order = await razorpayClient.orders.create({
        amount: input.amount,
        currency: input.currency.toUpperCase(),
        receipt: internalPaymentId,
      });
      razorpayOrderId = order.id;
    } else {
      razorpayOrderId = `order_sim_${inserted.id}`;
    }

    const [updated] = await tx
      .update(paymentsTable)
      .set({ internalPaymentId, razorpayOrderId })
      .where(eq(paymentsTable.id, inserted.id))
      .returning();
    if (!updated) throw new Error("Failed to finalize payment");

    if (input.allocations.length > 0) {
      await tx.insert(paymentAllocationsTable).values(
        input.allocations.map((a) => ({
          paymentId: updated.id,
          vendorId: a.vendorId ?? null,
          label: a.label,
          amount: a.amount,
        })),
      );
    }

    return updated;
  });

  await appendBlock({
    transactionId: payment.internalPaymentId,
    eventType: "PAYMENT_CREATED",
    entityId: payment.internalPaymentId,
    amount: payment.amount,
  });

  return { ok: true, payment };
}

/** Captures a payment (real Razorpay flow when configured, otherwise
 * simulated) and fans out a transfer per vendor allocation. */
export async function captureAndFanOut(
  paymentId: number,
  captureInput: { razorpayPaymentId?: string; razorpaySignature?: string },
): Promise<{ status: "not_found" } | { status: "conflict" } | { status: "ok"; payment: Payment }> {
  const [payment] = await db.select().from(paymentsTable).where(eq(paymentsTable.id, paymentId));
  if (!payment) return { status: "not_found" };
  if (payment.status === "CAPTURED" || payment.status === "FAILED") {
    return { status: "conflict" };
  }

  const razorpayPaymentId = captureInput.razorpayPaymentId ?? `pay_sim_${payment.id}`;

  const [captured] = await db
    .update(paymentsTable)
    .set({ status: "CAPTURED", razorpayPaymentId })
    .where(eq(paymentsTable.id, payment.id))
    .returning();
  if (!captured) throw new Error("Failed to capture payment");

  await appendBlock({
    transactionId: captured.internalPaymentId,
    eventType: "PAYMENT_CAPTURED",
    entityId: captured.internalPaymentId,
    amount: captured.amount,
  });

  const allocations = await db
    .select()
    .from(paymentAllocationsTable)
    .where(eq(paymentAllocationsTable.paymentId, captured.id));

  for (const allocation of allocations) {
    if (allocation.vendorId == null) continue;

    const [vendor] = await db
      .select()
      .from(vendorsTable)
      .where(eq(vendorsTable.id, allocation.vendorId));
    if (!vendor) continue;

    const canUseRealTransfer = razorpayConfigured && Boolean(vendor.razorpayAccountId);
    const [transfer] = await db
      .insert(transfersTable)
      .values({
        paymentId: captured.id,
        vendorId: vendor.id,
        amount: allocation.amount,
        status: "CREATED",
        simulated: !canUseRealTransfer,
      })
      .returning();
    if (!transfer) continue;

    await appendBlock({
      transactionId: captured.internalPaymentId,
      eventType: "TRANSFER_CREATED",
      entityId: `TRF-${transfer.id}`,
      amount: transfer.amount,
    });

    let finalStatus: "PROCESSED" | "FAILED" = "PROCESSED";
    let razorpayTransferId: string | null = null;

    if (canUseRealTransfer && razorpayClient) {
      try {
        const rpTransfer = await razorpayClient.transfers.create({
          account: vendor.razorpayAccountId!,
          amount: transfer.amount,
          currency: captured.currency,
        });
        razorpayTransferId = rpTransfer.id;
      } catch {
        finalStatus = "FAILED";
      }
    } else {
      razorpayTransferId = `trf_sim_${transfer.id}`;
    }

    await db
      .update(transfersTable)
      .set({
        status: finalStatus,
        razorpayTransferId,
        processedAt: new Date(),
        settlementStatus: finalStatus === "PROCESSED" ? "settled" : null,
      })
      .where(eq(transfersTable.id, transfer.id));

    await appendBlock({
      transactionId: captured.internalPaymentId,
      eventType: finalStatus === "PROCESSED" ? "TRANSFER_PROCESSED" : "TRANSFER_FAILED",
      entityId: `TRF-${transfer.id}`,
      amount: transfer.amount,
    });

    if (finalStatus === "PROCESSED") {
      await db
        .update(vendorsTable)
        .set({ totalReceived: vendor.totalReceived + transfer.amount })
        .where(eq(vendorsTable.id, vendor.id));
    }
  }

  return { status: "ok", payment: captured };
}
