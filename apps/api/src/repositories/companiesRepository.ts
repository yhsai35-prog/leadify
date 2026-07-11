import type { Company, CompanyFilters, PaginationQuery } from "@bluwheelz/shared";
import { supabaseAdmin } from "../config/supabase.js";
import { toCamel, toSnake } from "../utils/caseConverter.js";
import { ApiError } from "../utils/errors.js";

export const companiesRepository = {
  async findById(id: string): Promise<Company | null> {
    const { data, error } = await supabaseAdmin.from("companies").select("*").eq("id", id).is("deleted_at", null).maybeSingle();
    if (error) throw ApiError.internal(error.message);
    return data ? toCamel<Company>(data) : null;
  },

  async findByDomain(organizationId: string, domain: string): Promise<Company | null> {
    const { data, error } = await supabaseAdmin
      .from("companies")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("domain", domain)
      .maybeSingle();
    if (error) throw ApiError.internal(error.message);
    return data ? toCamel<Company>(data) : null;
  },

  async findByApolloId(organizationId: string, apolloId: string): Promise<Company | null> {
    const { data, error } = await supabaseAdmin
      .from("companies")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("apollo_id", apolloId)
      .maybeSingle();
    if (error) throw ApiError.internal(error.message);
    return data ? toCamel<Company>(data) : null;
  },

  async listApolloIds(organizationId: string): Promise<string[]> {
    const { data, error } = await supabaseAdmin
      .from("companies")
      .select("apollo_id")
      .eq("organization_id", organizationId)
      .not("apollo_id", "is", null);
    if (error) throw ApiError.internal(error.message);
    return (data ?? []).map((row) => row.apollo_id as string);
  },

  async list(
    organizationId: string,
    filters: CompanyFilters,
    pagination: PaginationQuery,
  ): Promise<{ data: Company[]; total: number }> {
    let query = supabaseAdmin
      .from("companies")
      .select("*", { count: "exact" })
      .eq("organization_id", organizationId)
      .is("deleted_at", null);

    if (filters.industry) query = query.ilike("industry", `%${filters.industry}%`);
    if (filters.minRevenueInrCr) query = query.gte("revenue_inr_cr", filters.minRevenueInrCr);
    if (filters.isExistingClient !== undefined) query = query.eq("is_existing_client", filters.isExistingClient);
    if (filters.search) query = query.ilike("name", `%${filters.search}%`);

    const from = (pagination.page - 1) * pagination.limit;
    const to = from + pagination.limit - 1;
    const { data, error, count } = await query.order("created_at", { ascending: false }).range(from, to);

    if (error) throw ApiError.internal(error.message);
    return { data: toCamel<Company[]>(data ?? []), total: count ?? 0 };
  },

  async create(organizationId: string, input: Partial<Company>): Promise<Company> {
    const row = toSnake({ ...input, organizationId });
    const { data, error } = await supabaseAdmin.from("companies").insert(row).select("*").single();
    if (error) throw ApiError.conflict(error.message);
    return toCamel<Company>(data);
  },

  async update(id: string, input: Partial<Company>): Promise<Company> {
    const row = toSnake(input);
    const { data, error } = await supabaseAdmin.from("companies").update(row).eq("id", id).select("*").single();
    if (error) throw ApiError.internal(error.message);
    return toCamel<Company>(data);
  },

  async findByNameFuzzy(organizationId: string, name: string, limit = 5): Promise<Company[]> {
    const { data } = await this.list(organizationId, { search: name }, { page: 1, limit });
    return data;
  },

  async updateEmbedding(id: string, embedding: number[]): Promise<void> {
    const { error } = await supabaseAdmin.from("companies").update({ embedding }).eq("id", id);
    if (error) throw ApiError.internal(error.message);
  },

  /** Vector similarity search against the 22 seeded existing-client profiles via cosine distance. */
  async findTopSimilarExistingClients(
    embedding: number[],
    limit = 3,
  ): Promise<Array<{ profileId: string; companyId: string; companyName: string; distance: number }>> {
    const { data, error } = await supabaseAdmin.rpc("match_existing_clients", {
      query_embedding: embedding,
      match_count: limit,
    });
    if (error) throw ApiError.internal(error.message);
    return (data ?? []).map((row: Record<string, unknown>) => ({
      profileId: row.profile_id as string,
      companyId: row.company_id as string,
      companyName: row.company_name as string,
      distance: row.distance as number,
    }));
  },
};
