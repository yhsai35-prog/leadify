import { supabaseAdmin } from "../config/supabase.js";
import { ApiError } from "./errors.js";

/** Leads owned by a rep: explicitly assigned, or promoted from their discovery searches. */
export async function resolveUserLeadIds(organizationId: string, userId: string): Promise<string[]> {
  const [assignedRes, discoveredRes] = await Promise.all([
    supabaseAdmin
      .from("leads")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("assigned_to", userId)
      .is("deleted_at", null),
    supabaseAdmin
      .from("discovered_leads")
      .select("lead_id")
      .eq("organization_id", organizationId)
      .eq("discovered_by", userId)
      .not("lead_id", "is", null),
  ]);
  if (assignedRes.error) throw ApiError.internal(assignedRes.error.message);
  if (discoveredRes.error) throw ApiError.internal(discoveredRes.error.message);

  const ids = new Set<string>();
  for (const row of assignedRes.data ?? []) ids.add(row.id as string);
  for (const row of discoveredRes.data ?? []) {
    if (row.lead_id) ids.add(row.lead_id as string);
  }
  return Array.from(ids);
}
