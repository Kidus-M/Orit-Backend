import {
  and,
  eq,
  gte,
  isNotNull,
  isNull,
  lt,
  sql,
} from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import {
  locations,
  monthlySummaryDeliveries,
  orders,
  users,
  vendorOrders,
} from "@/lib/db/schema";
import {
  MonthlyVendorSummaryRow,
  sendMonthlySummaryEmail,
} from "@/lib/server/email";
import { getEnv } from "@/lib/env";

function monthBoundaries(now: Date) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const reportMonth = `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, "0")}`;
  return { start, end: now, reportMonth };
}

export async function buildMonthlyVendorSummary(now = new Date()) {
  const db = getDb();
  const { start, end, reportMonth } = monthBoundaries(now);
  const [vendorRows, caseRows, bottleRows] = await Promise.all([
    db
      .select({
        id: users.id,
        name: users.firstName,
        email: users.email,
      })
      .from(users)
      .where(
        and(
          eq(users.role, "member"),
          eq(users.isVendor, true),
          isNull(users.deletedAt),
        ),
      )
      .orderBy(users.firstName),
    db
      .select({
        vendorId: vendorOrders.vendorId,
        quantity: sql<number>`coalesce(sum(${vendorOrders.quantity}), 0)::int`,
        totalCents: sql<number>`coalesce(sum(${vendorOrders.totalCents}), 0)::int`,
      })
      .from(vendorOrders)
      .where(
        and(
          eq(vendorOrders.status, "confirmed"),
          isNotNull(vendorOrders.confirmedAt),
          gte(vendorOrders.confirmedAt, start),
          lt(vendorOrders.confirmedAt, end),
        ),
      )
      .groupBy(vendorOrders.vendorId),
    db
      .select({
        vendorId: locations.vendorId,
        quantity: sql<number>`coalesce(sum(${orders.quantity}), 0)::int`,
        totalCents: sql<number>`coalesce(sum(${orders.totalCents}), 0)::int`,
      })
      .from(orders)
      .innerJoin(locations, eq(locations.id, orders.locationId))
      .where(
        and(
          isNotNull(locations.vendorId),
          eq(orders.orderType, "personal"),
          eq(orders.status, "completed"),
          isNotNull(orders.completedAt),
          gte(orders.completedAt, start),
          lt(orders.completedAt, end),
        ),
      )
      .groupBy(locations.vendorId),
  ]);

  const casesByVendor = new Map(
    caseRows.map((row) => [
      row.vendorId,
      {
        quantity: Number(row.quantity),
        totalCents: Number(row.totalCents),
      },
    ]),
  );
  const bottlesByVendor = new Map(
    bottleRows
      .filter((row) => row.vendorId)
      .map((row) => [
        row.vendorId!,
        {
          quantity: Number(row.quantity),
          totalCents: Number(row.totalCents),
        },
      ]),
  );
  const rows: MonthlyVendorSummaryRow[] = vendorRows.map((vendor) => {
    const cases = casesByVendor.get(vendor.id);
    const bottles = bottlesByVendor.get(vendor.id);
    return {
      vendorId: vendor.id,
      vendorName: vendor.name,
      vendorEmail: vendor.email,
      casesOrdered: cases?.quantity ?? 0,
      casesTotalCents: cases?.totalCents ?? 0,
      customerBottlesSold: bottles?.quantity ?? 0,
      customerBottlesTotalCents: bottles?.totalCents ?? 0,
    };
  });

  return { reportMonth, start, end, rows };
}

export async function sendMonthlyVendorSummary(now = new Date()) {
  const db = getDb();
  const summary = await buildMonthlyVendorSummary(now);
  const recipientEmail = getEnv().ORDER_NOTIFICATION_EMAIL;
  const [existing] = await db
    .select({ status: monthlySummaryDeliveries.status })
    .from(monthlySummaryDeliveries)
    .where(eq(monthlySummaryDeliveries.reportMonth, summary.reportMonth))
    .limit(1);
  if (existing?.status === "sent") {
    return {
      reportMonth: summary.reportMonth,
      sent: false,
      skipped: true,
      vendorCount: summary.rows.length,
    };
  }

  const nowTimestamp = new Date();
  await db
    .insert(monthlySummaryDeliveries)
    .values({
      reportMonth: summary.reportMonth,
      periodStart: summary.start,
      periodEnd: summary.end,
      recipientEmail,
      status: "pending",
      summaryRows: summary.rows,
      attemptCount: 1,
    })
    .onConflictDoUpdate({
      target: monthlySummaryDeliveries.reportMonth,
      set: {
        periodEnd: summary.end,
        recipientEmail,
        status: "pending",
        summaryRows: summary.rows,
        attemptCount: sql`${monthlySummaryDeliveries.attemptCount} + 1`,
        lastError: null,
        updatedAt: nowTimestamp,
      },
    });

  const periodLabel = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(summary.start);
  const sent = await sendMonthlySummaryEmail({
    reportMonth: summary.reportMonth,
    periodLabel,
    rows: summary.rows,
  });

  await db
    .update(monthlySummaryDeliveries)
    .set({
      status: sent ? "sent" : "failed",
      sentAt: sent ? new Date() : null,
      lastError: sent ? null : "Resend did not accept the summary email.",
      updatedAt: new Date(),
    })
    .where(eq(monthlySummaryDeliveries.reportMonth, summary.reportMonth));

  return {
    reportMonth: summary.reportMonth,
    sent,
    skipped: false,
    vendorCount: summary.rows.length,
  };
}
