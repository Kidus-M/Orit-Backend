import Stripe from "stripe";

import { getEnv } from "@/lib/env";
import { prepareDatabase } from "@/lib/db/prepare";
import { ApiError, handleRoute, json } from "@/lib/server/http";
import { sendMessage } from "@/lib/server/messages";
import { getStripe } from "@/lib/server/stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleRoute(async () => {
    const signature = request.headers.get("stripe-signature");
    const webhookSecret = getEnv().STRIPE_WEBHOOK_SECRET;
    if (!signature || !webhookSecret) {
      throw new ApiError(400, "Stripe webhook is not configured");
    }

    const rawBody = await request.text();
    let event: Stripe.Event;
    try {
      event = getStripe().webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret,
      );
    } catch {
      throw new ApiError(400, "Invalid Stripe webhook signature");
    }

    await prepareDatabase();

    if (event.type === "payment_intent.payment_failed") {
      const intent = event.data.object;
      const memberId = intent.metadata.memberId;
      if (memberId) {
        await sendMessage({
          recipientUserId: memberId,
          type: "payment_failed",
          title: "Payment needs attention",
          body:
            intent.last_payment_error?.message ??
            "Stripe could not process your saved payment method.",
          metadata: { paymentIntentId: intent.id },
        });
      }
    }

    return json({ received: true });
  });
}
