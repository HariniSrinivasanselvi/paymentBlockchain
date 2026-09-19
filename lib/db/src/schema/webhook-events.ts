import { pgTable, serial, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Records inbound Razorpay webhook deliveries for idempotency: the same
// event id arriving twice (Razorpay retries on timeout) is a no-op.
export const webhookEventsTable = pgTable("webhook_events", {
  id: serial("id").primaryKey(),
  razorpayEventId: text("razorpay_event_id").notNull().unique(),
  eventType: text("event_type").notNull(),
  payload: jsonb("payload").notNull(),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertWebhookEventSchema = createInsertSchema(webhookEventsTable).omit({
  id: true,
  receivedAt: true,
});
export type InsertWebhookEvent = z.infer<typeof insertWebhookEventSchema>;
export type WebhookEvent = typeof webhookEventsTable.$inferSelect;
