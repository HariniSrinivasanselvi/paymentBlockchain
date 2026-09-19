import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { LoginBody, GetCurrentUserResponse } from "@workspace/api-zod";
import {
  SESSION_COOKIE_NAME,
  comparePassword,
  requireAuth,
  signSession,
} from "../lib/auth";
import { recordAudit } from "../lib/audit";

const router: IRouter = Router();

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/api",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(401).end();
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, parsed.data.email.toLowerCase()));

  if (!user || user.status !== "ACTIVE") {
    res.status(401).end();
    return;
  }

  const valid = await comparePassword(parsed.data.password, user.passwordHash);
  if (!valid) {
    res.status(401).end();
    return;
  }

  const token = signSession(user.id);
  res.cookie(SESSION_COOKIE_NAME, token, COOKIE_OPTIONS);
  await recordAudit(req, user, "user.login", "user", String(user.id));

  res.json(GetCurrentUserResponse.parse(user));
});

router.post("/auth/logout", requireAuth, async (req, res): Promise<void> => {
  res.clearCookie(SESSION_COOKIE_NAME, { path: "/api" });
  await recordAudit(req, req.user, "user.logout", "user", String(req.user!.id));
  res.status(204).end();
});

router.get("/auth/me", requireAuth, (req, res): void => {
  res.json(GetCurrentUserResponse.parse(req.user));
});

export default router;
