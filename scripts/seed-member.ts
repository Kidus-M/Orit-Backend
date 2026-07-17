import { config } from "dotenv";

config({ path: ".env.local" });
config();

async function seedUser() {
  const [{ getDb }, { users }, { hashPassword }] = await Promise.all([
    import("../lib/db/client"),
    import("../lib/db/schema"),
    import("../lib/server/passwords"),
  ]);
  const { eq } = await import("drizzle-orm");

  const email = process.env.SEED_MEMBER_EMAIL?.trim().toLowerCase();
  const firstName = process.env.SEED_MEMBER_FIRST_NAME?.trim();
  const pin = process.env.SEED_MEMBER_PIN?.trim();
  const role = process.env.SEED_USER_ROLE?.trim() ?? "member";

  if (!email || !email.includes("@")) {
    throw new Error("SEED_MEMBER_EMAIL must be a valid email address");
  }
  if (!firstName) {
    throw new Error("SEED_MEMBER_FIRST_NAME is required");
  }
  if (!pin || !/^\d{4}$/.test(pin)) {
    throw new Error("SEED_MEMBER_PIN must contain exactly four numbers");
  }

  if (role !== "member" && role !== "admin") {
    throw new Error("SEED_USER_ROLE must be member or admin");
  }

  const now = new Date();
  const passwordHash = await hashPassword(pin);
  const db = getDb();
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  const [user] = existing
    ? await db
        .update(users)
        .set({
          role,
          firstName,
          passwordHash,
          membershipOptOut: false,
          deletedAt: null,
          updatedAt: now,
        })
        .where(eq(users.id, existing.id))
        .returning({
          id: users.id,
          firstName: users.firstName,
          email: users.email,
          role: users.role,
        })
    : await db
        .insert(users)
        .values({
          role,
          firstName,
          email,
          passwordHash,
          membershipOptOut: false,
        })
        .returning({
          id: users.id,
          firstName: users.firstName,
          email: users.email,
          role: users.role,
        });

  console.log("User seed complete", {
    ...user,
    action: existing ? "updated" : "created",
  });
}

seedUser()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
