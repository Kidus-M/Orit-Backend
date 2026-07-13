import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/lib/db/client";
import { prepareDatabase } from "@/lib/db/prepare";
import {
  locationStaff,
  locations,
  memberships,
  messages,
  orders,
  paymentMethods,
  payments,
  users,
} from "@/lib/db/schema";
import { requireAuth } from "@/lib/server/auth";
import { ApiError, handleRoute, json } from "@/lib/server/http";
import { chargeSavedPaymentMethod } from "@/lib/server/payments";
import { createPickupCredential } from "@/lib/server/pickup";

const bodySchema = z.object({
  locationId: z.string().uuid(),
  quantity: z.number().int().min(1).max(12),
});

const safeOrderFields = {
  id: orders.id,
  locationId: orders.locationId,
  quantity: orders.quantity,
  unitPriceCents: orders.unitPriceCents,
  totalCents: orders.totalCents,
  paid: orders.paid,
  status: orders.status,
  completedAt: orders.completedAt,
  createdAt: orders.createdAt,
};

const memberOrderFields = {
  ...safeOrderFields,
  locationName: locations.name,
};

export const runtime = "nodejs";

export async function GET(request: Request) {
  return handleRoute(async () => {
    await prepareDatabase();
    const member = await requireAuth(request, ["member"]);
    const result = await getDb()
      .select(memberOrderFields)
      .from(orders)
      .innerJoin(locations, eq(locations.id, orders.locationId))
      .where(eq(orders.memberId, member.id))
      .orderBy(desc(orders.createdAt));
    return json({ orders: result });
  });
}

export async function POST(request: Request) {
  return handleRoute(async () => {
    await prepareDatabase();
    const member = await requireAuth(request, ["member"]);
    const input = bodySchema.parse(await request.json());
    const db = getDb();

    const [membership] = await db
      .select({ id: memberships.id })
      .from(memberships)
      .where(
        and(
          eq(memberships.userId, member.id),
          eq(memberships.status, "active"),
          isNull(memberships.endedAt),
          gt(memberships.currentPeriodEnd, new Date()),
        ),
      )
      .limit(1);
    if (!membership) throw new ApiError(403, "Active membership required");

    const [paymentMethod] = await db
      .select({ id: paymentMethods.id })
      .from(paymentMethods)
      .where(eq(paymentMethods.userId, member.id))
      .limit(1);
    if (!paymentMethod) throw new ApiError(409, "Saved payment method required");

    const [location] = await db
      .select()
      .from(locations)
      .where(
        and(eq(locations.id, input.locationId), eq(locations.active, true)),
      )
      .limit(1);
    if (!location) throw new ApiError(404, "Pickup location not found");
    if (!location.inStock) {
      throw new ApiError(409, "This location is currently out of stock");
    }

    const totalCents = location.bottlePriceCents * input.quantity;
    const charge = await chargeSavedPaymentMethod({
      amountCents: totalCents,
      memberId: member.id,
      kind: "order",
    });
    const pickup = createPickupCredential();

    const [order] = await db
      .insert(orders)
      .values({
        memberId: member.id,
        locationId: location.id,
        quantity: input.quantity,
        unitPriceCents: location.bottlePriceCents,
        totalCents,
        paid: true,
        pickupTokenHash: pickup.tokenHash,
        pickupTokenExpiresAt: pickup.expiresAt,
      })
      .returning(safeOrderFields);

    await db.insert(payments).values({
      memberId: member.id,
      orderId: order.id,
      kind: "order",
      amountCents: totalCents,
      status: charge.status,
      providerReference: charge.providerReference,
    });

    const staff = await db
      .select({ userId: locationStaff.userId })
      .from(locationStaff)
      .where(eq(locationStaff.locationId, location.id));
    const admins = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.role, "admin"), isNull(users.deletedAt)));
    const recipientIds = [
      ...new Set([
        ...staff.map((item) => item.userId),
        ...admins.map((item) => item.id),
      ]),
    ];

    if (recipientIds.length > 0) {
      await db.insert(messages).values(
        recipientIds.map((recipientUserId) => ({
          recipientUserId,
          type: "new_order",
          title: "New paid pickup order",
          body: `${member.firstName} ordered ${input.quantity} bottle${input.quantity === 1 ? "" : "s"}.`,
          metadata: {
            orderId: order.id,
            customerName: member.firstName,
            customerEmail: member.email,
            quantity: input.quantity,
            paid: true,
            locationName: location.name,
          },
        })),
      );
    }

    return json(
      {
        order,
        notificationRecipients: recipientIds.length,
        pickupUrl: pickup.pickupUrl,
        pickupExpiresAt: pickup.expiresAt,
        paymentMode: charge.status === "succeeded_demo" ? "mock" : "stripe",
      },
      { status: 201 },
    );
  });
}
