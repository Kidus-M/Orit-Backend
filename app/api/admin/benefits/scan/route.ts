import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/lib/db/client";
import { prepareDatabase } from "@/lib/db/prepare";
import {
  complimentaryBenefits,
  messages,
  users,
} from "@/lib/db/schema";
import { requireAuth } from "@/lib/server/auth";
import { ApiError, handleRoute, json } from "@/lib/server/http";

const bodySchema = z.object({ code: z.string().trim().min(8).max(100) });

export async function POST(request: Request) {
  return handleRoute(async () => {
    await prepareDatabase();
    const scanner = await requireAuth(request, ["store_owner", "admin"]);
    const input = bodySchema.parse(await request.json());
    const db = getDb();

    const [benefit] = await db
      .select()
      .from(complimentaryBenefits)
      .where(eq(complimentaryBenefits.code, input.code))
      .limit(1);
    if (!benefit) throw new ApiError(404, "Complimentary benefit not found");

    if (benefit.status === "redeemed") {
      throw new ApiError(409, "Complimentary bottle already scanned and served", {
        status: "already_served",
        redeemedAt: benefit.redeemedAt,
      });
    }

    const now = new Date();
    if (benefit.status === "expired" || benefit.expiresAt < now) {
      await db
        .update(complimentaryBenefits)
        .set({ status: "expired", updatedAt: now })
        .where(eq(complimentaryBenefits.id, benefit.id));
      throw new ApiError(410, "Complimentary bottle offer has expired");
    }

    const [redeemed] = await db
      .update(complimentaryBenefits)
      .set({
        status: "redeemed",
        redeemedAt: now,
        redeemedByUserId: scanner.id,
        updatedAt: now,
      })
      .where(
        and(
          eq(complimentaryBenefits.id, benefit.id),
          eq(complimentaryBenefits.status, "available"),
        ),
      )
      .returning();

    if (!redeemed) {
      throw new ApiError(409, "Complimentary bottle was already processed");
    }

    const admins = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.role, "admin"), isNull(users.deletedAt)));
    const recipientIds = [
      ...new Set([benefit.memberId, ...admins.map((admin) => admin.id)]),
    ];

    await db.insert(messages).values(
      recipientIds.map((recipientUserId) => ({
        recipientUserId,
        type: "complimentary_bottle_redeemed",
        title: "Complimentary bottle received",
        body: "The complimentary bottle was scanned and served.",
        metadata: {
          benefitId: benefit.id,
          scannedByUserId: scanner.id,
          redeemedAt: now.toISOString(),
        },
      })),
    );

    return json({ status: "served", benefit: redeemed });
  });
}


