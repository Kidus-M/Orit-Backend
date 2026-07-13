import { eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/lib/db/client";
import { prepareDatabase } from "@/lib/db/prepare";
import { sessions, users } from "@/lib/db/schema";
import { requireAuth } from "@/lib/server/auth";
import { handleRoute, json } from "@/lib/server/http";

const patchSchema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
});

export const runtime = "nodejs";

export async function GET(request: Request) {
  return handleRoute(async () => {
    await prepareDatabase();
    return json({ user: await requireAuth(request) });
  });
}

export async function PATCH(request: Request) {
  return handleRoute(async () => {
    await prepareDatabase();
    const user = await requireAuth(request);
    const input = patchSchema.parse(await request.json());
    const [updated] = await getDb()
      .update(users)
      .set({ email: input.email, updatedAt: new Date() })
      .where(eq(users.id, user.id))
      .returning();
    return json({ user: updated });
  });
}

export async function DELETE(request: Request) {
  return handleRoute(async () => {
    await prepareDatabase();
    const user = await requireAuth(request);
    const now = new Date();
    await getDb()
      .update(users)
      .set({
        email: `deleted-${user.id}@invalid.local`,
        deletedAt: now,
        updatedAt: now,
      })
      .where(eq(users.id, user.id));
    await getDb().delete(sessions).where(eq(sessions.userId, user.id));
    return new Response(null, { status: 204 });
  });
}

