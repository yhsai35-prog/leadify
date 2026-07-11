import type {
  Campaign,
  CampaignBatchResult,
  CampaignDetail,
  CreateCampaignInput,
  LaunchCampaignInput,
  UpdateCampaignInput,
} from "@bluwheelz/shared";
import { campaignsRepository } from "../../repositories/campaignsRepository.js";
import { contactsRepository } from "../../repositories/contactsRepository.js";
import { emailsRepository } from "../../repositories/emailsRepository.js";
import { leadsRepository } from "../../repositories/leadsRepository.js";
import { approvalService } from "../approval/approvalService.js";
import { outreachService } from "../outreach/outreachService.js";
import { ApiError } from "../../utils/errors.js";

const ACTIVE_EMAIL_STATUSES = new Set(["draft", "pending_approval", "approved", "scheduled", "sent"]);

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
        emailStats: await campaignsRepository.emailStatsForCampaign(campaign.id),
      })),
    );
    return withStats;
  },

  async create(organizationId: string, input: CreateCampaignInput, createdBy: string): Promise<Campaign> {
    return campaignsRepository.create({ ...input, organizationId, createdBy, status: "draft" });
  },

  async getDetail(organizationId: string, id: string): Promise<CampaignDetail> {
    const campaign = await assertCampaignInOrg(organizationId, id);
    const [leads, pipelineBreakdown, emailStats] = await Promise.all([
      campaignsRepository.listLeadsForCampaign(id),
      campaignsRepository.statusBreakdown(id),
      campaignsRepository.emailStatsForCampaign(id),
    ]);
    const leadIds = leads.map((l) => l.id);
    const [latestEmailStatus, allEmails] = await Promise.all([
      emailsRepository.latestStatusByLeadIds(leadIds),
      emailsRepository.listByLeadIds(leadIds),
    ]);
    const contactStatusMap = emailsRepository.buildContactStatusMap(allEmails);
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
          isPrimary: contact.id === lead.contactId,
          latestEmailStatus: contactStatusMap.get(`${lead.id}:${contact.id}`) ?? null,
        }));

        return {
          leadId: lead.id,
          companyName: lead.company?.name ?? "Unknown company",
          pipelineStatus: lead.pipelineStatus,
          latestEmailStatus: latestEmailStatus.get(lead.id) ?? null,
          contactId: lead.contactId,
          contactName: lead.contact ? contactName(lead.contact) : null,
          contactEmail: lead.contact?.email ?? null,
          companyContacts,
        };
      }),
      pipelineBreakdown,
      emailStats,
    };
  },

  async update(organizationId: string, id: string, input: UpdateCampaignInput): Promise<Campaign> {
    await assertCampaignInOrg(organizationId, id);
    return campaignsRepository.update(id, input);
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
    };
  },

  async generateEmails(organizationId: string, campaignId: string, userId: string): Promise<CampaignBatchResult> {
    await assertCampaignInOrg(organizationId, campaignId);
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
          (e) => e.contactId === contact.id && ACTIVE_EMAIL_STATUSES.has(e.status),
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
            "professional",
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

  async submitAll(organizationId: string, campaignId: string, userId: string): Promise<CampaignBatchResult> {
    await assertCampaignInOrg(organizationId, campaignId);
    const leads = await campaignsRepository.listLeadsForCampaign(campaignId);
    const drafts = await emailsRepository.listDraftsForLeadIds(leads.map((l) => l.id));

    const result: CampaignBatchResult = { submitted: 0, skipped: 0, failed: [] };

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
    await assertCampaignInOrg(organizationId, campaignId);
    const leads = await campaignsRepository.listLeadsForCampaign(campaignId);
    const approved = await emailsRepository.listApprovedForLeadIds(leads.map((l) => l.id));
    const scheduledAt = input.scheduledAt ?? new Date().toISOString();

    const result: CampaignBatchResult = { scheduled: 0, failed: [] };

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

    await campaignsRepository.update(campaignId, {
      status: "active",
      scheduledAt: input.scheduledAt ?? null,
    });

    return result;
  },
};
