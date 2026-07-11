import type { Lead, LeadFilters, OutreachAcknowledgement, OutreachChannel, PaginationQuery, PipelineStatus } from "@bluwheelz/shared";
import { PIPELINE_ORDER } from "@bluwheelz/shared";
import { leadsRepository } from "../../repositories/leadsRepository.js";
import { activitiesRepository } from "../../repositories/activitiesRepository.js";
import { contactsRepository } from "../../repositories/contactsRepository.js";
import { outreachAcknowledgementsRepository } from "../../repositories/outreachAcknowledgementsRepository.js";
import { apolloService } from "../apollo/apolloService.js";
import { reminderService } from "../reminders/reminderService.js";
import { ensureExistingClientFirmographics } from "../companies/existingClientEnrichmentService.js";
import { assertSystemOnlyTransitionToSent, assertValidTransition } from "../../utils/stateMachine.js";
import { ApiError } from "../../utils/errors.js";

export const pipelineService = {
  async listByStatus(organizationId: string): Promise<Record<PipelineStatus, Lead[]>> {
    const board = {} as Record<PipelineStatus, Lead[]>;
    await Promise.all(
      PIPELINE_ORDER.map(async (status) => {
        board[status] = await leadsRepository.listByPipelineStatus(organizationId, status);
      }),
    );
    return board;
  },

  async list(organizationId: string, filters: LeadFilters, pagination: PaginationQuery) {
    return leadsRepository.list(organizationId, filters, pagination);
  },

  async getDetail(leadId: string): Promise<Lead> {
    const lead = await leadsRepository.findById(leadId);
    if (!lead) throw ApiError.notFound("Lead not found");
    if (lead.company?.isExistingClient) {
      const company = await ensureExistingClientFirmographics(lead.company);
      return { ...lead, company };
    }
    return lead;
  },

  /**
   * The only user-facing status transition endpoint. Validates against the
   * PIPELINE_TRANSITIONS allow-list and explicitly forbids setting `sent`
   * here -- that status is exclusively written by the n8n send webhook
   * after a confirmed Gmail delivery (see N8nWebhookService).
   */
  async transition(leadId: string, to: PipelineStatus, userId: string, reason?: string): Promise<Lead> {
    const lead = await this.getDetail(leadId);
    assertSystemOnlyTransitionToSent(to);
    assertValidTransition(lead.pipelineStatus, to);

    const updated = await leadsRepository.updateStatus(leadId, to);
    await activitiesRepository.log({
      leadId,
      userId,
      type: "status_changed",
      payload: { from: lead.pipelineStatus, to, reason },
    });
    return updated;
  },

  /** Internal-only transition used by N8nWebhookService; bypasses the user-facing "no direct sent" guard. */
  async transitionToSentFromWebhook(leadId: string): Promise<Lead> {
    const lead = await this.getDetail(leadId);
    assertValidTransition(lead.pipelineStatus, "sent");
    const updated = await leadsRepository.updateStatus(leadId, "sent");
    await activitiesRepository.log({ leadId, userId: null, type: "sent", payload: {} });
    return updated;
  },

  /**
   * Manual Gmail confirm from Approval Center. Same lead transition as the
   * webhook path, but attributed to the confirming user. Rich email payload
   * is logged separately by approvalService.confirmManualSent.
   */
  async transitionToSentFromManualGmail(leadId: string, _userId: string): Promise<Lead> {
    const lead = await this.getDetail(leadId);
    if (lead.pipelineStatus === "sent") return lead;
    assertValidTransition(lead.pipelineStatus, "sent");
    return leadsRepository.updateStatus(leadId, "sent");
  },

  async assign(leadId: string, assignedTo: string): Promise<Lead> {
    return leadsRepository.assign(leadId, assignedTo);
  },

  async getActivities(leadId: string) {
    return activitiesRepository.listByLead(leadId);
  },

  async revealContacts(organizationId: string, leadId: string, userId?: string) {
    const lead = await this.getDetail(leadId);
    if (lead.organizationId !== organizationId) throw ApiError.notFound("Lead not found");
    return apolloService.revealCompanyContacts(organizationId, lead.companyId, userId);
  },

  async listAcknowledgements(leadId: string): Promise<OutreachAcknowledgement[]> {
    return outreachAcknowledgementsRepository.listForLead(leadId);
  },

  /**
   * Self-reported "I sent the email / LinkedIn message to this POC" checkbox.
   * Purely a nurturing signal for the Lead Nurturing screen -- does not touch
   * `pipelineStatus` and is independent of the real send-approval pipeline.
   */
  async acknowledgeOutreach(
    leadId: string,
    contactId: string,
    channel: OutreachChannel,
    acknowledged: boolean,
    userId: string,
  ): Promise<OutreachAcknowledgement> {
    const contact = await contactsRepository.findById(contactId);
    if (!contact || contact.companyId !== (await this.getDetail(leadId)).companyId) {
      throw ApiError.notFound("Contact not found for this lead");
    }

    const result = await outreachAcknowledgementsRepository.upsert({
      leadId,
      contactId,
      channel,
      acknowledged,
      acknowledgedBy: userId,
    });

    if (acknowledged) {
      await activitiesRepository.log({
        leadId,
        userId,
        type: channel === "email" ? "email_acknowledged" : "linkedin_acknowledged",
        payload: {
          contactId,
          contactName: `${contact.firstName} ${contact.lastName ?? ""}`.trim(),
        },
      });
    }

    // Email acks schedule a 3-day follow-up nudge; un-checking cancels it.
    if (channel === "email") {
      const lead = await this.getDetail(leadId);
      if (acknowledged) {
        await reminderService.scheduleFollowUp({
          organizationId: lead.organizationId,
          userId,
          leadId,
          contactId,
        });
      } else {
        await reminderService.cancelFollowUp(userId, leadId, contactId);
      }
    }

    return result;
  },
};
