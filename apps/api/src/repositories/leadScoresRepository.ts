import type { LeadScore } from "@bluwheelz/shared";
import { supabaseAdmin } from "../config/supabase.js";
import { toCamel, toSnake } from "../utils/caseConverter.js";
import { ApiError } from "../utils/errors.js";

export const leadScoresRepository = {
  async listByLead(leadId: string): Promise<LeadScore[]> {
    const { data, error } = await supabaseAdmin
      .from("lead_scores")
      .select("*")
      .eq("lead_id", leadId)
      .order("version", { ascending: false });
    if (error) throw ApiError.internal(error.message);
    return toCamel<LeadScore[]>(data ?? []);
  },

  async findLatest(leadId: string): Promise<LeadScore | null> {
    const { data, error } = await supabaseAdmin
      .from("lead_scores")
      .select("*")
      .eq("lead_id", leadId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw ApiError.internal(error.message);
    return data ? toCamel<LeadScore>(data) : null;
  },

  async create(input: Omit<LeadScore, "id" | "createdAt">): Promise<LeadScore> {
    const row = toSnake(input);
    const { data, error } = await supabaseAdmin.from("lead_scores").insert(row).select("*").single();
    if (error) throw ApiError.conflict(error.message);
    return toCamel<LeadScore>(data);
  },

  async nextVersion(leadId: string): Promise<number> {
    const latest = await this.findLatest(leadId);
    return (latest?.version ?? 0) + 1;
  },
};
