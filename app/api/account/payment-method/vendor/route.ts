import { z } from "zod";

import { getDb } from "@/lib/db/client";
import { prepareDatabase } from "@/lib/db/prepare";
import { paymentMethods } from "@/lib/db/schema";
import { requireAuth } from "@/lib/server/auth";
import { ApiError, handleRoute, json } from "@/lib/server/http";
import { getStripe } from "@/lib/server/stripe";

const bodySchema = z.object({ setupIntentId: z.string().startsWith("seti_") });

export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleRoute(async () => {
    await prepareDatabase();
    const member = await requireAuth(request, ["member"]);
    const input = bodySchema.parse(await request.json());

    const intent = await getStripe().setupIntents.retrieve(input.setupIntentId, {
      expand: ["payment_method"],
    });
    if (
      intent.status !== "succeeded" ||
      intent.metadata?.kind !== "saved_card" ||
      intent.metadata?.userId !== member.id
    ) {
      throw new ApiError(409, "Stripe card setup is not valid for this account.");
    }

    const method =
      typeof intent.payment_method === "string"
        ? await getStripe().paymentMethods.retrieve(intent.payment_method)
        : intent.payment_method;
    const customerId =
      typeof intent.customer === "string" ? intent.customer : intent.customer?.id;
    const zip = method?.billing_details.address?.postal_code;
    if (!method?.card || !customerId || !zip) {
      throw new ApiError(409, "Card details and billing ZIP are required.");
    }

    const [paymentMethod] = await getDb()
      .insert(paymentMethods)
      .values({
        userId: member.id,
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
          updatedAt: new Date(),
        },
      })
      .returning({ id: paymentMethods.id });

    return json({ paymentMethod });
  });
}
