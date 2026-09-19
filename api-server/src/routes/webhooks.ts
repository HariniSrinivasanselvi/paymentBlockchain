import { Router, type IRouter, type Request } from "express";
import { eq } from "drizzle-orm";
import { db, webhookEventsTable, paymentsTable } from "@workspace/db";
import { HandleRazorpayWebhookBody } from "@workspace/api-zod";
import { verifyWebhookSignature } from "../lib/razorpay";
import { appendBlock } from "../lib/blockchain";
import { recordAudit } from "../lib/audit";

const router: IRouter = Router();

router.post("/webhooks/razorpay", async (req, res): Promise<void> => {
  const signature = req.header("x-razorpay-signature");
  const rawBody = (req as Request & { rawBody?: string }).rawBody ?? "";

  if (signature && !verifyWebhookSignature(rawBody, signature)) {
    req.log.warn("Rejected Razorpay webhook with invalid signature");
    res.status(200).end();
    return;
  }

  const parsed = HandleRazorpayWebhookBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(200).end();
    return;
  }

  const payload = parsed.data as { id?: string; event?: string; payload?: unknown };
  const eventId = payload.id ?? `evt_${Date.now()}`;

  const existing = await db
    .select()
    .from(webhookEventsTable)
    .where(eq(webhookEventsTable.razorpayEventId, eventId));
  if (existing.length > 0) {
    // Already processed this delivery -- Razorpay retries on timeout.
    res.status(200).end();
    return;
  }

  await db.insert(webhookEventsTable).values({
    razorpayEventId: eventId,
    eventType: payload.event ?? "unknown",
    payload: parsed.data,
  });

  const orderId = (payload.payload as { payment?: { entity?: { order_id?: string } } })?.payment
    ?.entity?.order_id;
  if (orderId) {
    const [payment] = await db
      .select()
      .from(paymentsTable)
      .where(eq(paymentsTable.razorpayOrderId, orderId));
    if (payment) {
      await appendBlock({
        transactionId: payment.internalPaymentId,
        eventType: `WEBHOOK_${(payload.event ?? "unknown").toUpperCase()}`,
        entityId: payment.internalPaymentId,
        amount: payment.amount,
      });
    }
  }

  await recordAudit(req, undefined, `webhook.${payload.event ?? "unknown"}`, "webhook", eventId);
  res.status(200).end();
});

export default router;
