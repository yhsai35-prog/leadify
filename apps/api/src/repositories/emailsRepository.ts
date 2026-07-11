import type { Email, EmailStatus } from "@bluwheelz/shared";
import { supabaseAdmin } from "../config/supabase.js";
import { toCamel, toSnake } from "../utils/caseConverter.js";
import { ApiError } from "../utils/errors.js";

export const emailsRepository = {
  async findById(id: string): Promise<Email | null> {
    const { data, error } = await supabaseAdmin.from("emails").select("*").eq("id", id).maybeSingle();
    if (error) throw ApiError.internal(error.message);
    return data ? toCamel<Email>(data) : null;
  },

  async listByLeadIds(leadIds: string[]): Promise<Email[]> {
    if (leadIds.length === 0) return [];
    const { data, error } = await supabaseAdmin
      .from("emails")
      .select("*")
      .in("lead_id", leadIds)
      .order("created_at", { ascending: false });
    if (error) throw ApiError.internal(error.message);
    return toCamel<Email[]>(data ?? []);
  },

  buildContactStatusMap(emails: Email[]): Map<string, string> {
    const map = new Map<string, string>();
    for (const email of emails) {
      const key = `${email.leadId}:${email.contactId}`;
      if (!map.has(key)) map.set(key, email.status);
    }
    return map;
  },

  async listByLead(leadId: string): Promise<Email[]> {
    const { data, error } = await supabaseAdmin
      .from("emails")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false });
    if (error) throw ApiError.internal(error.message);
    return toCamel<Email[]>(data ?? []);
  },

  async listDraftsForLeadIds(leadIds: string[]): Promise<Email[]> {
    if (leadIds.length === 0) return [];
    const { data, error } = await supabaseAdmin
      .from("emails")
      .select("*")
      .in("lead_id", leadIds)
      .eq("status", "draft" satisfies EmailStatus);
    if (error) throw ApiError.internal(error.message);
    return toCamel<Email[]>(data ?? []);
  },

  async listApprovedForLeadIds(leadIds: string[]): Promise<Email[]> {
    if (leadIds.length === 0) return [];
    const { data, error } = await supabaseAdmin
      .from("emails")
      .select("*")
      .in("lead_id", leadIds)
      .eq("status", "approved" satisfies EmailStatus);
    if (error) throw ApiError.internal(error.message);
    return toCamel<Email[]>(data ?? []);
  },

  async latestStatusByLeadIds(leadIds: string[]): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    if (leadIds.length === 0) return map;
    const { data, error } = await supabaseAdmin
      .from("emails")
      .select("lead_id, status, created_at")
      .in("lead_id", leadIds)
      .order("created_at", { ascending: false });
    if (error) throw ApiError.internal(error.message);
    for (const row of data ?? []) {
      const leadId = row.lead_id as string;
      if (!map.has(leadId)) map.set(leadId, row.status as string);
    }
    return map;
  },

  async findByGmailThreadId(threadId: string): Promise<Email | null> {
    const { data, error } = await supabaseAdmin
      .from("emails")
      .select("*")
      .eq("gmail_thread_id", threadId)
      .maybeSingle();
    if (error) throw ApiError.internal(error.message);
    return data ? toCamel<Email>(data) : null;
  },

  async listScheduledDue(asOf: string): Promise<Email[]> {
    const { data, error } = await supabaseAdmin
      .from("emails")
      .select("*")
      .eq("status", "scheduled" satisfies EmailStatus)
      .lte("scheduled_at", asOf);
    if (error) throw ApiError.internal(error.message);
    return toCamel<Email[]>(data ?? []);
  },

  async create(input: Partial<Email> & { leadId: string; contactId: string }): Promise<Email> {
    const row = toSnake(input);
    const { data, error } = await supabaseAdmin.from("emails").insert(row).select("*").single();
    if (error) throw ApiError.conflict(error.message);
    return toCamel<Email>(data);
  },

  async update(id: string, input: Partial<Email>): Promise<Email> {
    const row = toSnake(input);
    const { data, error } = await supabaseAdmin.from("emails").update(row).eq("id", id).select("*").single();
    if (error) throw ApiError.internal(error.message);
    return toCamel<Email>(data);
  },

  async markSuperseded(id: string): Promise<void> {
    const { error } = await supabaseAdmin.from("emails").update({ status: "superseded" }).eq("id", id);
    if (error) throw ApiError.internal(error.message);
  },
};
