import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/lib/db/client";
import { prepareDatabase } from "@/lib/db/prepare";
import { vendorOrders } from "@/lib/db/schema";
import { ApiError, handleRoute, json } from "@/lib/server/http";
import {
  findVendorOrderByToken,
  hashVendorOrderToken,
} from "@/lib/server/vendor-orders";

const bodySchema = z.object({ token: z.string().min(32).max(100) });

export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleRoute(async () => {
    await prepareDatabase();
    const input = bodySchema.parse(await request.json());
    const existing = await findVendorOrderByToken(input.token);
    if (!existing) {
      throw new ApiError(410, "This vendor order link is invalid or expired");
    }
    if (existing.status === "confirmed") {
      return json({ confirmed: true, order: existing });
    }

    const now = new Date();
    const [confirmed] = await getDb()
      .update(vendorOrders)
      .set({ status: "confirmed", confirmedAt: now, updatedAt: now })
      .where(
        and(
          eq(
            vendorOrders.confirmationTokenHash,
            hashVendorOrderToken(input.token),
          ),
          eq(vendorOrders.status, "pending"),
        ),
      )
      .returning({ id: vendorOrders.id });

    if (!confirmed) {
      throw new ApiError(409, "This vendor order was already processed");
    }
    return json({ confirmed: true });
  });
}