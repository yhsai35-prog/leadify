import pino from "pino";
import { env } from "./env.js";

/**
 * Structured logger. Never log full prompt text or PII (see AI Prompt
 * Architecture / Risks in docs/architecture.md) -- callers should log
 * prompt_hash and IDs, not raw content.
 */
export const logger = pino({
  level: env.NODE_ENV === "production" ? "info" : "debug",
  transport:
    env.NODE_ENV === "development"
      ? { target: "pino-pretty", options: { colorize: true } }
      : undefined,
});
