import { ROLE_RANK, UserRole, type ApprovalQueueItem } from "@bluwheelz/shared";
import { emailsRepository } from "../../repositories/emailsRepository.js";
import { whatsappMessagesRepository } from "../../repositories/whatsappMessagesRepository.js";
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
import { metaWhatsAppClient } from "../whatsapp/metaWhatsAppClient.js";
import { whatsappMessageEventsRepository } from "../../repositories/whatsappMessageEventsRepository.js";
import { ApiError } from "../../utils/errors.js";
import { requireOwnSubmissionOrAdmin } from "../../middleware/rbac.js";
import { logger } from "../../config/logger.js";
import { normalizeWhatsAppPhone } from "../whatsapp/metaWhatsAppClient.js";

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

async function assertContactHasPhone(whatsappMessageId: string): Promise<void> {
  const message = await whatsappMessagesRepository.findById(whatsappMessageId);
  if (!message) throw ApiError.notFound("WhatsApp message not found");

  const contact = await contactsRepository.findById(message.contactId);
  if (!contact?.phone) {
    throw ApiError.badRequest(
      "This contact does not have a phone number yet. Add a phone before approving WhatsApp outreach.",
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
 * Single choke point for human approval. Emails dispatch via n8n/Gmail;
 * WhatsApp messages dispatch via Meta Cloud API. Nothing reaches `sent`
 * without approved_by.
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

    const reviewers = await usersRepository.listManagersAndAdmins(
      (await leadsRepository.findById(email.leadId))!.organizationId,
    );
    await notificationsRepository.createForUsers(
      reviewers.map((r) => r.id),
      "approval_needed",
      { emailId, leadId: email.leadId },
    );

    return approval;
  },

  async submitWhatsapp(whatsappMessageId: string, submittedBy: string): Promise<ApprovalQueueItem> {
    const message = await whatsappMessagesRepository.findById(whatsappMessageId);
    if (!message) throw ApiError.notFound("WhatsApp message not found");
    if (message.status !== "draft") {
      throw ApiError.invariantViolation("Only draft WhatsApp messages can be submitted for approval");
    }

    await whatsappMessagesRepository.update(whatsappMessageId, { status: "pending_approval" });
    const approval = await approvalQueueRepository.create({
      whatsappMessageId,
      leadId: message.leadId,
      submittedBy,
    });
    await leadsRepository.updateStatus(message.leadId, "pending_approval");

    await activitiesRepository.log({
      leadId: message.leadId,
      userId: submittedBy,
      type: "submitted",
      payload: { whatsappMessageId, channel: "whatsapp" },
    });

    const reviewers = await usersRepository.listManagersAndAdmins(
      (await leadsRepository.findById(message.leadId))!.organizationId,
    );
    await notificationsRepository.createForUsers(
      reviewers.map((r) => r.id),
      "approval_needed",
      { whatsappMessageId, leadId: message.leadId, channel: "whatsapp" },
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

    if (approval.whatsappMessageId) {
      await assertContactHasPhone(approval.whatsappMessageId);
      const updated = await approvalQueueRepository.decide(approvalId, { status: "approved", reviewerId });
      await whatsappMessagesRepository.update(approval.whatsappMessageId, {
        status: "approved",
        approvedBy: reviewerId,
        approvedAt: new Date().toISOString(),
      });
      await leadsRepository.updateStatus(approval.leadId, "approved");
      await activitiesRepository.log({
        leadId: approval.leadId,
        userId: reviewerId,
        type: "approved",
        payload: { whatsappMessageId: approval.whatsappMessageId, channel: "whatsapp" },
      });
      await auditLogsRepository.record({
        organizationId: (await leadsRepository.findById(approval.leadId))!.organizationId,
        userId: reviewerId,
        action: "approve_whatsapp",
        resourceType: "whatsapp_message",
        resourceId: approval.whatsappMessageId,
      });
      return this.finishWhatsappDispatch(approval.whatsappMessageId, reviewerId, updated);
    }

    if (!approval.emailId) throw ApiError.invariantViolation("Approval item has no message reference");
    await assertContactHasEmail(approval.emailId);

    const updated = await approvalQueueRepository.decide(approvalId, { status: "approved", reviewerId });
    await emailsRepository.update(approval.emailId, {
      status: "approved",
      approvedBy: reviewerId,
      approvedAt: new Date().toISOString(),
    });
    await leadsRepository.updateStatus(approval.leadId, "approved");

    await activitiesRepository.log({
      leadId: approval.leadId,
      userId: reviewerId,
      type: "approved",
      payload: { emailId: approval.emailId },
    });
    await auditLogsRepository.record({
      organizationId: (await leadsRepository.findById(approval.leadId))!.organizationId,
      userId: reviewerId,
      action: "approve_email",
      resourceType: "email",
      resourceId: approval.emailId,
    });

    return this.finishApprovalDispatch(approval.emailId, reviewerId, updated);
  },

  async reject(
    approvalId: string,
    reviewerId: string,
    reviewerNotes: string,
    reviewerRole: UserRole,
  ): Promise<ApprovalQueueItem> {
    const approval = await approvalQueueRepository.findById(approvalId);
    if (!approval) throw ApiError.notFound("Approval item not found");
    if (approval.status !== "pending") throw ApiError.invariantViolation("This item has already been decided");

    requireOwnSubmissionOrAdmin(approval.submittedBy, reviewerId, reviewerRole);

    const updated = await approvalQueueRepository.decide(approvalId, {
      status: "rejected",
      reviewerId,
      reviewerNotes,
    });

    if (approval.whatsappMessageId) {
      await whatsappMessagesRepository.update(approval.whatsappMessageId, { status: "rejected" });
      await leadsRepository.updateStatus(approval.leadId, "draft_ready");
      await activitiesRepository.log({
        leadId: approval.leadId,
        userId: reviewerId,
        type: "rejected",
        payload: { whatsappMessageId: approval.whatsappMessageId, reviewerNotes, channel: "whatsapp" },
      });
      return updated;
    }

    if (!approval.emailId) throw ApiError.invariantViolation("Approval item has no message reference");
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

    if (approval.whatsappMessageId) {
      await assertContactHasPhone(approval.whatsappMessageId);
      await whatsappMessagesRepository.update(approval.whatsappMessageId, {
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
        payload: { whatsappMessageId: approval.whatsappMessageId, edited: true, channel: "whatsapp" },
      });
      return this.finishWhatsappDispatch(approval.whatsappMessageId, reviewerId, updated);
    }

    if (!approval.emailId) throw ApiError.invariantViolation("Approval item has no message reference");
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

  async scheduleWhatsapp(whatsappMessageId: string, scheduledAt: string): Promise<void> {
    const message = await whatsappMessagesRepository.findById(whatsappMessageId);
    if (!message) throw ApiError.notFound("WhatsApp message not found");
    if (message.status !== "approved") {
      throw ApiError.invariantViolation("Only approved WhatsApp messages can be scheduled");
    }
    await whatsappMessagesRepository.update(whatsappMessageId, { status: "scheduled", scheduledAt });
  },

  async dispatchToN8n(emailId: string, actingUserId: string): Promise<void> {
    const email = await emailsRepository.findById(emailId);
    if (!email || email.status !== "approved") return;

    const contact = await contactsRepository.findById(email.contactId);
    if (!contact?.email) {
      throw ApiError.invariantViolation("The contact for this email has no email address on file");
    }

    await n8nService.triggerSend(email, contact.email, actingUserId);
  },

  async dispatchWhatsapp(whatsappMessageId: string): Promise<void> {
    const message = await whatsappMessagesRepository.findById(whatsappMessageId);
    if (!message || (message.status !== "approved" && message.status !== "scheduled")) return;

    const contact = await contactsRepository.findById(message.contactId);
    if (!contact?.phone) {
      throw ApiError.invariantViolation("The contact for this WhatsApp message has no phone on file");
    }

    const toPhone = normalizeWhatsAppPhone(contact.phone);
    const components = (message.templateComponents ?? []) as Array<{
      type: "header" | "body" | "button";
      parameters?: Array<{ type: "text"; text: string }>;
    }>;

    try {
      const { messageId } = await metaWhatsAppClient.sendTemplateMessage({
        toPhoneE164: contact.phone,
        templateName: message.templateName,
        languageCode: message.templateLanguage,
        components,
      });

      const sentAt = new Date().toISOString();
      await whatsappMessagesRepository.update(whatsappMessageId, {
        status: "sent",
        sentAt,
        waMessageId: messageId,
        toPhone,
        deliveryStatus: "accepted",
      });
      await pipelineService.transitionToSentFromWebhook(message.leadId);
      await whatsappMessageEventsRepository.create({
        whatsappMessageId: message.id,
        leadId: message.leadId,
        campaignId: message.campaignId,
        eventType: "accepted",
        bodyText: message.bodyPreview,
        detail: {
          waMessageId: messageId,
          toPhone,
          templateName: message.templateName,
          templateLanguage: message.templateLanguage,
        },
        occurredAt: sentAt,
      });
      await activitiesRepository.log({
        leadId: message.leadId,
        userId: message.approvedBy,
        type: "whatsapp_sent",
        payload: {
          whatsappMessageId: message.id,
          waMessageId: messageId,
          templateName: message.templateName,
          bodyPreview: message.bodyPreview,
          toPhone,
          deliveryStatus: "accepted",
          sentAt,
        },
      });
    } catch (err) {
      await whatsappMessagesRepository.update(whatsappMessageId, {
        status: "failed",
        deliveryStatus: "failed",
        toPhone,
        errorPayload: { message: err instanceof Error ? err.message : "Send failed" },
      });
      await whatsappMessageEventsRepository.create({
        whatsappMessageId: message.id,
        leadId: message.leadId,
        campaignId: message.campaignId,
        eventType: "failed",
        bodyText: message.bodyPreview,
        detail: { error: err instanceof Error ? err.message : String(err), toPhone },
      });
      await activitiesRepository.log({
        leadId: message.leadId,
        userId: null,
        type: "send_failed",
        payload: { whatsappMessageId: message.id, channel: "whatsapp", error: String(err), toPhone },
      });
      throw err;
    }
  },

  async dispatchScheduledEmails(): Promise<number> {
    const due = await emailsRepository.listScheduledDue(new Date().toISOString());
    for (const email of due) {
      const contact = await contactsRepository.findById(email.contactId);
      if (!contact?.email) continue;
      await n8nService.triggerSend(email, contact.email, email.approvedBy ?? email.createdBy ?? "system");
    }

    const dueWa = await whatsappMessagesRepository.listScheduledDue(new Date().toISOString());
    for (const message of dueWa) {
      try {
        await this.dispatchWhatsapp(message.id);
      } catch (err) {
        logger.warn({ err, whatsappMessageId: message.id }, "Scheduled WhatsApp dispatch failed");
      }
    }

    return due.length + dueWa.length;
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

  scopeToViewer(items: ApprovalQueueItem[], viewerId?: string, viewerRole?: UserRole): ApprovalQueueItem[] {
    if (!viewerId || !viewerRole) return items;
    if (ROLE_RANK[viewerRole] >= ROLE_RANK[UserRole.ADMIN]) return items;
    return items.filter((item) => item.submittedBy === viewerId);
  },

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

  async finishWhatsappDispatch(
    whatsappMessageId: string,
    reviewerId: string,
    updated: ApprovalQueueItem,
  ): Promise<ApprovalDecisionResult> {
    try {
      await this.dispatchWhatsapp(whatsappMessageId);
      return { approval: updated, sendQueued: true };
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "WhatsApp send failed.";
      logger.warn({ err, whatsappMessageId }, "Approval saved but WhatsApp dispatch failed");
      return {
        approval: updated,
        sendQueued: false,
        notice: `Approved, but the WhatsApp message could not be sent. ${message}`,
      };
    }
  },
};
