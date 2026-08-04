import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import { config } from "dotenv";
import { eq, inArray } from "drizzle-orm";

config({ path: ".env.local" });
config();

import { getDb } from "@/lib/db/client";
import {
  complimentaryBenefits,
  membershipPlans,
  memberships,
  paymentMethods,
  sessions,
  users,
} from "@/lib/db/schema";
import { deleteAccountSafely } from "@/lib/server/account-deletion";
import { ApiError } from "@/lib/server/http";
import { getRenewalCandidates } from "@/lib/server/maintenance";
import { chargeSavedPaymentMethod } from "@/lib/server/payments";

async function run() {
  const db = getDb();
  const [plan] = await db
    .select({ id: membershipPlans.id })
    .from(membershipPlans)
    .limit(1);
  assert(plan, "Seed membership plans before running this check.");

  const userIds: string[] = [];
  const now = new Date();
  const dueAt = new Date(now.getTime() - 60_000);
  const startedAt = new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000);

  try {
    const suffix = randomUUID();
    const stripeCustomerId = "cus_deletion_check_" + suffix;
    const stripePaymentMethodId = "pm_deletion_check_" + suffix;
    const [account] = await db
      .insert(users)
      .values({
        role: "member",
        firstName: "Deletion Check",
        email: "deletion-check-" + suffix + "@example.invalid",
        stripeCustomerId,
      })
      .returning({ id: users.id });
    userIds.push(account.id);

    await db.insert(paymentMethods).values({
      userId: account.id,
      providerCustomerId: stripeCustomerId,
      providerPaymentMethodId: stripePaymentMethodId,
      brand: "visa",
      last4: "4242",
      expiryMonth: 12,
      expiryYear: 2030,
      billingZip: "95112",
    });
    const [membership] = await db
      .insert(memberships)
      .values({
        userId: account.id,
        planId: plan.id,
        status: "active",
        autoRenew: true,
        startedAt,
        currentPeriodStart: startedAt,
        currentPeriodEnd: dueAt,
      })
      .returning({ id: memberships.id });
    await db.insert(complimentaryBenefits).values({
      membershipId: membership.id,
      memberId: account.id,
      periodStart: startedAt,
      eligibleAt: startedAt,
      expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      code: "deletion-check-" + suffix,
      status: "available",
    });
    await db.insert(sessions).values({
      userId: account.id,
      tokenHash: "deletion-check-" + suffix,
      expiresAt: new Date(now.getTime() + 60_000),
    });

    let cleanupProfile:
      | { customerId: string | null; paymentMethodId: string | null }
      | undefined;
    await deleteAccountSafely(account.id, async (profile) => {
      cleanupProfile = profile;
    });

    assert.deepEqual(cleanupProfile, {
      customerId: stripeCustomerId,
      paymentMethodId: stripePaymentMethodId,
    });

    const [deletedAccount] = await db
      .select({
        email: users.email,
        deletedAt: users.deletedAt,
        stripeCustomerId: users.stripeCustomerId,
      })
      .from(users)
      .where(eq(users.id, account.id))
      .limit(1);
    assert(deletedAccount?.deletedAt);
    assert.equal(deletedAccount.stripeCustomerId, null);
    assert.equal(
      deletedAccount.email,
      "deleted-" + account.id + "@invalid.local",
    );

    const savedMethods = await db
      .select({ id: paymentMethods.id })
      .from(paymentMethods)
      .where(eq(paymentMethods.userId, account.id));
    assert.equal(savedMethods.length, 0);

    const [cancelledMembership] = await db
      .select({
        status: memberships.status,
        autoRenew: memberships.autoRenew,
        endedAt: memberships.endedAt,
      })
      .from(memberships)
      .where(eq(memberships.id, membership.id))
      .limit(1);
    assert.equal(cancelledMembership?.status, "cancelled");
    assert.equal(cancelledMembership?.autoRenew, false);
    assert(cancelledMembership?.endedAt);

    const remainingSessions = await db
      .select({ id: sessions.id })
      .from(sessions)
      .where(eq(sessions.userId, account.id));
    assert.equal(remainingSessions.length, 0);

    await assert.rejects(
      chargeSavedPaymentMethod({
        amountCents: 100,
        memberId: account.id,
        kind: "membership",
      }),
      (error: unknown) =>
        error instanceof ApiError &&
        error.status === 409 &&
        error.message === "This account cannot be charged",
    );

    const legacySuffix = randomUUID();
    const [legacyDeletedAccount] = await db
      .insert(users)
      .values({
        role: "member",
        firstName: "Legacy Deleted Check",
        email: "legacy-deleted-" + legacySuffix + "@example.invalid",
        deletedAt: now,
      })
      .returning({ id: users.id });
    userIds.push(legacyDeletedAccount.id);

    await db.insert(paymentMethods).values({
      userId: legacyDeletedAccount.id,
      providerCustomerId: "cus_legacy_" + legacySuffix,
      providerPaymentMethodId: "pm_legacy_" + legacySuffix,
      brand: "visa",
      last4: "4242",
      expiryMonth: 12,
      expiryYear: 2030,
      billingZip: "95112",
    });
    await db.insert(memberships).values({
      userId: legacyDeletedAccount.id,
      planId: plan.id,
      status: "active",
      autoRenew: true,
      startedAt,
      currentPeriodStart: startedAt,
      currentPeriodEnd: dueAt,
    });

    const candidates = await getRenewalCandidates(now);
    assert.equal(
      candidates.some(
        ({ membership: candidate }) =>
          candidate.userId === legacyDeletedAccount.id,
      ),
      false,
    );

    console.log("Account deletion billing safety check passed.");
  } finally {
    if (userIds.length > 0) {
      await db.delete(users).where(inArray(users.id, userIds));
    }
  }
}

run().catch((error) => {
  console.error("Account deletion billing safety check failed:", error);
  process.exitCode = 1;
});
