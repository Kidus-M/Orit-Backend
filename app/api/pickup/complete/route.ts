import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/lib/db/client";
import { prepareDatabase } from "@/lib/db/prepare";
import { orders } from "@/lib/db/schema";
import { handleRoute, json } from "@/lib/server/http";
import { sendMessage } from "@/lib/server/messages";
import { authorizePickup } from "@/lib/server/pickup";

const bodySchema = z.object({
  token: z.string().min(32).max(100),
  serviceCode: z.string().regex(/^\d{4}$/),
});

export async function POST(request: Request) {
  return handleRoute(async () => {
    await prepareDatabase();
    const input = bodySchema.parse(await request.json());
    const authorized = await authorizePickup(
      request,
      input.token,
      input.serviceCode,
    );
    const now = new Date();

    const [completed] = await getDb()
      .update(orders)
      .set({
        status: "completed",
        completedAt: now,
        pickupTokenHash: null,
        pickupTokenExpiresAt: null,
        updatedAt: now,
      })
      .where(
        and(
          eq(orders.id, authorized.orderId),
          eq(orders.status, "pending"),
        ),
      )
      .returning({ id: orders.id });

    if (!completed) {
      return json(
        { error: "This pickup QR code is no longer active" },
        { status: 410 },
      );
    }

    await sendMessage({
      recipientUserId: authorized.memberId,
      type: "order_completed",
      title: "Wine order completed",
      body: `Your order for ${authorized.quantity} bottle${authorized.quantity === 1 ? "" : "s"} was picked up.`,
      metadata: {
        orderId: authorized.orderId,
        quantity: authorized.quantity,
        completedAt: now.toISOString(),
      },
    });

    return json({ completed: true, completedAt: now.toISOString() });
  });
}
