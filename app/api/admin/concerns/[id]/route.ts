import { eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/lib/db/client";
import { prepareDatabase } from "@/lib/db/prepare";
import { concerns } from "@/lib/db/schema";
import { requireAdminCookie } from "@/lib/server/admin-auth";
import { ApiError, handleRoute, json } from "@/lib/server/http";

const bodySchema = z.object({
  status: z.enum(["new", "in_progress", "resolved"]),
  adminNotes: z.string().trim().max(500).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handleRoute(async () => {
    await prepareDatabase();
    await requireAdminCookie(request);
    const { id } = await params;
    const input = bodySchema.parse(await request.json());
    const now = new Date();
    const [concern] = await getDb()
      .update(concerns)
      .set({
        status: input.status,
        adminNotes: input.adminNotes,
        resolvedAt: input.status === "resolved" ? now : null,
        updatedAt: now,
      })
      .where(eq(concerns.id, z.string().uuid().parse(id)))
      .returning();
    if (!concern) throw new ApiError(404, "Concern not found");
    return json({ concern });
  });
}
