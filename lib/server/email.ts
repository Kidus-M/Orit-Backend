import { getEnv } from "@/lib/env";

export type NewOrderEmail = {
  orderId: string;
  orderType: "customer" | "vendor" | "event";
  customerName: string;
  customerEmail: string;
  quantity: number;
  totalCents: number;
  locationName: string;
  confirmationUrl?: string;
};

export type MonthlyVendorSummaryRow = {
  vendorId: string;
  vendorName: string;
  vendorEmail: string;
  casesOrdered: number;
  customerBottlesSold: number;
};

type EmailPayload = {
  subject: string;
  html: string;
  text: string;
  idempotencyKey: string;
};

const resendTestingSender = "Orit Tej <onboarding@resend.dev>";

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[character]!,
  );
}

async function deliverEmail(payload: EmailPayload) {
  const env = getEnv();
  if (!env.RESEND_API_KEY) {
    console.error(
      JSON.stringify({
        event: "email_not_sent",
        idempotencyKey: payload.idempotencyKey,
        reason: "RESEND_API_KEY is not configured",
      }),
    );
    return false;
  }

  const from = env.VENDOR_ORDER_FROM_EMAIL ?? resendTestingSender;
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
        "Idempotency-Key": payload.idempotencyKey,
        "User-Agent": "orit-tej-backend/1.0",
      },
      body: JSON.stringify({
        from,
        to: [env.ORDER_NOTIFICATION_EMAIL],
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
      }),
    });

    const responseBody = await response.text();
    if (response.ok) {
      console.info(
        JSON.stringify({
          event: "email_accepted",
          idempotencyKey: payload.idempotencyKey,
          recipient: env.ORDER_NOTIFICATION_EMAIL,
          providerResponse: responseBody,
        }),
      );
      return true;
    }

    console.error(
      JSON.stringify({
        event: "email_rejected",
        idempotencyKey: payload.idempotencyKey,
        sender: from,
        recipient: env.ORDER_NOTIFICATION_EMAIL,
        status: response.status,
        providerResponse: responseBody,
      }),
    );
    return false;
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "email_request_failed",
        idempotencyKey: payload.idempotencyKey,
        message: error instanceof Error ? error.message : String(error),
      }),
    );
    return false;
  }
}


export function sendNewOrderNotification(input: NewOrderEmail) {
  const total = `$${(input.totalCents / 100).toFixed(2)}`;
  const itemName =
    input.orderType === "customer" ? "bottle" : "case";
  const details = `${input.quantity} ${itemName}${input.quantity === 1 ? "" : "s"}`;
  const confirmation = input.confirmationUrl
    ? `<p><a href="${escapeHtml(input.confirmationUrl)}">Review and confirm this vendor order</a></p>`
    : "";
  const confirmationText = input.confirmationUrl
    ? ` Confirm: ${input.confirmationUrl}`
    : "";
  return deliverEmail({
    subject: input.orderType === "event" ? "NEW EVENT" : "NEW ORDER",
    html: `
      <h1><strong>${input.orderType === "event" ? "NEW EVENT" : "NEW ORDER"}</strong></h1>
      <p><strong>${escapeHtml(input.customerName)}</strong>
      (${escapeHtml(input.customerEmail)}) placed a paid order.</p>
      <p>Location: <strong>${escapeHtml(input.locationName)}</strong></p>
      <p>Quantity: <strong>${details}</strong></p>
      <p>Total: <strong>${total}</strong></p>
      ${confirmation}
    `,
    text:
      `${input.orderType === "event" ? "NEW EVENT" : "NEW ORDER"}\n` +
      `${input.customerName} (${input.customerEmail}) placed a paid order. ` +
      `Location: ${input.locationName}. Quantity: ${details}. Total: ${total}.` +
      confirmationText,
    idempotencyKey: `new-order/${input.orderType}/${input.orderId}`,
  });
}

export function sendMonthlySummaryEmail(input: {
  reportMonth: string;
  periodLabel: string;
  rows: MonthlyVendorSummaryRow[];
}) {
  const tableRows = input.rows
    .map(
      (row) => `
        <tr>
          <td>${escapeHtml(row.vendorName)}<br><small>${escapeHtml(row.vendorEmail)}</small></td>
          <td>${row.casesOrdered}</td>
          <td>${row.customerBottlesSold}</td>
        </tr>`,
    )
    .join("");
  const textRows = input.rows.length
    ? input.rows
        .map(
          (row) =>
            `${row.vendorName} (${row.vendorEmail}): ` +
            `${row.casesOrdered} cases received; ` +
            `${row.customerBottlesSold} bottles sold to customers`,
        )
        .join("\n")
    : "No vendors were active during this period.";

  return deliverEmail({
    subject: "SUMMARY",
    html: `
      <h1><strong>SUMMARY</strong></h1>
      <p>${escapeHtml(input.periodLabel)}</p>
      <table style="width:100%;border-collapse:collapse" cellpadding="10" border="1">
        <thead>
          <tr>
            <th align="left">Vendor</th>
            <th align="left">Cases received</th>
            <th align="left">Bottles sold to customers</th>
          </tr>
        </thead>
        <tbody>${tableRows || '<tr><td colspan="3">No vendor activity this month.</td></tr>'}</tbody>
      </table>
    `,
    text: `SUMMARY\n${input.periodLabel}\n${textRows}`,
    idempotencyKey: `monthly-summary/${input.reportMonth}`,
  });
}

export function sendEmailConfigurationCheck() {
  const stamp = new Date().toISOString();
  return deliverEmail({
    subject: "ORIT TEJ EMAIL TEST",
    html: `<h1>Orit Tej email test</h1><p>Resend accepted this test at ${escapeHtml(stamp)}.</p>`,
    text: `Orit Tej email test. Resend accepted this test at ${stamp}.`,
    idempotencyKey: `email-check/${stamp}`,
  });
}
