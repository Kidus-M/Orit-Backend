import { createHash } from "node:crypto";

import { and, eq, lt } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import {
  complimentaryBenefits,
  memberships,
} from "@/lib/db/schema";
import {
  addMonthsClamped,
  endOfUtcMonth,
  sameUtcMonth,
} from "@/lib/server/dates";

export async function getComplimentaryBottleBenefit(
  memberId: string,
  now = new Date(),
) {
  const db = getDb();
  await db
    .update(complimentaryBenefits)
    .set({ status: "expired", updatedAt: now })
    .where(
      and(
        eq(complimentaryBenefits.status, "available"),
        lt(complimentaryBenefits.expiresAt, now),
      ),
    );

  const [membership] = await db
    .select()
    .from(memberships)
    .where(
      and(
        eq(memberships.userId, memberId),
        eq(memberships.status, "active"),
      ),
    )
    .limit(1);

  if (!membership) {
    return {
      status: "no_membership" as const,
      active: false,
      nextEligibleAt: null,
      benefit: null,
    };
  }

  let activation = addMonthsClamped(membership.startedAt, 2);
  let latest: Date | null = null;
  while (activation <= now) {
    latest = activation;
    activation = addMonthsClamped(activation, 2);
  }

  if (!latest || !sameUtcMonth(latest, now)) {
    return {
      status: "inactive" as const,
      active: false,
      nextEligibleAt: activation,
      benefit: null,
    };
  }

  const code = `ORIT-${createHash("sha256")
    .update(`${membership.id}:${latest.toISOString()}`)
    .digest("hex")
    .slice(0, 24)
    .toUpperCase()}`;

  await db
    .insert(complimentaryBenefits)
    .values({
      membershipId: membership.id,
      memberId,
      periodStart: latest,
      eligibleAt: latest,
      expiresAt: endOfUtcMonth(latest),
      code,
    })
    .onConflictDoNothing();

  const [benefit] = await db
    .select()
    .from(complimentaryBenefits)
    .where(eq(complimentaryBenefits.code, code))
    .limit(1);

  return {
    status: benefit.status,
    active: benefit.status === "available" && benefit.expiresAt >= now,
    nextEligibleAt: activation,
    benefit,
  };
}

