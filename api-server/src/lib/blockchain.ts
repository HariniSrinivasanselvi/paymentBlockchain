import { createHash } from "node:crypto";
import { desc } from "drizzle-orm";
import { db, blockchainBlocksTable, type BlockchainBlock } from "@workspace/db";

const GENESIS_HASH = "0".repeat(64);

function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

function computePayloadHash(block: {
  blockIndex: number;
  transactionId: string;
  eventType: string;
  entityId: string;
  amount: number | null;
  timestamp: Date;
}): string {
  return sha256(
    JSON.stringify({
      blockIndex: block.blockIndex,
      transactionId: block.transactionId,
      eventType: block.eventType,
      entityId: block.entityId,
      amount: block.amount ?? null,
      timestamp: block.timestamp.toISOString(),
    }),
  );
}

export interface AppendBlockInput {
  transactionId: string;
  eventType: string;
  entityId: string;
  amount?: number | null;
}

/**
 * Appends a new block to the single global hash-linked ledger. Each block's
 * currentHash commits to its own payload plus the previous block's hash, so
 * altering any stored field breaks the chain from that point when re-verified.
 */
export async function appendBlock(input: AppendBlockInput): Promise<BlockchainBlock> {
  return db.transaction(async (tx) => {
    const [last] = await tx
      .select()
      .from(blockchainBlocksTable)
      .orderBy(desc(blockchainBlocksTable.blockIndex))
      .limit(1);

    const blockIndex = last ? last.blockIndex + 1 : 0;
    const previousHash = last ? last.currentHash : GENESIS_HASH;
    const timestamp = new Date();
    const amount = input.amount ?? null;

    const payloadHash = computePayloadHash({
      blockIndex,
      transactionId: input.transactionId,
      eventType: input.eventType,
      entityId: input.entityId,
      amount,
      timestamp,
    });
    const currentHash = sha256(payloadHash + previousHash);

    const [block] = await tx
      .insert(blockchainBlocksTable)
      .values({
        blockIndex,
        transactionId: input.transactionId,
        eventType: input.eventType,
        entityId: input.entityId,
        amount,
        payloadHash,
        previousHash,
        currentHash,
        timestamp,
        tampered: false,
      })
      .returning();

    if (!block) {
      throw new Error("Failed to append blockchain block");
    }

    return block;
  });
}

export interface InvalidBlock {
  blockIndex: number;
  transactionId: string;
  eventType: string;
  expectedHash: string;
  actualHash: string;
}

export interface VerifyResult {
  valid: boolean;
  totalBlocks: number;
  validBlocks: number;
  invalidBlocks: InvalidBlock[];
}

/** Recomputes every block's hash from its currently stored fields and
 * compares it against the stored hash, detecting any tampering. */
export async function verifyChain(): Promise<VerifyResult> {
  const blocks = await db
    .select()
    .from(blockchainBlocksTable)
    .orderBy(blockchainBlocksTable.blockIndex);

  const invalidBlocks: InvalidBlock[] = [];
  let expectedPreviousHash = GENESIS_HASH;

  for (const block of blocks) {
    const expectedPayloadHash = computePayloadHash(block);
    const expectedCurrentHash = sha256(expectedPayloadHash + expectedPreviousHash);

    if (
      expectedCurrentHash !== block.currentHash ||
      block.previousHash !== expectedPreviousHash
    ) {
      invalidBlocks.push({
        blockIndex: block.blockIndex,
        transactionId: block.transactionId,
        eventType: block.eventType,
        expectedHash: expectedCurrentHash,
        actualHash: block.currentHash,
      });
    }

    // Continue the chain from the block's *stored* hash so a single
    // tampered block is flagged on its own, instead of cascading false
    // failures through every block that follows it.
    expectedPreviousHash = block.currentHash;
  }

  return {
    valid: invalidBlocks.length === 0,
    totalBlocks: blocks.length,
    validBlocks: blocks.length - invalidBlocks.length,
    invalidBlocks,
  };
}
