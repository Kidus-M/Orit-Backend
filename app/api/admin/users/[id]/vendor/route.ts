import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/lib/db/client";
import { prepareDatabase } from "@/lib/db/prepare";
import { users } from "@/lib/db/schema";
import { requireAdminCookie } from "@/lib/server/admin-auth";
import { ApiError, handleRoute, json } from "@/lib/server/http";

const bodySchema = z.object({ isVendor: z.boolean() });

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handleRoute(async () => {
    await prepareDatabase();
    await requireAdminCookie(request);
    const { id } = await params;
    const input = bodySchema.parse(await request.json());

    const [user] = await getDb()
      .update(users)
      .set({ isVendor: input.isVendor, updatedAt: new Date() })
      .where(
        and(
          eq(users.id, z.string().uuid().parse(id)),
          eq(users.role, "member"),
          isNull(users.deletedAt),
        ),
      )
      .returning({
        id: users.id,
        firstName: users.firstName,
        email: users.email,
        isVendor: users.isVendor,
      });

    if (!user) throw new ApiError(404, "Member account not found");
    return json({ user });
  });
}