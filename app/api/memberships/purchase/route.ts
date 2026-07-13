import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/lib/db/client";
import { prepareDatabase } from "@/lib/db/prepare";
import {
  membershipPlans,
  memberships,
  paymentMethods,
  payments,
} from "@/lib/db/schema";
import { requireAuth } from "@/lib/server/auth";
import { addMonthsClamped } from "@/lib/server/dates";
import { ApiError, handleRoute, json } from "@/lib/server/http";
import { chargeSavedPaymentMethod } from "@/lib/server/payments";

const paymentMethodSchema = z.object({
  providerCustomerId: z.string().max(200).optional(),
  providerPaymentMethodId: z.string().max(200).optional(),
  brand: z.string().trim().min(1).max(30),
  last4: z.string().regex(/^\d{4}$/),
  expiryMonth: z.number().int().min(1).max(12),
  expiryYear: z.number().int().min(new Date().getUTCFullYear()),
  billingZip: z.string().regex(/^\d{5}$/),
});

const bodySchema = z.object({
  planId: z.string().uuid(),
  paymentMethod: paymentMethodSchema,
});

export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleRoute(async () => {
    await prepareDatabase();
    const user = await requireAuth(request, ["member"]);
    const input = bodySchema.parse(await request.json());
    const db = getDb();

    const [plan] = await db
      .select()
      .from(membershipPlans)
      .where(
        and(
          eq(membershipPlans.id, input.planId),
          eq(membershipPlans.isActive, true),
        ),
      )
      .limit(1);
    if (!plan) throw new ApiError(404, "Membership plan not found");

    await db
      .insert(paymentMethods)
      .values({ userId: user.id, ...input.paymentMethod })
      .onConflictDoUpdate({
        target: paymentMethods.userId,
        set: { ...input.paymentMethod, updatedAt: new Date() },
      });

    const now = new Date();
    const currentPeriodEnd = addMonthsClamped(now, plan.durationMonths);
    const [existing] = await db
      .select()
      .from(memberships)
      .where(
        and(eq(memberships.userId, user.id), isNull(memberships.endedAt)),
      )
      .limit(1);

    if (
      existing &&
      existing.status === "active" &&
      existing.currentPeriodEnd > now
    ) {
      throw new ApiError(409, "Membership is already active");
    }

    const charge = await chargeSavedPaymentMethod({
      amountCents: plan.priceCents,
      memberId: user.id,
      kind: "membership",
    });

    const [membership] = existing
      ? await db
          .update(memberships)
          .set({
            planId: plan.id,
            status: "active",
            autoRenew: true,
            currentPeriodStart: now,
            currentPeriodEnd,
            updatedAt: now,
          })
          .where(eq(memberships.id, existing.id))
          .returning()
      : await db
          .insert(memberships)
          .values({
            userId: user.id,
            planId: plan.id,
            startedAt: now,
            currentPeriodStart: now,
            currentPeriodEnd,
            autoRenew: true,
          })
          .returning();

    await db.insert(payments).values({
      memberId: user.id,
      membershipId: membership.id,
      kind: "membership",
      amountCents: plan.priceCents,
      status: charge.status,
      providerReference: charge.providerReference,
    });

    return json(
      {
        membership,
        autoRenew: true,
        paymentMode: charge.status === "succeeded_demo" ? "mock" : "provider",
      },
      { status: 201 },
    );
  });
}


