import { eq } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import { prepareDatabase } from "@/lib/db/prepare";
import { sessions } from "@/lib/db/schema";
import {
  clearSessionCookie,
  getSessionToken,
  hashSessionToken,
} from "@/lib/server/auth";
import { handleRoute } from "@/lib/server/http";

export async function POST(request: Request) {
  return handleRoute(async () => {
    await prepareDatabase();
    const token = getSessionToken(request);

    if (token) {
      await getDb()
        .delete(sessions)
        .where(eq(sessions.tokenHash, hashSessionToken(token)));
    }
    return new Response(null, {
      status: 204,
      headers: { "set-cookie": clearSessionCookie(request) },
    });
  });
}
