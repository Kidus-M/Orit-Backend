import { prepareDatabase } from "@/lib/db/prepare";
import { requireAuth } from "@/lib/server/auth";
import { getComplimentaryBottleBenefit } from "@/lib/server/benefits";
import { handleRoute, json } from "@/lib/server/http";

export async function GET(request: Request) {
  return handleRoute(async () => {
    await prepareDatabase();
    const member = await requireAuth(request, ["member"]);
    const result = await getComplimentaryBottleBenefit(member.id);
    return json({
      ...result,
      rules: {
        intervalMonths: 2,
        expiresAtEndOfEligibilityMonth: true,
        expiresOnRedemption: true,
      },
    });
  });
}

