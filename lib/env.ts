import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  SESSION_TOKEN_PEPPER: z.string().min(16),
  PASSWORD_PEPPER: z.string().min(16),
  ADMIN_API_KEY: z.string().min(16),
  CRON_SECRET: z.string().min(16),
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
