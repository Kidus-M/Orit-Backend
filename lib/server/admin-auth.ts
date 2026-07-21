import { and, eq, gt, isNull } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import { sessions, users } from "@/lib/db/schema";
import {
  createSession,
  hashSessionToken,
  type AuthenticatedUser,
} from "@/lib/server/auth";
import { ApiError } from "@/lib/server/http";

export const adminCookieName = "orit_admin_session";

function cookieValue(request: Request, name: string) {
  const cookie = request.headers.get("cookie") ?? "";
  for (const part of cookie.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
  return null;
}

export async function createAdminSessionCookie(userId: string) {
  const session = await createSession(userId);
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return {
    token: session.token,
    header: `${adminCookieName}=${encodeURIComponent(session.token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=31536000${secure}`,
  };
}

export function clearAdminSessionCookie() {
  return `${adminCookieName}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`;
}

export async function requireAdminCookie(
  request: Request,
): Promise<AuthenticatedUser> {
  const token = cookieValue(request, adminCookieName);
  if (!token) throw new ApiError(401, "Admin sign-in required");

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
        eq(users.role, "admin"),
        isNull(users.deletedAt),
      ),
    )
    .limit(1);

  if (!result) throw new ApiError(401, "Admin session is invalid or expired");
  return { ...result, role: "admin" };
}

export async function deleteAdminSession(request: Request) {
  const token = cookieValue(request, adminCookieName);
  if (!token) return;
  await getDb()
    .delete(sessions)
    .where(eq(sessions.tokenHash, hashSessionToken(token)));
}
