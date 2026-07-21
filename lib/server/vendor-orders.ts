import { createHmac, randomBytes } from "node:crypto";

import { and, eq, gt } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import { locations, users, vendorOrders } from "@/lib/db/schema";
import { getEnv } from "@/lib/env";

export const vendorOrderConfirmationDays = 30;

export function hashVendorOrderToken(token: string) {
  return createHmac("sha256", getEnv().PICKUP_SECURITY_PEPPER)
    .update(`vendor-order:${token}`)
    .digest("hex");
}

export function createVendorOrderConfirmation() {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + vendorOrderConfirmationDays);

  return {
    token,
    tokenHash: hashVendorOrderToken(token),
    expiresAt,
    confirmationUrl: new URL(
      `/vendor-order/${encodeURIComponent(token)}`,
      getEnv().PUBLIC_APP_URL,
    ).toString(),
  };
}

export async function findVendorOrderByToken(token: string) {
  const [order] = await getDb()
    .select({
      id: vendorOrders.id,
      vendorName: users.firstName,
      vendorEmail: users.email,
      locationName: locations.name,
      quantity: vendorOrders.quantity,
      casePriceCents: vendorOrders.casePriceCents,
      transportationFeeCents: vendorOrders.transportationFeeCents,
      totalCents: vendorOrders.totalCents,
      paid: vendorOrders.paid,
      status: vendorOrders.status,
      createdAt: vendorOrders.createdAt,
      confirmedAt: vendorOrders.confirmedAt,
      confirmationExpiresAt: vendorOrders.confirmationExpiresAt,
    })
    .from(vendorOrders)
    .innerJoin(users, eq(users.id, vendorOrders.vendorId))
    .innerJoin(locations, eq(locations.id, vendorOrders.locationId))
    .where(
      and(
        eq(vendorOrders.confirmationTokenHash, hashVendorOrderToken(token)),
        gt(vendorOrders.confirmationExpiresAt, new Date()),
      ),
    )
    .limit(1);

  return order ?? null;
}