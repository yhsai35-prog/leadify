import type { ApprovalQueueItem, ApprovalStatus } from "@bluwheelz/shared";
import { supabaseAdmin } from "../config/supabase.js";
import { toCamel, toSnake } from "../utils/caseConverter.js";
import { ApiError } from "../utils/errors.js";

const WITH_RELATIONS =
  "*, email:emails(*, contact:contacts(*)), lead:leads(*, company:companies(*), contact:contacts(*))";

export const approvalQueueRepository = {
  async findById(id: string): Promise<ApprovalQueueItem | null> {
    const { data, error } = await supabaseAdmin.from("approval_queue").select(WITH_RELATIONS).eq("id", id).maybeSingle();
    if (error) throw ApiError.internal(error.message);
    return data ? toCamel<ApprovalQueueItem>(data) : null;
  },

  async findByEmailId(emailId: string): Promise<ApprovalQueueItem | null> {
    const { data, error } = await supabaseAdmin
      .from("approval_queue")
      .select(WITH_RELATIONS)
      .eq("email_id", emailId)
      .maybeSingle();
    if (error) throw ApiError.internal(error.message);
    return data ? toCamel<ApprovalQueueItem>(data) : null;
  },

  async listPending(): Promise<ApprovalQueueItem[]> {
    const { data, error } = await supabaseAdmin
      .from("approval_queue")
      .select(WITH_RELATIONS)
      .eq("status", "pending" satisfies ApprovalStatus)
      .order("created_at", { ascending: true });
    if (error) throw ApiError.internal(error.message);
    return toCamel<ApprovalQueueItem[]>(data ?? []);
  },

  /** Approved (or edit-approved) queue items whose email is still awaiting send. */
  async listReadyToSend(): Promise<ApprovalQueueItem[]> {
    const { data, error } = await supabaseAdmin
      .from("approval_queue")
      .select(WITH_RELATIONS)
      .in("status", ["approved", "edited"] satisfies ApprovalStatus[])
      .order("decided_at", { ascending: false });
    if (error) throw ApiError.internal(error.message);
    const items = toCamel<ApprovalQueueItem[]>(data ?? []);
    return items.filter((item) => item.email?.status === "approved");
  },

  async create(input: { emailId: string; leadId: string; submittedBy: string }): Promise<ApprovalQueueItem> {
    const row = toSnake(input);
    const { data, error } = await supabaseAdmin.from("approval_queue").insert(row).select(WITH_RELATIONS).single();
    if (error) throw ApiError.conflict(error.message);
    return toCamel<ApprovalQueueItem>(data);
  },

  async decide(
    id: string,
    input: {
      status: ApprovalStatus;
      reviewerId: string;
      reviewerNotes?: string;
      editedContent?: Record<string, unknown>;
    },
  ): Promise<ApprovalQueueItem> {
    const row = toSnake({ ...input, decidedAt: new Date().toISOString() });
    const { data, error } = await supabaseAdmin
      .from("approval_queue")
      .update(row)
      .eq("id", id)
      .select(WITH_RELATIONS)
      .single();
    if (error) throw ApiError.internal(error.message);
    return toCamel<ApprovalQueueItem>(data);
  },
};
