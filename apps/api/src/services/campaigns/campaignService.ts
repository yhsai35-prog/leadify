import type {
  Campaign,
  CampaignBatchResult,
  CampaignDetail,
  CreateCampaignInput,
  LaunchCampaignInput,
  UpdateCampaignInput,
} from "@bluwheelz/shared";
import { CampaignChannel, campaignFlowDefinitionSchema, validateCampaignFlowForLaunch } from "@bluwheelz/shared";
import { campaignsRepository } from "../../repositories/campaignsRepository.js";
import { contactsRepository } from "../../repositories/contactsRepository.js";
import { emailsRepository } from "../../repositories/emailsRepository.js";
import { leadsRepository } from "../../repositories/leadsRepository.js";
import { whatsappMessagesRepository } from "../../repositories/whatsappMessagesRepository.js";
import { approvalService } from "../approval/approvalService.js";
import { outreachService } from "../outreach/outreachService.js";
import { whatsappOutreachService } from "../whatsapp/whatsappOutreachService.js";
import { ApiError } from "../../utils/errors.js";
import { extractFlowMessageConfig, resolveCreateFlowDefinition } from "./defaultFlows.js";

const ACTIVE_STATUSES = new Set(["draft", "pending_approval", "approved", "scheduled", "sent"]);

function contactName(contact: { firstName: string; lastName: string | null }) {
  return [contact.firstName, contact.lastName].filter(Boolean).join(" ") || "Unknown";
}

async function assertCampaignInOrg(organizationId: string, campaignId: string): Promise<Campaign> {
  const campaign = await campaignsRepository.findById(campaignId);
  if (!campaign) throw ApiError.notFound("Campaign not found");
  if (campaign.organizationId !== organizationId) {
    throw ApiError.forbidden("Campaign not in your organization");
  }
  return campaign;
}

export const campaignService = {
  async list(organizationId: string): Promise<Campaign[]> {
    const campaigns = await campaignsRepository.list(organizationId);
    const withStats = await Promise.all(
      campaigns.map(async (campaign) => ({
        ...campaign,
        emailStats:
          campaign.channel === CampaignChannel.WHATSAPP
            ? await campaignsRepository.whatsappStatsForCampaign(campaign.id)
            : await campaignsRepository.emailStatsForCampaign(campaign.id),
      })),
    );
    return withStats;
  },

  async create(organizationId: string, input: CreateCampaignInput, createdBy: string): Promise<Campaign> {
    const channel = input.channel ?? CampaignChannel.EMAIL;
    const flowDefinition = resolveCreateFlowDefinition({ ...input, channel });
    return campaignsRepository.create({
      name: input.name,
      description: input.description ?? null,
      scheduledAt: input.scheduledAt ?? null,
      organizationId,
      createdBy,
      status: "draft",
      channel,
      flowDefinition,
    });
  },

  async getDetail(organizationId: string, id: string): Promise<CampaignDetail> {
    const campaign = await assertCampaignInOrg(organizationId, id);
    const [leads, pipelineBreakdown, emailStats, whatsappStats] = await Promise.all([
      campaignsRepository.listLeadsForCampaign(id),
      campaignsRepository.statusBreakdown(id),
      campaignsRepository.emailStatsForCampaign(id),
      campaignsRepository.whatsappStatsForCampaign(id),
    ]);
    const leadIds = leads.map((l) => l.id);
    const [latestEmailStatus, allEmails, allWa] = await Promise.all([
      emailsRepository.latestStatusByLeadIds(leadIds),
      emailsRepository.listByLeadIds(leadIds),
      whatsappMessagesRepository.listByLeadIds(leadIds),
    ]);
    const latestWaStatus = whatsappMessagesRepository.latestStatusByLeadIds(allWa);    const contactStatusMap = emailsRepository.buildContactStatusMap(allEmails);
    const waContactStatusMap = whatsappMessagesRepository.buildContactStatusMap(allWa);
    const companyIds = [...new Set(leads.map((l) => l.companyId))];
    const allContacts = await contactsRepository.listByCompanyIds(companyIds);
    const contactsByCompany = new Map<string, typeof allContacts>();
    for (const contact of allContacts) {
      const list = contactsByCompany.get(contact.companyId) ?? [];
      list.push(contact);
      contactsByCompany.set(contact.companyId, list);
    }

    return {
      campaign: { ...campaign, leadCount: leads.length },
      leads: leads.map((lead) => {
        const companyContacts = (contactsByCompany.get(lead.companyId) ?? []).map((contact) => ({
          contactId: contact.id,
          name: contactName(contact),
          email: contact.email,
          phone: contact.phone,
          isPrimary: contact.id === lead.contactId,
          latestEmailStatus: contactStatusMap.get(`${lead.id}:${contact.id}`) ?? null,
          latestWhatsappStatus: waContactStatusMap.get(`${lead.id}:${contact.id}`) ?? null,
        }));

        return {
          leadId: lead.id,
          companyName: lead.company?.name ?? "Unknown company",
          pipelineStatus: lead.pipelineStatus,
          latestEmailStatus: latestEmailStatus.get(lead.id) ?? null,
          latestWhatsappStatus: latestWaStatus.get(lead.id) ?? null,
          contactId: lead.contactId,
          contactName: lead.contact ? contactName(lead.contact) : null,
          contactEmail: lead.contact?.email ?? null,
          contactPhone: lead.contact?.phone ?? null,
          companyContacts,
        };
      }),
      pipelineBreakdown,
      emailStats,
      whatsappStats,
    };
  },

  async update(organizationId: string, id: string, input: UpdateCampaignInput): Promise<Campaign> {
    await assertCampaignInOrg(organizationId, id);
    const patch: Partial<Campaign> = { ...input };
    if (input.flowDefinition) {
      patch.flowDefinition = campaignFlowDefinitionSchema.parse(input.flowDefinition);
    }
    return campaignsRepository.update(id, patch);
  },

  async addLeads(organizationId: string, id: string, leadIds: string[]): Promise<void> {
    await assertCampaignInOrg(organizationId, id);
    const count = await leadsRepository.countInOrganization(organizationId, leadIds);
    if (count !== leadIds.length) {
      throw ApiError.badRequest("One or more leads do not belong to your organization");
    }
    await campaignsRepository.addLeads(id, leadIds);
  },

  async removeLeads(organizationId: string, id: string, leadIds: string[]): Promise<void> {
    await assertCampaignInOrg(organizationId, id);
    const count = await leadsRepository.countInOrganization(organizationId, leadIds);
    if (count !== leadIds.length) {
      throw ApiError.badRequest("One or more leads do not belong to your organization");
    }
    await campaignsRepository.removeLeads(id, leadIds);
  },

  async getStatus(organizationId: string, id: string) {
    const detail = await this.getDetail(organizationId, id);
    return {
      campaign: detail.campaign,
      pipelineBreakdown: detail.pipelineBreakdown,
      emailStats: detail.emailStats,
      whatsappStats: detail.whatsappStats,
    };
  },

  async generateEmails(organizationId: string, campaignId: string, userId: string): Promise<CampaignBatchResult> {
    const campaign = await assertCampaignInOrg(organizationId, campaignId);
    if (campaign.channel === CampaignChannel.WHATSAPP) {
      return this.generateWhatsapp(organizationId, campaignId, userId);
    }

    const leads = await campaignsRepository.listLeadsForCampaign(campaignId);
    const leadIds = leads.map((l) => l.id);
    const allEmails = await emailsRepository.listByLeadIds(leadIds);
    const emailsByLead = new Map<string, typeof allEmails>();
    for (const email of allEmails) {
      const list = emailsByLead.get(email.leadId) ?? [];
      list.push(email);
      emailsByLead.set(email.leadId, list);
    }

    const companyIds = [...new Set(leads.map((l) => l.companyId))];
    const allContacts = await contactsRepository.listByCompanyIds(companyIds);
    const contactsByCompany = new Map<string, typeof allContacts>();
    for (const contact of allContacts) {
      const list = contactsByCompany.get(contact.companyId) ?? [];
      list.push(contact);
      contactsByCompany.set(contact.companyId, list);
    }

    const config = extractFlowMessageConfig(campaign.flowDefinition);
    const result: CampaignBatchResult = { generated: 0, skipped: 0, failed: [] };

    for (const lead of leads) {
      const contactsWithEmail = (contactsByCompany.get(lead.companyId) ?? []).filter((c) => c.email);
      if (contactsWithEmail.length === 0) {
        result.skipped! += 1;
        result.failed.push({
          leadId: lead.id,
          name: lead.company?.name ?? undefined,
          reason: "No contacts with revealed email",
        });
        continue;
      }

      const leadEmails = emailsByLead.get(lead.id) ?? [];

      for (const contact of contactsWithEmail) {
        const hasActive = leadEmails.some(
          (e) => e.contactId === contact.id && ACTIVE_STATUSES.has(e.status),
        );
        if (hasActive) {
          result.skipped! += 1;
          continue;
        }

        try {
          const email = await outreachService.generateEmail(
            lead.id,
            contact.id,
            "initial",
            config.tone,
            userId,
          );
          result.generated! += 1;
          leadEmails.push(email);
        } catch (err) {
          result.failed.push({
            leadId: lead.id,
            contactId: contact.id,
            name: `${contactName(contact)} (${lead.company?.name ?? "lead"})`,
            reason: err instanceof ApiError ? err.message : "Generation failed",
          });
        }
      }
    }

    return result;
  },

  async generateWhatsapp(organizationId: string, campaignId: string, userId: string): Promise<CampaignBatchResult> {
    const campaign = await assertCampaignInOrg(organizationId, campaignId);
    const config = extractFlowMessageConfig(campaign.flowDefinition);
    if (!config.templateName) {
      throw ApiError.badRequest(
        "Select a WhatsApp template on the Message node in the Flow tab before generating.",
      );
    }

    const leads = await campaignsRepository.listLeadsForCampaign(campaignId);
    const leadIds = leads.map((l) => l.id);
    const allMessages = await whatsappMessagesRepository.listByLeadIds(leadIds);
    const byLead = new Map<string, typeof allMessages>();
    for (const msg of allMessages) {
      const list = byLead.get(msg.leadId) ?? [];
      list.push(msg);
      byLead.set(msg.leadId, list);
    }

    const companyIds = [...new Set(leads.map((l) => l.companyId))];
    const allContacts = await contactsRepository.listByCompanyIds(companyIds);
    const contactsByCompany = new Map<string, typeof allContacts>();
    for (const contact of allContacts) {
      const list = contactsByCompany.get(contact.companyId) ?? [];
      list.push(contact);
      contactsByCompany.set(contact.companyId, list);
    }

    const result: CampaignBatchResult = { generated: 0, skipped: 0, failed: [] };

    for (const lead of leads) {
      const contactsWithPhone = (contactsByCompany.get(lead.companyId) ?? []).filter((c) => c.phone);
      if (contactsWithPhone.length === 0) {
        result.skipped! += 1;
        result.failed.push({
          leadId: lead.id,
          name: lead.company?.name ?? undefined,
          reason: "No contacts with phone number",
        });
        continue;
      }

      const leadMessages = byLead.get(lead.id) ?? [];

      for (const contact of contactsWithPhone) {
        const hasActive = leadMessages.some(
          (m) => m.contactId === contact.id && ACTIVE_STATUSES.has(m.status),
        );
        if (hasActive) {
          result.skipped! += 1;
          continue;
        }

        try {
          const message = await whatsappOutreachService.generateMessage({
            leadId: lead.id,
            contactId: contact.id,
            templateName: config.templateName,
            templateLanguage: config.templateLanguage,
            tone: config.tone,
            userId,
            campaignId,
          });
          result.generated! += 1;
          leadMessages.push(message);
        } catch (err) {
          result.failed.push({
            leadId: lead.id,
            contactId: contact.id,
            name: `${contactName(contact)} (${lead.company?.name ?? "lead"})`,
            reason: err instanceof ApiError ? err.message : "Generation failed",
          });
        }
      }
    }

    return result;
  },

  async submitAll(organizationId: string, campaignId: string, userId: string): Promise<CampaignBatchResult> {
    const campaign = await assertCampaignInOrg(organizationId, campaignId);
    const leads = await campaignsRepository.listLeadsForCampaign(campaignId);
    const leadIds = leads.map((l) => l.id);
    const result: CampaignBatchResult = { submitted: 0, skipped: 0, failed: [] };

    if (campaign.channel === CampaignChannel.WHATSAPP) {
      const drafts = await whatsappMessagesRepository.listDraftsForLeadIds(leadIds);
      for (const message of drafts) {
        try {
          await approvalService.submitWhatsapp(message.id, userId);
          result.submitted! += 1;
        } catch (err) {
          result.failed.push({
            whatsappMessageId: message.id,
            leadId: message.leadId,
            reason: err instanceof ApiError ? err.message : "Submit failed",
          });
        }
      }
      return result;
    }

    const drafts = await emailsRepository.listDraftsForLeadIds(leadIds);
    for (const email of drafts) {
      try {
        await approvalService.submit(email.id, userId);
        result.submitted! += 1;
      } catch (err) {
        result.failed.push({
          emailId: email.id,
          leadId: email.leadId,
          reason: err instanceof ApiError ? err.message : "Submit failed",
        });
      }
    }

    return result;
  },

  async launch(
    organizationId: string,
    campaignId: string,
    userId: string,
    input: LaunchCampaignInput,
  ): Promise<CampaignBatchResult> {
    const campaign = await assertCampaignInOrg(organizationId, campaignId);
    const flow = campaignFlowDefinitionSchema.parse(campaign.flowDefinition ?? { nodes: [], edges: [] });
    const validation = validateCampaignFlowForLaunch(flow, campaign.channel ?? CampaignChannel.EMAIL);
    if (!validation.ok) {
      throw ApiError.badRequest(validation.errors.join("; "));
    }

    const config = extractFlowMessageConfig(flow);
    const leads = await campaignsRepository.listLeadsForCampaign(campaignId);
    const leadIds = leads.map((l) => l.id);
    const result: CampaignBatchResult = { scheduled: 0, failed: [] };

    let scheduledAt = input.scheduledAt ?? new Date().toISOString();
    if (!input.scheduledAt && config.waitHours > 0) {
      scheduledAt = new Date(Date.now() + config.waitHours * 60 * 60 * 1000).toISOString();
    }

    if (campaign.channel === CampaignChannel.WHATSAPP) {
      const approved = await whatsappMessagesRepository.listApprovedForLeadIds(leadIds);
      for (const message of approved) {
        try {
          if (config.sendMode === "immediate" && config.waitHours === 0 && !input.scheduledAt) {
            await approvalService.dispatchWhatsapp(message.id);
          } else {
            await approvalService.scheduleWhatsapp(message.id, scheduledAt);
          }
          result.scheduled! += 1;
        } catch (err) {
          result.failed.push({
            whatsappMessageId: message.id,
            leadId: message.leadId,
            reason: err instanceof ApiError ? err.message : "Failed to schedule/send",
          });
        }
      }
    } else {
      const approved = await emailsRepository.listApprovedForLeadIds(leadIds);
      for (const email of approved) {
        try {
          await approvalService.schedule(email.id, userId, scheduledAt);
          result.scheduled! += 1;
        } catch (err) {
          result.failed.push({
            emailId: email.id,
            leadId: email.leadId,
            reason: err instanceof ApiError ? err.message : "Failed to schedule",
          });
        }
      }
    }

    await campaignsRepository.update(campaignId, {
      status: "active",
      scheduledAt: input.scheduledAt ?? null,
    });

    return result;
  },
};
