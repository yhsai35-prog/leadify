import type { Lead, LeadFilters, PaginationQuery, PipelineStatus } from "@bluwheelz/shared";
import { industryMatchesIcpSelection } from "@bluwheelz/shared";
import { supabaseAdmin } from "../config/supabase.js";
import { toCamel, toSnake } from "../utils/caseConverter.js";
import { ApiError } from "../utils/errors.js";

const LEAD_WITH_RELATIONS = "*, company:companies(*), contact:contacts(*)";

function matchesIndustryFilter(companyIndustry: string | null | undefined, filter: string): boolean {
  if (!companyIndustry) return false;
  const lower = companyIndustry.toLowerCase();
  return (
    industryMatchesIcpSelection(companyIndustry, [filter]) ||
    lower.includes(filter.toLowerCase())
  );
}

export const leadsRepository = {
  async findById(id: string): Promise<Lead | null> {
    const { data, error } = await supabaseAdmin
      .from("leads")
      .select(LEAD_WITH_RELATIONS)
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw ApiError.internal(error.message);
    return data ? toCamel<Lead>(data) : null;
  },

  async list(
    organizationId: string,
    filters: LeadFilters,
    pagination: PaginationQuery,
  ): Promise<{ data: Lead[]; total: number }> {
    let query = supabaseAdmin
      .from("leads")
      .select(LEAD_WITH_RELATIONS, { count: "exact" })
      .eq("organization_id", organizationId)
      .is("deleted_at", null);

    if (filters.pipelineStatus) query = query.eq("pipeline_status", filters.pipelineStatus);
    if (filters.priority) query = query.eq("priority", filters.priority);
    if (filters.assignedTo) query = query.eq("assigned_to", filters.assignedTo);

    const needsInMemoryFilter = Boolean(filters.industry || filters.search);
    const from = (pagination.page - 1) * pagination.limit;
    const to = from + pagination.limit - 1;

    if (!needsInMemoryFilter) {
      query = query.range(from, to);
    }

    const { data, error, count } = await query.order("icp_score", { ascending: false, nullsFirst: false });
    if (error) throw ApiError.internal(error.message);
    let rows = toCamel<Lead[]>(data ?? []);

    if (filters.industry) {
      rows = rows.filter((l) => matchesIndustryFilter(l.company?.industry, filters.industry!));
    }
    if (filters.search) {
      const term = filters.search.toLowerCase();
      rows = rows.filter((l) => l.company?.name?.toLowerCase().includes(term));
    }

    if (needsInMemoryFilter) {
      const total = rows.length;
      rows = rows.slice(from, to + 1);
      return { data: rows, total };
    }

    return { data: rows, total: count ?? 0 };
  },

  async listForFoundView(
    organizationId: string,
    options: { offset: number; limit: number },
  ): Promise<{ data: Lead[]; total: number }> {
    const from = options.offset;
    const to = from + options.limit - 1;
    const { data, error, count } = await supabaseAdmin
      .from("leads")
      .select(LEAD_WITH_RELATIONS, { count: "exact" })
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .range(from, to);
    if (error) throw ApiError.internal(error.message);
    return { data: toCamel<Lead[]>(data ?? []), total: count ?? 0 };
  },

  async listByPipelineStatus(organizationId: string, status: PipelineStatus): Promise<Lead[]> {
    const { data, error } = await supabaseAdmin
      .from("leads")
      .select(LEAD_WITH_RELATIONS)
      .eq("organization_id", organizationId)
      .eq("pipeline_status", status)
      .is("deleted_at", null);
    if (error) throw ApiError.internal(error.message);
    return toCamel<Lead[]>(data ?? []);
  },

  async create(input: Partial<Lead> & { organizationId: string; companyId: string }): Promise<Lead> {
    const row = toSnake(input);
    const { data, error } = await supabaseAdmin.from("leads").insert(row).select(LEAD_WITH_RELATIONS).single();
    if (error) throw ApiError.conflict(error.message);
    return toCamel<Lead>(data);
  },

  async findExistingForCompany(organizationId: string, companyId: string): Promise<Lead | null> {
    const { data, error } = await supabaseAdmin
      .from("leads")
      .select(LEAD_WITH_RELATIONS)
      .eq("organization_id", organizationId)
      .eq("company_id", companyId)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw ApiError.internal(error.message);
    return data ? toCamel<Lead>(data) : null;
  },

  async updateStatus(id: string, status: PipelineStatus): Promise<Lead> {
    const { data, error } = await supabaseAdmin
      .from("leads")
      .update({ pipeline_status: status })
      .eq("id", id)
      .select(LEAD_WITH_RELATIONS)
      .single();
    if (error) throw ApiError.internal(error.message);
    return toCamel<Lead>(data);
  },

  async assign(id: string, assignedTo: string): Promise<Lead> {
    const { data, error } = await supabaseAdmin
      .from("leads")
      .update({ assigned_to: assignedTo })
      .eq("id", id)
      .select(LEAD_WITH_RELATIONS)
      .single();
    if (error) throw ApiError.internal(error.message);
    return toCamel<Lead>(data);
  },

  async countInOrganization(organizationId: string, leadIds: string[]): Promise<number> {
    if (leadIds.length === 0) return 0;
    const { count, error } = await supabaseAdmin
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .in("id", leadIds)
      .is("deleted_at", null);
    if (error) throw ApiError.internal(error.message);
    return count ?? 0;
  },
};
