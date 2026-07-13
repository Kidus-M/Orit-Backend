import { messages } from "@/lib/db/schema";
import { getDb } from "@/lib/db/client";

export async function sendMessage(input: {
  recipientUserId: string;
  type: string;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
}) {
  const [message] = await getDb()
    .insert(messages)
    .values({
      ...input,
      metadata: input.metadata ?? {},
    })
    .returning();
  return message;
}

