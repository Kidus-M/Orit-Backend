import { z } from "zod";

import { prepareDatabase } from "@/lib/db/prepare";
import { ApiError, handleRoute, json } from "@/lib/server/http";
import { verifyVendorCodeRequest } from "@/lib/server/vendor-code";

const bodySchema = z.object({ code: z.string().regex(/^\d{4}$/) });

export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleRoute(async () => {
    await prepareDatabase();
    const input = bodySchema.parse(await request.json());
    const valid = await verifyVendorCodeRequest(request, input.code);
    if (valid === null) {
      throw new ApiError(503, "Vendor access is not configured yet.");
    }
    if (!valid) throw new ApiError(401, "Vendor code is incorrect.");
    return json({ valid: true });
  });
}
