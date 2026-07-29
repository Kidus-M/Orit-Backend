import { config } from "dotenv";

config({ path: ".env.local" });
config();

async function checkStripe() {
  const [{ getEnv }, { getStripe }] = await Promise.all([
    import("../lib/env"),
    import("../lib/server/stripe"),
  ]);
  const env = getEnv();
  if (env.PAYMENT_MODE !== "stripe") {
    throw new Error("Set PAYMENT_MODE=stripe before running this check.");
  }

  const balance = await getStripe().balance.retrieve();
  const keyMode = env.STRIPE_SECRET_KEY?.includes("_live_") ? "live" : "sandbox";

  console.log("Stripe configuration is ready.");
  console.log(`Mode: ${keyMode}`);
  console.log(`API access: verified (${balance.object})`);
  console.log(`Currency: ${env.STRIPE_CURRENCY.toLowerCase()}`);
  console.log("Webhook secret: configured");
}

checkStripe().catch((error) => {
  console.error(
    "Stripe configuration check failed:",
    error instanceof Error ? error.message : error,
  );
  process.exit(1);
});