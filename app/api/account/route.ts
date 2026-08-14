import { eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/lib/db/client";
import { prepareDatabase } from "@/lib/db/prepare";
import { userConsents, users } from "@/lib/db/schema";
import { deleteAccountSafely } from "@/lib/server/account-deletion";
import { clearSessionCookie, requireAuth } from "@/lib/server/auth";
import {
  adultBirthDateSchema,
  PRIVACY_POLICY_VERSION,
} from "@/lib/server/compliance";
import { handleRoute, json } from "@/lib/server/http";

const patchSchema = z
  .object({
    email: z
      .string()
      .trim()
      .email()
      .transform((value) => value.toLowerCase())
      .optional(),
    dateOfBirth: adultBirthDateSchema.optional(),
    privacyConsent: z.literal(true).optional(),
    privacyPolicyVersion: z.literal(PRIVACY_POLICY_VERSION).optional(),
  })
  .superRefine((value, context) => {
    if (!value.email && !value.dateOfBirth && !value.privacyConsent) {
      context.addIssue({ code: "custom", message: "Provide an account update." });
    }
    if (value.privacyConsent && !value.privacyPolicyVersion) {
      context.addIssue({
        code: "custom",
        path: ["privacyPolicyVersion"],
        message: "Privacy policy version is required.",
      });
    }
  });

export const runtime = "nodejs";

export async function GET(request: Request) {
  return handleRoute(async () => {
    await prepareDatabase();
    return json({ user: await requireAuth(request) });
  });
}

export async function PATCH(request: Request) {
  return handleRoute(async () => {
    await prepareDatabase();
    const user = await requireAuth(request);
    const input = patchSchema.parse(await request.json());
    const now = new Date();
    const [updated] = await getDb()
      .update(users)
      .set({
        ...(input.email ? { email: input.email } : {}),
        ...(input.dateOfBirth ? { dateOfBirth: input.dateOfBirth } : {}),
        updatedAt: now,
      })
      .where(eq(users.id, user.id))
      .returning();

    if (input.privacyConsent && input.privacyPolicyVersion) {
      await getDb()
        .insert(userConsents)
        .values({
          userId: user.id,
          consentType: "privacy_policy",
          policyVersion: input.privacyPolicyVersion,
          acceptedAt: now,
          metadata: { source: "account_update" },
        })
        .onConflictDoNothing();
    }

    return json({ user: updated });
  });
}

export async function DELETE(request: Request) {
  return handleRoute(async () => {
    await prepareDatabase();
    const user = await requireAuth(request);
    await deleteAccountSafely(user.id);
    return new Response(null, {
      status: 204,
      headers: { "set-cookie": clearSessionCookie(request) },
    });
  });
}
