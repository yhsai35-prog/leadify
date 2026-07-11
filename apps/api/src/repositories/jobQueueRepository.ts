import type { JobStatus, JobType } from "@bluwheelz/shared";
import { supabaseAdmin } from "../config/supabase.js";
import { toCamel, toSnake } from "../utils/caseConverter.js";
import { ApiError } from "../utils/errors.js";

export interface JobRecord {
  id: string;
  type: JobType;
  payload: Record<string, unknown>;
  status: JobStatus;
  attempts: number;
  maxAttempts: number;
  error: string | null;
  result: Record<string, unknown> | null;
}

export const jobQueueRepository = {
  async enqueue(type: JobType, payload: Record<string, unknown>): Promise<JobRecord> {
    const { data, error } = await supabaseAdmin
      .from("job_queue")
      .insert(toSnake({ type, payload }))
      .select("*")
      .single();
    if (error) throw ApiError.internal(error.message);
    return toCamel<JobRecord>(data);
  },

  async findById(id: string): Promise<JobRecord | null> {
    const { data, error } = await supabaseAdmin.from("job_queue").select("*").eq("id", id).maybeSingle();
    if (error) throw ApiError.internal(error.message);
    return data ? toCamel<JobRecord>(data) : null;
  },

  /** Atomically claims up to `limit` pending jobs by flipping them to `processing`. */
  async claimPending(limit: number): Promise<JobRecord[]> {
    const { data: pending, error: selectError } = await supabaseAdmin
      .from("job_queue")
      .select("id")
      .eq("status", "pending" satisfies JobStatus)
      .order("created_at", { ascending: true })
      .limit(limit);
    if (selectError) throw ApiError.internal(selectError.message);
    if (!pending || pending.length === 0) return [];

    const ids = pending.map((p) => p.id as string);
    const { data, error } = await supabaseAdmin
      .from("job_queue")
      .update({ status: "processing" satisfies JobStatus, started_at: new Date().toISOString() })
      .in("id", ids)
      .eq("status", "pending" satisfies JobStatus)
      .select("*");
    if (error) throw ApiError.internal(error.message);
    return toCamel<JobRecord[]>(data ?? []);
  },

  async markCompleted(id: string, result: Record<string, unknown>): Promise<void> {
    const { error } = await supabaseAdmin
      .from("job_queue")
      .update({ status: "completed" satisfies JobStatus, result, completed_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw ApiError.internal(error.message);
  },

  async markFailed(id: string, errorMessage: string, attempts: number, maxAttempts: number): Promise<void> {
    const status: JobStatus = attempts >= maxAttempts ? "failed" : "pending";
    const { error } = await supabaseAdmin
      .from("job_queue")
      .update({ status, error: errorMessage, attempts })
      .eq("id", id);
    if (error) throw ApiError.internal(error.message);
  },
};
