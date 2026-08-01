import { eq, sql } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/lib/db/client";
import { prepareDatabase } from "@/lib/db/prepare";
import { users, vendorInvitations } from "@/lib/db/schema";
import { createSession } from "@/lib/server/auth";
import { ApiError, handleRoute, json } from "@/lib/server/http";
import { verifyVendorCodeRequest } from "@/lib/server/vendor-code";

const bodySchema = z.object({
  businessName: z.string().trim().min(1).max(120),
  businessEmail: z
    .string()
    .trim()
    .email()
    .transform((value) => value.toLowerCase()),
  vendorCode: z.string().regex(/^\d{4}$/),
});

type RegisteredVendor = {
  id: string;
  role: string;
  firstName: string;
  email: string;
  storeName: string | null;
  isVendor: boolean;
};

export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleRoute(async () => {
    await prepareDatabase();
    const input = bodySchema.parse(await request.json());
    const invitationId = await verifyVendorCodeRequest(
      request,
      input.vendorCode,
    );
    if (invitationId === null) {
      throw new ApiError(503, "Vendor access is not configured yet.");
    }
    if (!invitationId) {
      throw new ApiError(401, "Vendor code is incorrect or already used.");
    }

    const db = getDb();
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, input.businessEmail))
      .limit(1);
    if (existing) throw new ApiError(409, "An account already uses this email.");

    const result = await db.execute<RegisteredVendor>(sql`
      insert into ${users} (
        role,
        first_name,
        email,
        store_name,
        vendor_invitation_id,
        is_vendor
      )
      select
        'member',
        ${input.businessName},
        ${input.businessEmail},
        ${input.businessName},
        ${vendorInvitations.id},
        true
      from ${vendorInvitations}
      left join ${users} as claimed_vendor
        on claimed_vendor.vendor_invitation_id = ${vendorInvitations.id}
      where ${vendorInvitations.id} = ${invitationId}
        and ${vendorInvitations.revokedAt} is null
        and claimed_vendor.id is null
      returning
        id,
        role,
        first_name as "firstName",
        email,
        store_name as "storeName",
        is_vendor as "isVendor"
    `);
    const user = result.rows[0];
    if (!user) {
      throw new ApiError(409, "This vendor code has already been used.");
    }

    const session = await createSession(user.id);
    return json({ user, session }, { status: 201 });
  });
}