import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  SESSION_TOKEN_PEPPER: z.string().min(16),
  PASSWORD_PEPPER: z.string().min(16),
  ADMIN_API_KEY: z.string().min(16),
  CRON_SECRET: z.string().min(16),
  PICKUP_SECURITY_PEPPER: z.string().min(16),
  PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  PICKUP_QR_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(30),
  LEYOU_SERVICE_CODE: z.string().regex(/^\d{4}$/).default("1100"),
  DEMO_PICKUP_TOKEN: z.string().min(24).optional(),
  SEED_IF_EMPTY: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  DEMO_MEMBER_TOKEN: z.string().min(16).optional(),
  DEMO_STORE_OWNER_TOKEN: z.string().min(16).optional(),
  DEMO_ADMIN_TOKEN: z.string().min(16).optional(),
  PAYMENT_MODE: z.enum(["mock", "stripe"]).default("mock"),
  STRIPE_SECRET_KEY: z.string().startsWith("sk_").optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().startsWith("pk_").optional(),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_").optional(),
  STRIPE_CURRENCY: z.string().length(3).default("usd"),
});

export type AppEnv = z.infer<typeof envSchema>;

let cached: AppEnv | undefined;

export function getEnv(): AppEnv {
  if (!cached) cached = envSchema.parse(process.env);
  return cached;
}
