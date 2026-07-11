import type { CompanyIntelligence } from "@bluwheelz/shared";
import { supabaseAdmin } from "../config/supabase.js";
import { toCamel, toSnake } from "../utils/caseConverter.js";
import { ApiError } from "../utils/errors.js";

export const companyIntelligenceRepository = {
  async findLatestByCompany(companyId: string): Promise<CompanyIntelligence | null> {
    const { data, error } = await supabaseAdmin
      .from("company_intelligence")
      .select("*")
      .eq("company_id", companyId)
      .order("researched_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw ApiError.internal(error.message);
    return data ? toCamel<CompanyIntelligence>(data) : null;
  },

  async create(input: Omit<CompanyIntelligence, "id" | "researchedAt">): Promise<CompanyIntelligence> {
    const row = toSnake(input);
    const { data, error } = await supabaseAdmin.from("company_intelligence").insert(row).select("*").single();
    if (error) throw ApiError.conflict(error.message);
    return toCamel<CompanyIntelligence>(data);
  },
};
