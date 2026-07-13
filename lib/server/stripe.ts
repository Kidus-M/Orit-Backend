import Stripe from "stripe";

import { getEnv } from "@/lib/env";
import { ApiError } from "@/lib/server/http";

let client: Stripe | undefined;

export function getStripe() {
  const secret = getEnv().STRIPE_SECRET_KEY;
  if (!secret) {
    throw new ApiError(503, "Stripe is not configured");
  }

  client ??= new Stripe(secret, {
    appInfo: { name: "Orit Tej", version: "0.1.0" },
  });
  return client;
}

export async function ensureStripeCustomer(user: {
  id: string;
  firstName: string;
  email: string;
  stripeCustomerId: string | null;
}) {
  if (user.stripeCustomerId) return user.stripeCustomerId;

  const customer = await getStripe().customers.create({
    name: user.firstName,
    email: user.email,
    metadata: { oritUserId: user.id },
  });
  return customer.id;
}
