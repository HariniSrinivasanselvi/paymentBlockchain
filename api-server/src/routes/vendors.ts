import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, vendorsTable } from "@workspace/db";
import {
  CreateVendorBody,
  ListVendorsResponse,
  CreateVendorResponse,
  GetVendorParams,
  GetVendorResponse,
  UpdateVendorParams,
  UpdateVendorBody,
  UpdateVendorResponse,
  DeleteVendorParams,
} from "@workspace/api-zod";
import { requireAuth, requireRole } from "../lib/auth";
import { recordAudit } from "../lib/audit";

const router: IRouter = Router();

function generateVendorCode(): string {
  return `VEN-${Math.floor(1000 + Math.random() * 9000)}`;
}

router.get(
  "/vendors",
  requireAuth,
  requireRole("ADMIN", "OPERATOR", "AUDITOR"),
  async (_req, res): Promise<void> => {
    const vendors = await db.select().from(vendorsTable).orderBy(vendorsTable.createdAt);
    res.json(ListVendorsResponse.parse(vendors));
  },
);

router.post(
  "/vendors",
  requireAuth,
  requireRole("ADMIN", "OPERATOR"),
  async (req, res): Promise<void> => {
    const parsed = CreateVendorBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const [vendor] = await db
      .insert(vendorsTable)
      .values({
        vendorCode: generateVendorCode(),
        businessName: parsed.data.businessName,
        email: parsed.data.email,
        phone: parsed.data.phone,
        razorpayAccountId: parsed.data.razorpayAccountId ?? null,
        status: "PENDING",
      })
      .returning();

    await recordAudit(req, req.user, "vendor.created", "vendor", String(vendor!.id));
    res.status(201).json(CreateVendorResponse.parse(vendor));
  },
);

router.get("/vendors/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetVendorParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (req.user!.role === "VENDOR" && req.user!.vendorId !== params.data.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const [vendor] = await db.select().from(vendorsTable).where(eq(vendorsTable.id, params.data.id));
  if (!vendor) {
    res.status(404).json({ error: "Vendor not found" });
    return;
  }
  res.json(GetVendorResponse.parse(vendor));
});

router.patch(
  "/vendors/:id",
  requireAuth,
  requireRole("ADMIN", "OPERATOR"),
  async (req, res): Promise<void> => {
    const params = UpdateVendorParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const parsed = UpdateVendorBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const [vendor] = await db
      .update(vendorsTable)
      .set(parsed.data)
      .where(eq(vendorsTable.id, params.data.id))
      .returning();

    if (!vendor) {
      res.status(404).json({ error: "Vendor not found" });
      return;
    }

    await recordAudit(req, req.user, "vendor.updated", "vendor", String(vendor.id));
    res.json(UpdateVendorResponse.parse(vendor));
  },
);

router.delete(
  "/vendors/:id",
  requireAuth,
  requireRole("ADMIN"),
  async (req, res): Promise<void> => {
    const params = DeleteVendorParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const [vendor] = await db
      .update(vendorsTable)
      .set({ status: "INACTIVE" })
      .where(eq(vendorsTable.id, params.data.id))
      .returning();

    if (!vendor) {
      res.status(404).json({ error: "Vendor not found" });
      return;
    }

    await recordAudit(req, req.user, "vendor.deactivated", "vendor", String(vendor.id));
    res.status(204).end();
  },
);

export default router;
