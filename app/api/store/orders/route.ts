import { desc, eq, inArray } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import { prepareDatabase } from "@/lib/db/prepare";
import { locations, orders, users } from "@/lib/db/schema";
import { requireAuth } from "@/lib/server/auth";
import { handleRoute, json } from "@/lib/server/http";
import { getStaffLocationIds } from "@/lib/server/store";

const orderFields = {
  id: orders.id,
  customerName: users.firstName,
  customerEmail: users.email,
  quantity: orders.quantity,
  paid: orders.paid,
  status: orders.status,
  totalCents: orders.totalCents,
  locationId: orders.locationId,
  locationName: locations.name,
  createdAt: orders.createdAt,
  completedAt: orders.completedAt,
};

export async function GET(request: Request) {
  return handleRoute(async () => {
    await prepareDatabase();
    const user = await requireAuth(request, ["store_owner", "admin"]);
    const locationIds = await getStaffLocationIds(user);
    const db = getDb();

    if (locationIds?.length === 0) return json({ orders: [] });

    const result = locationIds
      ? await db
          .select(orderFields)
          .from(orders)
          .innerJoin(users, eq(users.id, orders.memberId))
          .innerJoin(locations, eq(locations.id, orders.locationId))
          .where(inArray(orders.locationId, locationIds))
          .orderBy(desc(orders.createdAt))
      : await db
          .select(orderFields)
          .from(orders)
          .innerJoin(users, eq(users.id, orders.memberId))
          .innerJoin(locations, eq(locations.id, orders.locationId))
          .orderBy(desc(orders.createdAt));

    return json({ orders: result, canSendMessages: false });
  });
}
