import type { OutreachAcknowledgement, OutreachChannel } from "@bluwheelz/shared";
import { supabaseAdmin } from "../config/supabase.js";
import { toCamel, toSnake } from "../utils/caseConverter.js";
import { ApiError } from "../utils/errors.js";

export const outreachAcknowledgementsRepository = {
  async listForLead(leadId: string): Promise<OutreachAcknowledgement[]> {
    const { data, error } = await supabaseAdmin
      .from("outreach_acknowledgements")
      .select("*")
      .eq("lead_id", leadId);
    if (error) throw ApiError.internal(error.message);
    return toCamel<OutreachAcknowledgement[]>(data ?? []);
  },

  async listForLeads(leadIds: string[]): Promise<OutreachAcknowledgement[]> {
    if (leadIds.length === 0) return [];
    const { data, error } = await supabaseAdmin
      .from("outreach_acknowledgements")
      .select("*")
      .in("lead_id", leadIds);
    if (error) throw ApiError.internal(error.message);
    return toCamel<OutreachAcknowledgement[]>(data ?? []);
  },

  async upsert(input: {
    leadId: string;
    contactId: string;
    channel: OutreachChannel;
    acknowledged: boolean;
    acknowledgedBy: string;
  }): Promise<OutreachAcknowledgement> {
    const row = toSnake({ ...input, acknowledgedAt: new Date().toISOString() });
    const { data, error } = await supabaseAdmin
      .from("outreach_acknowledgements")
      .upsert(row, { onConflict: "lead_id,contact_id,channel" })
      .select("*")
      .single();
    if (error) throw ApiError.internal(error.message);
    return toCamel<OutreachAcknowledgement>(data);
  },
};
