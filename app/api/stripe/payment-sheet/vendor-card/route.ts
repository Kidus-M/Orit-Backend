import { eq } from "drizzle-orm";
import Stripe from "stripe";

import { getDb } from "@/lib/db/client";
import { prepareDatabase } from "@/lib/db/prepare";
import { users } from "@/lib/db/schema";
import { getEnv } from "@/lib/env";
import { requireAuth } from "@/lib/server/auth";
import { ApiError, handleRoute, json } from "@/lib/server/http";
import { ensureStripeCustomer, getStripe } from "@/lib/server/stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleRoute(async () => {
    await prepareDatabase();
    const vendor = await requireAuth(request, ["member"]);
    if (!vendor.isVendor) throw new ApiError(403, "Vendor access required.");

    const env = getEnv();
    if (env.PAYMENT_MODE !== "stripe") {
      throw new ApiError(409, "Stripe PaymentSheet is disabled in mock mode.");
    }
    if (!env.STRIPE_PUBLISHABLE_KEY) {
      throw new ApiError(503, "Stripe publishable key is not configured.");
    }

    const db = getDb();
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, vendor.id))
      .limit(1);
    if (!user) throw new ApiError(404, "Vendor not found.");

    const customerId = await ensureStripeCustomer(user);
    if (!user.stripeCustomerId) {
      await db
        .update(users)
        .set({ stripeCustomerId: customerId, updatedAt: new Date() })
        .where(eq(users.id, vendor.id));
    }

    const stripe = getStripe();
    const [intent, ephemeralKey] = await Promise.all([
      stripe.setupIntents.create({
        customer: customerId,
        usage: "off_session",
        automatic_payment_methods: { enabled: true },
        metadata: { kind: "vendor_card", vendorId: vendor.id },
      }),
      stripe.ephemeralKeys.create(
        { customer: customerId },
        { apiVersion: Stripe.API_VERSION },
      ),
    ]);

    return json({
      setupIntentId: intent.id,
      setupIntentClientSecret: intent.client_secret,
      customerId,
      customerEphemeralKeySecret: ephemeralKey.secret,
      publishableKey: env.STRIPE_PUBLISHABLE_KEY,
      merchantDisplayName: "Orit Tej",
    });
  });
}
