import type {
  AddManualCampaignRecipientInput,
  Campaign,
  CampaignBatchResult,
  CampaignDetail,
  CampaignRecipient,
  CreateCampaignInput,
  GenerateCampaignOutreachInput,
  LaunchCampaignInput,
  SetCampaignRecipientsInput,
  UpdateCampaignInput,
  WhatsappMessage,
  WhatsappMessageEvent,
} from "@bluwheelz/shared";
import { CampaignChannel, campaignFlowDefinitionSchema, validateCampaignFlowForLaunch } from "@bluwheelz/shared";
import { campaignsRepository } from "../../repositories/campaignsRepository.js";
import { campaignRecipientsRepository } from "../../repositories/campaignRecipientsRepository.js";
import { companiesRepository } from "../../repositories/companiesRepository.js";
import { contactsRepository } from "../../repositories/contactsRepository.js";
import { emailsRepository } from "../../repositories/emailsRepository.js";
import { leadsRepository } from "../../repositories/leadsRepository.js";
import { whatsappMessagesRepository } from "../../repositories/whatsappMessagesRepository.js";
import { whatsappMessageEventsRepository } from "../../repositories/whatsappMessageEventsRepository.js";
import { approvalService } from "../approval/approvalService.js";
import { outreachService } from "../outreach/outreachService.js";
import { normalizeWhatsAppPhone } from "../whatsapp/metaWhatsAppClient.js";
import { whatsappOutreachService } from "../whatsapp/whatsappOutreachService.js";
import { ApiError } from "../../utils/errors.js";
import { extractFlowMessageConfig, resolveCreateFlowDefinition } from "./defaultFlows.js";

const ACTIVE_STATUSES = new Set(["draft", "pending_approval", "approved", "scheduled", "sent"]);
const MANUAL_TEST_COMPANY_DOMAIN = "whatsapp-test.local";
const MANUAL_TEST_COMPANY_NAME = "WhatsApp Test Numbers";

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

async function syncRecipientsFromLeads(campaign: Campaign, leadIds: string[]): Promise<void> {
  if (leadIds.length === 0) return;
  const leads = await Promise.all(leadIds.map((id) => leadsRepository.findById(id)));
  const companyIds = [...new Set(leads.filter(Boolean).map((l) => l!.companyId))];
  const contacts = await contactsRepository.listByCompanyIds(companyIds);
  const byCompany = new Map<string, typeof contacts>();
  for (const c of contacts) {
    const list = byCompany.get(c.companyId) ?? [];
    list.push(c);
    byCompany.set(c.companyId, list);
  }

  const rows: Array<{
    campaignId: string;
    leadId: string;
    contactId: string;
    phone?: string | null;
    email?: string | null;
    selected: boolean;
  }> = [];

  for (const lead of leads) {
    if (!lead) continue;
    for (const contact of byCompany.get(lead.companyId) ?? []) {
      const hasChannelIdentity =
        campaign.channel === CampaignChannel.WHATSAPP ? Boolean(contact.phone) : Boolean(contact.email);
      if (!hasChannelIdentity && campaign.channel === CampaignChannel.WHATSAPP && !contact.phone) {
        // Still list contacts without phone so user can see them as unselected/disabled via UI
      }
      rows.push({
        campaignId: campaign.id,
        leadId: lead.id,
        contactId: contact.id,
        phone: contact.phone,
        email: contact.email,
        selected: hasChannelIdentity,
      });
    }
  }

  await campaignRecipientsRepository.upsertMany(rows);
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
    const latestWaStatus = whatsappMessagesRepository.latestStatusByLeadIds(allWa);
    const contactStatusMap = emailsRepository.buildContactStatusMap(allEmails);
    const waContactStatusMap = whatsappMessagesRepository.buildContactStatusMap(allWa);
    const companyIds = [...new Set(leads.map((l) => l.companyId))];
    const allContacts = await contactsRepository.listByCompanyIds(companyIds);
    const contactsByCompany = new Map<string, typeof allContacts>();
    for (const contact of allContacts) {
      const list = contactsByCompany.get(contact.companyId) ?? [];
      list.push(contact);
      contactsByCompany.set(contact.companyId, list);
    }

    let recipients: CampaignRecipient[] = [];
    try {
      recipients = await campaignRecipientsRepository.listByCampaign(id);
      if (recipients.length === 0 && leads.length > 0) {
        await syncRecipientsFromLeads(campaign, leadIds);
        recipients = await campaignRecipientsRepository.listByCampaign(id);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (/campaign_recipients|schema cache|does not exist/i.test(message)) {
        throw ApiError.badRequest(
          "Database migration 016 is required for recipient selection. Run packages/db/migrations/016_campaign_recipients_history.sql in the Supabase SQL Editor, then retry.",
        );
      }
      throw err;
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
      recipients,
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
    const campaign = await assertCampaignInOrg(organizationId, id);
    const count = await leadsRepository.countInOrganization(organizationId, leadIds);
    if (count !== leadIds.length) {
      throw ApiError.badRequest("One or more leads do not belong to your organization");
    }
    await campaignsRepository.addLeads(id, leadIds);
    await syncRecipientsFromLeads(campaign, leadIds);
  },

  async removeLeads(organizationId: string, id: string, leadIds: string[]): Promise<void> {
    await assertCampaignInOrg(organizationId, id);
    const count = await leadsRepository.countInOrganization(organizationId, leadIds);
    if (count !== leadIds.length) {
      throw ApiError.badRequest("One or more leads do not belong to your organization");
    }
    await campaignsRepository.removeLeads(id, leadIds);
    await campaignRecipientsRepository.removeByLeadIds(id, leadIds);
  },

  async setRecipients(
    organizationId: string,
    campaignId: string,
    input: SetCampaignRecipientsInput,
  ): Promise<CampaignRecipient[]> {
    const campaign = await assertCampaignInOrg(organizationId, campaignId);
    const contactIds = input.recipients.map((r) => r.contactId);
    const contacts = await Promise.all(contactIds.map((cid) => contactsRepository.findById(cid)));
    const byId = new Map(contacts.filter(Boolean).map((c) => [c!.id, c!]));

    await campaignRecipientsRepository.upsertMany(
      input.recipients.map((r) => {
        const contact = byId.get(r.contactId);
        return {
          campaignId,
          leadId: r.leadId,
          contactId: r.contactId,
          phone: contact?.phone ?? null,
          email: contact?.email ?? null,
          selected: r.selected,
        };
      }),
    );

    // Ensure channel-invalid phones aren't left selected for WhatsApp
    if (campaign.channel === CampaignChannel.WHATSAPP) {
      const all = await campaignRecipientsRepository.listByCampaign(campaignId);
      for (const r of all) {
        if (r.selected && !r.phone) {
          await campaignRecipientsRepository.setSelected(campaignId, r.contactId, false);
        }
      }
    }

    return campaignRecipientsRepository.listByCampaign(campaignId);
  },

  async updateRecipientSelected(
    organizationId: string,
    campaignId: string,
    contactId: string,
    selected: boolean,
  ): Promise<CampaignRecipient> {
    await assertCampaignInOrg(organizationId, campaignId);
    if (selected) {
      const contact = await contactsRepository.findById(contactId);
      const campaign = await campaignsRepository.findById(campaignId);
      if (campaign?.channel === CampaignChannel.WHATSAPP && !contact?.phone) {
        throw ApiError.badRequest("Cannot select a contact without a phone number for WhatsApp campaigns");
      }
    }
    return campaignRecipientsRepository.setSelected(campaignId, contactId, selected);
  },

  async addManualRecipient(
    organizationId: string,
    campaignId: string,
    input: AddManualCampaignRecipientInput,
  ): Promise<CampaignRecipient[]> {
    const campaign = await assertCampaignInOrg(organizationId, campaignId);

    if (campaign.channel === CampaignChannel.WHATSAPP) {
      if (!input.phone) {
        throw ApiError.badRequest("Phone number is required for WhatsApp campaigns");
      }
      const digits = normalizeWhatsAppPhone(input.phone);
      const displayPhone = `+${digits}`;

      let company = await companiesRepository.findByDomain(organizationId, MANUAL_TEST_COMPANY_DOMAIN);
      if (!company) {
        company = await companiesRepository.create(organizationId, {
          name: MANUAL_TEST_COMPANY_NAME,
          domain: MANUAL_TEST_COMPANY_DOMAIN,
          industry: "Internal testing",
        });
      }

      const existingOnCompany = await contactsRepository.listByCompanyWithPhone(company.id);
      let contact = existingOnCompany.find((c) => {
        if (!c.phone) return false;
        try {
          return normalizeWhatsAppPhone(c.phone) === digits;
        } catch {
          return false;
        }
      });

      if (!contact) {
        const label = (input.label?.trim() || "Test").slice(0, 80);
        contact = await contactsRepository.create({
          companyId: company.id,
          firstName: label,
          lastName: "Number",
          phone: displayPhone,
          title: "Manual test recipient",
          isDecisionMaker: true,
        });
      } else if (input.label?.trim() && contact.firstName !== input.label.trim()) {
        contact = await contactsRepository.update(contact.id, {
          firstName: input.label.trim().slice(0, 80),
        });
      }

      let lead = await leadsRepository.findExistingForCompany(organizationId, company.id);
      if (!lead) {
        lead = await leadsRepository.create({
          organizationId,
          companyId: company.id,
          contactId: contact.id,
          pipelineStatus: "imported",
          source: "manual",
        });
      }

      await campaignsRepository.addLeads(campaignId, [lead.id]);
      await syncRecipientsFromLeads(campaign, [lead.id]);
      await campaignRecipientsRepository.setSelected(campaignId, contact.id, true);

      return campaignRecipientsRepository.listByCampaign(campaignId);
    }

    if (!input.email) {
      throw ApiError.badRequest("Email is required for email campaigns");
    }

    let company = await companiesRepository.findByDomain(organizationId, MANUAL_TEST_COMPANY_DOMAIN);
    if (!company) {
      company = await companiesRepository.create(organizationId, {
        name: MANUAL_TEST_COMPANY_NAME,
        domain: MANUAL_TEST_COMPANY_DOMAIN,
        industry: "Internal testing",
      });
    }

    const label = (input.label?.trim() || "Test").slice(0, 80);
    const existing = await contactsRepository.findByCompanyAndEmail(company.id, input.email);
    const contact =
      existing ??
      (await contactsRepository.create({
        companyId: company.id,
        firstName: label,
        lastName: "Recipient",
        email: input.email,
        title: "Manual test recipient",
        isDecisionMaker: true,
      }));

    let lead = await leadsRepository.findExistingForCompany(organizationId, company.id);
    if (!lead) {
      lead = await leadsRepository.create({
        organizationId,
        companyId: company.id,
        contactId: contact.id,
        pipelineStatus: "imported",
        source: "manual",
      });
    }

    await campaignsRepository.addLeads(campaignId, [lead.id]);
    await syncRecipientsFromLeads(campaign, [lead.id]);
    await campaignRecipientsRepository.setSelected(campaignId, contact.id, true);

    return campaignRecipientsRepository.listByCampaign(campaignId);
  },

  async getConversationHistory(
    organizationId: string,
    campaignId: string,
  ): Promise<{ messages: WhatsappMessage[]; events: WhatsappMessageEvent[] }> {
    await assertCampaignInOrg(organizationId, campaignId);
    const [messages, events] = await Promise.all([
      whatsappMessagesRepository.listByCampaign(campaignId),
      whatsappMessageEventsRepository.listByCampaign(campaignId, 200),
    ]);
    return { messages, events };
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

  async generateEmails(
    organizationId: string,
    campaignId: string,
    userId: string,
    input: GenerateCampaignOutreachInput = {},
  ): Promise<CampaignBatchResult> {
    const campaign = await assertCampaignInOrg(organizationId, campaignId);
    if (campaign.channel === CampaignChannel.WHATSAPP) {
      return this.generateWhatsapp(organizationId, campaignId, userId, input.contactIds);
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

  async generateWhatsapp(
    organizationId: string,
    campaignId: string,
    userId: string,
    contactIds?: string[],
  ): Promise<CampaignBatchResult> {
    const campaign = await assertCampaignInOrg(organizationId, campaignId);
    const config = extractFlowMessageConfig(campaign.flowDefinition);
    if (!config.templateName) {
      throw ApiError.badRequest(
        "Select a WhatsApp template on the Message node in the Flow tab before generating.",
      );
    }

    let recipients = await campaignRecipientsRepository.listByCampaign(campaignId);
    if (recipients.length === 0) {
      const leads = await campaignsRepository.listLeadsForCampaign(campaignId);
      await syncRecipientsFromLeads(
        campaign,
        leads.map((l) => l.id),
      );
      recipients = await campaignRecipientsRepository.listByCampaign(campaignId);
    }

    const filterSet = contactIds && contactIds.length > 0 ? new Set(contactIds) : null;
    const targets = recipients.filter((r) => {
      if (!r.selected) return false;
      if (!r.phone) return false;
      if (filterSet && !filterSet.has(r.contactId)) return false;
      return true;
    });

    if (targets.length === 0) {
      throw ApiError.badRequest(
        "No recipients selected with phone numbers. Open the Recipients tab and select numbers to message.",
      );
    }

    const leadIds = [...new Set(targets.map((t) => t.leadId))];
    const allMessages = await whatsappMessagesRepository.listByLeadIds(leadIds);
    const byLead = new Map<string, typeof allMessages>();
    for (const msg of allMessages) {
      const list = byLead.get(msg.leadId) ?? [];
      list.push(msg);
      byLead.set(msg.leadId, list);
    }

    const result: CampaignBatchResult = { generated: 0, skipped: 0, failed: [] };

    for (const target of targets) {
      const leadMessages = byLead.get(target.leadId) ?? [];
      const hasActive = leadMessages.some(
        (m) => m.contactId === target.contactId && ACTIVE_STATUSES.has(m.status),
      );
      if (hasActive) {
        result.skipped! += 1;
        continue;
      }

      try {
        const message = await whatsappOutreachService.generateMessage({
          leadId: target.leadId,
          contactId: target.contactId,
          templateName: config.templateName,
          templateLanguage: config.templateLanguage,
          tone: config.tone,
          userId,
          campaignId,
        });
        result.generated! += 1;
        leadMessages.push(message);
        byLead.set(target.leadId, leadMessages);
      } catch (err) {
        result.failed.push({
          leadId: target.leadId,
          contactId: target.contactId,
          name: `${target.contactName ?? "Contact"} (${target.companyName ?? "lead"})`,
          reason: err instanceof ApiError ? err.message : "Generation failed",
        });
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
