import { randomUUID } from "node:crypto";

import { getEnv } from "@/lib/env";
import { ApiError } from "@/lib/server/http";

export type PaymentCharge = {
  status: "succeeded_demo" | "succeeded";
  providerReference: string;
};

export async function chargeSavedPaymentMethod(input: {
  amountCents: number;
  memberId: string;
  kind: "membership" | "order";
}): Promise<PaymentCharge> {
  const env = getEnv();

  if (env.PAYMENT_MODE === "mock") {
    return {
      status: "succeeded_demo",
      providerReference: `mock_${input.kind}_${randomUUID()}`,
    };
  }

  if (!env.PAYMENT_PROVIDER_SECRET_KEY) {
    throw new ApiError(503, "Payment provider is not configured");
  }

  throw new ApiError(
    501,
    "Live payment processing is not connected yet; use PAYMENT_MODE=mock for the pilot",
  );
}
