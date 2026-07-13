import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";

let transporter: Transporter | null | undefined;

/**
 * Transactional mailer for OTP + reminder nudges.
 *
 * Prefer Resend (HTTPS) in production: Render free web services block outbound
 * SMTP ports 25/465/587. SMTP remains available for local development.
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

function resendFrom(): string {
  return env.RESEND_FROM ?? env.SMTP_FROM ?? "Leadify <onboarding@resend.dev>";
}

async function sendViaResend(to: string, subject: string, text: string, html?: string): Promise<void> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: resendFrom(),
      to: [to],
      subject,
      text,
      ...(html ? { html } : {}),
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend ${res.status}: ${body}`);
  }
}

export const mailerService = {
  /** True when either Resend or SMTP can deliver mail. */
  isConfigured(): boolean {
    return Boolean(env.RESEND_API_KEY) || getTransporter() !== null;
  },

  provider(): "resend" | "smtp" | "none" {
    if (env.RESEND_API_KEY) return "resend";
    if (getTransporter()) return "smtp";
    return "none";
  },

  /** Returns true if the email was handed off successfully. */
  async send(to: string, subject: string, text: string, html?: string): Promise<boolean> {
    if (env.RESEND_API_KEY) {
      try {
        await sendViaResend(to, subject, text, html);
        return true;
      } catch (err) {
        logger.warn({ err, to, subject }, "Transactional email send failed (Resend)");
        return false;
      }
    }

    const transport = getTransporter();
    if (!transport) {
      logger.debug({ to, subject }, "No mail provider configured; skipping transactional email");
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
      logger.warn({ err, to, subject }, "Transactional email send failed (SMTP)");
      return false;
    }
  },
};
