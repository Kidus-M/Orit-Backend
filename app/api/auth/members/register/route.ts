import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/lib/db/client";
import { prepareDatabase } from "@/lib/db/prepare";
import { userConsents, users } from "@/lib/db/schema";
import { createSession, createSessionCookie } from "@/lib/server/auth";
import {
  adultBirthDateSchema,
  PRIVACY_POLICY_VERSION,
  privacyConsentSchema,
} from "@/lib/server/compliance";
import { ApiError, handleRoute, json } from "@/lib/server/http";
import { hashPassword } from "@/lib/server/passwords";
import { fourDigitPinSchema } from "@/lib/server/pins";

const bodySchema = privacyConsentSchema.extend({
  firstName: z.string().trim().min(1).max(80),
  dateOfBirth: adultBirthDateSchema,
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: fourDigitPinSchema,
});

export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleRoute(async () => {
    await prepareDatabase();
    const input = bodySchema.parse(await request.json());
    const db = getDb();

    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, input.email))
      .limit(1);
    if (existing) throw new ApiError(409, "An account already uses this email");

    const id = randomUUID();
    const passwordHash = await hashPassword(input.password);
    await db.batch([
      db.insert(users).values({
        id,
        firstName: input.firstName,
        dateOfBirth: input.dateOfBirth,
        email: input.email,
        role: "member",
        passwordHash,
      }),
      db.insert(userConsents).values({
        userId: id,
        consentType: "privacy_policy",
        policyVersion: PRIVACY_POLICY_VERSION,
        metadata: { source: "member_signup" },
      }),
    ]);

    const user = {
      id,
      role: "member",
      firstName: input.firstName,
      email: input.email,
      storeName: null,
      isVendor: false,
    };
    const session = await createSession(user.id);

    return json(
      { user, session },
      {
        status: 201,
        headers: {
          "set-cookie": createSessionCookie(request, session.token, session.expiresAt),
        },
      },
    );
  });
}
