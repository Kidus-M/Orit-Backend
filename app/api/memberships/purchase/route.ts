import { and, eq, isNull, or } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/lib/db/client";
import { prepareDatabase } from "@/lib/db/prepare";
import {
  membershipPlans,
  memberships,
  paymentMethods,
  payments,
} from "@/lib/db/schema";
import { getEnv } from "@/lib/env";
import { requireAuth } from "@/lib/server/auth";
import { addMonthsClamped } from "@/lib/server/dates";
import { ApiError, handleRoute, json } from "@/lib/server/http";
import { chargeSavedPaymentMethod } from "@/lib/server/payments";
import { getStripe } from "@/lib/server/stripe";

const paymentMethodSchema = z.object({
  providerCustomerId: z.string().max(200).optional(),
  providerPaymentMethodId: z.string().max(200).optional(),
  brand: z.string().trim().min(1).max(30),
  last4: z.string().regex(/^\d{4}$/),
  expiryMonth: z.number().int().min(1).max(12),
  expiryYear: z.number().int().min(new Date().getUTCFullYear()),
  billingZip: z.string().regex(/^\d{5}$/),
});

const bodySchema = z
  .object({
    planId: z.string().uuid().optional(),
    planCode: z.enum(["one_month", "three_month", "six_month"]).optional(),
    paymentIntentId: z.string().startsWith("pi_").optional(),
    paymentMethod: paymentMethodSchema.optional(),
  })
  .refine((value) => value.planId || value.planCode, {
    message: "planId or planCode is required",
  });

export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleRoute(async () => {
    await prepareDatabase();
    const user = await requireAuth(request, ["member"]);
    const input = bodySchema.parse(await request.json());
    const env = getEnv();
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

    let paymentStatus: "succeeded_demo" | "succeeded";
    let providerReference: string;

    if (env.PAYMENT_MODE === "stripe") {
      if (!input.paymentIntentId) {
        throw new ApiError(400, "paymentIntentId is required for Stripe");
      }

      const intent = await getStripe().paymentIntents.retrieve(
        input.paymentIntentId,
        { expand: ["payment_method"] },
      );
      if (
        intent.status !== "succeeded" ||
        intent.metadata.kind !== "membership_purchase" ||
        intent.metadata.memberId !== user.id ||
        intent.metadata.planId !== plan.id ||
        intent.amount_received !== plan.priceCents
      ) {
        throw new ApiError(409, "Stripe payment is not valid for this plan");
      }

      const method =
        typeof intent.payment_method === "string"
          ? await getStripe().paymentMethods.retrieve(intent.payment_method)
          : intent.payment_method;
      const customerId =
        typeof intent.customer === "string" ? intent.customer : intent.customer?.id;
      const zip = method?.billing_details.address?.postal_code;
      if (!method?.card || !customerId || !zip) {
        throw new ApiError(
          409,
          "Stripe payment must include a card and billing ZIP code",
        );
      }

      await db
        .insert(paymentMethods)
        .values({
          userId: user.id,
          providerCustomerId: customerId,
          providerPaymentMethodId: method.id,
          brand: method.card.brand,
          last4: method.card.last4,
          expiryMonth: method.card.exp_month,
          expiryYear: method.card.exp_year,
          billingZip: zip,
        })
        .onConflictDoUpdate({
          target: paymentMethods.userId,
          set: {
            providerCustomerId: customerId,
            providerPaymentMethodId: method.id,
            brand: method.card.brand,
            last4: method.card.last4,
            expiryMonth: method.card.exp_month,
            expiryYear: method.card.exp_year,
            billingZip: zip,
            updatedAt: now,
          },
        });

      paymentStatus = "succeeded";
      providerReference = intent.id;
    } else {
      if (!input.paymentMethod) {
        throw new ApiError(400, "paymentMethod is required in mock mode");
      }
      await db
        .insert(paymentMethods)
        .values({ userId: user.id, ...input.paymentMethod })
        .onConflictDoUpdate({
          target: paymentMethods.userId,
          set: { ...input.paymentMethod, updatedAt: now },
        });

      const charge = await chargeSavedPaymentMethod({
        amountCents: plan.priceCents,
        memberId: user.id,
        kind: "membership",
      });
      paymentStatus = charge.status;
      providerReference = charge.providerReference;
    }

    const [membership] = existing
      ? await db
          .update(memberships)
          .set({
            planId: plan.id,
            status: "active",
            autoRenew: true,
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
      status: paymentStatus,
      providerReference,
    });

    return json(
      {
        membership,
        autoRenew: true,
        paymentMode: env.PAYMENT_MODE,
      },
      { status: 201 },
    );
  });
}
