import { desc, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/lib/db/client";
import { prepareDatabase } from "@/lib/db/prepare";
import { concerns } from "@/lib/db/schema";
import { requireAuth } from "@/lib/server/auth";
import { handleRoute, json } from "@/lib/server/http";

const bodySchema = z.object({
  message: z.string().trim().min(10).max(500),
});

export const runtime = "nodejs";

export async function GET(request: Request) {
  return handleRoute(async () => {
    await prepareDatabase();
    const member = await requireAuth(request, ["member"]);
    const items = await getDb()
      .select({
        id: concerns.id,
        message: concerns.message,
        status: concerns.status,
        createdAt: concerns.createdAt,
        updatedAt: concerns.updatedAt,
      })
      .from(concerns)
      .where(eq(concerns.memberId, member.id))
      .orderBy(desc(concerns.createdAt));
    return json({ concerns: items });
  });
}

export async function POST(request: Request) {
  return handleRoute(async () => {
    await prepareDatabase();
    const member = await requireAuth(request, ["member"]);
    const input = bodySchema.parse(await request.json());

    const [concern] = await getDb()
      .insert(concerns)
      .values({ memberId: member.id, message: input.message })
      .returning({
        id: concerns.id,
        status: concerns.status,
        createdAt: concerns.createdAt,
      });

    return json({ concern }, { status: 201 });
  });
}
