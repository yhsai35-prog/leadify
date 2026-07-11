import type { AiUsageByUserRow, AiUsageSummaryRow } from "@bluwheelz/shared";
import { supabaseAdmin } from "../config/supabase.js";
import { logger } from "../config/logger.js";

type AiProvider = "apollo" | "claude";

interface UsageEventRow {
  provider: AiProvider;
  action: string;
  user_id: string | null;
  users: { full_name: string } | { full_name: string }[] | null;
}

export const aiUsageRepository = {
  /**
   * Fire-and-forget call counter. Never throws -- a logging failure must
   * never break the underlying Apollo/Claude request it's instrumenting.
   */
  record(organizationId: string, userId: string | null | undefined, provider: AiProvider, action: string): void {
    void supabaseAdmin
      .from("ai_usage_events")
      .insert({ organization_id: organizationId, user_id: userId ?? null, provider, action })
      .then(({ error }) => {
        if (error) logger.warn({ err: error, provider, action }, "Failed to record AI usage event");
      });
  },

  async summary(organizationId: string, from?: string, to?: string): Promise<AiUsageSummaryRow[]> {
    let query = supabaseAdmin
      .from("ai_usage_events")
      .select("provider, action")
      .eq("organization_id", organizationId);
    if (from) query = query.gte("created_at", from);
    if (to) query = query.lte("created_at", to);
    const { data, error } = await query;
    if (error) throw error;

    const counts = new Map<string, AiUsageSummaryRow>();
    for (const row of (data ?? []) as Array<{ provider: AiProvider; action: string }>) {
      const key = `${row.provider}:${row.action}`;
      const existing = counts.get(key);
      if (existing) existing.count += 1;
      else counts.set(key, { provider: row.provider, action: row.action, count: 1 });
    }
    return Array.from(counts.values()).sort((a, b) => b.count - a.count);
  },

  async byUser(organizationId: string, from?: string, to?: string): Promise<AiUsageByUserRow[]> {
    let query = supabaseAdmin
      .from("ai_usage_events")
      .select("provider, action, user_id, users(full_name)")
      .eq("organization_id", organizationId)
      .not("user_id", "is", null);
    if (from) query = query.gte("created_at", from);
    if (to) query = query.lte("created_at", to);
    const { data, error } = await query;
    if (error) throw error;

    const counts = new Map<string, AiUsageByUserRow>();
    for (const row of (data ?? []) as unknown as UsageEventRow[]) {
      if (!row.user_id) continue;
      const userRecord = Array.isArray(row.users) ? row.users[0] : row.users;
      const key = `${row.user_id}:${row.provider}`;
      const existing = counts.get(key);
      if (existing) existing.count += 1;
      else
        counts.set(key, {
          userId: row.user_id,
          userName: userRecord?.full_name ?? "Unknown",
          provider: row.provider,
          count: 1,
        });
    }
    return Array.from(counts.values()).sort((a, b) => b.count - a.count);
  },
};
