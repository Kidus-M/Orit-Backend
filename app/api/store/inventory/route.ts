import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/lib/db/client";
import { prepareDatabase } from "@/lib/db/prepare";
import {
  inventoryEvents,
  locations,
  messages,
  users,
} from "@/lib/db/schema";
import { requireAuth } from "@/lib/server/auth";
import { ApiError, handleRoute, json } from "@/lib/server/http";
import { requireLocationAccess } from "@/lib/server/store";

const defaultStockQuantity = 24;
const bodySchema = z
  .object({
    locationId: z.string().uuid(),
    stockQuantity: z.number().int().min(0).max(1_000_000).optional(),
    // Retained for backward compatibility with the earlier stock toggle.
    inStock: z.boolean().optional(),
    note: z.string().trim().max(500).optional(),
  })
  .refine(
    (input) => input.stockQuantity !== undefined || input.inStock !== undefined,
    "Provide a stock quantity.",
  );

export async function PATCH(request: Request) {
  return handleRoute(async () => {
    await prepareDatabase();
    const user = await requireAuth(request, ["store_owner", "admin"]);
    const input = bodySchema.parse(await request.json());
    await requireLocationAccess(user, input.locationId);
    const db = getDb();

    const [existing] = await db
      .select({ stockQuantity: locations.stockQuantity })
      .from(locations)
      .where(
        and(eq(locations.id, input.locationId), isNull(locations.deletedAt)),
      )
      .limit(1);
    if (!existing) throw new ApiError(404, "Location not found");

    const stockQuantity =
      input.stockQuantity ??
      (input.inStock ? Math.max(existing.stockQuantity, defaultStockQuantity) : 0);
    const [location] = await db
      .update(locations)
      .set({
        stockQuantity,
        inStock: stockQuantity > 0,
        updatedAt: new Date(),
      })
      .where(
        and(eq(locations.id, input.locationId), isNull(locations.deletedAt)),
      )
      .returning();
    if (!location) throw new ApiError(404, "Location not found");

    await db.insert(inventoryEvents).values({
      locationId: location.id,
      changedByUserId: user.id,
      inStock: location.inStock,
      stockQuantity: location.stockQuantity,
      note: input.note,
    });

    let notifiedMembers = 0;
    const becameOutOfStock =
      existing.stockQuantity > 0 && location.stockQuantity === 0;
    if (becameOutOfStock) {
      const members = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.role, "member"), isNull(users.deletedAt)));
      notifiedMembers = members.length;
      if (members.length > 0) {
        await db.insert(messages).values(
          members.map((member) => ({
            recipientUserId: member.id,
            type: "out_of_stock",
            title: `Out of stock at ${location.name}`,
            body:
              input.note ??
              "Orit Tej is temporarily unavailable. We will notify you when stock returns.",
            metadata: { locationId: location.id },
          })),
        );
      }
    }

    return json({ location, notifiedMembers });
  });
}
