import { sql } from "drizzle-orm";

import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
};

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    role: text("role").notNull(),
    firstName: text("first_name").notNull(),
    email: text("email").notNull(),
    storeName: text("store_name"),
    passwordHash: text("password_hash"),
    stripeCustomerId: text("stripe_customer_id"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("users_email_unique").on(table.email),
    uniqueIndex("users_stripe_customer_unique").on(table.stripeCustomerId),
    index("users_role_idx").on(table.role),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("sessions_token_hash_unique").on(table.tokenHash),
    index("sessions_user_idx").on(table.userId),
  ],
);

export const membershipPlans = pgTable(
  "membership_plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    durationMonths: integer("duration_months").notNull(),
    priceCents: integer("price_cents").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (table) => [uniqueIndex("membership_plans_code_unique").on(table.code)],
);

export const paymentMethods = pgTable(
  "payment_methods",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    providerCustomerId: text("provider_customer_id"),
    providerPaymentMethodId: text("provider_payment_method_id"),
    brand: text("brand").notNull(),
    last4: text("last4").notNull(),
    expiryMonth: integer("expiry_month").notNull(),
    expiryYear: integer("expiry_year").notNull(),
    billingZip: text("billing_zip").notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("payment_methods_user_unique").on(table.userId),
  ],
);

export const memberships = pgTable(
  "memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    planId: uuid("plan_id")
      .notNull()
      .references(() => membershipPlans.id),
    status: text("status").notNull().default("active"),
    autoRenew: boolean("auto_renew").notNull().default(true),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    currentPeriodStart: timestamp("current_period_start", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
    currentPeriodEnd: timestamp("current_period_end", {
      withTimezone: true,
    }).notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("memberships_active_user_unique")
      .on(table.userId)
      .where(sql`ended_at IS NULL`),
    index("memberships_renewal_idx").on(
      table.status,
      table.autoRenew,
      table.currentPeriodEnd,
    ),
  ],
);

export const locations = pgTable(
  "locations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    addressLine1: text("address_line_1").notNull(),
    city: text("city").notNull(),
    state: text("state").notNull(),
    postalCode: text("postal_code").notNull(),
    hoursText: text("hours_text").notNull(),
    bottlePriceCents: integer("bottle_price_cents").notNull().default(1898),
    inStock: boolean("in_stock").notNull().default(true),
    active: boolean("active").notNull().default(true),
    serviceCodeHash: text("service_code_hash"),
    ...timestamps,
  },
  (table) => [uniqueIndex("locations_name_unique").on(table.name)],
);

export const locationStaff = pgTable(
  "location_staff",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    locationId: uuid("location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("location_staff_unique").on(table.locationId, table.userId),
  ],
);

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => users.id),
    locationId: uuid("location_id")
      .notNull()
      .references(() => locations.id),
    quantity: integer("quantity").notNull(),
    unitPriceCents: integer("unit_price_cents").notNull(),
    totalCents: integer("total_cents").notNull(),
    paid: boolean("paid").notNull().default(false),
    status: text("status").notNull().default("pending"),
    pickupTokenHash: text("pickup_token_hash"),
    pickupTokenExpiresAt: timestamp("pickup_token_expires_at", {
      withTimezone: true,
    }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    completedByUserId: uuid("completed_by_user_id").references(() => users.id),
    ...timestamps,
  },
  (table) => [
    index("orders_location_status_idx").on(table.locationId, table.status),
    index("orders_member_idx").on(table.memberId),
    uniqueIndex("orders_pickup_token_unique").on(table.pickupTokenHash),
  ],
);

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => users.id),
    membershipId: uuid("membership_id").references(() => memberships.id),
    orderId: uuid("order_id").references(() => orders.id),
    kind: text("kind").notNull(),
    amountCents: integer("amount_cents").notNull(),
    status: text("status").notNull(),
    providerReference: text("provider_reference"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("payments_member_idx").on(table.memberId),
    index("payments_order_idx").on(table.orderId),
    uniqueIndex("payments_provider_reference_unique").on(
      table.providerReference,
    ),
  ],
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    recipientUserId: uuid("recipient_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("messages_recipient_created_idx").on(
      table.recipientUserId,
      table.createdAt,
    ),
  ],
);

export const complimentaryBenefits = pgTable(
  "complimentary_benefits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    membershipId: uuid("membership_id")
      .notNull()
      .references(() => memberships.id, { onDelete: "cascade" }),
    memberId: uuid("member_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
    eligibleAt: timestamp("eligible_at", { withTimezone: true }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    code: text("code").notNull(),
    status: text("status").notNull().default("available"),
    redeemedAt: timestamp("redeemed_at", { withTimezone: true }),
    redeemedByUserId: uuid("redeemed_by_user_id").references(() => users.id),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("complimentary_benefits_code_unique").on(table.code),
    uniqueIndex("complimentary_benefits_period_unique").on(
      table.membershipId,
      table.periodStart,
    ),
  ],
);

export const inventoryEvents = pgTable("inventory_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  locationId: uuid("location_id")
    .notNull()
    .references(() => locations.id, { onDelete: "cascade" }),
  changedByUserId: uuid("changed_by_user_id")
    .notNull()
    .references(() => users.id),
  inStock: boolean("in_stock").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});





export const pickupAccessAttempts = pgTable(
  "pickup_access_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    ipHash: text("ip_hash").notNull(),
    succeeded: boolean("succeeded").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("pickup_attempts_order_ip_created_idx").on(
      table.orderId,
      table.ipHash,
      table.createdAt,
    ),
  ],
);


export const authAccessAttempts = pgTable(
  "auth_access_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    emailHash: text("email_hash").notNull(),
    ipHash: text("ip_hash").notNull(),
    succeeded: boolean("succeeded").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("auth_attempts_email_created_idx").on(
      table.emailHash,
      table.createdAt,
    ),
    index("auth_attempts_email_ip_created_idx").on(
      table.emailHash,
      table.ipHash,
      table.createdAt,
    ),
  ],
);
