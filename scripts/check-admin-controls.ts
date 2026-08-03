import { randomInt, randomUUID } from "node:crypto";
import assert from "node:assert/strict";

import { config } from "dotenv";
import { and, eq, inArray, isNull } from "drizzle-orm";

config({ path: ".env.local" });
config();

import { getDb } from "@/lib/db/client";
import { locations, users, vendorInvitations } from "@/lib/db/schema";
import { deleteAdminLocation } from "@/lib/server/admin-locations";
import { ApiError } from "@/lib/server/http";
import {
  createVendorInvitation,
  releaseVendorInvitation,
  verifyVendorCode,
} from "@/lib/server/vendor-code";

async function run() {
  const db = getDb();
  const [admin] = await db
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        eq(users.role, "admin"),
        isNull(users.deletedAt),
      ),
    )
    .limit(1);
  assert(admin, "Create an admin account before running this check.");

  let invitationId: string | null = null;
  let vendorId: string | null = null;
  const locationIds: string[] = [];

  try {
    let code = "";
    for (let attempt = 0; attempt < 20; attempt += 1) {
      code = randomInt(0, 10_000).toString().padStart(4, "0");
      try {
        const invitation = await createVendorInvitation(code, admin.id);
        invitationId = invitation.id;
        break;
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 409) throw error;
      }
    }
    assert(invitationId, "Could not allocate a temporary vendor code.");

    const unique = randomUUID();
    const [vendor] = await db
      .insert(users)
      .values({
        role: "member",
        firstName: "Temporary Vendor Check",
        email: `admin-control-${unique}@example.invalid`,
        isVendor: true,
        vendorInvitationId: invitationId,
      })
      .returning({ id: users.id });
    vendorId = vendor.id;

    const locationName = `Temporary Admin Location ${unique}`;
    const [location] = await db
      .insert(locations)
      .values({
        vendorId,
        name: locationName,
        addressLine1: "1 Test Way",
        city: "San Jose",
        state: "CA",
        postalCode: "95112",
        hoursText: "Test hours",
        stockQuantity: 24,
        inStock: true,
        active: true,
      })
      .returning({ id: locations.id });
    locationIds.push(location.id);

    await releaseVendorInvitation(invitationId);
    const [releasedVendor] = await db
      .select({
        isVendor: users.isVendor,
        vendorInvitationId: users.vendorInvitationId,
      })
      .from(users)
      .where(eq(users.id, vendorId))
      .limit(1);
    assert.equal(releasedVendor?.isVendor, false);
    assert.equal(releasedVendor?.vendorInvitationId, null);

    const [unassignedLocation] = await db
      .select({ vendorId: locations.vendorId })
      .from(locations)
      .where(eq(locations.id, location.id))
      .limit(1);
    assert.equal(unassignedLocation?.vendorId, null);
    assert.equal(await verifyVendorCode(code), invitationId);

    await deleteAdminLocation(location.id);
    const [deletedLocation] = await db
      .select({
        active: locations.active,
        inStock: locations.inStock,
        deletedAt: locations.deletedAt,
      })
      .from(locations)
      .where(eq(locations.id, location.id))
      .limit(1);
    assert.equal(deletedLocation?.active, false);
    assert.equal(deletedLocation?.inStock, false);
    assert(deletedLocation?.deletedAt);

    const [replacement] = await db
      .insert(locations)
      .values({
        name: locationName,
        addressLine1: "2 Test Way",
        city: "San Jose",
        state: "CA",
        postalCode: "95112",
        hoursText: "Replacement test hours",
        stockQuantity: 24,
        inStock: true,
        active: true,
      })
      .returning({ id: locations.id });
    locationIds.push(replacement.id);

    console.log("Admin controls check passed.");
  } finally {
    if (locationIds.length > 0) {
      await db.delete(locations).where(inArray(locations.id, locationIds));
    }
    if (vendorId) {
      await db.delete(users).where(eq(users.id, vendorId));
    }
    if (invitationId) {
      await db
        .delete(vendorInvitations)
        .where(eq(vendorInvitations.id, invitationId));
    }
  }
}

run().catch((error) => {
  console.error("Admin controls check failed:", error);
  process.exitCode = 1;
});
