import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { db, paymentsTable, transfersTable, vendorsTable, blockchainBlocksTable } from "@workspace/db";
import { GetDashboardSummaryResponse } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import { withAllocations } from "../lib/serializers";

const router: IRouter = Router();

router.get("/dashboard/summary", requireAuth, async (_req, res): Promise<void> => {
  const allPayments = await db.select().from(paymentsTable);

  const captured = allPayments.filter((p) => p.status === "CAPTURED");
  const pending = allPayments.filter((p) => p.status === "CREATED" || p.status === "AUTHORIZED");
  const failed = allPayments.filter((p) => p.status === "FAILED");
  const totalVolume = captured.reduce((sum, p) => sum + p.amount, 0);

  const processedTransfers = await db
    .select()
    .from(transfersTable)
    .where(eq(transfersTable.status, "PROCESSED"));
  const vendors = await db.select().from(vendorsTable);
  const vendorNameById = new Map(vendors.map((v) => [v.id, v.businessName]));

  const totalsByVendor = new Map<number, number>();
  for (const t of processedTransfers) {
    if (t.vendorId == null) continue;
    totalsByVendor.set(t.vendorId, (totalsByVendor.get(t.vendorId) ?? 0) + t.amount);
  }
  const vendorTotal = [...totalsByVendor.values()].reduce((a, b) => a + b, 0);
  const vendorDistribution = [...totalsByVendor.entries()]
    .map(([vendorId, amount]) => ({
      vendorName: vendorNameById.get(vendorId) ?? "Unknown vendor",
      amount,
      percentage: vendorTotal > 0 ? Math.round((amount / vendorTotal) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  const recentPaymentsRaw = allPayments
    .slice()
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 5);
  const recentPayments = await withAllocations(recentPaymentsRaw);

  const recentBlockchainEvents = await db
    .select()
    .from(blockchainBlocksTable)
    .orderBy(desc(blockchainBlocksTable.blockIndex))
    .limit(8);

  res.json(
    GetDashboardSummaryResponse.parse({
      totalVolume,
      successfulCount: captured.length,
      pendingCount: pending.length,
      failedCount: failed.length,
      vendorDistribution,
      recentPayments,
      recentBlockchainEvents,
    }),
  );
});

export default router;
