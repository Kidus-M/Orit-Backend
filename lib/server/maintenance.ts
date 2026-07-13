import { and, eq, isNull, lte } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import {
  complimentaryBenefits,
  membershipPlans,
  memberships,
  paymentMethods,
  payments,
} from "@/lib/db/schema";
import { addMonthsClamped } from "@/lib/server/dates";
import { sendMessage } from "@/lib/server/messages";
import { chargeSavedPaymentMethod } from "@/lib/server/payments";

export type MaintenanceSummary = {
  expiredBenefits: number;
  renewedMemberships: number;
  failedMemberships: number;
};

export async function runMaintenance(now = new Date()): Promise<MaintenanceSummary> {
  const db = getDb();

  const expiredBenefits = await db
    .update(complimentaryBenefits)
    .set({ status: "expired", updatedAt: now })
    .where(
      and(
        eq(complimentaryBenefits.status, "available"),
        lte(complimentaryBenefits.expiresAt, now),
      ),
    )
    .returning({ id: complimentaryBenefits.id });

  const dueMemberships = await db
    .select({
      membership: memberships,
      plan: membershipPlans,
      paymentMethodId: paymentMethods.id,
    })
    .from(memberships)
    .innerJoin(membershipPlans, eq(memberships.planId, membershipPlans.id))
    .leftJoin(paymentMethods, eq(memberships.userId, paymentMethods.userId))
    .where(
      and(
        isNull(memberships.endedAt),
        eq(memberships.autoRenew, true),
        lte(memberships.currentPeriodEnd, now),
      ),
    );

  let renewedMemberships = 0;
  let failedMemberships = 0;

  for (const row of dueMemberships) {
    const { membership, plan, paymentMethodId } = row;

    if (!paymentMethodId) {
      await expireMembership(
        membership.id,
        membership.userId,
        plan.priceCents,
        "No saved payment method",
        now,
      );
      failedMemberships += 1;
      continue;
    }

    try {
      const charge = await chargeSavedPaymentMethod({
        amountCents: plan.priceCents,
        memberId: membership.userId,
        kind: "membership",
      });
      const nextPeriodStart = membership.currentPeriodEnd;
      const nextPeriodEnd = addMonthsClamped(
        nextPeriodStart,
        plan.durationMonths,
      );

      await db
        .update(memberships)
        .set({
          status: "active",
          currentPeriodStart: nextPeriodStart,
          currentPeriodEnd: nextPeriodEnd,
          updatedAt: now,
        })
        .where(
          and(
            eq(memberships.id, membership.id),
            eq(memberships.currentPeriodEnd, membership.currentPeriodEnd),
            isNull(memberships.endedAt),
          ),
        );

      await db.insert(payments).values({
        memberId: membership.userId,
        membershipId: membership.id,
        kind: "membership_renewal",
        amountCents: plan.priceCents,
        status: charge.status,
        providerReference: charge.providerReference,
      });

      await sendMessage({
        recipientUserId: membership.userId,
        type: "membership_renewed",
        title: "Membership renewed",
        body: `Your ${plan.name} membership renewed automatically.`,
        metadata: {
          membershipId: membership.id,
          currentPeriodEnd: nextPeriodEnd.toISOString(),
        },
      });
      renewedMemberships += 1;
    } catch (error) {
      const reason =
        error instanceof Error ? error.message : "Payment could not be processed";
      await expireMembership(
        membership.id,
        membership.userId,
        plan.priceCents,
        reason,
        now,
      );
      failedMemberships += 1;
    }
  }

  return {
    expiredBenefits: expiredBenefits.length,
    renewedMemberships,
    failedMemberships,
  };
}

async function expireMembership(
  membershipId: string,
  memberId: string,
  amountCents: number,
  reason: string,
  now: Date,
) {
  const db = getDb();

  await db
    .update(memberships)
    .set({
      status: "expired",
      endedAt: now,
      updatedAt: now,
    })
    .where(and(eq(memberships.id, membershipId), isNull(memberships.endedAt)));

  await db.insert(payments).values({
    memberId,
    membershipId,
    kind: "membership_renewal",
    amountCents,
    status: "failed",
  });

  await sendMessage({
    recipientUserId: memberId,
    type: "membership_renewal_failed",
    title: "Membership renewal needs attention",
    body:
      "We could not renew your membership. Update your saved payment method and select a membership plan again.",
    metadata: { membershipId, reason },
  });
}
