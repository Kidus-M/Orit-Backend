import { prepareDatabase } from "@/lib/db/prepare";
import { requireCronSecret } from "@/lib/server/cron-auth";
import { handleRoute, json } from "@/lib/server/http";
import { runMaintenance } from "@/lib/server/maintenance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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