import { createHmac } from "node:crypto";

import { and, eq, gte } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import { authAccessAttempts } from "@/lib/db/schema";
import { getEnv } from "@/lib/env";
import { ApiError } from "@/lib/server/http";

const attemptWindowMinutes = 15;
const perIpFailureLimit = 5;
const perEmailFailureLimit = 20;

export type LoginAttemptIdentity = {
  emailHash: string;
  ipHash: string;
};

function hash(value: string) {
  return createHmac("sha256", getEnv().PASSWORD_PEPPER)
    .update(`login-attempt:${value}`)
    .digest("hex");
}

function clientAddress(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function assertLoginAllowed(
  request: Request,
  email: string,
): Promise<LoginAttemptIdentity> {
  const identity = {
    emailHash: hash(email.toLowerCase()),
    ipHash: hash(clientAddress(request)),
  };
  const attemptWindow = new Date(
    Date.now() - attemptWindowMinutes * 60 * 1000,
  );
  const failures = await getDb()
    .select({ ipHash: authAccessAttempts.ipHash })
    .from(authAccessAttempts)
    .where(
      and(
        eq(authAccessAttempts.emailHash, identity.emailHash),
        eq(authAccessAttempts.succeeded, false),
        gte(authAccessAttempts.createdAt, attemptWindow),
      ),
    );
  const failuresFromIp = failures.filter(
    (attempt) => attempt.ipHash === identity.ipHash,
  ).length;

  if (
    failuresFromIp >= perIpFailureLimit ||
    failures.length >= perEmailFailureLimit
  ) {
    throw new ApiError(
      429,
      "Too many incorrect PIN attempts. Try again in 15 minutes.",
    );
  }

  return identity;
}

export async function recordLoginAttempt(
  identity: LoginAttemptIdentity,
  succeeded: boolean,
) {
  const db = getDb();
  if (succeeded) {
    await db
      .delete(authAccessAttempts)
      .where(eq(authAccessAttempts.emailHash, identity.emailHash));
    return;
  }

  await db.insert(authAccessAttempts).values({
    ...identity,
    succeeded: false,
  });
}
