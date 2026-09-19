import { pgEnum, pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const vendorStatusEnum = pgEnum("vendor_status", [
  "ACTIVE",
  "PENDING",
  "INACTIVE",
]);

export const vendorsTable = pgTable("vendors", {
  id: serial("id").primaryKey(),
  vendorCode: text("vendor_code").notNull().unique(),
  businessName: text("business_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  razorpayAccountId: text("razorpay_account_id"),
  status: vendorStatusEnum("status").notNull().default("ACTIVE"),
  // Denormalized running total of processed transfers, in paise.
  totalReceived: integer("total_received").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertVendorSchema = createInsertSchema(vendorsTable).omit({
  id: true,
  vendorCode: true,
  totalReceived: true,
  createdAt: true,
});
export type InsertVendor = z.infer<typeof insertVendorSchema>;
export type Vendor = typeof vendorsTable.$inferSelect;
