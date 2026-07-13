import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { and, count, eq, gte } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import {
  locations,
  orders,
  pickupAccessAttempts,
  users,
} from "@/lib/db/schema";
import { getEnv } from "@/lib/env";
import { ApiError } from "@/lib/server/http";

const tokenPattern = /^[A-Za-z0-9_-]{32,100}$/;
const failedAttemptLimit = 5;
const attemptWindowMinutes = 15;

function hmac(purpose: string, value: string) {
  return createHmac("sha256", getEnv().PICKUP_SECURITY_PEPPER)
    .update(`${purpose}:${value}`)
    .digest("hex");
}

export function hashPickupToken(token: string) {
  return hmac("pickup-token", token);
}

export function hashServiceCode(code: string) {
  return hmac("service-code", code);
}

function hashIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  const address =
    forwarded?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  return hmac("pickup-ip", address);
}

function matchesHash(actual: string, expected: string) {
  const actualBuffer = Buffer.from(actual, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

export function createPickupCredential(tokenOverride?: string) {
  const token = tokenOverride ?? randomBytes(32).toString("base64url");
  const expiresAt = new Date();
  expiresAt.setUTCDate(
    expiresAt.getUTCDate() + getEnv().PICKUP_QR_TTL_DAYS,
  );

  const pickupUrl = new URL(
    `/pickup/${token}`,
    getEnv().PUBLIC_APP_URL,
  ).toString();

  return {
    token,
    tokenHash: hashPickupToken(token),
    expiresAt,
    pickupUrl,
  };
}

export async function pickupTokenIsActive(token: string) {
  if (!tokenPattern.test(token)) return false;
  const [result] = await getDb()
    .select({
      status: orders.status,
      expiresAt: orders.pickupTokenExpiresAt,
    })
    .from(orders)
    .where(eq(orders.pickupTokenHash, hashPickupToken(token)))
    .limit(1);

  return Boolean(
    result &&
      result.status === "pending" &&
      result.expiresAt &&
      result.expiresAt > new Date(),
  );
}

export async function authorizePickup(
  request: Request,
  token: string,
  serviceCode: string,
) {
  if (!tokenPattern.test(token)) {
    throw new ApiError(404, "Pickup QR code is invalid");
  }

  const db = getDb();
  const [result] = await db
    .select({
      orderId: orders.id,
      status: orders.status,
      paid: orders.paid,
      quantity: orders.quantity,
      totalCents: orders.totalCents,
      expiresAt: orders.pickupTokenExpiresAt,
      customerName: users.firstName,
      customerEmail: users.email,
      memberId: users.id,
      locationName: locations.name,
      serviceCodeHash: locations.serviceCodeHash,
    })
    .from(orders)
    .innerJoin(users, eq(users.id, orders.memberId))
    .innerJoin(locations, eq(locations.id, orders.locationId))
    .where(eq(orders.pickupTokenHash, hashPickupToken(token)))
    .limit(1);

  if (!result) throw new ApiError(404, "Pickup QR code is invalid");
  if (!result.expiresAt || result.expiresAt <= new Date()) {
    throw new ApiError(410, "Pickup QR code has expired");
  }
  if (!result.serviceCodeHash) {
    throw new ApiError(503, "This location does not have a service code");
  }

  const ipHash = hashIp(request);
  const attemptWindow = new Date(
    Date.now() - attemptWindowMinutes * 60 * 1000,
  );
  const [{ value: failedAttempts }] = await db
    .select({ value: count() })
    .from(pickupAccessAttempts)
    .where(
      and(
        eq(pickupAccessAttempts.orderId, result.orderId),
        eq(pickupAccessAttempts.ipHash, ipHash),
        eq(pickupAccessAttempts.succeeded, false),
        gte(pickupAccessAttempts.createdAt, attemptWindow),
      ),
    );

  if (Number(failedAttempts) >= failedAttemptLimit) {
    throw new ApiError(
      429,
      "Too many incorrect attempts. Try again in 15 minutes.",
    );
  }

  const validCode = matchesHash(
    hashServiceCode(serviceCode),
    result.serviceCodeHash,
  );
  await db.insert(pickupAccessAttempts).values({
    orderId: result.orderId,
    ipHash,
    succeeded: validCode,
  });

  if (!validCode) {
    throw new ApiError(401, "Service code is incorrect");
  }
  if (result.status !== "pending") {
    throw new ApiError(410, "This pickup QR code is no longer active");
  }
  if (!result.paid) {
    throw new ApiError(409, "This order has not been paid");
  }

  return result;
}


