import { getEnv } from "@/lib/env";

type VendorOrderEmail = {
  orderId: string;
  vendorName: string;
  vendorEmail: string;
  quantity: number;
  totalCents: number;
  confirmationUrl: string;
};

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

export async function sendVendorOrderNotification(input: VendorOrderEmail) {
  const env = getEnv();
  if (!env.RESEND_API_KEY || !env.VENDOR_ORDER_FROM_EMAIL) {
    console.warn(
      `Vendor order ${input.orderId} saved, but Resend is not configured.`,
    );
    return false;
  }

  const total = `$${(input.totalCents / 100).toFixed(2)}`;
  const name = escapeHtml(input.vendorName);
  const email = escapeHtml(input.vendorEmail);
  const link = escapeHtml(input.confirmationUrl);
  try {
    const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `vendor-order-${input.orderId}`,
    },
    body: JSON.stringify({
      from: env.VENDOR_ORDER_FROM_EMAIL,
      to: ["orittej@gmail.com"],
      subject: `New vendor case order from ${input.vendorName}`,
      html: `
        <h1>New vendor case order</h1>
        <p>An order for <strong>${total}</strong> was placed by
        <strong>${name}</strong> (${email}).</p>
        <p>Quantity: <strong>${input.quantity} case${input.quantity === 1 ? "" : "s"}</strong></p>
        <p><a href="${link}">Review and confirm this vendor order</a></p>
      `,
      text:
        `An order for ${total} was placed by ${input.vendorName} ` +
        `(${input.vendorEmail}). Quantity: ${input.quantity} case` +
        `${input.quantity === 1 ? "" : "s"}. Confirm: ${input.confirmationUrl}`,
    }),
  });

  if (!response.ok) {
    console.error(
      `Resend rejected vendor order ${input.orderId}: ${response.status} ${await response.text()}`,
    );
    return false;
  }
    return true;
  } catch (error) {
    console.error(
      "Resend request failed for vendor order " + input.orderId,
      error,
    );
    return false;
  }
}