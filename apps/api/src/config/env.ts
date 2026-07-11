import dotenv from "dotenv";
import { z } from "zod";

dotenv.config({ override: true });

/**
 * Fails fast at boot if required configuration is missing, instead of
 * surfacing cryptic runtime errors the first time a service tries to use an
 * undefined credential.
 */
const envSchema = z.object({
  PORT: z.coerce.number().int().default(4000),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_BASE_URL: z.string().url(),
  WEB_APP_URL: z.string().url(),

  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_JWT_SECRET: z.string().min(1),

  DEFAULT_ORGANIZATION_ID: z.string().uuid(),

  ANTHROPIC_API_KEY: z.string().min(1),
  CLAUDE_MODEL_QUALIFICATION: z.string().default("claude-sonnet-4-5-20250929"),
  CLAUDE_MODEL_RESEARCH: z.string().default("claude-sonnet-4-5-20250929"),
  CLAUDE_MODEL_OUTREACH: z.string().default("claude-sonnet-4-5-20250929"),
  CLAUDE_MODEL_COPILOT: z.string().default("claude-sonnet-4-5-20250929"),

  EMBEDDINGS_PROVIDER: z.enum(["voyage", "openai"]).default("voyage"),
  VOYAGE_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),

  APOLLO_API_KEY: z.string().min(1),
  APOLLO_BASE_URL: z.string().url().default("https://api.apollo.io/v1"),

  N8N_BASE_URL: z.string().url(),
  N8N_API_KEY: z.string().min(1),
  N8N_WEBHOOK_SECRET: z.string().min(16),

  INTERNAL_SERVICE_KEY: z.string().min(16),

  // Platform-level SMTP for transactional mail (follow-up reminders). All
  // optional: when unset, reminder emails are skipped and only in-app
  // notifications are created.
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),
});

function loadEnv() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    // eslint-disable-next-line no-console
    console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
    process.exit(1);
  }
  return parsed.data;
}

export const env = loadEnv();
export type Env = typeof env;
