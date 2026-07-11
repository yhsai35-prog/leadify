import type { User, UserRole } from "@bluwheelz/shared";
import { supabaseAdmin } from "../config/supabase.js";
import { toCamel } from "../utils/caseConverter.js";
import { ApiError } from "../utils/errors.js";

export const usersRepository = {
  async findById(id: string): Promise<User | null> {
    const { data, error } = await supabaseAdmin.from("users").select("*").eq("id", id).maybeSingle();
    if (error) throw ApiError.internal(error.message);
    return data ? toCamel<User>(data) : null;
  },

  async list(organizationId: string): Promise<User[]> {
    const { data, error } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: true });
    if (error) throw ApiError.internal(error.message);
    return toCamel<User[]>(data ?? []);
  },

  /** Platform-wide super admins (multi-tenant: they are not org-scoped operators). */
  async listSuperAdmins(): Promise<User[]> {
    const { data, error } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("role", "super_admin")
      .eq("is_active", true);
    if (error) throw ApiError.internal(error.message);
    return toCamel<User[]>(data ?? []);
  },

  async listManagersAndAdmins(organizationId: string): Promise<User[]> {
    const { data, error } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("organization_id", organizationId)
      .in("role", ["admin", "super_admin"] satisfies UserRole[]);
    if (error) throw ApiError.internal(error.message);
    return toCamel<User[]>(data ?? []);
  },

  async updateRole(id: string, role: UserRole): Promise<User> {
    const { data, error } = await supabaseAdmin.from("users").update({ role }).eq("id", id).select("*").single();
    if (error) throw ApiError.internal(error.message);
    return toCamel<User>(data);
  },

  async deactivate(id: string): Promise<User> {
    return this.setActive(id, false);
  },

  async setActive(id: string, isActive: boolean): Promise<User> {
    const { data, error } = await supabaseAdmin
      .from("users")
      .update({ is_active: isActive })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw ApiError.internal(error.message);
    return toCamel<User>(data);
  },

  async countActiveSuperAdmins(organizationId: string): Promise<number> {
    const { count, error } = await supabaseAdmin
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("role", "super_admin")
      .eq("is_active", true);
    if (error) throw ApiError.internal(error.message);
    return count ?? 0;
  },
};
