import { pgTable, serial, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Append-only, hash-linked audit ledger. Each row is a "block" whose
// currentHash is SHA-256(payloadHash + previousHash). Rows are never
// updated except by the demo tamper endpoint, which intentionally
// corrupts payloadHash without recomputing currentHash so re-verification
// detects the mismatch.
export const blockchainBlocksTable = pgTable("blockchain_blocks", {
  id: serial("id").primaryKey(),
  // Sequential position in the global chain (0-based), assigned at insert time.
  blockIndex: integer("block_index").notNull().unique(),
  // The domain transaction this event belongs to, e.g. a payment's internalPaymentId.
  transactionId: text("transaction_id").notNull(),
  eventType: text("event_type").notNull(),
  entityId: text("entity_id").notNull(),
  amount: integer("amount"),
  payloadHash: text("payload_hash").notNull(),
  previousHash: text("previous_hash").notNull(),
  currentHash: text("current_hash").notNull(),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
  tampered: boolean("tampered").notNull().default(false),
});

export const insertBlockchainBlockSchema = createInsertSchema(
  blockchainBlocksTable,
).omit({ id: true });
export type InsertBlockchainBlock = z.infer<typeof insertBlockchainBlockSchema>;
export type BlockchainBlock = typeof blockchainBlocksTable.$inferSelect;
