import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/lib/db/client";
import { locations, users } from "@/lib/db/schema";
import { ApiError } from "@/lib/server/http";

export const LEYOU_LOCATION_ID =
  "0f6fd071-46c6-4f2d-8e53-3d8e0895df98";

export function isGrandfatheredLocation(locationId: string) {
  return locationId === LEYOU_LOCATION_ID;
}

export const locationValuesSchema = z.object({
  vendorId: z.string().uuid().nullable(),
  name: z.string().trim().min(1).max(120),
  addressLine1: z.string().trim().min(1).max(180),
  city: z.string().trim().min(1).max(100),
  state: z.string().trim().min(2).max(60).transform((value) => value.toUpperCase()),
  postalCode: z.string().trim().min(3).max(20),
  hoursText: z.string().trim().min(1).max(240),
  abcLicenseType: z.string().trim().max(80),
  abcLicenseNumber: z.string().trim().max(50),
  responsibleOperator: z.string().trim().max(120),
  complianceApproved: z.boolean(),
  bottlePriceCents: z.number().int().min(0).max(1_000_000),
  stockQuantity: z.number().int().min(0).max(1_000_000),
  casePriceCents: z.number().int().min(0).max(10_000_000),
  transportationFeeCents: z.number().int().min(0).max(10_000_000),
  active: z.boolean(),
  serviceCode: z.string().regex(/^\d{4}$/).optional(),
});

export function assertLocationCanBeActive(values: {
  active: boolean;
  state: string;
  abcLicenseType: string | null;
  abcLicenseNumber: string | null;
  responsibleOperator: string | null;
  complianceApproved: boolean;
}) {
  if (!values.active) return;
  if (values.state.trim().toUpperCase() !== "CA") {
    throw new ApiError(
      400,
      "Customer-visible pickup locations must be in California.",
    );
  }
  if (
    !values.complianceApproved ||
    !values.abcLicenseType?.trim() ||
    !values.abcLicenseNumber?.trim() ||
    !values.responsibleOperator?.trim()
  ) {
    throw new ApiError(
      400,
      "Approve compliance and add the ABC license type, license number, and responsible operator before making this location visible.",
    );
  }
}

export async function requireVendor(vendorId: string | null) {
  if (!vendorId) return;
  const [vendor] = await getDb()
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        eq(users.id, vendorId),
        eq(users.role, "member"),
        eq(users.isVendor, true),
        isNull(users.deletedAt),
      ),
    )
    .limit(1);
  if (!vendor) throw new ApiError(404, "Vendor account not found.");
}

export async function deleteAdminLocation(locationId: string) {
  const now = new Date();
  const [location] = await getDb()
    .update(locations)
    .set({
      active: false,
      inStock: false,
      vendorId: null,
      complianceApproved: false,
      deletedAt: now,
      updatedAt: now,
    })
    .where(
      and(eq(locations.id, locationId), isNull(locations.deletedAt)),
    )
    .returning({ id: locations.id });
  if (!location) throw new ApiError(404, "Location not found.");
  return location;
}
