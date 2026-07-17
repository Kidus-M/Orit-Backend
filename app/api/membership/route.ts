import { and, eq, gt, isNull } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/lib/db/client";
import { prepareDatabase } from "@/lib/db/prepare";
import {
  complimentaryBenefits,
  membershipPlans,
  memberships,
  paymentMethods,
  payments,
  users,
} from "@/lib/db/schema";
import { requireAuth } from "@/lib/server/auth";
import { addMonthsClamped } from "@/lib/server/dates";
import { ApiError, handleRoute, json } from "@/lib/server/http";
import { chargeSavedPaymentMethod } from "@/lib/server/payments";

const bodySchema = z.object({
  planCode: z.enum([
    "one_month",
    "three_month",
    "six_month",
    "non_member",
  ]),
});

const membershipFields = {
  id: memberships.id,
  planId: memberships.planId,
  planCode: membershipPlans.code,
  planName: membershipPlans.name,
  durationMonths: membershipPlans.durationMonths,
  autoRenew: memberships.autoRenew,
  currentPeriodEnd: memberships.currentPeriodEnd,
};

export const runtime = "nodejs";

export async function GET(request: Request) {
  return handleRoute(async () => {
    await prepareDatabase();
    const member = await requireAuth(request, ["member"]);
    const now = new Date();
    const db = getDb();

    const [account] = await db
      .select({ membershipOptOut: users.membershipOptOut })
      .from(users)
      .where(eq(users.id, member.id))
      .limit(1);
    const [membership] = await db
      .select(membershipFields)
      .from(memberships)
      .innerJoin(membershipPlans, eq(membershipPlans.id, memberships.planId))
      .where(
        and(
          eq(memberships.userId, member.id),
          eq(memberships.status, "active"),
          isNull(memberships.endedAt),
          gt(memberships.currentPeriodEnd, now),
        ),
      )
      .limit(1);

    return json({
      isMember: Boolean(membership),
      isNonMember: Boolean(account?.membershipOptOut),
      membership: membership ?? null,
    });
  });
}

export async function PATCH(request: Request) {
  return handleRoute(async () => {
    await prepareDatabase();
    const member = await requireAuth(request, ["member"]);
    const input = bodySchema.parse(await request.json());
    const db = getDb();
    const now = new Date();

    const [existing] = await db
      .select()
      .from(memberships)
      .where(
        and(eq(memberships.userId, member.id), isNull(memberships.endedAt)),
      )
      .limit(1);

    if (input.planCode === "non_member") {
      if (existing) {
        await db
          .update(memberships)
          .set({
            status: "cancelled",
            autoRenew: false,
            currentPeriodEnd: now,
            endedAt: now,
            updatedAt: now,
          })
          .where(eq(memberships.id, existing.id));
        await db
          .update(complimentaryBenefits)
          .set({ status: "expired", updatedAt: now })
          .where(
            and(
              eq(complimentaryBenefits.membershipId, existing.id),
              eq(complimentaryBenefits.status, "available"),
            ),
          );
      }
      await db
        .update(users)
        .set({ membershipOptOut: true, updatedAt: now })
        .where(eq(users.id, member.id));
      return json({ isMember: false, isNonMember: true, membership: null });
    }

    const [plan] = await db
      .select()
      .from(membershipPlans)
      .where(
        and(
          eq(membershipPlans.code, input.planCode),
          eq(membershipPlans.isActive, true),
        ),
      )
      .limit(1);
    if (!plan) throw new ApiError(404, "Membership plan not found");

    if (
      existing &&
      existing.planId === plan.id &&
      existing.status === "active" &&
      existing.currentPeriodEnd > now
    ) {
      await db
        .update(users)
        .set({ membershipOptOut: false, updatedAt: now })
        .where(eq(users.id, member.id));
      return json({
        isMember: true,
        isNonMember: false,
        membership: {
          ...existing,
          planCode: plan.code,
          planName: plan.name,
          durationMonths: plan.durationMonths,
        },
      });
    }

    const [savedMethod] = await db
      .select({ id: paymentMethods.id })
      .from(paymentMethods)
      .where(eq(paymentMethods.userId, member.id))
      .limit(1);
    if (!savedMethod) {
      throw new ApiError(
        409,
        "Add a payment method before changing your membership",
      );
    }

    const charge = await chargeSavedPaymentMethod({
      amountCents: plan.priceCents,
      memberId: member.id,
      kind: "membership",
    });
    const currentPeriodEnd = addMonthsClamped(now, plan.durationMonths);

    const [membership] = existing
      ? await db
          .update(memberships)
          .set({
            planId: plan.id,
            status: "active",
            autoRenew: true,
            startedAt: now,
            currentPeriodStart: now,
            currentPeriodEnd,
            endedAt: null,
            updatedAt: now,
          })
          .where(eq(memberships.id, existing.id))
          .returning()
      : await db
          .insert(memberships)
          .values({
            userId: member.id,
            planId: plan.id,
            status: "active",
            autoRenew: true,
            startedAt: now,
            currentPeriodStart: now,
            currentPeriodEnd,
          })
          .returning();

    await db
      .update(complimentaryBenefits)
      .set({ status: "expired", updatedAt: now })
      .where(
        and(
          eq(complimentaryBenefits.membershipId, membership.id),
          eq(complimentaryBenefits.status, "available"),
        ),
      );
    await db.insert(payments).values({
      memberId: member.id,
      membershipId: membership.id,
      kind: "membership",
      amountCents: plan.priceCents,
      status: charge.status,
      providerReference: charge.providerReference,
    });
    await db
      .update(users)
      .set({ membershipOptOut: false, updatedAt: now })
      .where(eq(users.id, member.id));

    return json({
      isMember: true,
      isNonMember: false,
      membership: {
        ...membership,
        planCode: plan.code,
        planName: plan.name,
        durationMonths: plan.durationMonths,
      },
    });
  });
}
