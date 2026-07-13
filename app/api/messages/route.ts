import { desc, eq } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import { prepareDatabase } from "@/lib/db/prepare";
import { messages } from "@/lib/db/schema";
import { requireAuth } from "@/lib/server/auth";
import { handleRoute, json } from "@/lib/server/http";

export async function GET(request: Request) {
  return handleRoute(async () => {
    await prepareDatabase();
    const user = await requireAuth(request);
    const result = await getDb()
      .select()
      .from(messages)
      .where(eq(messages.recipientUserId, user.id))
      .orderBy(desc(messages.createdAt));
    return json({
      messages: result,
      unreadCount: result.filter((message) => !message.readAt).length,
      canSend: false,
    });
  });
}

