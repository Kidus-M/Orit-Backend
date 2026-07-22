import { createHmac, timingSafeEqual } from "node:crypto";

import { and, eq, gte } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import { appSettings, vendorCodeAccessAttempts } from "@/lib/db/schema";
import { getEnv } from "@/lib/env";
import { ApiError } from "@/lib/server/http";

export const vendorCodeSettingKey = "vendor_access_code_hash";
const attemptWindowMinutes = 15;
const attemptLimit = 5;

function hmac(value: string) {
  return createHmac("sha256", getEnv().PASSWORD_PEPPER)
    .update(value)
    .digest("hex");
}

export function hashVendorCode(code: string) {
  return hmac(`vendor-access:${code}`);
}

function clientAddress(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function hasVendorCode() {
  const [setting] = await getDb()
    .select({ key: appSettings.key })
    .from(appSettings)
    .where(eq(appSettings.key, vendorCodeSettingKey))
    .limit(1);
  return Boolean(setting);
}

export async function verifyVendorCode(code: string) {
  const [setting] = await getDb()
    .select({ value: appSettings.value })
    .from(appSettings)
    .where(eq(appSettings.key, vendorCodeSettingKey))
    .limit(1);
  if (!setting) return null;

  const expected = Buffer.from(setting.value, "hex");
  const received = Buffer.from(hashVendorCode(code), "hex");
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export async function verifyVendorCodeRequest(request: Request, code: string) {
  const ipHash = hmac(`vendor-code-attempt:${clientAddress(request)}`);
  const attemptWindow = new Date(
    Date.now() - attemptWindowMinutes * 60 * 1000,
  );
  const failures = await getDb()
    .select({ id: vendorCodeAccessAttempts.id })
    .from(vendorCodeAccessAttempts)
    .where(
      and(
        eq(vendorCodeAccessAttempts.ipHash, ipHash),
        eq(vendorCodeAccessAttempts.succeeded, false),
        gte(vendorCodeAccessAttempts.createdAt, attemptWindow),
      ),
    );
  if (failures.length >= attemptLimit) {
    throw new ApiError(
      429,
      "Too many incorrect vendor code attempts. Try again in 15 minutes.",
    );
  }

  const valid = await verifyVendorCode(code);
  if (valid) {
    await getDb()
      .delete(vendorCodeAccessAttempts)
      .where(eq(vendorCodeAccessAttempts.ipHash, ipHash));
  } else if (valid === false) {
    await getDb().insert(vendorCodeAccessAttempts).values({ ipHash });
  }
  return valid;
}

export async function setVendorCode(code: string, adminId: string) {
  const now = new Date();
  await getDb()
    .insert(appSettings)
    .values({
      key: vendorCodeSettingKey,
      value: hashVendorCode(code),
      updatedByUserId: adminId,
    })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: {
        value: hashVendorCode(code),
        updatedByUserId: adminId,
        updatedAt: now,
      },
    });
}