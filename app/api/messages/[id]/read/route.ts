import { and, eq } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import { prepareDatabase } from "@/lib/db/prepare";
import { messages } from "@/lib/db/schema";
import { requireAuth } from "@/lib/server/auth";
import { ApiError, handleRoute, json } from "@/lib/server/http";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handleRoute(async () => {
    await prepareDatabase();
    const user = await requireAuth(request);
    const { id } = await params;
    const [message] = await getDb()
      .update(messages)
      .set({ readAt: new Date() })
      .where(
        and(eq(messages.id, id), eq(messages.recipientUserId, user.id)),
      )
      .returning();
    if (!message) throw new ApiError(404, "Message not found");
    return json({ message });
  });
}

