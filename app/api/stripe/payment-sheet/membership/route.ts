import { and, eq, isNull, or } from "drizzle-orm";
import Stripe from "stripe";
import { z } from "zod";

import { getDb } from "@/lib/db/client";
import { prepareDatabase } from "@/lib/db/prepare";
import { membershipPlans, memberships, users } from "@/lib/db/schema";
import { getEnv } from "@/lib/env";
import { requireAuth } from "@/lib/server/auth";
import { ApiError, handleRoute, json } from "@/lib/server/http";
import { ensureStripeCustomer, getStripe } from "@/lib/server/stripe";

const bodySchema = z
  .object({
    planId: z.string().uuid().optional(),
    planCode: z.enum(["one_month", "three_month", "six_month"]).optional(),
  })
  .refine((value) => value.planId || value.planCode, {
    message: "planId or planCode is required",
  });

export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleRoute(async () => {
    await prepareDatabase();
    const member = await requireAuth(request, ["member"]);
    const input = bodySchema.parse(await request.json());
    const env = getEnv();

    if (env.PAYMENT_MODE !== "stripe") {
      throw new ApiError(409, "Stripe PaymentSheet is disabled in mock mode");
    }
    if (!env.STRIPE_PUBLISHABLE_KEY) {
      throw new ApiError(503, "Stripe publishable key is not configured");
    }

    const db = getDb();
    const [plan] = await db
      .select()
      .from(membershipPlans)
      .where(
        and(
          eq(membershipPlans.isActive, true),
          or(
            input.planId ? eq(membershipPlans.id, input.planId) : undefined,
            input.planCode
              ? eq(membershipPlans.code, input.planCode)
              : undefined,
          ),
        ),
      )
      .limit(1);
    if (!plan) throw new ApiError(404, "Membership plan not found");

    const [active] = await db
      .select({ id: memberships.id })
      .from(memberships)
      .where(
        and(
          eq(memberships.userId, member.id),
          eq(memberships.status, "active"),
          isNull(memberships.endedAt),
        ),
      )
      .limit(1);
    if (active) throw new ApiError(409, "Membership is already active");

    const [userRecord] = await db
      .select()
      .from(users)
      .where(eq(users.id, member.id))
      .limit(1);
    if (!userRecord) throw new ApiError(404, "Member not found");

    const customerId = await ensureStripeCustomer(userRecord);
    if (!userRecord.stripeCustomerId) {
      await db
        .update(users)
        .set({ stripeCustomerId: customerId, updatedAt: new Date() })
        .where(eq(users.id, member.id));
    }

    const stripe = getStripe();
    const [intent, ephemeralKey] = await Promise.all([
      stripe.paymentIntents.create({
        amount: plan.priceCents,
        currency: env.STRIPE_CURRENCY,
        customer: customerId,
        setup_future_usage: "off_session",
        automatic_payment_methods: { enabled: true },
        metadata: {
          kind: "membership_purchase",
          memberId: member.id,
          planId: plan.id,
        },
      }),
      stripe.ephemeralKeys.create(
        { customer: customerId },
        { apiVersion: Stripe.API_VERSION },
      ),
    ]);

    return json({
      paymentIntentId: intent.id,
      paymentIntentClientSecret: intent.client_secret,
      customerId,
      customerEphemeralKeySecret: ephemeralKey.secret,
      publishableKey: env.STRIPE_PUBLISHABLE_KEY,
      merchantDisplayName: "Orit Tej",
    });
  });
}
