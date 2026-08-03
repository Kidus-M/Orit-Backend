import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { ApiError } from "@/lib/server/http";

export const locationValuesSchema = z.object({
  vendorId: z.string().uuid().nullable(),
  name: z.string().trim().min(1).max(120),
  addressLine1: z.string().trim().min(1).max(180),
  city: z.string().trim().min(1).max(100),
  state: z.string().trim().min(2).max(60),
  postalCode: z.string().trim().min(3).max(20),
  hoursText: z.string().trim().min(1).max(240),
  bottlePriceCents: z.number().int().min(0).max(1_000_000),
  stockQuantity: z.number().int().min(0).max(1_000_000),
  casePriceCents: z.number().int().min(0).max(10_000_000),
  transportationFeeCents: z.number().int().min(0).max(10_000_000),
  active: z.boolean(),
  serviceCode: z.string().regex(/^\d{4}$/).optional(),
});

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