import { eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/lib/db/client";
import { prepareDatabase } from "@/lib/db/prepare";
import { paymentMethods, payments, vendorOrders } from "@/lib/db/schema";
import { requireAuth } from "@/lib/server/auth";
import { sendNewOrderNotification } from "@/lib/server/email";
import { ApiError, handleRoute, json } from "@/lib/server/http";
import { chargeSavedPaymentMethod } from "@/lib/server/payments";
import { createVendorOrderConfirmation } from "@/lib/server/vendor-orders";

const vendorCasePriceCents = 8_500;
const vendorTransportationFeeCents = 5_000;
const vendorDeliveryLabel = "Vendor delivery";

const bodySchema = z.object({
  // Accepted temporarily so older app builds remain compatible. Vendor orders
  // are deliberately not authorized or priced through pickup locations.
  locationId: z.string().uuid().optional(),
  quantity: z.number().int().min(1).max(30),
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
    const [savedPaymentMethod] = await getDb()
      .select({ id: paymentMethods.id })
      .from(paymentMethods)
      .where(eq(paymentMethods.userId, member.id))
      .limit(1);

    return json({
      isVendor: member.isVendor,
      hasPaymentMethod: Boolean(savedPaymentMethod),
      casePriceCents: vendorCasePriceCents,
      transportationFeeCents: vendorTransportationFeeCents,
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

    const totalCents =
      vendorCasePriceCents * input.quantity + vendorTransportationFeeCents;
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
        quantity: input.quantity,
        casePriceCents: vendorCasePriceCents,
        transportationFeeCents: vendorTransportationFeeCents,
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

    const emailNotificationSent = await sendNewOrderNotification({
      orderId: order.id,
      orderType: "vendor",
      customerName: vendor.firstName,
      customerEmail: vendor.email,
      quantity: order.quantity,
      totalCents: order.totalCents,
      locationName: vendorDeliveryLabel,
      confirmationUrl: confirmation.confirmationUrl,
    });

    return json(
      {
        order,
        locationName: vendorDeliveryLabel,
        emailNotificationSent,
        paymentMode: charge.status === "succeeded_demo" ? "mock" : "stripe",
      },
      { status: 201 },
    );
  });
}