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
import { paymentsTable } from "./payments";
import { vendorsTable } from "./vendors";

export const transferStatusEnum = pgEnum("transfer_status", [
  "CREATED",
  "PROCESSED",
  "FAILED",
  "REVERSED",
]);

export const transfersTable = pgTable("transfers", {
  id: serial("id").primaryKey(),
  paymentId: integer("payment_id")
    .notNull()
    .references(() => paymentsTable.id, { onDelete: "cascade" }),
  vendorId: integer("vendor_id").references(() => vendorsTable.id),
  razorpayTransferId: text("razorpay_transfer_id"),
  amount: integer("amount").notNull(),
  status: transferStatusEnum("status").notNull().default("CREATED"),
  settlementStatus: text("settlement_status"),
  simulated: boolean("simulated").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
});

export const insertTransferSchema = createInsertSchema(transfersTable).omit({
  id: true,
  createdAt: true,
});
export type InsertTransfer = z.infer<typeof insertTransferSchema>;
export type Transfer = typeof transfersTable.$inferSelect;
