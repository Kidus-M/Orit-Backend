import { and, desc, eq, gt, gte, isNull, or, sql } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/lib/db/client";
import { prepareDatabase } from "@/lib/db/prepare";
import {
  inventoryEvents,
  locationStaff,
  locations,
  memberships,
  messages,
  orders,
  paymentMethods,
  payments,
  users,
} from "@/lib/db/schema";
import { LEYOU_LOCATION_ID } from "@/lib/server/admin-locations";
import { requireAuth } from "@/lib/server/auth";
import { isAtLeast21 } from "@/lib/server/compliance";
import { sendNewOrderNotification } from "@/lib/server/email";
import { ApiError, handleRoute, json } from "@/lib/server/http";
import { chargeSavedPaymentMethod } from "@/lib/server/payments";
import { createPickupCredential } from "@/lib/server/pickup";

const personalOrderSchema = z.object({
  orderType: z.literal("personal").optional(),
  locationId: z.string().uuid(),
  quantity: z.number().int().min(1).max(6),
});

const eventOrderSchema = z.object({
  orderType: z.literal("event"),
  locationId: z.string().uuid(),
  quantity: z.number().int().min(2).max(4),
});

const bodySchema = z.union([eventOrderSchema, personalOrderSchema]);
const orderStatusSchema = z.enum(["pending"]).optional();
const eventCasePriceCents = 15000;
const eventPickupDelayDays = 3;

const safeOrderFields = {
  id: orders.id,
  locationId: orders.locationId,
  quantity: orders.quantity,
  orderType: orders.orderType,
  unitPriceCents: orders.unitPriceCents,
  transportationFeeCents: orders.transportationFeeCents,
  totalCents: orders.totalCents,
  paid: orders.paid,
  status: orders.status,
  pickupReadyAt: orders.pickupReadyAt,
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
    const requestedStatus = orderStatusSchema.parse(
      new URL(request.url).searchParams.get("status") ?? undefined,
    );
    const result = await getDb()
      .select(memberOrderFields)
      .from(orders)
      .innerJoin(locations, eq(locations.id, orders.locationId))
      .where(
        requestedStatus
          ? and(
              eq(orders.memberId, member.id),
              eq(orders.status, requestedStatus),
            )
          : eq(orders.memberId, member.id),
      )
      .orderBy(desc(orders.createdAt));
    return json({ orders: result });
  });
}

export async function POST(request: Request) {
  return handleRoute(async () => {
    await prepareDatabase();
    const member = await requireAuth(request, ["member"]);
    const input = bodySchema.parse(await request.json());
    const isEvent = input.orderType === "event";
    const db = getDb();
    const now = new Date();

    const [eligibility] = await db
      .select({ dateOfBirth: users.dateOfBirth })
      .from(users)
      .where(eq(users.id, member.id))
      .limit(1);
    if (
      !eligibility?.dateOfBirth ||
      !isAtLeast21(eligibility.dateOfBirth, now)
    ) {
      throw new ApiError(
        403,
        "You must be 21yrs or older to purchase alcohol",
      );
    }

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
        and(
          eq(locations.id, input.locationId),
          eq(locations.active, true),
          or(
            eq(locations.id, LEYOU_LOCATION_ID),
            and(
              eq(locations.complianceApproved, true),
              eq(locations.state, "CA"),
            ),
          ),
          isNull(locations.deletedAt),
        ),
      )
      .limit(1);
    if (!location) throw new ApiError(404, "Pickup location not found");

    if (isEvent) {
      const [membership] = await db
        .select({ id: memberships.id })
        .from(memberships)
        .where(
          and(
            eq(memberships.userId, member.id),
            eq(memberships.status, "active"),
            isNull(memberships.endedAt),
            gt(memberships.currentPeriodEnd, now),
          ),
        )
        .limit(1);
      if (!membership) {
        throw new ApiError(403, "Event orders are available to active members");
      }
    } else if (location.stockQuantity < input.quantity) {
      throw new ApiError(
        409,
        location.stockQuantity === 0
          ? "This location is currently out of stock"
          : "Not enough bottles are currently in stock",
      );
    }

    const unitPriceCents = isEvent
      ? eventCasePriceCents
      : location.bottlePriceCents;
    const transportationFeeCents = isEvent
      ? location.transportationFeeCents
      : 0;
    const totalCents =
      unitPriceCents * input.quantity + transportationFeeCents;

    let remainingStockQuantity: number | null = null;
    if (!isEvent) {
      const [reservedStock] = await db
        .update(locations)
        .set({
          stockQuantity: sql`${locations.stockQuantity} - ${input.quantity}`,
          inStock: sql`${locations.stockQuantity} - ${input.quantity} > 0`,
          updatedAt: now,
        })
        .where(
          and(
            eq(locations.id, location.id),
            eq(locations.active, true),
            isNull(locations.deletedAt),
            gte(locations.stockQuantity, input.quantity),
          ),
        )
        .returning({ stockQuantity: locations.stockQuantity });
      if (!reservedStock) {
        throw new ApiError(409, "Not enough bottles are currently in stock");
      }
      remainingStockQuantity = reservedStock.stockQuantity;
    }

    let charge: Awaited<ReturnType<typeof chargeSavedPaymentMethod>>;
    try {
      charge = await chargeSavedPaymentMethod({
        amountCents: totalCents,
        memberId: member.id,
        kind: isEvent ? "event_order" : "order",
      });
    } catch (error) {
      if (!isEvent) {
        await db
          .update(locations)
          .set({
            stockQuantity: sql`${locations.stockQuantity} + ${input.quantity}`,
            inStock: true,
            updatedAt: new Date(),
          })
          .where(eq(locations.id, location.id));
      }
      throw error;
    }
    const pickup = createPickupCredential();
    const pickupReadyAt = isEvent
      ? new Date(now.getTime() + eventPickupDelayDays * 24 * 60 * 60 * 1000)
      : null;

    const [order] = await db
      .insert(orders)
      .values({
        memberId: member.id,
        locationId: location.id,
        quantity: input.quantity,
        orderType: isEvent ? "event" : "personal",
        unitPriceCents,
        transportationFeeCents,
        totalCents,
        paid: true,
        pickupTokenHash: pickup.tokenHash,
        pickupTokenExpiresAt: pickup.expiresAt,
        pickupReadyAt,
      })
      .returning(safeOrderFields);

    await db.insert(payments).values({
      memberId: member.id,
      orderId: order.id,
      kind: isEvent ? "event_order" : "order",
      amountCents: totalCents,
      status: charge.status,
      providerReference: charge.providerReference,
    });

    if (remainingStockQuantity !== null) {
      await db.insert(inventoryEvents).values({
        locationId: location.id,
        changedByUserId: member.id,
        inStock: remainingStockQuantity > 0,
        stockQuantity: remainingStockQuantity,
        note: `Customer order ${order.id}: ${input.quantity} bottle${input.quantity === 1 ? "" : "s"}`,
      });
    }

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
      const itemName = isEvent ? "case" : "bottle";
      await db.insert(messages).values(
        recipientIds.map((recipientUserId) => ({
          recipientUserId,
          type: "new_order",
          title: isEvent ? "New paid event order" : "New paid pickup order",
          body: `${member.firstName} ordered ${input.quantity} ${itemName}${input.quantity === 1 ? "" : "s"}.`,
          metadata: {
            orderId: order.id,
            orderType: order.orderType,
            customerName: member.firstName,
            customerEmail: member.email,
            quantity: input.quantity,
            paid: true,
            locationName: location.name,
          },
        })),
      );
    }

    const emailNotificationSent = await sendNewOrderNotification({
      orderId: order.id,
      orderType: isEvent ? "event" : "customer",
      customerName: member.firstName,
      customerEmail: member.email,
      quantity: order.quantity,
      totalCents: order.totalCents,
      locationName: location.name,
    });

    return json(
      {
        order,
        emailNotificationSent,
        notificationRecipients: recipientIds.length,
        pickupUrl: pickup.pickupUrl,
        pickupExpiresAt: pickup.expiresAt,
        paymentMode: charge.status === "succeeded_demo" ? "mock" : "stripe",
      },
      { status: 201 },
    );
  });
}
