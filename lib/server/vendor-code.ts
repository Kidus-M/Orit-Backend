import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

import { and, eq, gte } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import { appSettings, vendorCodeAccessAttempts } from "@/lib/db/schema";
import { getEnv } from "@/lib/env";
import { ApiError } from "@/lib/server/http";

export const vendorCodeSettingKey = "vendor_access_code_hash";
const vendorCodeEncryptedSettingKey = "vendor_access_code_encrypted";
const attemptWindowMinutes = 15;
const attemptLimit = 5;

function hmac(value: string) {
  return createHmac("sha256", getEnv().PASSWORD_PEPPER)
    .update(value)
    .digest("hex");
}

function encryptionKey() {
  return createHash("sha256")
    .update(`vendor-code-encryption:${getEnv().PASSWORD_PEPPER}`)
    .digest();
}

function encryptVendorCode(code: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(code, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted]
    .map((part) => part.toString("base64url"))
    .join(".");
}

function decryptVendorCode(value: string) {
  try {
    const [ivValue, tagValue, encryptedValue] = value.split(".");
    if (!ivValue || !tagValue || !encryptedValue) return null;
    const decipher = createDecipheriv(
      "aes-256-gcm",
      encryptionKey(),
      Buffer.from(ivValue, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(encryptedValue, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return null;
  }
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

export async function getVendorCodeForAdmin() {
  const [setting] = await getDb()
    .select({ value: appSettings.value })
    .from(appSettings)
    .where(eq(appSettings.key, vendorCodeEncryptedSettingKey))
    .limit(1);
  return setting ? decryptVendorCode(setting.value) : null;
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

async function upsertSetting(
  key: string,
  value: string,
  adminId: string,
  now: Date,
) {
  await getDb()
    .insert(appSettings)
    .values({ key, value, updatedByUserId: adminId })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value, updatedByUserId: adminId, updatedAt: now },
    });
}

export async function setVendorCode(code: string, adminId: string) {
  const now = new Date();
  await Promise.all([
    upsertSetting(vendorCodeSettingKey, hashVendorCode(code), adminId, now),
    upsertSetting(
      vendorCodeEncryptedSettingKey,
      encryptVendorCode(code),
      adminId,
      now,
    ),
  ]);
}