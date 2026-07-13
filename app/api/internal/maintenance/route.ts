import { timingSafeEqual } from "node:crypto";

import { getEnv } from "@/lib/env";
import { prepareDatabase } from "@/lib/db/prepare";
import { ApiError, handleRoute, json } from "@/lib/server/http";
import { runMaintenance } from "@/lib/server/maintenance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function requireCronSecret(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const expected = getEnv().CRON_SECRET;
  const actualBuffer = Buffer.from(token ?? "");
  const expectedBuffer = Buffer.from(expected);

  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    throw new ApiError(401, "Invalid maintenance credential");
  }
}

async function run(request: Request) {
  return handleRoute(async () => {
    requireCronSecret(request);
    await prepareDatabase();
    const summary = await runMaintenance();
    return json({ ok: true, ...summary });
  });
}

export const GET = run;
export const POST = run;
