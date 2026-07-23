import type { WhatsappMessageEvent } from "@bluwheelz/shared";
import { supabaseAdmin } from "../config/supabase.js";
import { toCamel, toSnake } from "../utils/caseConverter.js";
import { ApiError } from "../utils/errors.js";

export const whatsappMessageEventsRepository = {
  async create(input: {
    whatsappMessageId: string;
    leadId: string;
    campaignId?: string | null;
    eventType: string;
    bodyText?: string | null;
    detail?: Record<string, unknown>;
    occurredAt?: string;
  }): Promise<WhatsappMessageEvent> {
    const row = toSnake({
      whatsappMessageId: input.whatsappMessageId,
      leadId: input.leadId,
      campaignId: input.campaignId ?? null,
      eventType: input.eventType,
      bodyText: input.bodyText ?? null,
      detail: input.detail ?? {},
      occurredAt: input.occurredAt ?? new Date().toISOString(),
    });
    const { data, error } = await supabaseAdmin.from("whatsapp_message_events").insert(row).select("*").single();
    if (error) throw ApiError.internal(error.message);
    return toCamel<WhatsappMessageEvent>(data);
  },

  async listByCampaign(campaignId: string, limit = 100): Promise<WhatsappMessageEvent[]> {
    const { data, error } = await supabaseAdmin
      .from("whatsapp_message_events")
      .select("*")
      .eq("campaign_id", campaignId)
      .order("occurred_at", { ascending: false })
      .limit(limit);
    if (error) throw ApiError.internal(error.message);
    return toCamel<WhatsappMessageEvent[]>(data ?? []);
  },

  async listByLead(leadId: string, limit = 100): Promise<WhatsappMessageEvent[]> {
    const { data, error } = await supabaseAdmin
      .from("whatsapp_message_events")
      .select("*")
      .eq("lead_id", leadId)
      .order("occurred_at", { ascending: false })
      .limit(limit);
    if (error) throw ApiError.internal(error.message);
    return toCamel<WhatsappMessageEvent[]>(data ?? []);
  },

  async listByMessage(whatsappMessageId: string): Promise<WhatsappMessageEvent[]> {
    const { data, error } = await supabaseAdmin
      .from("whatsapp_message_events")
      .select("*")
      .eq("whatsapp_message_id", whatsappMessageId)
      .order("occurred_at", { ascending: true });
    if (error) throw ApiError.internal(error.message);
    return toCamel<WhatsappMessageEvent[]>(data ?? []);
  },
};
