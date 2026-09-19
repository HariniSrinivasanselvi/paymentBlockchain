import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, blockchainBlocksTable } from "@workspace/db";
import {
  ListBlockchainBlocksResponse,
  GetBlockchainTransactionParams,
  GetBlockchainTransactionResponse,
  VerifyBlockchainResponse,
  TamperBlockchainBlockParams,
  TamperBlockchainBlockResponse,
} from "@workspace/api-zod";
import { requireAuth, requireRole } from "../lib/auth";
import { recordAudit } from "../lib/audit";
import { verifyChain } from "../lib/blockchain";

const router: IRouter = Router();

router.get("/blockchain/blocks", requireAuth, async (_req, res): Promise<void> => {
  const blocks = await db
    .select()
    .from(blockchainBlocksTable)
    .orderBy(desc(blockchainBlocksTable.blockIndex));
  res.json(ListBlockchainBlocksResponse.parse(blocks));
});

router.get(
  "/blockchain/transactions/:transactionId",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = GetBlockchainTransactionParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const blocks = await db
      .select()
      .from(blockchainBlocksTable)
      .where(eq(blockchainBlocksTable.transactionId, params.data.transactionId))
      .orderBy(blockchainBlocksTable.blockIndex);

    res.json(GetBlockchainTransactionResponse.parse(blocks));
  },
);

router.get("/blockchain/verify", requireAuth, async (_req, res): Promise<void> => {
  const result = await verifyChain();
  res.json(VerifyBlockchainResponse.parse(result));
});

router.post(
  "/blockchain/blocks/:id/tamper",
  requireAuth,
  requireRole("ADMIN"),
  async (req, res): Promise<void> => {
    const params = TamperBlockchainBlockParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const [block] = await db
      .select()
      .from(blockchainBlocksTable)
      .where(eq(blockchainBlocksTable.id, params.data.id));
    if (!block) {
      res.status(404).json({ error: "Block not found" });
      return;
    }

    // Demo-only: corrupt the stored payload amount without recomputing
    // payloadHash/currentHash, so verification detects the mismatch.
    const [tampered] = await db
      .update(blockchainBlocksTable)
      .set({
        amount: (block.amount ?? 0) + 1,
        entityId: `${block.entityId}*`,
        tampered: true,
      })
      .where(eq(blockchainBlocksTable.id, block.id))
      .returning();

    await recordAudit(req, req.user, "blockchain.tampered", "blockchain_block", String(block.id));
    res.json(TamperBlockchainBlockResponse.parse(tampered));
  },
);

export default router;
