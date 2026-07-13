import { asc, eq } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import { prepareDatabase } from "@/lib/db/prepare";
import { membershipPlans } from "@/lib/db/schema";
import { handleRoute, json } from "@/lib/server/http";

export async function GET() {
  return handleRoute(async () => {
    await prepareDatabase();
    const plans = await getDb()
      .select()
      .from(membershipPlans)
      .where(eq(membershipPlans.isActive, true))
      .orderBy(asc(membershipPlans.durationMonths));
    return json({ plans, autoRenewRequired: true });
  });
}

