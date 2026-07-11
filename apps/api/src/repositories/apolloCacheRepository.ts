import { supabaseAdmin } from "../config/supabase.js";
import { ApiError } from "../utils/errors.js";

const CACHE_TTL_MS = 1000 * 60 * 60 * 6; // 6 hours

export const apolloCacheRepository = {
  async get(queryHash: string): Promise<unknown | null> {
    const { data, error } = await supabaseAdmin
      .from("apollo_search_cache")
      .select("results, expires_at")
      .eq("query_hash", queryHash)
      .maybeSingle();
    if (error) throw ApiError.internal(error.message);
    if (!data) return null;
    if (new Date(data.expires_at) < new Date()) return null;
    return data.results;
  },

  async set(queryHash: string, filters: unknown, results: unknown): Promise<void> {
    const { error } = await supabaseAdmin.from("apollo_search_cache").upsert(
      {
        query_hash: queryHash,
        filters,
        results,
        expires_at: new Date(Date.now() + CACHE_TTL_MS).toISOString(),
      },
      { onConflict: "query_hash" },
    );
    if (error) throw ApiError.internal(error.message);
  },
};
