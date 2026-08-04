import { config } from "dotenv";

config({ path: ".env.local" });
config();

async function checkResend() {
  const [
    { getEnv },
    { sendMonthlySummaryEmail, sendNewOrderNotification },
  ] = await Promise.all([
    import("../lib/env"),
    import("../lib/server/email"),
  ]);
  const env = getEnv();
  if (!env.RESEND_API_KEY) {
    throw new Error("Set RESEND_API_KEY before running this check.");
  }

  console.log(
    `Testing Resend from ${env.VENDOR_ORDER_FROM_EMAIL ?? "Orit Tej <onboarding@resend.dev>"}`,
  );
  console.log(`Recipient: ${env.ORDER_NOTIFICATION_EMAIL}`);
  const stamp = new Date().toISOString();
  const previews = [
    {
      label: "vendor order",
      accepted: await sendNewOrderNotification({
        orderId: `mock-email-preview-vendor-${stamp}`,
        orderType: "vendor",
        customerName: "Mock Vendor Preview — No Order Created",
        customerEmail: "mock-vendor@example.invalid",
        quantity: 3,
        totalCents: 36000,
        locationName: "Mock Downtown Market Delivery",
        confirmationUrl: "https://example.invalid/mock-vendor-confirmation",
      }),
    },
    {
      label: "event order",
      accepted: await sendNewOrderNotification({
        orderId: `mock-email-preview-event-${stamp}`,
        orderType: "event",
        customerName: "Mock Event Guest — No Order Created",
        customerEmail: "mock-event-guest@example.invalid",
        quantity: 4,
        totalCents: 10000,
        locationName: "Mock Orit Tej Summer Tasting",
      }),
    },
    {
      label: "monthly summary",
      accepted: await sendMonthlySummaryEmail({
        reportMonth: `mock-email-preview-${stamp}`,
        periodLabel: "Mock monthly summary — July 1–31, 2026 (no production data)",
        rows: [
          {
            vendorId: "mock-vendor-one",
            vendorName: "Mock Downtown Market",
            vendorEmail: "downtown-market@example.invalid",
            casesOrdered: 8,
            customerBottlesSold: 31,
          },
          {
            vendorId: "mock-vendor-two",
            vendorName: "Mock Neighborhood Wine Shop",
            vendorEmail: "wine-shop@example.invalid",
            casesOrdered: 5,
            customerBottlesSold: 19,
          },
        ],
      }),
    },
  ];

  const rejected = previews.filter((preview) => !preview.accepted);
  if (rejected.length > 0) {
    throw new Error(
      `Resend rejected: ${rejected.map((preview) => preview.label).join(", ")}. ` +
        "Read the email_rejected log above for the exact provider error.",
    );
  }
  console.log(
    `Resend accepted ${previews.length} mock previews: ${previews
      .map((preview) => preview.label)
      .join(", ")}.`,
  );
}

checkResend().catch((error) => {
  console.error(
    "Resend configuration check failed:",
    error instanceof Error ? error.message : error,
  );
  process.exit(1);
});
