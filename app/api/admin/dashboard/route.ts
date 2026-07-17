import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import { prepareDatabase } from "@/lib/db/prepare";
import {
  concerns,
  locations,
  membershipPlans,
  memberships,
  orders,
  users,
} from "@/lib/db/schema";
import { requireAdminCookie } from "@/lib/server/admin-auth";
import { handleRoute, json } from "@/lib/server/http";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return handleRoute(async () => {
    await prepareDatabase();
    await requireAdminCookie(request);
    const db = getDb();
    const now = new Date();

    const [concernItems, orderItems, planItems] = await Promise.all([
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
        activeMemberCount: planItems.reduce(
          (total, plan) => total + Number(plan.activeMembers),
          0,
        ),
      },
      concerns: concernItems,
      orders: orderItems,
      plans: planItems,
    });
  });
}
