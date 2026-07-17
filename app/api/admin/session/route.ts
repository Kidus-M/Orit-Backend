import { eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/lib/db/client";
import { prepareDatabase } from "@/lib/db/prepare";
import { users } from "@/lib/db/schema";
import {
  clearAdminSessionCookie,
  createAdminSessionCookie,
  deleteAdminSession,
  requireAdminCookie,
} from "@/lib/server/admin-auth";
import { ApiError, handleRoute, json } from "@/lib/server/http";
import {
  assertLoginAllowed,
  recordLoginAttempt,
} from "@/lib/server/login-security";
import { verifyPassword } from "@/lib/server/passwords";
import { fourDigitPinSchema } from "@/lib/server/pins";

const bodySchema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  pin: fourDigitPinSchema,
});

export const runtime = "nodejs";

export async function GET(request: Request) {
  return handleRoute(async () => {
    await prepareDatabase();
    const admin = await requireAdminCookie(request);
    return json({ admin });
  });
}

export async function POST(request: Request) {
  return handleRoute(async () => {
    await prepareDatabase();
    const input = bodySchema.parse(await request.json());
    const attemptIdentity = await assertLoginAllowed(request, input.email);
    const [account] = await getDb()
      .select()
      .from(users)
      .where(eq(users.email, input.email))
      .limit(1);

    const valid = Boolean(
      account?.role === "admin" &&
        account.passwordHash &&
        !account.deletedAt &&
        (await verifyPassword(input.pin, account.passwordHash)),
    );
    await recordLoginAttempt(attemptIdentity, valid);
    if (!valid || !account) {
      throw new ApiError(401, "Admin email or PIN is incorrect");
    }

    const cookie = await createAdminSessionCookie(account.id);
    return json(
      {
        admin: {
          id: account.id,
          firstName: account.firstName,
          email: account.email,
          role: account.role,
        },
      },
      { headers: { "set-cookie": cookie.header } },
    );
  });
}

export async function DELETE(request: Request) {
  return handleRoute(async () => {
    await deleteAdminSession(request);
    return json(
      { signedOut: true },
      { headers: { "set-cookie": clearAdminSessionCookie() } },
    );
  });
}
