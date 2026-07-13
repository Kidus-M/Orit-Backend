import { eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/lib/db/client";
import { prepareDatabase } from "@/lib/db/prepare";
import { users } from "@/lib/db/schema";
import { createSession } from "@/lib/server/auth";
import { ApiError, handleRoute, json } from "@/lib/server/http";
import { hashPassword } from "@/lib/server/passwords";

const bodySchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: z
    .string()
    .min(10, "Password must be at least 10 characters")
    .max(128)
    .regex(/[A-Z]/, "Password must include an uppercase letter")
    .regex(/[a-z]/, "Password must include a lowercase letter")
    .regex(/\d/, "Password must include a number"),
});

export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleRoute(async () => {
    await prepareDatabase();
    const input = bodySchema.parse(await request.json());
    const db = getDb();

    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, input.email))
      .limit(1);
    if (existing) throw new ApiError(409, "An account already uses this email");

    const passwordHash = await hashPassword(input.password);
    const [user] = await db
      .insert(users)
      .values({
        firstName: input.firstName,
        email: input.email,
        role: "member",
        passwordHash,
      })
      .returning({
        id: users.id,
        role: users.role,
        firstName: users.firstName,
        email: users.email,
        storeName: users.storeName,
      });
    const session = await createSession(user.id);

    return json({ user, session }, { status: 201 });
  });
}
