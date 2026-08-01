import { z } from "zod";

import { prepareDatabase } from "@/lib/db/prepare";
import { requireAdminCookie } from "@/lib/server/admin-auth";
import { handleRoute, json } from "@/lib/server/http";
import { revokeVendorInvitation } from "@/lib/server/vendor-code";

export const runtime = "nodejs";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handleRoute(async () => {
    await prepareDatabase();
    await requireAdminCookie(request);
    const { id } = await params;
    await revokeVendorInvitation(z.string().uuid().parse(id));
    return json({ revoked: true });
  });
}