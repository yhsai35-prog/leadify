import { supabaseAdmin } from "../config/supabase.js";
import { toSnake } from "../utils/caseConverter.js";
import { ApiError } from "../utils/errors.js";

export interface AuditLogInput {
  organizationId: string;
  userId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  beforeState?: unknown;
  afterState?: unknown;
  ipAddress?: string | null;
}

export const auditLogsRepository = {
  async record(input: AuditLogInput): Promise<void> {
    const row = toSnake(input);
    const { error } = await supabaseAdmin.from("audit_logs").insert(row);
    if (error) throw ApiError.internal(error.message);
  },

  async listForOrganization(organizationId: string, limit = 100) {
    const { data, error } = await supabaseAdmin
      .from("audit_logs")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw ApiError.internal(error.message);
    return data ?? [];
  },
};
