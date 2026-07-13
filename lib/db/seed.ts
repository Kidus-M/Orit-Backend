import { count, eq, inArray } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import {
  locationStaff,
  locations,
  membershipPlans,
  memberships,
  messages,
  orders,
  paymentMethods,
  sessions,
  users,
} from "@/lib/db/schema";
import { getEnv } from "@/lib/env";
import { hashSessionToken } from "@/lib/server/auth";
import { addMonthsClamped } from "@/lib/server/dates";
import { hashPassword } from "@/lib/server/passwords";
import {
  createPickupCredential,
  hashServiceCode,
} from "@/lib/server/pickup";

export async function seedDatabase() {
  const db = getDb();
  const env = getEnv();
  const serviceCodeHash = hashServiceCode(
    env.LEYOU_SERVICE_CODE,
  );

  await db
    .insert(membershipPlans)
    .values([
      {
        code: "one_month",
        name: "1 month",
        durationMonths: 1,
        priceCents: 2500,
      },
      {
        code: "three_month",
        name: "3 months",
        durationMonths: 3,
        priceCents: 7000,
      },
      {
        code: "six_month",
        name: "6 months",
        durationMonths: 6,
        priceCents: 13500,
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(locations)
    .values({
      name: "Leyou Ethiopian",
      addressLine1: "1100 N First St Ste C",
      city: "San Jose",
      state: "CA",
      postalCode: "95112",
      hoursText: "Monday-Sunday, 5:30 PM-9:00 PM",
      bottlePriceCents: 1898,
      inStock: true,
      serviceCodeHash,
    })
    .onConflictDoUpdate({
      target: locations.name,
      set: { serviceCodeHash, updatedAt: new Date() },
    });

  const [{ value: userCount }] = await db
    .select({ value: count() })
    .from(users);
  if (userCount > 0) {
    const demoPasswordHash = await hashPassword("DemoPassword123!");
    const refreshed = await db
      .update(users)
      .set({ passwordHash: demoPasswordHash, updatedAt: new Date() })
      .where(
        inArray(users.email, [
          "maya.member@example.com",
          "owner@leyou.example.com",
          "admin@orit-tej.example.com",
        ]),
      )
      .returning({ id: users.id });

    return {
      demoSeeded: false,
      demoPasswordsRefreshed: refreshed.length,
    };
  }

  const [location] = await db
    .select()
    .from(locations)
    .where(eq(locations.name, "Leyou Ethiopian"))
    .limit(1);
  const [plan] = await db
    .select()
    .from(membershipPlans)
    .where(eq(membershipPlans.code, "three_month"))
    .limit(1);

  const demoPasswordHash = await hashPassword("DemoPassword123!");

  const [member, owner, admin] = await db
    .insert(users)
    .values([
      {
        role: "member",
        firstName: "Maya",
        email: "maya.member@example.com",
        passwordHash: demoPasswordHash,
      },
      {
        role: "store_owner",
        firstName: "Daniel",
        email: "owner@leyou.example.com",
        storeName: "Leyou Ethiopian",
        passwordHash: demoPasswordHash,
      },
      {
        role: "admin",
        firstName: "Orit Admin",
        email: "admin@orit-tej.example.com",
        passwordHash: demoPasswordHash,
      },
    ])
    .returning();

  await db.insert(locationStaff).values({
    locationId: location.id,
    userId: owner.id,
  });

  const startedAt = addMonthsClamped(new Date(), -2);
  const [membership] = await db
    .insert(memberships)
    .values({
      userId: member.id,
      planId: plan.id,
      startedAt,
      currentPeriodStart: startedAt,
      currentPeriodEnd: addMonthsClamped(startedAt, 3),
      autoRenew: true,
    })
    .returning();

  await db.insert(paymentMethods).values({
    userId: member.id,
    providerCustomerId: "demo_customer",
    providerPaymentMethodId: "demo_payment_method",
    brand: "visa",
    last4: "4242",
    expiryMonth: 12,
    expiryYear: new Date().getUTCFullYear() + 3,
    billingZip: "95112",
  });

  const demoPickup = createPickupCredential(env.DEMO_PICKUP_TOKEN);
  const [order] = await db
    .insert(orders)
    .values({
      memberId: member.id,
      locationId: location.id,
      quantity: 2,
      unitPriceCents: location.bottlePriceCents,
      totalCents: location.bottlePriceCents * 2,
      paid: true,
      status: "pending",
      pickupTokenHash: demoPickup.tokenHash,
      pickupTokenExpiresAt: demoPickup.expiresAt,
    })
    .returning();

  const orderMetadata = {
    orderId: order.id,
    customerName: member.firstName,
    customerEmail: member.email,
    quantity: order.quantity,
    paid: order.paid,
    membershipId: membership.id,
    pickupUrl: demoPickup.pickupUrl,
  };

  await db.insert(messages).values([
    {
      recipientUserId: member.id,
      type: "welcome",
      title: "Welcome to Orit Tej",
      body: "Your server-backed member inbox is ready.",
    },
    {
      recipientUserId: owner.id,
      type: "new_order",
      title: "New paid pickup order",
      body: `${member.firstName} ordered ${order.quantity} bottles for pickup.`,
      metadata: orderMetadata,
    },
    {
      recipientUserId: admin.id,
      type: "new_order",
      title: "New paid pickup order",
      body: `${member.firstName} ordered ${order.quantity} bottles at Leyou Ethiopian.`,
      metadata: orderMetadata,
    },
  ]);

  const demoSessions = [
    [member.id, env.DEMO_MEMBER_TOKEN],
    [owner.id, env.DEMO_STORE_OWNER_TOKEN],
    [admin.id, env.DEMO_ADMIN_TOKEN],
  ] as const;
  const expiresAt = new Date();
  expiresAt.setUTCFullYear(expiresAt.getUTCFullYear() + 5);

  for (const [userId, token] of demoSessions) {
    if (!token) continue;
    await db
      .insert(sessions)
      .values({
        userId,
        tokenHash: hashSessionToken(token),
        expiresAt,
      })
      .onConflictDoNothing();
  }

  return { demoSeeded: true };
}
