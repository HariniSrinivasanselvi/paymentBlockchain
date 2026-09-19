import { inArray, eq } from "drizzle-orm";
import {
  db,
  paymentAllocationsTable,
  transfersTable,
  vendorsTable,
  type Payment,
  type Transfer,
} from "@workspace/db";

export interface PaymentDTO extends Payment {
  allocations: {
    id: number;
    paymentId: number;
    vendorId: number | null;
    vendorName: string | null;
    label: string;
    amount: number;
  }[];
}

/** Attaches allocations (with the vendor's display name) to each payment. */
export async function withAllocations(payments: Payment[]): Promise<PaymentDTO[]> {
  if (payments.length === 0) return [];
  const paymentIds = payments.map((p) => p.id);

  const rows = await db
    .select({
      allocation: paymentAllocationsTable,
      vendorName: vendorsTable.businessName,
    })
    .from(paymentAllocationsTable)
    .leftJoin(vendorsTable, eq(paymentAllocationsTable.vendorId, vendorsTable.id))
    .where(inArray(paymentAllocationsTable.paymentId, paymentIds));

  const byPayment = new Map<number, PaymentDTO["allocations"]>();
  for (const row of rows) {
    const list = byPayment.get(row.allocation.paymentId) ?? [];
    list.push({
      id: row.allocation.id,
      paymentId: row.allocation.paymentId,
      vendorId: row.allocation.vendorId,
      vendorName: row.vendorName ?? null,
      label: row.allocation.label,
      amount: row.allocation.amount,
    });
    byPayment.set(row.allocation.paymentId, list);
  }

  return payments.map((payment) => ({
    ...payment,
    allocations: byPayment.get(payment.id) ?? [],
  }));
}

export interface TransferDTO extends Transfer {
  vendorName: string | null;
}

/** Attaches the vendor's display name to each transfer. */
export async function withVendorName(transfers: Transfer[]): Promise<TransferDTO[]> {
  if (transfers.length === 0) return [];
  const vendorIds = [
    ...new Set(transfers.map((t) => t.vendorId).filter((id): id is number => id != null)),
  ];

  const vendors =
    vendorIds.length > 0
      ? await db
          .select({ id: vendorsTable.id, businessName: vendorsTable.businessName })
          .from(vendorsTable)
          .where(inArray(vendorsTable.id, vendorIds))
      : [];
  const nameById = new Map(vendors.map((v) => [v.id, v.businessName]));

  return transfers.map((transfer) => ({
    ...transfer,
    vendorName: transfer.vendorId != null ? (nameById.get(transfer.vendorId) ?? null) : null,
  }));
}

export async function getTransfersForPayment(paymentId: number): Promise<Transfer[]> {
  return db.select().from(transfersTable).where(eq(transfersTable.paymentId, paymentId));
}
