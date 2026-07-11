import type { ExistingClientProfile, LeadSimilarityMatch } from "@bluwheelz/shared";
import { supabaseAdmin } from "../config/supabase.js";
import { toCamel, toSnake } from "../utils/caseConverter.js";
import { ApiError } from "../utils/errors.js";

type LeadOrgRow = { organization_id: string; deleted_at: string | null };

function unwrapLeadOrg(lead: unknown): LeadOrgRow | null {
  if (!lead) return null;
  if (Array.isArray(lead)) return (lead[0] as LeadOrgRow | undefined) ?? null;
  return lead as LeadOrgRow;
}

export const similarityRepository = {
  async listExistingClientProfiles(): Promise<Array<ExistingClientProfile & { companyName: string }>> {
    const { data, error } = await supabaseAdmin
      .from("existing_client_profiles")
      .select("*, company:companies(name)");
    if (error) throw ApiError.internal(error.message);
    return (data ?? []).map((row: Record<string, unknown>) => ({
      ...toCamel<ExistingClientProfile>(row),
      companyName: (row.company as { name: string } | null)?.name ?? "Unknown",
    }));
  },

  async listMatchesForLead(leadId: string): Promise<LeadSimilarityMatch[]> {
    const { data, error } = await supabaseAdmin
      .from("lead_similarity_matches")
      .select("*, existing_client_profile:existing_client_profiles(company:companies(name))")
      .eq("lead_id", leadId)
      .order("similarity_pct", { ascending: false });
    if (error) throw ApiError.internal(error.message);
    return (data ?? []).map((row: Record<string, unknown>) => {
      const profile = row.existing_client_profile as { company?: { name: string } } | null;
      return {
        ...toCamel<LeadSimilarityMatch>(row),
        existingClientName: profile?.company?.name ?? "Unknown",
      };
    });
  },

  async countProspectsByProfile(organizationId: string): Promise<Record<string, number>> {
    const { data, error } = await supabaseAdmin
      .from("lead_similarity_matches")
      .select("existing_client_profile_id, lead:leads(organization_id, deleted_at)");
    if (error) throw ApiError.internal(error.message);

    const counts: Record<string, number> = {};
    for (const row of data ?? []) {
      const lead = unwrapLeadOrg(row.lead);
      if (!lead || lead.deleted_at || lead.organization_id !== organizationId) continue;
      const profileId = row.existing_client_profile_id as string;
      counts[profileId] = (counts[profileId] ?? 0) + 1;
    }
    return counts;
  },

  async similarityCoverage(organizationId: string): Promise<{ leadsWithSimilarity: number; totalLeads: number }> {
    const { count: totalLeads, error: countError } = await supabaseAdmin
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .is("deleted_at", null);
    if (countError) throw ApiError.internal(countError.message);

    const { data, error } = await supabaseAdmin
      .from("lead_similarity_matches")
      .select("lead_id, lead:leads(organization_id, deleted_at)");
    if (error) throw ApiError.internal(error.message);

    const leadIds = new Set<string>();
    for (const row of data ?? []) {
      const lead = unwrapLeadOrg(row.lead);
      if (!lead || lead.deleted_at || lead.organization_id !== organizationId) continue;
      leadIds.add(row.lead_id as string);
    }

    return { leadsWithSimilarity: leadIds.size, totalLeads: totalLeads ?? 0 };
  },

  async findProfileByCompanyId(companyId: string): Promise<(ExistingClientProfile & { companyName: string }) | null> {
    const { data, error } = await supabaseAdmin
      .from("existing_client_profiles")
      .select("*, company:companies(name)")
      .eq("company_id", companyId)
      .maybeSingle();
    if (error) throw ApiError.internal(error.message);
    if (!data) return null;
    return {
      ...toCamel<ExistingClientProfile>(data),
      companyName: (data.company as { name: string } | null)?.name ?? "Unknown",
    };
  },

  async listProspectsForProfile(
    organizationId: string,
    profileId: string,
    limit: number,
  ): Promise<
    Array<{
      leadId: string;
      companyName: string;
      industry: string | null;
      pipelineStatus: string;
      priority: string;
      icpScore: number | null;
      similarityPct: number;
      reason: string;
    }>
  > {
    const { data, error } = await supabaseAdmin
      .from("lead_similarity_matches")
      .select(
        "similarity_pct, reason, lead:leads(id, pipeline_status, priority, icp_score, organization_id, deleted_at, company:companies(name, industry))",
      )
      .eq("existing_client_profile_id", profileId)
      .order("similarity_pct", { ascending: false })
      .limit(limit * 3);
    if (error) throw ApiError.internal(error.message);

    return (data ?? [])
      .map((row: Record<string, unknown>) => {
        const lead = row.lead as {
          id: string;
          pipeline_status: string;
          priority: string;
          icp_score: number | null;
          organization_id: string;
          deleted_at: string | null;
          company?: { name: string; industry: string | null };
        } | null;
        if (!lead || lead.deleted_at || lead.organization_id !== organizationId) return null;
        return {
          leadId: lead.id,
          companyName: lead.company?.name ?? "Unknown",
          industry: lead.company?.industry ?? null,
          pipelineStatus: lead.pipeline_status,
          priority: lead.priority,
          icpScore: lead.icp_score,
          similarityPct: Number(row.similarity_pct),
          reason: row.reason as string,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row != null)
      .slice(0, limit);
  },

  async replaceMatchesForLead(
    leadId: string,
    matches: Array<Omit<LeadSimilarityMatch, "id" | "rankedAt" | "leadId" | "existingClientName">>,
  ): Promise<void> {
    const { error: deleteError } = await supabaseAdmin.from("lead_similarity_matches").delete().eq("lead_id", leadId);
    if (deleteError) throw ApiError.internal(deleteError.message);

    if (matches.length === 0) return;
    const rows = matches.map((m) => toSnake({ ...m, leadId }));
    const { error: insertError } = await supabaseAdmin.from("lead_similarity_matches").insert(rows);
    if (insertError) throw ApiError.internal(insertError.message);
  },
};
