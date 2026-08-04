import { and, eq, isNull } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import {
  complimentaryBenefits,
  locations,
  memberships,
  paymentMethods,
  sessions,
  users,
} from "@/lib/db/schema";
import { ApiError } from "@/lib/server/http";
import { getStripe } from "@/lib/server/stripe";

type StripeBillingProfile = {
  customerId: string | null;
  paymentMethodId: string | null;
};

type StripeBillingCleanup = (
  profile: StripeBillingProfile,
) => Promise<void>;

function isMissingStripeResource(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "resource_missing"
  );
}

export async function removeStripeBillingProfile({
  customerId,
  paymentMethodId,
}: StripeBillingProfile) {
  if (!customerId && !paymentMethodId) return;

  try {
    if (customerId) {
      await getStripe().customers.del(customerId);
      return;
    }

    if (paymentMethodId) {
      await getStripe().paymentMethods.detach(paymentMethodId);
    }
  } catch (error) {
    if (isMissingStripeResource(error)) return;
    throw error;
  }
}

export async function deleteAccountSafely(
  userId: string,
  cleanupStripeBilling: StripeBillingCleanup = removeStripeBillingProfile,
) {
  const db = getDb();
  const [account] = await db
    .select({
      id: users.id,
      stripeCustomerId: users.stripeCustomerId,
    })
    .from(users)
    .where(and(eq(users.id, userId), isNull(users.deletedAt)))
    .limit(1);

  if (!account) throw new ApiError(404, "Account not found");

  const [savedPaymentMethod] = await db
    .select({
      providerCustomerId: paymentMethods.providerCustomerId,
      providerPaymentMethodId: paymentMethods.providerPaymentMethodId,
    })
    .from(paymentMethods)
    .where(eq(paymentMethods.userId, userId))
    .limit(1);

  await cleanupStripeBilling({
    customerId:
      account.stripeCustomerId ??
      savedPaymentMethod?.providerCustomerId ??
      null,
    paymentMethodId:
      savedPaymentMethod?.providerPaymentMethodId ?? null,
  });

  const now = new Date();
  await db.batch([
    db
      .update(memberships)
      .set({
        status: "cancelled",
        autoRenew: false,
        currentPeriodEnd: now,
        endedAt: now,
        updatedAt: now,
      })
      .where(
        and(eq(memberships.userId, userId), isNull(memberships.endedAt)),
      ),
    db
      .update(complimentaryBenefits)
      .set({ status: "expired", updatedAt: now })
      .where(
        and(
          eq(complimentaryBenefits.memberId, userId),
          eq(complimentaryBenefits.status, "available"),
        ),
      ),
    db.delete(paymentMethods).where(eq(paymentMethods.userId, userId)),
    db.delete(sessions).where(eq(sessions.userId, userId)),
    db
      .update(locations)
      .set({ vendorId: null, updatedAt: now })
      .where(eq(locations.vendorId, userId)),
    db
      .update(users)
      .set({
        email: "deleted-" + userId + "@invalid.local",
        stripeCustomerId: null,
        membershipOptOut: true,
        isVendor: false,
        vendorInvitationId: null,
        deletedAt: now,
        updatedAt: now,
      })
      .where(and(eq(users.id, userId), isNull(users.deletedAt))),
  ]);
}
