import type { DiscoveredLead, DiscoveredLeadListQuery, DiscoveredLeadStatus } from "@bluwheelz/shared";
import { supabaseAdmin } from "../config/supabase.js";
import { toCamel, toSnake } from "../utils/caseConverter.js";
import { ApiError } from "../utils/errors.js";

export interface DiscoveredLeadInsert {
  organizationId: string;
  searchBatchId: string;
  apolloId: string;
  companyName: string;
  domain?: string | null;
  industry?: string | null;
  employeeCount?: number | null;
  city?: string | null;
  searchState?: string | null;
  searchIndustry?: string | null;
  people: unknown[];
  status: DiscoveredLeadStatus;
  leadId?: string | null;
  companyId?: string | null;
  discoveredBy: string;
}

export const discoveredLeadsRepository = {
  async findByApolloId(organizationId: string, apolloId: string): Promise<DiscoveredLead | null> {
    const { data, error } = await supabaseAdmin
      .from("discovered_leads")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("apollo_id", apolloId)
      .maybeSingle();
    if (error) throw ApiError.internal(error.message);
    return data ? toCamel<DiscoveredLead>(data) : null;
  },

  async listApolloIds(organizationId: string): Promise<string[]> {
    const { data, error } = await supabaseAdmin
      .from("discovered_leads")
      .select("apollo_id")
      .eq("organization_id", organizationId);
    if (error) throw ApiError.internal(error.message);
    return (data ?? []).map((row) => row.apollo_id as string);
  },

  async list(
    organizationId: string,
    query: DiscoveredLeadListQuery,
  ): Promise<{ data: DiscoveredLead[]; total: number }> {
    let dbQuery = supabaseAdmin
      .from("discovered_leads")
      .select("*", { count: "exact" })
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false });

    if (query.status) dbQuery = dbQuery.eq("status", query.status);

    const from = (query.page - 1) * query.limit;
    const to = from + query.limit - 1;
    const { data, error, count } = await dbQuery.range(from, to);
    if (error) throw ApiError.internal(error.message);
    return { data: toCamel<DiscoveredLead[]>(data ?? []), total: count ?? 0 };
  },

  async findByIds(organizationId: string, ids: string[]): Promise<DiscoveredLead[]> {
    const { data, error } = await supabaseAdmin
      .from("discovered_leads")
      .select("*")
      .eq("organization_id", organizationId)
      .in("id", ids);
    if (error) throw ApiError.internal(error.message);
    return toCamel<DiscoveredLead[]>(data ?? []);
  },

  async findByLeadIds(organizationId: string, leadIds: string[]): Promise<DiscoveredLead[]> {
    if (leadIds.length === 0) return [];
    const { data, error } = await supabaseAdmin
      .from("discovered_leads")
      .select("*")
      .eq("organization_id", organizationId)
      .in("lead_id", leadIds);
    if (error) throw ApiError.internal(error.message);
    return toCamel<DiscoveredLead[]>(data ?? []);
  },

  async findByCompanyIds(organizationId: string, companyIds: string[]): Promise<DiscoveredLead[]> {
    if (companyIds.length === 0) return [];
    const { data, error } = await supabaseAdmin
      .from("discovered_leads")
      .select("*")
      .eq("organization_id", organizationId)
      .in("company_id", companyIds);
    if (error) throw ApiError.internal(error.message);
    return toCamel<DiscoveredLead[]>(data ?? []);
  },

  async listPendingOrphans(organizationId: string): Promise<DiscoveredLead[]> {
    const { data, error } = await supabaseAdmin
      .from("discovered_leads")
      .select("*")
      .eq("organization_id", organizationId)
      .in("status", ["pending", "failed"])
      .is("lead_id", null)
      .order("created_at", { ascending: false });
    if (error) throw ApiError.internal(error.message);
    return toCamel<DiscoveredLead[]>(data ?? []);
  },

  async upsert(row: DiscoveredLeadInsert): Promise<DiscoveredLead> {
    const snake = toSnake(row);
    const { data, error } = await supabaseAdmin
      .from("discovered_leads")
      .upsert(snake, { onConflict: "organization_id,apollo_id" })
      .select("*")
      .single();
    if (error) throw ApiError.internal(error.message);
    return toCamel<DiscoveredLead>(data);
  },

  async update(
    id: string,
    input: Partial<{
      status: DiscoveredLeadStatus;
      leadId: string | null;
      companyId: string | null;
      failureReason: string | null;
      promotedAt: string | null;
      searchBatchId: string;
      people: unknown[];
    }>,
  ): Promise<DiscoveredLead> {
    const row = toSnake(input);
    const { data, error } = await supabaseAdmin
      .from("discovered_leads")
      .update(row)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw ApiError.internal(error.message);
    return toCamel<DiscoveredLead>(data);
  },
};
