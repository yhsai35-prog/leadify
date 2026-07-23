import type { EmailStatus, WhatsappMessage } from "@bluwheelz/shared";
import { supabaseAdmin } from "../config/supabase.js";
import { toCamel, toSnake } from "../utils/caseConverter.js";
import { ApiError } from "../utils/errors.js";

const ACTIVE_STATUSES = new Set(["draft", "pending_approval", "approved", "scheduled", "sent"]);

export const whatsappMessagesRepository = {
  async findById(id: string): Promise<WhatsappMessage | null> {
    const { data, error } = await supabaseAdmin.from("whatsapp_messages").select("*").eq("id", id).maybeSingle();
    if (error) throw ApiError.internal(error.message);
    return data ? toCamel<WhatsappMessage>(data) : null;
  },

  async findByWaMessageId(waMessageId: string): Promise<WhatsappMessage | null> {
    const { data, error } = await supabaseAdmin
      .from("whatsapp_messages")
      .select("*")
      .eq("wa_message_id", waMessageId)
      .maybeSingle();
    if (error) throw ApiError.internal(error.message);
    return data ? toCamel<WhatsappMessage>(data) : null;
  },

  async create(
    input: Partial<WhatsappMessage> & {
      leadId: string;
      contactId: string;
      templateName: string;
      templateLanguage: string;
    },
  ): Promise<WhatsappMessage> {
    const row = toSnake(input);
    const { data, error } = await supabaseAdmin.from("whatsapp_messages").insert(row).select("*").single();
    if (error) throw ApiError.conflict(error.message);
    return toCamel<WhatsappMessage>(data);
  },

  async update(id: string, input: Partial<WhatsappMessage>): Promise<WhatsappMessage> {
    const row = toSnake({ ...input, updatedAt: new Date().toISOString() });
    const { data, error } = await supabaseAdmin.from("whatsapp_messages").update(row).eq("id", id).select("*").single();
    if (error) throw ApiError.internal(error.message);
    return toCamel<WhatsappMessage>(data);
  },

  async listByLeadIds(leadIds: string[]): Promise<WhatsappMessage[]> {
    if (leadIds.length === 0) return [];
    const { data, error } = await supabaseAdmin.from("whatsapp_messages").select("*").in("lead_id", leadIds);
    if (error) throw ApiError.internal(error.message);
    return toCamel<WhatsappMessage[]>(data ?? []);
  },

  async listDraftsForLeadIds(leadIds: string[]): Promise<WhatsappMessage[]> {
    if (leadIds.length === 0) return [];
    const { data, error } = await supabaseAdmin
      .from("whatsapp_messages")
      .select("*")
      .in("lead_id", leadIds)
      .eq("status", "draft" satisfies EmailStatus);
    if (error) throw ApiError.internal(error.message);
    return toCamel<WhatsappMessage[]>(data ?? []);
  },

  async listApprovedForLeadIds(leadIds: string[]): Promise<WhatsappMessage[]> {
    if (leadIds.length === 0) return [];
    const { data, error } = await supabaseAdmin
      .from("whatsapp_messages")
      .select("*")
      .in("lead_id", leadIds)
      .eq("status", "approved" satisfies EmailStatus);
    if (error) throw ApiError.internal(error.message);
    return toCamel<WhatsappMessage[]>(data ?? []);
  },

  async listScheduledDue(nowIso: string): Promise<WhatsappMessage[]> {
    const { data, error } = await supabaseAdmin
      .from("whatsapp_messages")
      .select("*")
      .eq("status", "scheduled" satisfies EmailStatus)
      .lte("scheduled_at", nowIso);
    if (error) throw ApiError.internal(error.message);
    return toCamel<WhatsappMessage[]>(data ?? []);
  },

  latestStatusByLeadIds(messages: WhatsappMessage[]): Map<string, string> {
    const map = new Map<string, string>();
    for (const msg of messages) {
      if (!map.has(msg.leadId) || ACTIVE_STATUSES.has(msg.status)) {
        map.set(msg.leadId, msg.status);
      }
    }
    return map;
  },

  buildContactStatusMap(messages: WhatsappMessage[]): Map<string, string> {
    const map = new Map<string, string>();
    for (const msg of messages) {
      const key = `${msg.leadId}:${msg.contactId}`;
      if (!map.has(key) || ACTIVE_STATUSES.has(msg.status)) {
        map.set(key, msg.status);
      }
    }
    return map;
  },

  mapStats(rows: Array<{ status: string }>) {
    const stats = {
      draft: 0,
      pendingApproval: 0,
      approved: 0,
      scheduled: 0,
      sent: 0,
      failed: 0,
    };
    for (const row of rows) {
      if (row.status === "draft") stats.draft += 1;
      else if (row.status === "pending_approval") stats.pendingApproval += 1;
      else if (row.status === "approved") stats.approved += 1;
      else if (row.status === "scheduled") stats.scheduled += 1;
      else if (row.status === "sent") stats.sent += 1;
      else if (row.status === "failed") stats.failed += 1;
    }
    return stats;
  },
};
