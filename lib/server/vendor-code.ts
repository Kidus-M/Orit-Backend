import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  randomUUID,
} from "node:crypto";

import { and, desc, eq, gte, isNull } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import {
  locations,
  users,
  vendorCodeAccessAttempts,
  vendorInvitations,
} from "@/lib/db/schema";
import { getEnv } from "@/lib/env";
import { ApiError } from "@/lib/server/http";

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

export async function getVendorInvitationsForAdmin() {
  const rows = await getDb()
    .select({
      id: vendorInvitations.id,
      codeEncrypted: vendorInvitations.codeEncrypted,
      revokedAt: vendorInvitations.revokedAt,
      createdAt: vendorInvitations.createdAt,
      vendorId: users.id,
      businessName: users.firstName,
      businessEmail: users.email,
    })
    .from(vendorInvitations)
    .leftJoin(users, eq(users.vendorInvitationId, vendorInvitations.id))
    .orderBy(desc(vendorInvitations.createdAt));

  return rows.map((row) => ({
    id: row.id,
    code: decryptVendorCode(row.codeEncrypted),
    status: row.vendorId ? "claimed" : row.revokedAt ? "revoked" : "pending",
    vendorId: row.vendorId,
    businessName: row.businessName,
    businessEmail: row.businessEmail,
    createdAt: row.createdAt,
  }));
}

export async function createVendorInvitation(code: string, adminId: string) {
  const db = getDb();
  const codeHash = hashVendorCode(code);
  const invitationId = randomUUID();

  const [existing] = await db
    .select({
      id: vendorInvitations.id,
      vendorId: users.id,
    })
    .from(vendorInvitations)
    .leftJoin(users, eq(users.vendorInvitationId, vendorInvitations.id))
    .where(
      and(
        eq(vendorInvitations.codeHash, codeHash),
        isNull(vendorInvitations.revokedAt),
      ),
    )
    .limit(1);
  if (existing?.vendorId) {
    throw new ApiError(
      409,
      "This code belongs to a vendor. Release the vendor before reusing it.",
    );
  }
  if (existing) {
    throw new ApiError(409, "This vendor code is already available.");
  }

  await db.insert(vendorInvitations).values({
    id: invitationId,
    codeHash,
    codeEncrypted: encryptVendorCode(code),
    createdByAdminId: adminId,
  });

  return { id: invitationId, code, status: "pending" as const };
}

export async function revokeVendorInvitation(invitationId: string) {
  const db = getDb();
  const [invitation] = await db
    .select({ id: vendorInvitations.id, vendorId: users.id })
    .from(vendorInvitations)
    .leftJoin(users, eq(users.vendorInvitationId, vendorInvitations.id))
    .where(eq(vendorInvitations.id, invitationId))
    .limit(1);

  if (!invitation) throw new ApiError(404, "Vendor invitation not found.");
  if (invitation.vendorId) {
    throw new ApiError(409, "A claimed vendor code cannot be revoked.");
  }

  const [revoked] = await db
    .update(vendorInvitations)
    .set({ revokedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(vendorInvitations.id, invitationId),
        isNull(vendorInvitations.revokedAt),
      ),
    )
    .returning({ id: vendorInvitations.id });
  if (!revoked) throw new ApiError(409, "Vendor invitation is already revoked.");
}

export async function releaseVendorInvitation(invitationId: string) {
  const db = getDb();
  const [invitation] = await db
    .select({
      id: vendorInvitations.id,
      revokedAt: vendorInvitations.revokedAt,
      vendorId: users.id,
    })
    .from(vendorInvitations)
    .leftJoin(users, eq(users.vendorInvitationId, vendorInvitations.id))
    .where(eq(vendorInvitations.id, invitationId))
    .limit(1);

  if (!invitation) throw new ApiError(404, "Vendor invitation not found.");
  if (invitation.revokedAt) {
    throw new ApiError(409, "A revoked vendor code cannot be released.");
  }
  if (!invitation.vendorId) {
    throw new ApiError(409, "This vendor code is already available.");
  }

  const now = new Date();
  await db.batch([
    db
      .update(users)
      .set({
        isVendor: false,
        vendorInvitationId: null,
        updatedAt: now,
      })
      .where(eq(users.id, invitation.vendorId)),
    db
      .update(locations)
      .set({ vendorId: null, updatedAt: now })
      .where(eq(locations.vendorId, invitation.vendorId)),
    db
      .update(vendorInvitations)
      .set({ updatedAt: now })
      .where(eq(vendorInvitations.id, invitationId)),
  ]);

  return { vendorId: invitation.vendorId };
}

export async function verifyVendorCode(code: string) {
  const [invitation] = await getDb()
    .select({ id: vendorInvitations.id })
    .from(vendorInvitations)
    .leftJoin(users, eq(users.vendorInvitationId, vendorInvitations.id))
    .where(
      and(
        eq(vendorInvitations.codeHash, hashVendorCode(code)),
        isNull(vendorInvitations.revokedAt),
        isNull(users.id),
      ),
    )
    .limit(1);
  return invitation?.id ?? null;
}

async function hasAnyVendorInvitation() {
  const [invitation] = await getDb()
    .select({ id: vendorInvitations.id })
    .from(vendorInvitations)
    .limit(1);
  return Boolean(invitation);
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

  const invitationId = await verifyVendorCode(code);
  if (invitationId) {
    await getDb()
      .delete(vendorCodeAccessAttempts)
      .where(eq(vendorCodeAccessAttempts.ipHash, ipHash));
    return invitationId;
  }

  await getDb().insert(vendorCodeAccessAttempts).values({ ipHash });
  return (await hasAnyVendorInvitation()) ? false : null;
}
