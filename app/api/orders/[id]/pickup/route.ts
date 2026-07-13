import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/lib/db/client";
import { prepareDatabase } from "@/lib/db/prepare";
import { orders } from "@/lib/db/schema";
import { requireAuth } from "@/lib/server/auth";
import { ApiError, handleRoute, json } from "@/lib/server/http";
import { createPickupCredential } from "@/lib/server/pickup";

const idSchema = z.string().uuid();

type RouteContext = {
  params: Promise<{ id: string }>;
};

export const runtime = "nodejs";

export async function POST(request: Request, context: RouteContext) {
  return handleRoute(async () => {
    await prepareDatabase();
    const member = await requireAuth(request, ["member"]);
    const id = idSchema.parse((await context.params).id);
    const db = getDb();

    const [order] = await db
      .select({ id: orders.id, status: orders.status })
      .from(orders)
      .where(and(eq(orders.id, id), eq(orders.memberId, member.id)))
      .limit(1);

    if (!order) throw new ApiError(404, "Order not found");
    if (order.status !== "pending") {
      throw new ApiError(410, "This pickup QR code is no longer active");
    }

    const pickup = createPickupCredential();
    const [updated] = await db
      .update(orders)
      .set({
        pickupTokenHash: pickup.tokenHash,
        pickupTokenExpiresAt: pickup.expiresAt,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(orders.id, order.id),
          eq(orders.memberId, member.id),
          eq(orders.status, "pending"),
        ),
      )
      .returning({ id: orders.id });

    if (!updated) {
      throw new ApiError(410, "This pickup QR code is no longer active");
    }

    return json({
      orderId: updated.id,
      pickupUrl: pickup.pickupUrl,
      pickupExpiresAt: pickup.expiresAt,
    });
  });
}
