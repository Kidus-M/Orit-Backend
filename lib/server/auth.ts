import { createHash, randomBytes } from "node:crypto";

import { and, eq, gt, isNull } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import { sessions, users } from "@/lib/db/schema";
import { getEnv } from "@/lib/env";
import { ApiError } from "@/lib/server/http";

export type UserRole = "member" | "store_owner" | "admin";

export type AuthenticatedUser = {
  id: string;
  role: UserRole;
  firstName: string;
  email: string;
  storeName: string | null;
  isVendor: boolean;
};

export function hashSessionToken(token: string) {
  return createHash("sha256")
    .update(`${getEnv().SESSION_TOKEN_PEPPER}:${token}`)
    .digest("hex");
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date();
  expiresAt.setFullYear(expiresAt.getFullYear() + 1);

  await getDb().insert(sessions).values({
    userId,
    tokenHash: hashSessionToken(token),
    expiresAt,
  });

  return { token, expiresAt };
}

export async function requireAuth(
  request: Request,
  allowedRoles?: UserRole[],
): Promise<AuthenticatedUser> {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    throw new ApiError(401, "Missing bearer token");
  }

  const token = header.slice("Bearer ".length).trim();
  const [result] = await getDb()
    .select({
      id: users.id,
      role: users.role,
      firstName: users.firstName,
      email: users.email,
      storeName: users.storeName,
      isVendor: users.isVendor,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(
      and(
        eq(sessions.tokenHash, hashSessionToken(token)),
        gt(sessions.expiresAt, new Date()),
        isNull(users.deletedAt),
      ),
    )
    .limit(1);

  if (!result) throw new ApiError(401, "Invalid or expired session");

  const user = { ...result, role: result.role as UserRole };
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    throw new ApiError(403, "You do not have permission for this action");
  }
  return user;
}

