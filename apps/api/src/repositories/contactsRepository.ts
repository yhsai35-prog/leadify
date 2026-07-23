import type { Contact } from "@bluwheelz/shared";
import { supabaseAdmin } from "../config/supabase.js";
import { toCamel, toSnake } from "../utils/caseConverter.js";
import { ApiError } from "../utils/errors.js";

export const contactsRepository = {
  async findById(id: string): Promise<Contact | null> {
    const { data, error } = await supabaseAdmin.from("contacts").select("*").eq("id", id).maybeSingle();
    if (error) throw ApiError.internal(error.message);
    return data ? toCamel<Contact>(data) : null;
  },

  async listByCompany(companyId: string): Promise<Contact[]> {
    const { data, error } = await supabaseAdmin
      .from("contacts")
      .select("*")
      .eq("company_id", companyId)
      .order("is_decision_maker", { ascending: false });
    if (error) throw ApiError.internal(error.message);
    return toCamel<Contact[]>(data ?? []);
  },

  async listByCompanyIds(companyIds: string[]): Promise<Contact[]> {
    if (companyIds.length === 0) return [];
    const { data, error } = await supabaseAdmin
      .from("contacts")
      .select("*")
      .in("company_id", companyIds)
      .order("is_decision_maker", { ascending: false });
    if (error) throw ApiError.internal(error.message);
    return toCamel<Contact[]>(data ?? []);
  },

  async findByCompanyAndEmail(companyId: string, email: string): Promise<Contact | null> {
    const { data, error } = await supabaseAdmin
      .from("contacts")
      .select("*")
      .eq("company_id", companyId)
      .eq("email", email)
      .maybeSingle();
    if (error) throw ApiError.internal(error.message);
    return data ? toCamel<Contact>(data) : null;
  },

  async findByCompanyAndApolloId(companyId: string, apolloId: string): Promise<Contact | null> {
    const { data, error } = await supabaseAdmin
      .from("contacts")
      .select("*")
      .eq("company_id", companyId)
      .eq("apollo_id", apolloId)
      .maybeSingle();
    if (error) throw ApiError.internal(error.message);
    return data ? toCamel<Contact>(data) : null;
  },

  async create(input: Partial<Contact> & { companyId: string }): Promise<Contact> {
    const row = toSnake(input);
    const { data, error } = await supabaseAdmin.from("contacts").insert(row).select("*").single();
    if (error) throw ApiError.conflict(error.message);
    return toCamel<Contact>(data);
  },

  async listByCompanyWithPhone(companyId: string): Promise<Contact[]> {
    const { data, error } = await supabaseAdmin
      .from("contacts")
      .select("*")
      .eq("company_id", companyId)
      .not("phone", "is", null);
    if (error) throw ApiError.internal(error.message);
    return toCamel<Contact[]>(data ?? []);
  },

  async update(id: string, input: Partial<Contact>): Promise<Contact> {
    const row = toSnake(input);
    const { data, error } = await supabaseAdmin.from("contacts").update(row).eq("id", id).select("*").single();
    if (error) throw ApiError.internal(error.message);
    return toCamel<Contact>(data);
  },
};
