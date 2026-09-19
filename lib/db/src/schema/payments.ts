import {
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { vendorsTable } from "./vendors";

export const paymentStatusEnum = pgEnum("payment_status", [
  "CREATED",
  "AUTHORIZED",
  "CAPTURED",
  "FAILED",
]);

export const paymentsTable = pgTable("payments", {
  id: serial("id").primaryKey(),
  // Human-readable id shown across the app and ledger, e.g. "PAY-1023".
  internalPaymentId: text("internal_payment_id").notNull().unique(),
  razorpayOrderId: text("razorpay_order_id"),
  razorpayPaymentId: text("razorpay_payment_id"),
  customerReference: text("customer_reference").notNull(),
  amount: integer("amount").notNull(),
  currency: text("currency").notNull().default("INR"),
  status: paymentStatusEnum("status").notNull().default("CREATED"),
  description: text("description"),
  // True when Razorpay live keys were not configured and capture/transfer
  // was simulated locally instead of going through the real Razorpay API.
  simulated: boolean("simulated").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertPaymentSchema = createInsertSchema(paymentsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof paymentsTable.$inferSelect;

export const paymentAllocationsTable = pgTable("payment_allocations", {
  id: serial("id").primaryKey(),
  paymentId: integer("payment_id")
    .notNull()
    .references(() => paymentsTable.id, { onDelete: "cascade" }),
  vendorId: integer("vendor_id").references(() => vendorsTable.id),
  label: text("label").notNull(),
  amount: integer("amount").notNull(),
});

export const insertPaymentAllocationSchema = createInsertSchema(
  paymentAllocationsTable,
).omit({ id: true });
export type InsertPaymentAllocation = z.infer<typeof insertPaymentAllocationSchema>;
export type PaymentAllocation = typeof paymentAllocationsTable.$inferSelect;
