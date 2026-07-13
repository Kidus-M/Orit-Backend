import { and, eq } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import { prepareDatabase } from "@/lib/db/prepare";
import { orders } from "@/lib/db/schema";
import { requireAuth } from "@/lib/server/auth";
import { ApiError, handleRoute, json } from "@/lib/server/http";
import { sendMessage } from "@/lib/server/messages";
import { requireLocationAccess } from "@/lib/server/store";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handleRoute(async () => {
    await prepareDatabase();
    const user = await requireAuth(request, ["store_owner", "admin"]);
    const { id } = await params;
    const db = getDb();

    const [existing] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, id))
      .limit(1);
    if (!existing) throw new ApiError(404, "Order not found");

    await requireLocationAccess(user, existing.locationId);

    if (existing.status === "completed") {
      return json({ order: existing, alreadyCompleted: true });
    }

    const now = new Date();
    const [order] = await db
      .update(orders)
      .set({
        status: "completed",
        completedAt: now,
        completedByUserId: user.id,
        updatedAt: now,
      })
      .where(and(eq(orders.id, id), eq(orders.status, "pending")))
      .returning();

    if (!order) throw new ApiError(409, "Order is no longer pending");

    await sendMessage({
      recipientUserId: order.memberId,
      type: "order_completed",
      title: "Wine order completed",
      body: `Your order for ${order.quantity} bottle${order.quantity === 1 ? "" : "s"} was marked complete.`,
      metadata: { orderId: order.id, quantity: order.quantity },
    });

    return json({ order, alreadyCompleted: false });
  });
}

