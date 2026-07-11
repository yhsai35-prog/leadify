import type { Organization, TenantSummary } from "@bluwheelz/shared";
import { supabaseAdmin } from "../config/supabase.js";
import { toCamel } from "../utils/caseConverter.js";
import { ApiError } from "../utils/errors.js";

export const organizationsRepository = {
  async findById(id: string): Promise<Organization | null> {
    const { data, error } = await supabaseAdmin.from("organizations").select("*").eq("id", id).maybeSingle();
    if (error) throw ApiError.internal(error.message);
    return data ? toCamel<Organization>(data) : null;
  },

  async listAll(): Promise<TenantSummary[]> {
    const { data, error } = await supabaseAdmin
      .from("organizations")
      .select("*, users (id, is_active)")
      .order("created_at", { ascending: true });
    if (error) throw ApiError.internal(error.message);

    return (data ?? []).map((row) => {
      const users = (row.users ?? []) as Array<{ id: string; is_active: boolean }>;
      const { users: _users, ...org } = row;
      return {
        ...toCamel<Organization>(org),
        userCount: users.length,
        activeUserCount: users.filter((u) => u.is_active).length,
      };
    });
  },

  async create(input: { name: string; companyProfile?: string }): Promise<Organization> {
    const { data, error } = await supabaseAdmin
      .from("organizations")
      .insert({ name: input.name, company_profile: input.companyProfile ?? null, settings: {} })
      .select("*")
      .single();
    if (error) throw ApiError.internal(error.message);
    return toCamel<Organization>(data);
  },

  async update(
    id: string,
    patch: {
      name?: string;
      settings?: Record<string, unknown>;
      logoUrl?: string | null;
      isActive?: boolean;
      companyProfile?: string;
    },
  ): Promise<Organization> {
    const update: Record<string, unknown> = {};
    if (patch.name !== undefined) update.name = patch.name;
    if (patch.settings !== undefined) update.settings = patch.settings;
    if (patch.logoUrl !== undefined) update.logo_url = patch.logoUrl;
    if (patch.isActive !== undefined) update.is_active = patch.isActive;
    if (patch.companyProfile !== undefined) update.company_profile = patch.companyProfile;
    update.updated_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from("organizations")
      .update(update)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw ApiError.internal(error.message);
    return toCamel<Organization>(data);
  },

  /** Back-compat alias used by organizationsService. */
  async updateSettings(id: string, patch: { name?: string; settings?: Record<string, unknown>; companyProfile?: string }): Promise<Organization> {
    return this.update(id, patch);
  },
};
