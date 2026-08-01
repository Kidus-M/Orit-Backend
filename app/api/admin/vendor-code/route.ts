import { z } from "zod";

import { prepareDatabase } from "@/lib/db/prepare";
import { requireAdminCookie } from "@/lib/server/admin-auth";
import { handleRoute, json } from "@/lib/server/http";
import { createVendorInvitation } from "@/lib/server/vendor-code";

const bodySchema = z.object({ code: z.string().regex(/^\d{4}$/) });

export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleRoute(async () => {
    await prepareDatabase();
    const admin = await requireAdminCookie(request);
    const input = bodySchema.parse(await request.json());
    const invitation = await createVendorInvitation(input.code, admin.id);
    return json({ invitation }, { status: 201 });
  });
}