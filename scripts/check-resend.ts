import { config } from "dotenv";

config({ path: ".env.local" });
config();

async function checkResend() {
  const [{ getEnv }, { sendEmailConfigurationCheck }] = await Promise.all([
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
  const accepted = await sendEmailConfigurationCheck();
  if (!accepted) {
    throw new Error(
      "Resend rejected the message. Read the email_rejected log above for the exact provider error.",
    );
  }
  console.log("Resend accepted the test email.");
}

checkResend().catch((error) => {
  console.error(
    "Resend configuration check failed:",
    error instanceof Error ? error.message : error,
  );
  process.exit(1);
});