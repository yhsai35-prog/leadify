import type { Activity, ActivityType } from "@bluwheelz/shared";
import { supabaseAdmin } from "../config/supabase.js";
import { toCamel, toSnake } from "../utils/caseConverter.js";
import { ApiError } from "../utils/errors.js";

export const activitiesRepository = {
  async listByLead(leadId: string): Promise<Activity[]> {
    const { data, error } = await supabaseAdmin
      .from("activities")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false });
    if (error) throw ApiError.internal(error.message);
    return toCamel<Activity[]>(data ?? []);
  },

  async log(input: {
    leadId: string;
    userId?: string | null;
    type: ActivityType;
    payload?: Record<string, unknown>;
  }): Promise<Activity> {
    const row = toSnake({ payload: {}, ...input });
    const { data, error } = await supabaseAdmin.from("activities").insert(row).select("*").single();
    if (error) throw ApiError.internal(error.message);
    return toCamel<Activity>(data);
  },
};
