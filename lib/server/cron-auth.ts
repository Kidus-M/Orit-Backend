import { timingSafeEqual } from "node:crypto";

import { getEnv } from "@/lib/env";
import { ApiError } from "@/lib/server/http";

export function requireCronSecret(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const expected = getEnv().CRON_SECRET;
  const actualBuffer = Buffer.from(token ?? "");
  const expectedBuffer = Buffer.from(expected);
  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    throw new ApiError(401, "Invalid cron credential");
  }
}