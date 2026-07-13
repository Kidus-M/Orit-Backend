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
  PAYMENT_PROVIDER_SECRET_KEY: z.string().optional(),
  PAYMENT_WEBHOOK_SECRET: z.string().optional(),
});

export type AppEnv = z.infer<typeof envSchema>;

let cached: AppEnv | undefined;

export function getEnv(): AppEnv {
  if (!cached) cached = envSchema.parse(process.env);
  return cached;
}



