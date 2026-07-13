import { eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/lib/db/client";
import { prepareDatabase } from "@/lib/db/prepare";
import { paymentMethods } from "@/lib/db/schema";
import { requireAuth } from "@/lib/server/auth";
import { handleRoute, json } from "@/lib/server/http";

const bodySchema = z.object({
  providerCustomerId: z.string().max(200).optional(),
  providerPaymentMethodId: z.string().max(200).optional(),
  brand: z.string().trim().min(1).max(30),
  last4: z.string().regex(/^\d{4}$/),
  expiryMonth: z.number().int().min(1).max(12),
  expiryYear: z.number().int().min(new Date().getUTCFullYear()),
  billingZip: z.string().regex(/^\d{5}$/),
});

export const runtime = "nodejs";

export async function PATCH(request: Request) {
  return handleRoute(async () => {
    await prepareDatabase();
    const user = await requireAuth(request, ["member"]);
    const input = bodySchema.parse(await request.json());

    const [paymentMethod] = await getDb()
      .insert(paymentMethods)
      .values({ userId: user.id, ...input })
      .onConflictDoUpdate({
        target: paymentMethods.userId,
        set: { ...input, updatedAt: new Date() },
      })
      .returning();

    return json({ paymentMethod });
  });
}

