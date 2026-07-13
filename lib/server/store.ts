import { and, eq } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import { locationStaff } from "@/lib/db/schema";
import { AuthenticatedUser } from "@/lib/server/auth";
import { ApiError } from "@/lib/server/http";

export async function requireLocationAccess(
  user: AuthenticatedUser,
  locationId: string,
) {
  if (user.role === "admin") return;

  const [assignment] = await getDb()
    .select({ id: locationStaff.id })
    .from(locationStaff)
    .where(
      and(
        eq(locationStaff.userId, user.id),
        eq(locationStaff.locationId, locationId),
      ),
    )
    .limit(1);

  if (!assignment) {
    throw new ApiError(403, "You are not assigned to this location");
  }
}

export async function getStaffLocationIds(user: AuthenticatedUser) {
  if (user.role === "admin") return null;
  const rows = await getDb()
    .select({ locationId: locationStaff.locationId })
    .from(locationStaff)
    .where(eq(locationStaff.userId, user.id));
  return rows.map((row) => row.locationId);
}

