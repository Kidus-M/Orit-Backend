import { prepareDatabase } from "@/lib/db/prepare";
import { requireCronSecret } from "@/lib/server/cron-auth";
import { handleRoute, json } from "@/lib/server/http";
import { sendMonthlyVendorSummary } from "@/lib/server/monthly-summary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return handleRoute(async () => {
    requireCronSecret(request);
    await prepareDatabase();
    const result = await sendMonthlyVendorSummary();
    return json({ ok: true, ...result });
  });
}