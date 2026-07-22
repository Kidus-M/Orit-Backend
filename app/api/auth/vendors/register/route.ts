import { eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/lib/db/client";
import { prepareDatabase } from "@/lib/db/prepare";
import { users } from "@/lib/db/schema";
import { createSession } from "@/lib/server/auth";
import { ApiError, handleRoute, json } from "@/lib/server/http";
import { verifyVendorCodeRequest } from "@/lib/server/vendor-code";

const bodySchema = z.object({
  businessName: z.string().trim().min(1).max(120),
  businessEmail: z.string().trim().email().transform((value) => value.toLowerCase()),
  vendorCode: z.string().regex(/^\d{4}$/),
});

export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleRoute(async () => {
    await prepareDatabase();
    const input = bodySchema.parse(await request.json());
    const valid = await verifyVendorCodeRequest(request, input.vendorCode);
    if (valid === null) {
      throw new ApiError(503, "Vendor access is not configured yet.");
    }
    if (!valid) throw new ApiError(401, "Vendor code is incorrect.");

    const db = getDb();
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, input.businessEmail))
      .limit(1);
    if (existing) throw new ApiError(409, "An account already uses this email.");

    const [user] = await db
      .insert(users)
      .values({
        role: "member",
        firstName: input.businessName,
        storeName: input.businessName,
        email: input.businessEmail,
        isVendor: true,
      })
      .returning({
        id: users.id,
        role: users.role,
        firstName: users.firstName,
        email: users.email,
        storeName: users.storeName,
        isVendor: users.isVendor,
      });
    const session = await createSession(user.id);
    return json({ user, session }, { status: 201 });
  });
}
