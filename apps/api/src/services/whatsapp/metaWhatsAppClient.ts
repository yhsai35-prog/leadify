import crypto from "node:crypto";
import { env } from "../../config/env.js";
import { ApiError } from "../../utils/errors.js";
import { logger } from "../../config/logger.js";

const GRAPH_BASE = "https://graph.facebook.com/v21.0";

export interface MetaTemplateComponent {
  type: string;
  format?: string;
  text?: string;
  buttons?: unknown[];
  example?: unknown;
}

export interface MetaMessageTemplate {
  id?: string;
  name: string;
  language: string;
  status: string;
  category?: string;
  components: MetaTemplateComponent[];
}

export interface SendTemplateParams {
  toPhoneE164: string;
  templateName: string;
  languageCode: string;
  components?: Array<{
    type: "header" | "body" | "button";
    parameters?: Array<{ type: "text"; text: string }>;
    sub_type?: string;
    index?: string;
  }>;
}

function requireWhatsAppConfig() {
  if (
    !env.WHATSAPP_PHONE_NUMBER_ID ||
    !env.WHATSAPP_BUSINESS_ACCOUNT_ID ||
    !env.WHATSAPP_ACCESS_TOKEN
  ) {
    throw ApiError.badRequest(
      "WhatsApp Cloud API is not configured. Set WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_BUSINESS_ACCOUNT_ID, and WHATSAPP_ACCESS_TOKEN.",
    );
  }
}

export function isWhatsAppConfigured(): boolean {
  return Boolean(
    env.WHATSAPP_PHONE_NUMBER_ID &&
      env.WHATSAPP_BUSINESS_ACCOUNT_ID &&
      env.WHATSAPP_ACCESS_TOKEN &&
      env.WHATSAPP_VERIFY_TOKEN,
  );
}

/** Normalize to digits-only international form without leading +. */
export function normalizeWhatsAppPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 8) {
    throw ApiError.badRequest("Contact phone number is invalid for WhatsApp");
  }
  return digits;
}

export function verifyWhatsAppWebhookSignature(rawBody: Buffer, signatureHeader: string | undefined): boolean {
  if (!env.WHATSAPP_APP_SECRET) {
    logger.warn("WHATSAPP_APP_SECRET not set; skipping signature verification");
    return true;
  }
  if (!signatureHeader?.startsWith("sha256=")) return false;
  const expected = crypto.createHmac("sha256", env.WHATSAPP_APP_SECRET).update(rawBody).digest("hex");
  const received = signatureHeader.slice("sha256=".length);
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(received));
  } catch {
    return false;
  }
}

async function graphFetch<T>(path: string, init?: RequestInit): Promise<T> {
  requireWhatsAppConfig();
  const res = await fetch(`${GRAPH_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const json = (await res.json()) as T & { error?: { message?: string } };
  if (!res.ok) {
    const message = json.error?.message ?? `Meta Graph API error (${res.status})`;
    logger.warn({ path, status: res.status, error: json.error }, "Meta WhatsApp API error");
    throw ApiError.badRequest(message);
  }
  return json;
}

export const metaWhatsAppClient = {
  isConfigured: isWhatsAppConfigured,

  async listTemplates(): Promise<MetaMessageTemplate[]> {
    requireWhatsAppConfig();
    const data = await graphFetch<{
      data?: Array<{
        id: string;
        name: string;
        status: string;
        category?: string;
        language: string;
        components?: MetaTemplateComponent[];
      }>;
    }>(
      `/${env.WHATSAPP_BUSINESS_ACCOUNT_ID}/message_templates?limit=100&fields=id,name,status,category,language,components`,
    );

    return (data.data ?? []).map((t) => ({
      id: t.id,
      name: t.name,
      language: t.language,
      status: t.status,
      category: t.category,
      components: t.components ?? [],
    }));
  },

  async sendTemplateMessage(params: SendTemplateParams): Promise<{ messageId: string }> {
    requireWhatsAppConfig();
    const to = normalizeWhatsAppPhone(params.toPhoneE164);
    const body: Record<string, unknown> = {
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: params.templateName,
        language: { code: params.languageCode },
        ...(params.components && params.components.length > 0 ? { components: params.components } : {}),
      },
    };

    const result = await graphFetch<{
      messages?: Array<{ id: string }>;
    }>(`/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      body: JSON.stringify(body),
    });

    const messageId = result.messages?.[0]?.id;
    if (!messageId) throw ApiError.internal("Meta did not return a WhatsApp message id");
    return { messageId };
  },
};
