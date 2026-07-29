import { z } from "zod";

const optionalString = (schema: z.ZodString) =>
  z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? undefined : value,
    schema.optional(),
  );

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  SESSION_TOKEN_PEPPER: z.string().min(16),
  PASSWORD_PEPPER: z.string().min(16),
  ADMIN_API_KEY: z.string().min(16),
  CRON_SECRET: z.string().min(16),
  PICKUP_SECURITY_PEPPER: z.string().min(16),
  PUBLIC_APP_URL: z.string().url().default("https://orit-backend.vercel.app"),
  PICKUP_QR_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(30),
  LEYOU_SERVICE_CODE: z.string().regex(/^\d{4}$/).default("1100"),
  DEMO_PICKUP_TOKEN: optionalString(z.string().min(24)),
  SEED_IF_EMPTY: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  DEMO_MEMBER_TOKEN: optionalString(z.string().min(16)),
  DEMO_STORE_OWNER_TOKEN: optionalString(z.string().min(16)),
  DEMO_ADMIN_TOKEN: optionalString(z.string().min(16)),
  PAYMENT_MODE: z.enum(["mock", "stripe"]).default("mock"),
  STRIPE_SECRET_KEY: optionalString(
    z.string().regex(/^(sk|rk)_(test|live)_/, "Invalid Stripe secret key"),
  ),
  STRIPE_PUBLISHABLE_KEY: optionalString(
    z.string().regex(/^pk_(test|live)_/, "Invalid Stripe publishable key"),
  ),
  STRIPE_WEBHOOK_SECRET: optionalString(z.string().startsWith("whsec_")),
  STRIPE_CURRENCY: z.string().regex(/^[a-zA-Z]{3}$/).default("usd"),
  RESEND_API_KEY: optionalString(z.string().startsWith("re_")),
  VENDOR_ORDER_FROM_EMAIL: optionalString(z.string().min(3)),

}).superRefine((env, context) => {
  if (env.PAYMENT_MODE !== "stripe") return;

  for (const key of [
    "STRIPE_SECRET_KEY",
    "STRIPE_PUBLISHABLE_KEY",
    "STRIPE_WEBHOOK_SECRET",
  ] as const) {
    if (!env[key]) {
      context.addIssue({
        code: "custom",
        path: [key],
        message: `${key} is required when PAYMENT_MODE=stripe`,
      });
    }
  }

  const secretMode = env.STRIPE_SECRET_KEY?.match(
    /^(?:sk|rk)_(test|live)_/,
  )?.[1];
  const publishableMode =
    env.STRIPE_PUBLISHABLE_KEY?.match(/^pk_(test|live)_/)?.[1];
  if (secretMode && publishableMode && secretMode !== publishableMode) {
    context.addIssue({
      code: "custom",
      path: ["STRIPE_PUBLISHABLE_KEY"],
      message: "Stripe secret and publishable keys must use the same mode",
    });
  }
});

export type AppEnv = z.infer<typeof envSchema>;

let cached: AppEnv | undefined;

export function getEnv(): AppEnv {
  if (!cached) cached = envSchema.parse(process.env);
  return cached;
}
