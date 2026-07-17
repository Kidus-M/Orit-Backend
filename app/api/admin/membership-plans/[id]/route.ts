import { eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/lib/db/client";
import { prepareDatabase } from "@/lib/db/prepare";
import { membershipPlans } from "@/lib/db/schema";
import { requireAdminCookie } from "@/lib/server/admin-auth";
import { ApiError, handleRoute, json } from "@/lib/server/http";

const bodySchema = z
  .object({
    priceCents: z.number().int().min(0).max(100000).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => value.priceCents !== undefined || value.isActive !== undefined);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handleRoute(async () => {
    await prepareDatabase();
    await requireAdminCookie(request);
    const { id } = await params;
    const input = bodySchema.parse(await request.json());
    const [plan] = await getDb()
      .update(membershipPlans)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(membershipPlans.id, z.string().uuid().parse(id)))
      .returning();
    if (!plan) throw new ApiError(404, "Membership program not found");
    return json({ plan });
  });
}
