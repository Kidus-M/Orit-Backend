import { eq } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import { paymentMethods } from "@/lib/db/schema";
import { getEnv } from "@/lib/env";
import { ApiError } from "@/lib/server/http";
import { getStripe } from "@/lib/server/stripe";

export type PaymentCharge = {
  status: "succeeded_demo" | "succeeded";
  providerReference: string;
};

export async function chargeSavedPaymentMethod(input: {
  amountCents: number;
  memberId: string;
  kind: "membership" | "order" | "vendor_order";
}): Promise<PaymentCharge> {
  const env = getEnv();

  if (env.PAYMENT_MODE === "mock") {
    return {
      status: "succeeded_demo",
      providerReference: `mock_${input.kind}_${crypto.randomUUID()}`,
    };
  }

  const [saved] = await getDb()
    .select()
    .from(paymentMethods)
    .where(eq(paymentMethods.userId, input.memberId))
    .limit(1);

  if (!saved?.providerCustomerId || !saved.providerPaymentMethodId) {
    throw new ApiError(409, "A Stripe payment method must be saved first");
  }

  try {
    const intent = await getStripe().paymentIntents.create(
      {
        amount: input.amountCents,
        currency: env.STRIPE_CURRENCY,
        customer: saved.providerCustomerId,
        payment_method: saved.providerPaymentMethodId,
        confirm: true,
        off_session: true,
        metadata: {
          kind: input.kind,
          memberId: input.memberId,
        },
      },
      {
        idempotencyKey: `${input.kind}:${input.memberId}:${crypto.randomUUID()}`,
      },
    );

    if (intent.status !== "succeeded") {
      throw new ApiError(402, "Stripe requires customer authentication", {
        paymentIntentId: intent.id,
        clientSecret: intent.client_secret,
        status: intent.status,
      });
    }

    return { status: "succeeded", providerReference: intent.id };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    const message =
      error instanceof Error ? error.message : "Stripe payment failed";
    throw new ApiError(402, message);
  }
}
