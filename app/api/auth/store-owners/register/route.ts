import { eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/lib/db/client";
import { prepareDatabase } from "@/lib/db/prepare";
import { locationStaff, locations, users } from "@/lib/db/schema";
import { createSession } from "@/lib/server/auth";
import { ApiError, handleRoute, json } from "@/lib/server/http";
import { hashPassword } from "@/lib/server/passwords";
import { fourDigitPinSchema } from "@/lib/server/pins";

const bodySchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: fourDigitPinSchema,
  storeName: z.string().trim().min(2).max(160),
  locationId: z.string().uuid(),
});

export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleRoute(async () => {
    await prepareDatabase();
    const input = bodySchema.parse(await request.json());
    const db = getDb();

    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, input.email))
      .limit(1);
    if (existing) throw new ApiError(409, "An account already uses this email");

    const [location] = await db
      .select({ id: locations.id })
      .from(locations)
      .where(eq(locations.id, input.locationId))
      .limit(1);
    if (!location) throw new ApiError(404, "Pickup location not found");

    const passwordHash = await hashPassword(input.password);
    const [user] = await db
      .insert(users)
      .values({
        role: "store_owner",
        firstName: input.firstName,
        email: input.email,
        passwordHash,
        storeName: input.storeName,
      })
      .returning({
        id: users.id,
        role: users.role,
        firstName: users.firstName,
        email: users.email,
        storeName: users.storeName,
      });
    await db.insert(locationStaff).values({
      locationId: location.id,
      userId: user.id,
    });
    const session = await createSession(user.id);

    return json({ user, session }, { status: 201 });
  });
}

