import type { DemoRequest } from "@bluwheelz/shared";
import { supabaseAdmin } from "../config/supabase.js";
import { toCamel } from "../utils/caseConverter.js";
import { ApiError } from "../utils/errors.js";

export const demoRequestsRepository = {
  async create(input: { name: string; email: string; company?: string; message?: string }): Promise<DemoRequest> {
    const { data, error } = await supabaseAdmin
      .from("demo_requests")
      .insert({
        name: input.name,
        email: input.email,
        company: input.company ?? null,
        message: input.message ?? null,
      })
      .select("*")
      .single();
    if (error) throw ApiError.internal(error.message);
    return toCamel<DemoRequest>(data);
  },

  async list(): Promise<DemoRequest[]> {
    const { data, error } = await supabaseAdmin
      .from("demo_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw ApiError.internal(error.message);
    return toCamel<DemoRequest[]>(data ?? []);
  },

  async updateStatus(id: string, status: DemoRequest["status"]): Promise<DemoRequest> {
    const { data, error } = await supabaseAdmin
      .from("demo_requests")
      .update({ status })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw ApiError.internal(error.message);
    return toCamel<DemoRequest>(data);
  },
};
