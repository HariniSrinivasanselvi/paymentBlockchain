import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import type { Request, Response, NextFunction } from "express";
import { db, usersTable, type User } from "@workspace/db";
import { eq } from "drizzle-orm";

const JWT_SECRET = process.env.SESSION_SECRET;
if (!JWT_SECRET) {
  throw new Error("SESSION_SECRET must be set to sign session tokens.");
}

export const SESSION_COOKIE_NAME = "chainroute_session";
export type Role = "ADMIN" | "OPERATOR" | "AUDITOR" | "VENDOR";

interface SessionPayload {
  sub: number;
}

export function signSession(userId: number): string {
  return jwt.sign({ sub: userId } satisfies SessionPayload, JWT_SECRET as string, {
    expiresIn: "7d",
  });
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

/** Reads the session cookie, verifies it, and attaches the user to the
 * request when valid. Always calls next() -- unauthenticated requests are
 * rejected later by requireAuth/requireRole on routes that need it. */
export async function attachUser(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const token = req.cookies?.[SESSION_COOKIE_NAME] as string | undefined;
  if (!token) {
    next();
    return;
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET as string) as unknown as SessionPayload;
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, decoded.sub));
    if (user && user.status === "ACTIVE") {
      req.user = user;
    }
  } catch {
    // Invalid/expired token: treat as unauthenticated.
  }
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  next();
}

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  };
}
