import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import {
  CreateUserBody,
  ListUsersResponse,
  CreateUserResponse,
  UpdateUserParams,
  UpdateUserBody,
  UpdateUserResponse,
} from "@workspace/api-zod";
import { requireAuth, requireRole, hashPassword } from "../lib/auth";
import { recordAudit } from "../lib/audit";

const router: IRouter = Router();

router.get("/users", requireAuth, requireRole("ADMIN"), async (_req, res): Promise<void> => {
  const users = await db.select().from(usersTable).orderBy(usersTable.createdAt);
  res.json(ListUsersResponse.parse(users));
});

router.post("/users", requireAuth, requireRole("ADMIN"), async (req, res): Promise<void> => {
  const parsed = CreateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const [user] = await db
    .insert(usersTable)
    .values({
      name: parsed.data.name,
      email: parsed.data.email.toLowerCase(),
      passwordHash,
      role: parsed.data.role,
      vendorId: parsed.data.vendorId ?? null,
      status: "ACTIVE",
    })
    .returning();

  await recordAudit(req, req.user, "user.created", "user", String(user!.id));
  res.status(201).json(CreateUserResponse.parse(user));
});

router.patch("/users/:id", requireAuth, requireRole("ADMIN"), async (req, res): Promise<void> => {
  const params = UpdateUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [user] = await db
    .update(usersTable)
    .set(parsed.data)
    .where(eq(usersTable.id, params.data.id))
    .returning();

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  await recordAudit(req, req.user, "user.updated", "user", String(user.id));
  res.json(UpdateUserResponse.parse(user));
});

export default router;
