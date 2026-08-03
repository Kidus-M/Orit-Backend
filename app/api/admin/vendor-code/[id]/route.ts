import { z } from "zod";

import { prepareDatabase } from "@/lib/db/prepare";
import { requireAdminCookie } from "@/lib/server/admin-auth";
import { handleRoute, json } from "@/lib/server/http";
import {
  releaseVendorInvitation,
  revokeVendorInvitation,
} from "@/lib/server/vendor-code";

const updateSchema = z.object({ status: z.literal("pending") });

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handleRoute(async () => {
    await prepareDatabase();
    await requireAdminCookie(request);
    const { id } = await params;
    updateSchema.parse(await request.json());
    const released = await releaseVendorInvitation(
      z.string().uuid().parse(id),
    );
    return json({ invitation: { id, status: "pending" }, released });
  });
}

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
