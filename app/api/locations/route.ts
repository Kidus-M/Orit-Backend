import { and, asc, eq, isNull } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import { prepareDatabase } from "@/lib/db/prepare";
import { locations } from "@/lib/db/schema";
import { handleRoute, json } from "@/lib/server/http";

export async function GET() {
  return handleRoute(async () => {
    await prepareDatabase();
    const result = await getDb()
      .select({
        id: locations.id,
        name: locations.name,
        addressLine1: locations.addressLine1,
        city: locations.city,
        state: locations.state,
        postalCode: locations.postalCode,
        hoursText: locations.hoursText,
        bottlePriceCents: locations.bottlePriceCents,
        transportationFeeCents: locations.transportationFeeCents,
        stockQuantity: locations.stockQuantity,
        inStock: locations.inStock,
      })
      .from(locations)
      .where(
        and(eq(locations.active, true), isNull(locations.deletedAt)),
      )
      .orderBy(asc(locations.name));
    return json({ locations: result });
  });
}
