import { prepareDatabase } from "@/lib/db/prepare";
import { handleRoute, json } from "@/lib/server/http";

export const runtime = "nodejs";

export async function GET() {
  return handleRoute(async () => {
    await prepareDatabase();
    return json({ ok: true, service: "orit-tej-backend" });
  });
}

