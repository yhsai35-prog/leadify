import dotenv from "dotenv";
import { z } from "zod";

dotenv.config({ override: true });

/** Treat blank env strings as unset so defaults / platform-injected values still apply. */
function emptyToUndefined(value: unknown): unknown {
  if (value === "" || value === null || value === undefined) return undefined;
  return value;
}

/** Render/dashboard paste often includes quotes that break SMTP From addresses. */
function stripWrappingQuotes(value: unknown): unknown {
  const v = emptyToUndefined(value);
  if (typeof v !== "string") return v;
  const trimmed = v.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

/**
 * Fails fast at boot if required configuration is missing, instead of
 * surfacing cryptic runtime errors the first time a service tries to use an
 * undefined credential.
 */
const envSchema = z.object({
  // Render injects PORT; an empty PORT= in the dashboard would otherwise coerce to 0
  // (OS picks a random port → endless "Detected a new open port" restarts).
  PORT: z.preprocess(emptyToUndefined, z.coerce.number().int().positive().default(4000)),
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

  // SMTP for transactional mail (OTP + reminders).
  SMTP_HOST: z.preprocess(stripWrappingQuotes, z.string().optional()),
  SMTP_PORT: z.preprocess(emptyToUndefined, z.coerce.number().int().positive().optional()),
  SMTP_USER: z.preprocess(stripWrappingQuotes, z.string().optional()),
  SMTP_PASS: z.preprocess(stripWrappingQuotes, z.string().optional()),
  SMTP_FROM: z.preprocess(stripWrappingQuotes, z.string().optional()),
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
