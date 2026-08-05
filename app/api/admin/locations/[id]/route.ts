import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/lib/db/client";
import { prepareDatabase } from "@/lib/db/prepare";
import { locations } from "@/lib/db/schema";
import { requireAdminCookie } from "@/lib/server/admin-auth";
import {
  assertLocationCanBeActive,
  deleteAdminLocation,
  locationValuesSchema,
  requireVendor,
} from "@/lib/server/admin-locations";
import { ApiError, handleRoute, json } from "@/lib/server/http";
import { hashServiceCode } from "@/lib/server/pickup";

const updateSchema = locationValuesSchema.partial().refine(
  (values) => Object.keys(values).length > 0,
  "Provide at least one location field.",
);

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handleRoute(async () => {
    await prepareDatabase();
    await requireAdminCookie(request);
    const { id } = await params;
    const locationId = z.string().uuid().parse(id);
    const input = updateSchema.parse(await request.json());
    const [existing] = await getDb()
      .select()
      .from(locations)
      .where(
        and(eq(locations.id, locationId), isNull(locations.deletedAt)),
      )
      .limit(1);
    if (!existing) throw new ApiError(404, "Location not found.");

    assertLocationCanBeActive({
      active: input.active ?? existing.active,
      state: input.state ?? existing.state,
      abcLicenseType:
        input.abcLicenseType ?? existing.abcLicenseType,
      abcLicenseNumber:
        input.abcLicenseNumber ?? existing.abcLicenseNumber,
      responsibleOperator:
        input.responsibleOperator ?? existing.responsibleOperator,
      complianceApproved:
        input.complianceApproved ?? existing.complianceApproved,
    });

    if (input.vendorId !== undefined) await requireVendor(input.vendorId);
    const { serviceCode, stockQuantity, ...values } = input;
    const [location] = await getDb()
      .update(locations)
      .set({
        ...values,
        ...(stockQuantity !== undefined
          ? { stockQuantity, inStock: stockQuantity > 0 }
          : {}),
        ...(serviceCode
          ? { serviceCodeHash: hashServiceCode(serviceCode) }
          : {}),
        updatedAt: new Date(),
      })
      .where(
        and(eq(locations.id, locationId), isNull(locations.deletedAt)),
      )
      .returning();
    if (!location) throw new ApiError(404, "Location not found.");
    return json({ location });
  });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handleRoute(async () => {
    await prepareDatabase();
    await requireAdminCookie(request);
    const { id } = await params;
    const locationId = z.string().uuid().parse(id);
    const location = await deleteAdminLocation(locationId);
    return json({ deleted: true, locationId: location.id });
  });
}
