import { eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/lib/db/client";
import { prepareDatabase } from "@/lib/db/prepare";
import { users } from "@/lib/db/schema";
import { createSession } from "@/lib/server/auth";
import { ApiError, handleRoute, json } from "@/lib/server/http";
import { verifyPassword } from "@/lib/server/passwords";

const bodySchema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128),
});

export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleRoute(async () => {
    await prepareDatabase();
    const input = bodySchema.parse(await request.json());
    const [user] = await getDb()
      .select()
      .from(users)
      .where(eq(users.email, input.email))
      .limit(1);

    const valid =
      user?.passwordHash &&
      !user.deletedAt &&
      (await verifyPassword(input.password, user.passwordHash));
    if (!valid || !user) {
      throw new ApiError(401, "Email or password is incorrect");
    }

    const session = await createSession(user.id);
    return json({
      user: {
        id: user.id,
        role: user.role,
        firstName: user.firstName,
        email: user.email,
        storeName: user.storeName,
      },
      session,
    });
  });
}
