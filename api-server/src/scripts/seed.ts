/* eslint-disable no-console */
// One-off demo data seed. Run with: pnpm --filter @workspace/api-server run seed
import { eq } from "drizzle-orm";
import { db, usersTable, vendorsTable, pool, type Vendor } from "@workspace/db";
import { hashPassword } from "../lib/auth";
import { createPaymentWithAllocations, captureAndFanOut } from "../lib/ledger";

async function main() {
  console.log("Seeding ChainRoute demo data...");

  const demoUsers = [
    { name: "Ava Admin", email: "admin@chainroute.dev", password: "admin123", role: "ADMIN" as const },
    { name: "Oscar Operator", email: "operator@chainroute.dev", password: "operator123", role: "OPERATOR" as const },
    { name: "Aria Auditor", email: "auditor@chainroute.dev", password: "auditor123", role: "AUDITOR" as const },
  ];

  for (const u of demoUsers) {
    const passwordHash = await hashPassword(u.password);
    await db
      .insert(usersTable)
      .values({ name: u.name, email: u.email, passwordHash, role: u.role, status: "ACTIVE" })
      .onConflictDoNothing({ target: usersTable.email });
  }

  const demoVendors = [
    { businessName: "Northwind Textiles", email: "billing@northwindtextiles.dev", phone: "+91-9820011223" },
    { businessName: "Bluepeak Logistics", email: "accounts@bluepeaklogistics.dev", phone: "+91-9820011224" },
    { businessName: "Solace Foods Co.", email: "finance@solacefoods.dev", phone: "+91-9820011225" },
  ];

  const insertedVendors: Vendor[] = [];
  for (const v of demoVendors) {
    const [existing] = await db.select().from(vendorsTable).where(eq(vendorsTable.email, v.email));
    if (existing) {
      insertedVendors.push(existing);
      continue;
    }
    const [vendor] = await db
      .insert(vendorsTable)
      .values({
        vendorCode: `VEN-${1000 + insertedVendors.length}`,
        businessName: v.businessName,
        email: v.email,
        phone: v.phone,
        status: "ACTIVE",
      })
      .returning();
    if (vendor) insertedVendors.push(vendor);
  }

  const vendorUserEmail = "vendor@chainroute.dev";
  const [existingVendorUser] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, vendorUserEmail));
  if (!existingVendorUser && insertedVendors[0]) {
    const passwordHash = await hashPassword("vendor123");
    await db.insert(usersTable).values({
      name: "Vikram Vendor",
      email: vendorUserEmail,
      passwordHash,
      role: "VENDOR",
      status: "ACTIVE",
      vendorId: insertedVendors[0].id,
    });
  }

  if (insertedVendors.length >= 2) {
    const samplePayments = [
      {
        customerReference: "ORD-58291",
        amount: 250000,
        currency: "INR",
        description: "Bulk fabric order",
        allocations: [
          { vendorId: insertedVendors[0]!.id, label: "Vendor payout - Northwind Textiles", amount: 220000 },
          { vendorId: null, label: "Platform fee", amount: 30000 },
        ],
        capture: true,
      },
      {
        customerReference: "ORD-58312",
        amount: 180000,
        currency: "INR",
        description: "Logistics & delivery",
        allocations: [
          { vendorId: insertedVendors[1]!.id, label: "Vendor payout - Bluepeak Logistics", amount: 165000 },
          { vendorId: null, label: "Platform fee", amount: 15000 },
        ],
        capture: true,
      },
      {
        customerReference: "ORD-58340",
        amount: 95000,
        currency: "INR",
        description: "Grocery restock",
        allocations: [
          { vendorId: insertedVendors[2]?.id ?? insertedVendors[0]!.id, label: "Vendor payout", amount: 88000 },
          { vendorId: null, label: "Platform fee", amount: 7000 },
        ],
        capture: false,
      },
    ];

    for (const p of samplePayments) {
      const result = await createPaymentWithAllocations(p);
      if (result.ok && p.capture) {
        await captureAndFanOut(result.payment.id, {});
      }
    }
  }

  console.log("Seed complete.");
  console.log("Demo logins:");
  console.log("  admin@chainroute.dev / admin123");
  console.log("  operator@chainroute.dev / operator123");
  console.log("  auditor@chainroute.dev / auditor123");
  console.log("  vendor@chainroute.dev / vendor123");
}

main()
  .then(() => pool.end())
  .catch(async (err) => {
    console.error(err);
    await pool.end();
    process.exit(1);
  });
