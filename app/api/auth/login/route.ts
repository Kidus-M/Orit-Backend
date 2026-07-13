import { eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/lib/db/client";
import { prepareDatabase } from "@/lib/db/prepare";
import { users } from "@/lib/db/schema";
import { createSession } from "@/lib/server/auth";
import { ApiError, handleRoute, json } from "@/lib/server/http";
import {
  assertLoginAllowed,
  recordLoginAttempt,
} from "@/lib/server/login-security";
import { verifyPassword } from "@/lib/server/passwords";
import { fourDigitPinSchema } from "@/lib/server/pins";

const bodySchema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: fourDigitPinSchema,
});

export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleRoute(async () => {
    await prepareDatabase();
    const input = bodySchema.parse(await request.json());
    const attemptIdentity = await assertLoginAllowed(request, input.email);
    const [user] = await getDb()
      .select()
      .from(users)
      .where(eq(users.email, input.email))
      .limit(1);

    const valid = Boolean(
      user?.passwordHash &&
        !user.deletedAt &&
        (await verifyPassword(input.password, user.passwordHash)),
    );
    await recordLoginAttempt(attemptIdentity, valid);

    if (!valid || !user) {
      throw new ApiError(401, "Email or PIN is incorrect");
    }

    const session = await createSession(user.id);
    return json({
      user: {
        id: user.id,
        role: user.role,
        firstName: user.firstName,
        email: user.email,
        storeName: user.storeName,
      },
      session,
    });
  });
}
