import { pgEnum, pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { paymentsTable } from "./payments";

export const reconciliationStatusEnum = pgEnum("reconciliation_status", [
  "MATCH",
  "MISMATCH",
]);

export const reconciliationRecordsTable = pgTable("reconciliation_records", {
  id: serial("id").primaryKey(),
  paymentId: integer("payment_id")
    .notNull()
    .references(() => paymentsTable.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  internalAmount: integer("internal_amount").notNull(),
  externalAmount: integer("external_amount").notNull(),
  difference: integer("difference").notNull(),
  status: reconciliationStatusEnum("status").notNull(),
  checkedAt: timestamp("checked_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertReconciliationRecordSchema = createInsertSchema(
  reconciliationRecordsTable,
).omit({ id: true, checkedAt: true });
export type InsertReconciliationRecord = z.infer<
  typeof insertReconciliationRecordSchema
>;
export type ReconciliationRecord = typeof reconciliationRecordsTable.$inferSelect;
