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

const bodySchema = z.object({
  locationId: z.string().uuid(),
  inStock: z.boolean(),
  note: z.string().trim().max(500).optional(),
});

export async function PATCH(request: Request) {
  return handleRoute(async () => {
    await prepareDatabase();
    const user = await requireAuth(request, ["store_owner", "admin"]);
    const input = bodySchema.parse(await request.json());
    await requireLocationAccess(user, input.locationId);
    const db = getDb();

    const [location] = await db
      .update(locations)
      .set({ inStock: input.inStock, updatedAt: new Date() })
      .where(eq(locations.id, input.locationId))
      .returning();
    if (!location) throw new ApiError(404, "Location not found");

    await db.insert(inventoryEvents).values({
      locationId: location.id,
      changedByUserId: user.id,
      inStock: input.inStock,
      note: input.note,
    });

    let notifiedMembers = 0;
    if (!input.inStock) {
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

