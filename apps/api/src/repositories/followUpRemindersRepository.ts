import { supabaseAdmin } from "../config/supabase.js";
import { toCamel } from "../utils/caseConverter.js";
import { ApiError } from "../utils/errors.js";

export interface FollowUpReminder {
  id: string;
  organizationId: string;
  userId: string;
  leadId: string | null;
  contactId: string | null;
  emailSubjectHint: string | null;
  dueAt: string;
  completedAt: string | null;
  createdAt: string;
}

export const followUpRemindersRepository = {
  async create(input: {
    organizationId: string;
    userId: string;
    leadId?: string | null;
    contactId?: string | null;
    emailSubjectHint?: string | null;
    dueAt: string;
  }): Promise<FollowUpReminder | null> {
    const { data, error } = await supabaseAdmin
      .from("follow_up_reminders")
      .insert({
        organization_id: input.organizationId,
        user_id: input.userId,
        lead_id: input.leadId ?? null,
        contact_id: input.contactId ?? null,
        email_subject_hint: input.emailSubjectHint ?? null,
        due_at: input.dueAt,
      })
      .select("*")
      .single();
    if (error) {
      // Unique partial index: a live reminder already exists for this
      // user+lead+contact — treat as a no-op rather than an error.
      if (error.code === "23505") return null;
      throw ApiError.internal(error.message);
    }
    return toCamel<FollowUpReminder>(data);
  },

  /** Removes the pending reminder when the user un-checks the acknowledgement. */
  async deletePending(userId: string, leadId: string, contactId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from("follow_up_reminders")
      .delete()
      .eq("user_id", userId)
      .eq("lead_id", leadId)
      .eq("contact_id", contactId)
      .is("completed_at", null);
    if (error) throw ApiError.internal(error.message);
  },

  async listDue(asOf: string, limit = 50): Promise<FollowUpReminder[]> {
    const { data, error } = await supabaseAdmin
      .from("follow_up_reminders")
      .select("*")
      .is("completed_at", null)
      .lte("due_at", asOf)
      .order("due_at", { ascending: true })
      .limit(limit);
    if (error) throw ApiError.internal(error.message);
    return toCamel<FollowUpReminder[]>(data ?? []);
  },

  async markCompleted(id: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from("follow_up_reminders")
      .update({ completed_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw ApiError.internal(error.message);
  },
};
