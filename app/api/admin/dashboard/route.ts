import { and, asc, desc, eq, gt, isNull, sql } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import { prepareDatabase } from "@/lib/db/prepare";
import {
  concerns,
  locations,
  membershipPlans,
  memberships,
  orders,
  users,
  vendorOrders,
} from "@/lib/db/schema";
import { requireAdminCookie } from "@/lib/server/admin-auth";
import { handleRoute, json } from "@/lib/server/http";
import { getVendorInvitationsForAdmin } from "@/lib/server/vendor-code";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return handleRoute(async () => {
    await prepareDatabase();
    await requireAdminCookie(request);
    const db = getDb();
    const now = new Date();

    const [
      concernItems,
      orderItems,
      vendorOrderItems,
      planItems,
      userItems,
      locationItems,
      vendorInvitations,
    ] = await Promise.all([
      db
        .select({
          id: concerns.id,
          memberName: users.firstName,
          memberEmail: users.email,
          message: concerns.message,
          status: concerns.status,
          adminNotes: concerns.adminNotes,
          createdAt: concerns.createdAt,
          updatedAt: concerns.updatedAt,
        })
        .from(concerns)
        .innerJoin(users, eq(users.id, concerns.memberId))
        .orderBy(desc(concerns.createdAt)),
      db
        .select({
          id: orders.id,
          memberName: users.firstName,
          memberEmail: users.email,
          locationName: locations.name,
          quantity: orders.quantity,
          orderType: orders.orderType,
          transportationFeeCents: orders.transportationFeeCents,
          totalCents: orders.totalCents,
          paid: orders.paid,
          status: orders.status,
          createdAt: orders.createdAt,
          completedAt: orders.completedAt,
        })
        .from(orders)
        .innerJoin(users, eq(users.id, orders.memberId))
        .innerJoin(locations, eq(locations.id, orders.locationId))
        .orderBy(desc(orders.createdAt)),
      db
        .select({
          id: vendorOrders.id,
          businessName: users.firstName,
          businessEmail: users.email,
          locationName: sql<string>`coalesce(${locations.name}, 'Vendor delivery')`, 
          quantity: vendorOrders.quantity,
          casePriceCents: vendorOrders.casePriceCents,
          transportationFeeCents: vendorOrders.transportationFeeCents,
          totalCents: vendorOrders.totalCents,
          paid: vendorOrders.paid,
          status: vendorOrders.status,
          createdAt: vendorOrders.createdAt,
          confirmedAt: vendorOrders.confirmedAt,
        })
        .from(vendorOrders)
        .innerJoin(users, eq(users.id, vendorOrders.vendorId))
        .leftJoin(locations, eq(locations.id, vendorOrders.locationId))
        .orderBy(desc(vendorOrders.createdAt)),
      db
        .select({
          id: membershipPlans.id,
          code: membershipPlans.code,
          name: membershipPlans.name,
          durationMonths: membershipPlans.durationMonths,
          priceCents: membershipPlans.priceCents,
          isActive: membershipPlans.isActive,
          activeMembers: sql<number>`count(${memberships.id})::int`,
        })
        .from(membershipPlans)
        .leftJoin(
          memberships,
          and(
            eq(memberships.planId, membershipPlans.id),
            eq(memberships.status, "active"),
            isNull(memberships.endedAt),
            gt(memberships.currentPeriodEnd, now),
          ),
        )
        .groupBy(membershipPlans.id)
        .orderBy(membershipPlans.durationMonths),
      db
        .select({
          id: users.id,
          firstName: users.firstName,
          email: users.email,
          storeName: users.storeName,
          isVendor: users.isVendor,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(and(eq(users.role, "member"), isNull(users.deletedAt)))
        .orderBy(users.firstName),
      db
        .select({
          id: locations.id,
          vendorId: locations.vendorId,
          vendorName: users.firstName,
          vendorEmail: users.email,
          name: locations.name,
          addressLine1: locations.addressLine1,
          city: locations.city,
          state: locations.state,
          postalCode: locations.postalCode,
          hoursText: locations.hoursText,
          bottlePriceCents: locations.bottlePriceCents,
          stockQuantity: locations.stockQuantity,
          casePriceCents: locations.casePriceCents,
          transportationFeeCents: locations.transportationFeeCents,
          inStock: locations.inStock,
          active: locations.active,
          createdAt: locations.createdAt,
        })
        .from(locations)
        .leftJoin(users, eq(users.id, locations.vendorId))
        .where(isNull(locations.deletedAt))
        .orderBy(asc(locations.name)),
      getVendorInvitationsForAdmin(),
    ]);

    const newConcernCount = concernItems.filter(
      (concern) => concern.status === "new",
    ).length;
    return json({
      summary: {
        newConcernCount,
        pendingOrderCount: orderItems.filter(
          (order) => order.status === "pending",
        ).length,
        pendingVendorOrderCount: vendorOrderItems.filter(
          (order) => order.status === "pending",
        ).length,
        activeMemberCount: planItems.reduce(
          (total, plan) => total + Number(plan.activeMembers),
          0,
        ),
      },
      concerns: concernItems,
      orders: orderItems,
      vendorOrders: vendorOrderItems,
      vendorInvitations,
      locations: locationItems,
      plans: planItems,
      users: userItems,
    });
  });
}
