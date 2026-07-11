import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";

let transporter: Transporter | null | undefined;

/**
 * Platform-level transactional mailer (reminder nudges, not sales outreach —
 * outreach still goes through the human-approval pipeline). Configured via
 * optional SMTP_* env vars; when absent, sends are skipped silently so the
 * in-app notification remains the source of truth.
 */
function getTransporter(): Transporter | null {
  if (transporter !== undefined) return transporter;
  if (!env.SMTP_HOST || !env.SMTP_PORT) {
    transporter = null;
    return transporter;
  }
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: env.SMTP_USER && env.SMTP_PASS ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
  });
  return transporter;
}

export const mailerService = {
  isConfigured(): boolean {
    return getTransporter() !== null;
  },

  /** Returns true if the email was handed to the SMTP server, false if skipped/failed. */
  async send(to: string, subject: string, text: string, html?: string): Promise<boolean> {
    const transport = getTransporter();
    if (!transport) {
      logger.debug({ to, subject }, "SMTP not configured; skipping transactional email");
      return false;
    }
    try {
      await transport.sendMail({
        from: env.SMTP_FROM ?? env.SMTP_USER ?? "no-reply@leadify.app",
        to,
        subject,
        text,
        html: html ?? undefined,
      });
      return true;
    } catch (err) {
      logger.warn({ err, to, subject }, "Transactional email send failed");
      return false;
    }
  },
};
