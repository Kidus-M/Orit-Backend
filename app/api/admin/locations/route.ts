import { z } from "zod";

import { getDb } from "@/lib/db/client";
import { prepareDatabase } from "@/lib/db/prepare";
import { locations } from "@/lib/db/schema";
import { requireAdminCookie } from "@/lib/server/admin-auth";
import {
  locationValuesSchema,
  requireVendor,
} from "@/lib/server/admin-locations";
import { handleRoute, json } from "@/lib/server/http";
import { hashServiceCode } from "@/lib/server/pickup";

const createSchema = locationValuesSchema.extend({
  serviceCode: z.string().regex(/^\d{4}$/),
});

export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleRoute(async () => {
    await prepareDatabase();
    await requireAdminCookie(request);
    const input = createSchema.parse(await request.json());
    await requireVendor(input.vendorId);
    const { serviceCode, stockQuantity, ...values } = input;
    const [location] = await getDb()
      .insert(locations)
      .values({
        ...values,
        stockQuantity,
        inStock: stockQuantity > 0,
        serviceCodeHash: hashServiceCode(serviceCode),
      })
      .returning();
    return json({ location }, { status: 201 });
  });
}