import type { Meeting } from "@bluwheelz/shared";
import { supabaseAdmin } from "../config/supabase.js";
import { toCamel, toSnake } from "../utils/caseConverter.js";
import { ApiError } from "../utils/errors.js";

export const meetingsRepository = {
  async create(input: Omit<Meeting, "id">): Promise<Meeting> {
    const row = toSnake(input);
    const { data, error } = await supabaseAdmin.from("meetings").insert(row).select("*").single();
    if (error) throw ApiError.conflict(error.message);
    return toCamel<Meeting>(data);
  },

  async listByLead(leadId: string): Promise<Meeting[]> {
    const { data, error } = await supabaseAdmin
      .from("meetings")
      .select("*")
      .eq("lead_id", leadId)
      .order("scheduled_at", { ascending: false });
    if (error) throw ApiError.internal(error.message);
    return toCamel<Meeting[]>(data ?? []);
  },
};
