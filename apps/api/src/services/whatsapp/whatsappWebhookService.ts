import { env } from "../../config/env.js";
import { activitiesRepository } from "../../repositories/activitiesRepository.js";
import { whatsappMessagesRepository } from "../../repositories/whatsappMessagesRepository.js";
import { whatsappMessageEventsRepository } from "../../repositories/whatsappMessageEventsRepository.js";
import { supabaseAdmin } from "../../config/supabase.js";
import { callClaudeStructured } from "../claude/client.js";
import {
  REPLY_CLASSIFICATION_TOOL_SCHEMA,
  buildReplyClassificationPrompt,
} from "../claude/prompts/replyClassification.prompt.js";
import { ReplySentiment } from "@bluwheelz/shared";
import { logger } from "../../config/logger.js";
import { verifyWhatsAppWebhookSignature } from "./metaWhatsAppClient.js";
import { metaWhatsAppClient } from "./metaWhatsAppClient.js";
import { whatsappTemplatesRepository } from "../../repositories/whatsappTemplatesRepository.js";
import { z } from "zod";
import type { Request, Response } from "express";

const replyClassificationResultSchema = z.object({
  sentiment: z.nativeEnum(ReplySentiment),
  suggestedAction: z.string(),
  summary: z.string(),
});

interface MetaWebhookPayload {
  object?: string;
  entry?: Array<{
    changes?: Array<{
      value?: {
        statuses?: Array<{
          id: string;
          status: string;
          errors?: unknown[];
          conversation?: { id?: string };
        }>;
        messages?: Array<{
          id: string;
          from: string;
          timestamp?: string;
          type?: string;
          text?: { body?: string };
        }>;
        contacts?: Array<{ wa_id?: string; profile?: { name?: string } }>;
      };
    }>;
  }>;
}

export const whatsappWebhookService = {
  verifyChallenge(req: Request, res: Response): void {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    if (mode === "subscribe" && token === env.WHATSAPP_VERIFY_TOKEN && challenge) {
      res.status(200).send(String(challenge));
      return;
    }
    res.status(403).send("Forbidden");
  },

  async handleInbound(req: Request, res: Response): Promise<void> {
    const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
    const signature = req.header("x-hub-signature-256") ?? undefined;
    if (rawBody && !verifyWhatsAppWebhookSignature(rawBody, signature)) {
      res.status(401).json({ error: "Invalid signature" });
      return;
    }

    // Always ACK quickly; process asynchronously-ish in-request for MVP.
    res.status(200).json({ success: true });

    const payload = req.body as MetaWebhookPayload;
    if (payload.object !== "whatsapp_business_account") return;

    for (const entry of payload.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const value = change.value;
        if (!value) continue;

        for (const status of value.statuses ?? []) {
          await this.handleStatus(status).catch((err) =>
            logger.warn({ err, statusId: status.id }, "WhatsApp status webhook failed"),
          );
        }

        for (const message of value.messages ?? []) {
          await this.handleInboundMessage(message).catch((err) =>
            logger.warn({ err, messageId: message.id }, "WhatsApp inbound webhook failed"),
          );
        }
      }
    }
  },

  async handleStatus(status: {
    id: string;
    status: string;
    errors?: unknown[];
    conversation?: { id?: string };
    timestamp?: string;
  }): Promise<void> {
    const message = await whatsappMessagesRepository.findByWaMessageId(status.id);
    if (!message) return;

    const occurredAt = status.timestamp
      ? new Date(Number(status.timestamp) * 1000).toISOString()
      : new Date().toISOString();

    if (status.status === "failed") {
      await whatsappMessagesRepository.update(message.id, {
        status: "failed",
        deliveryStatus: "failed",
        errorPayload: { errors: status.errors ?? [] },
        waConversationId: status.conversation?.id ?? message.waConversationId ?? null,
      });
      await whatsappMessageEventsRepository.create({
        whatsappMessageId: message.id,
        leadId: message.leadId,
        campaignId: message.campaignId,
        eventType: "failed",
        bodyText: message.bodyPreview,
        detail: { errors: status.errors ?? [], waMessageId: status.id },
        occurredAt,
      });
      await activitiesRepository.log({
        leadId: message.leadId,
        userId: null,
        type: "send_failed",
        payload: { whatsappMessageId: message.id, channel: "whatsapp", errors: status.errors },
      });
      return;
    }

    if (status.status === "sent" || status.status === "delivered" || status.status === "read") {
      const patch: Record<string, unknown> = {
        deliveryStatus: status.status,
        waConversationId: status.conversation?.id ?? message.waConversationId ?? null,
      };
      if (status.status === "delivered") patch.deliveredAt = occurredAt;
      if (status.status === "read") {
        patch.readAt = occurredAt;
        if (!message.deliveredAt) patch.deliveredAt = occurredAt;
      }
      await whatsappMessagesRepository.update(message.id, patch);
      await whatsappMessageEventsRepository.create({
        whatsappMessageId: message.id,
        leadId: message.leadId,
        campaignId: message.campaignId,
        eventType: status.status,
        bodyText: message.bodyPreview,
        detail: {
          waMessageId: status.id,
          toPhone: message.toPhone,
          conversationId: status.conversation?.id,
        },
        occurredAt,
      });
    }
  },

  async handleInboundMessage(message: {
    id: string;
    from: string;
    timestamp?: string;
    type?: string;
    text?: { body?: string };
  }): Promise<void> {
    const bodyText = message.text?.body ?? `[${message.type ?? "unsupported"} message]`;
    const fromPhone = message.from;

    // Match the most recent outbound WhatsApp message to this phone via contact phone digits.
    const { data: contacts } = await supabaseAdmin
      .from("contacts")
      .select("id, phone, company_id")
      .not("phone", "is", null);

    const match = (contacts ?? []).find((c) => {
      const digits = String(c.phone ?? "").replace(/\D/g, "");
      return digits && (digits.endsWith(fromPhone) || fromPhone.endsWith(digits));
    });

    if (!match) {
      logger.info({ fromPhone }, "WhatsApp inbound with no matching contact");
      return;
    }

    const { data: leads } = await supabaseAdmin
      .from("leads")
      .select("id")
      .eq("contact_id", match.id)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(1);

    const leadId = leads?.[0]?.id as string | undefined;
    if (!leadId) return;

    const outbound = (await whatsappMessagesRepository.listByLeadIds([leadId])).find(
      (m) => m.status === "sent" || m.status === "approved",
    );

    let sentiment: "positive" | "neutral" | "negative" | null = null;
    try {
      const { system, userPrompt } = buildReplyClassificationPrompt(bodyText);
      const { result } = await callClaudeStructured({
        model: env.CLAUDE_MODEL_COPILOT,
        system,
        userPrompt,
        toolName: "classify_reply",
        toolDescription: "Classify reply sentiment",
        toolInputSchema: REPLY_CLASSIFICATION_TOOL_SCHEMA,
        parse: (raw) => replyClassificationResultSchema.parse(raw),
        maxTokens: 256,
      });
      sentiment = result.sentiment;
    } catch (err) {
      logger.warn({ err }, "WhatsApp reply classification failed");
    }

    await supabaseAdmin.from("whatsapp_replies").insert({
      whatsapp_message_id: outbound?.id ?? null,
      lead_id: leadId,
      wa_message_id: message.id,
      from_phone: fromPhone,
      body_text: bodyText,
      sentiment,
      received_at: message.timestamp
        ? new Date(Number(message.timestamp) * 1000).toISOString()
        : new Date().toISOString(),
    });

    if (outbound) {
      await whatsappMessageEventsRepository.create({
        whatsappMessageId: outbound.id,
        leadId,
        campaignId: outbound.campaignId,
        eventType: "reply",
        bodyText,
        detail: { fromPhone, sentiment, waMessageId: message.id },
        occurredAt: message.timestamp
          ? new Date(Number(message.timestamp) * 1000).toISOString()
          : new Date().toISOString(),
      });
    }

    await activitiesRepository.log({
      leadId,
      userId: null,
      type: "whatsapp_reply_received",
      payload: {
        fromPhone,
        bodyText,
        sentiment,
        waMessageId: message.id,
        whatsappMessageId: outbound?.id,
      },
    });
  },
};

export const whatsappTemplatesService = {
  async sync(organizationId: string) {
    const templates = await metaWhatsAppClient.listTemplates();
    const approved = templates.filter((t) => String(t.status).toUpperCase() === "APPROVED");
    return whatsappTemplatesRepository.upsertMany(
      organizationId,
      approved.map((t) => ({
        metaId: t.id ?? null,
        name: t.name,
        language: t.language,
        status: t.status,
        category: t.category ?? null,
        components: t.components,
      })),
    );
  },

  async list(organizationId: string) {
    return whatsappTemplatesRepository.listByOrganization(organizationId);
  },
};
