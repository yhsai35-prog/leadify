import { ROLE_RANK, UserRole, type ApprovalQueueItem } from "@bluwheelz/shared";
import { emailsRepository } from "../../repositories/emailsRepository.js";
import { approvalQueueRepository } from "../../repositories/approvalQueueRepository.js";
import { leadsRepository } from "../../repositories/leadsRepository.js";
import { contactsRepository } from "../../repositories/contactsRepository.js";
import { usersRepository } from "../../repositories/usersRepository.js";
import { activitiesRepository } from "../../repositories/activitiesRepository.js";
import { notificationsRepository } from "../../repositories/notificationsRepository.js";
import { auditLogsRepository } from "../../repositories/auditLogsRepository.js";
import { n8nService } from "../n8n/n8nService.js";
import { pipelineService } from "../pipeline/pipelineService.js";
import { reminderService } from "../reminders/reminderService.js";
import { ApiError } from "../../utils/errors.js";
import { requireOwnSubmissionOrAdmin } from "../../middleware/rbac.js";
import { logger } from "../../config/logger.js";

export interface ApprovalDecisionResult {
  approval: ApprovalQueueItem;
  sendQueued: boolean;
  notice?: string;
}

async function assertContactHasEmail(emailId: string): Promise<void> {
  const email = await emailsRepository.findById(emailId);
  if (!email) throw ApiError.notFound("Email not found");

  const contact = await contactsRepository.findById(email.contactId);
  if (!contact?.email) {
    throw ApiError.badRequest(
      "This contact does not have an email address yet. Reveal or add the contact email before approving outreach.",
    );
  }
}

function alreadyApprovedResult(approval: ApprovalQueueItem): ApprovalDecisionResult {
  return {
    approval,
    sendQueued: false,
    notice: "This outreach was already approved.",
  };
}

/**
 * This service is the single choke point for the platform's core invariant:
 * "no email is ever sent without human approval". Every state transition
 * that touches `emails.status` or `approval_queue.status` flows through
 * here, and this is the ONLY place that calls `n8nService.triggerSend`.
 */
export const approvalService = {
  async submit(emailId: string, submittedBy: string): Promise<ApprovalQueueItem> {
    const email = await emailsRepository.findById(emailId);
    if (!email) throw ApiError.notFound("Email not found");
    if (email.status !== "draft") {
      throw ApiError.invariantViolation("Only draft emails can be submitted for approval");
    }

    await emailsRepository.update(emailId, { status: "pending_approval" });
    const approval = await approvalQueueRepository.create({ emailId, leadId: email.leadId, submittedBy });
    await leadsRepository.updateStatus(email.leadId, "pending_approval");

    await activitiesRepository.log({ leadId: email.leadId, userId: submittedBy, type: "submitted", payload: { emailId } });

    const reviewers = await usersRepository.listManagersAndAdmins((await leadsRepository.findById(email.leadId))!.organizationId);
    await notificationsRepository.createForUsers(
      reviewers.map((r) => r.id),
      "approval_needed",
      { emailId, leadId: email.leadId },
    );

    return approval;
  },

  async approve(approvalId: string, reviewerId: string, reviewerRole: UserRole): Promise<ApprovalDecisionResult> {
    const approval = await approvalQueueRepository.findById(approvalId);
    if (!approval) throw ApiError.notFound("Approval item not found");
    if (approval.status !== "pending") {
      if (approval.status === "approved" || approval.status === "edited") {
        return alreadyApprovedResult(approval);
      }
      throw ApiError.invariantViolation("This item has already been rejected and cannot be approved.");
    }

    requireOwnSubmissionOrAdmin(approval.submittedBy, reviewerId, reviewerRole);
    await assertContactHasEmail(approval.emailId);

    const updated = await approvalQueueRepository.decide(approvalId, { status: "approved", reviewerId });
    await emailsRepository.update(approval.emailId, { status: "approved", approvedBy: reviewerId, approvedAt: new Date().toISOString() });
    await leadsRepository.updateStatus(approval.leadId, "approved");

    await activitiesRepository.log({ leadId: approval.leadId, userId: reviewerId, type: "approved", payload: { emailId: approval.emailId } });
    await auditLogsRepository.record({
      organizationId: (await leadsRepository.findById(approval.leadId))!.organizationId,
      userId: reviewerId,
      action: "approve_email",
      resourceType: "email",
      resourceId: approval.emailId,
    });

    return this.finishApprovalDispatch(approval.emailId, reviewerId, updated);
  },

  async reject(approvalId: string, reviewerId: string, reviewerNotes: string, reviewerRole: UserRole): Promise<ApprovalQueueItem> {
    const approval = await approvalQueueRepository.findById(approvalId);
    if (!approval) throw ApiError.notFound("Approval item not found");
    if (approval.status !== "pending") throw ApiError.invariantViolation("This item has already been decided");

    requireOwnSubmissionOrAdmin(approval.submittedBy, reviewerId, reviewerRole);

    const updated = await approvalQueueRepository.decide(approvalId, { status: "rejected", reviewerId, reviewerNotes });
    await emailsRepository.update(approval.emailId, { status: "rejected" });
    await leadsRepository.updateStatus(approval.leadId, "draft_ready");

    await activitiesRepository.log({
      leadId: approval.leadId,
      userId: reviewerId,
      type: "rejected",
      payload: { emailId: approval.emailId, reviewerNotes },
    });

    return updated;
  },

  async editAndApprove(
    approvalId: string,
    reviewerId: string,
    editedContent: Record<string, unknown>,
    reviewerRole: UserRole,
    reviewerNotes?: string,
  ): Promise<ApprovalDecisionResult> {
    const approval = await approvalQueueRepository.findById(approvalId);
    if (!approval) throw ApiError.notFound("Approval item not found");
    if (approval.status !== "pending") {
      if (approval.status === "approved" || approval.status === "edited") {
        return alreadyApprovedResult(approval);
      }
      throw ApiError.invariantViolation("This item has already been rejected and cannot be approved.");
    }

    requireOwnSubmissionOrAdmin(approval.submittedBy, reviewerId, reviewerRole);
    await assertContactHasEmail(approval.emailId);

    await emailsRepository.update(approval.emailId, {
      ...editedContent,
      status: "approved",
      approvedBy: reviewerId,
      approvedAt: new Date().toISOString(),
    });
    const updated = await approvalQueueRepository.decide(approvalId, {
      status: "edited",
      reviewerId,
      reviewerNotes,
      editedContent,
    });
    await leadsRepository.updateStatus(approval.leadId, "approved");

    await activitiesRepository.log({
      leadId: approval.leadId,
      userId: reviewerId,
      type: "approved",
      payload: { emailId: approval.emailId, edited: true },
    });

    return this.finishApprovalDispatch(approval.emailId, reviewerId, updated);
  },

  async schedule(emailId: string, reviewerId: string, scheduledAt: string): Promise<void> {
    const email = await emailsRepository.findById(emailId);
    if (!email) throw ApiError.notFound("Email not found");
    if (email.status !== "approved") {
      throw ApiError.invariantViolation("Only approved emails can be scheduled");
    }
    await emailsRepository.update(emailId, { status: "scheduled", scheduledAt });
  },

  /**
   * Fires the n8n Gmail send workflow. Approved emails scheduled for a
   * future time are NOT dispatched here -- they wait for
   * `dispatchScheduledEmails` (driven by n8n's own cron, see WF-3) to pick
   * them up once due.
   */
  async dispatchToN8n(emailId: string, actingUserId: string): Promise<void> {
    const email = await emailsRepository.findById(emailId);
    if (!email || email.status !== "approved") return;

    const contact = await contactsRepository.findById(email.contactId);
    if (!contact?.email) {
      throw ApiError.invariantViolation("The contact for this email has no email address on file");
    }

    await n8nService.triggerSend(email, contact.email, actingUserId);
  },

  async dispatchScheduledEmails(): Promise<number> {
    const due = await emailsRepository.listScheduledDue(new Date().toISOString());
    for (const email of due) {
      const contact = await contactsRepository.findById(email.contactId);
      if (!contact?.email) continue;
      await n8nService.triggerSend(email, contact.email, email.approvedBy ?? email.createdBy ?? "system");
    }
    return due.length;
  },

  async listPending(campaignId?: string, viewerId?: string, viewerRole?: UserRole): Promise<ApprovalQueueItem[]> {
    let items = await approvalQueueRepository.listPending();
    if (campaignId) items = items.filter((item) => item.lead?.campaignId === campaignId);
    return this.scopeToViewer(items, viewerId, viewerRole);
  },

  async listReadyToSend(campaignId?: string, viewerId?: string, viewerRole?: UserRole): Promise<ApprovalQueueItem[]> {
    let items = await approvalQueueRepository.listReadyToSend();
    if (campaignId) items = items.filter((item) => item.lead?.campaignId === campaignId);
    return this.scopeToViewer(items, viewerId, viewerRole);
  },

  /**
   * Regular users only see the outreach they generated and submitted
   * themselves (to track its approval status) -- they cannot browse other
   * reps' pending drafts. Admins and super admins see the full queue so
   * they can review and approve on behalf of the team.
   */
  scopeToViewer(items: ApprovalQueueItem[], viewerId?: string, viewerRole?: UserRole): ApprovalQueueItem[] {
    if (!viewerId || !viewerRole) return items;
    if (ROLE_RANK[viewerRole] >= ROLE_RANK[UserRole.ADMIN]) return items;
    return items.filter((item) => item.submittedBy === viewerId);
  },

  /**
   * Manual Gmail path: after the reviewer opens Gmail compose and confirms
   * they sent, mark the email + lead as sent and log a rich timeline activity.
   */
  async confirmManualSent(emailId: string, userId: string): Promise<{ emailId: string; sentAt: string }> {
    const email = await emailsRepository.findById(emailId);
    if (!email) throw ApiError.notFound("Email not found");
    if (email.status !== "approved") {
      throw ApiError.invariantViolation("Only approved emails can be marked as sent from Approval Center");
    }

    const sentAt = new Date().toISOString();
    await emailsRepository.update(emailId, { status: "sent", sentAt });

    const [contact, lead] = await Promise.all([
      contactsRepository.findById(email.contactId),
      leadsRepository.findById(email.leadId),
    ]);
    const companyName = lead?.company?.name ?? null;
    const contactName = contact
      ? [contact.firstName, contact.lastName].filter(Boolean).join(" ").trim() || null
      : null;

    await pipelineService.transitionToSentFromManualGmail(email.leadId, userId);
    await activitiesRepository.log({
      leadId: email.leadId,
      userId,
      type: "sent",
      payload: {
        emailId: email.id,
        contactId: email.contactId,
        contactName,
        companyName,
        subject: email.subject,
        bodyText: email.bodyText,
        sentAt,
        source: "manual_gmail",
      },
    });

    if (lead) {
      await reminderService.scheduleFollowUp({
        organizationId: lead.organizationId,
        userId,
        leadId: email.leadId,
        contactId: email.contactId,
        emailSubjectHint: email.subject,
      });
    }

    return { emailId, sentAt };
  },

  async finishApprovalDispatch(
    emailId: string,
    reviewerId: string,
    updated: ApprovalQueueItem,
  ): Promise<ApprovalDecisionResult> {
    const reviewer = await usersRepository.findById(reviewerId);
    if (reviewer?.preferredEmailClient === "gmail") {
      return {
        approval: updated,
        sendQueued: false,
        notice: "Approved. Send from Approval Center with Gmail.",
      };
    }

    try {
      await this.dispatchToN8n(emailId, reviewerId);
      return { approval: updated, sendQueued: true };
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "The send workflow could not be started.";
      logger.warn({ err, emailId }, "Approval saved but n8n dispatch failed");
      return {
        approval: updated,
        sendQueued: false,
        notice: `Approved, but the email could not be queued for sending. ${message}`,
      };
    }
  },
};
