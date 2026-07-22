import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/lib/db/client";
import { prepareDatabase } from "@/lib/db/prepare";
import {
  locations,
  paymentMethods,
  payments,
  vendorOrders,
} from "@/lib/db/schema";
import { requireAuth } from "@/lib/server/auth";
import { sendVendorOrderNotification } from "@/lib/server/email";
import { ApiError, handleRoute, json } from "@/lib/server/http";
import { chargeSavedPaymentMethod } from "@/lib/server/payments";
import { createVendorOrderConfirmation } from "@/lib/server/vendor-orders";

const bodySchema = z.object({
  locationId: z.string().uuid(),
  quantity: z.number().int().min(1).max(20),
});

const safeFields = {
  id: vendorOrders.id,
  quantity: vendorOrders.quantity,
  casePriceCents: vendorOrders.casePriceCents,
  transportationFeeCents: vendorOrders.transportationFeeCents,
  totalCents: vendorOrders.totalCents,
  paid: vendorOrders.paid,
  status: vendorOrders.status,
  createdAt: vendorOrders.createdAt,
};

export const runtime = "nodejs";

export async function GET(request: Request) {
  return handleRoute(async () => {
    await prepareDatabase();
    const member = await requireAuth(request, ["member"]);
    const [location] = await getDb()
      .select({
        id: locations.id,
        name: locations.name,
        casePriceCents: locations.casePriceCents,
        transportationFeeCents: locations.transportationFeeCents,
      })
      .from(locations)
      .where(eq(locations.active, true))
      .limit(1);
    const [savedPaymentMethod] = await getDb()
      .select({ id: paymentMethods.id })
      .from(paymentMethods)
      .where(eq(paymentMethods.userId, member.id))
      .limit(1);

    return json({
      isVendor: member.isVendor,
      hasPaymentMethod: Boolean(savedPaymentMethod),
      location: location ?? null,
    });
  });
}

export async function POST(request: Request) {
  return handleRoute(async () => {
    await prepareDatabase();
    const vendor = await requireAuth(request, ["member"]);
    if (!vendor.isVendor) {
      throw new ApiError(403, "Page reserved for vendors.");
    }

    const input = bodySchema.parse(await request.json());
    const db = getDb();
    const [paymentMethod] = await db
      .select({ id: paymentMethods.id })
      .from(paymentMethods)
      .where(eq(paymentMethods.userId, vendor.id))
      .limit(1);
    if (!paymentMethod) throw new ApiError(409, "Saved payment method required");

    const [location] = await db
      .select()
      .from(locations)
      .where(
        and(eq(locations.id, input.locationId), eq(locations.active, true)),
      )
      .limit(1);
    if (!location) throw new ApiError(404, "Service location not found");

    const totalCents =
      location.casePriceCents * input.quantity +
      location.transportationFeeCents;
    const charge = await chargeSavedPaymentMethod({
      amountCents: totalCents,
      memberId: vendor.id,
      kind: "vendor_order",
    });
    const confirmation = createVendorOrderConfirmation();

    const [order] = await db
      .insert(vendorOrders)
      .values({
        vendorId: vendor.id,
        locationId: location.id,
        quantity: input.quantity,
        casePriceCents: location.casePriceCents,
        transportationFeeCents: location.transportationFeeCents,
        totalCents,
        paid: true,
        confirmationTokenHash: confirmation.tokenHash,
        confirmationExpiresAt: confirmation.expiresAt,
      })
      .returning(safeFields);

    await db.insert(payments).values({
      memberId: vendor.id,
      vendorOrderId: order.id,
      kind: "vendor_order",
      amountCents: totalCents,
      status: charge.status,
      providerReference: charge.providerReference,
    });

    const emailNotificationSent = await sendVendorOrderNotification({
      orderId: order.id,
      vendorName: vendor.firstName,
      vendorEmail: vendor.email,
      quantity: order.quantity,
      totalCents: order.totalCents,
      confirmationUrl: confirmation.confirmationUrl,
    });

    return json(
      {
        order,
        locationName: location.name,
        emailNotificationSent,
        paymentMode: charge.status === "succeeded_demo" ? "mock" : "stripe",
      },
      { status: 201 },
    );
  });
}