import type { Campaign, CampaignEmailStats, CampaignPerformanceRow, Lead } from "@bluwheelz/shared";
import { CampaignChannel } from "@bluwheelz/shared";
import { supabaseAdmin } from "../config/supabase.js";
import { toCamel, toSnake } from "../utils/caseConverter.js";
import { ApiError } from "../utils/errors.js";
import { resolveUserLeadIds } from "../utils/userLeadScope.js";

const LEAD_WITH_RELATIONS = "*, company:companies(*), contact:contacts(*)";

const EMPTY_EMAIL_STATS: CampaignEmailStats = {
  draft: 0,
  pendingApproval: 0,
  approved: 0,
  scheduled: 0,
  sent: 0,
  failed: 0,
};

function normalizeCampaign(campaign: Campaign): Campaign {
  return {
    ...campaign,
    channel: campaign.channel ?? CampaignChannel.EMAIL,
    flowDefinition: campaign.flowDefinition ?? { nodes: [], edges: [] },
  };
}

function mapEmailStats(rows: Array<{ status: string }>): CampaignEmailStats {
  const stats = { ...EMPTY_EMAIL_STATS };
  for (const row of rows) {
    const status = row.status;
    if (status === "draft") stats.draft += 1;
    else if (status === "pending_approval") stats.pendingApproval += 1;
    else if (status === "approved") stats.approved += 1;
    else if (status === "scheduled") stats.scheduled += 1;
    else if (status === "sent") stats.sent += 1;
    else if (status === "failed") stats.failed += 1;
  }
  return stats;
}

export const campaignsRepository = {
  async findById(id: string): Promise<Campaign | null> {
    const { data, error } = await supabaseAdmin.from("campaigns").select("*").eq("id", id).maybeSingle();
    if (error) throw ApiError.internal(error.message);
    return data ? normalizeCampaign(toCamel<Campaign>(data)) : null;
  },

  async list(organizationId: string): Promise<Campaign[]> {
    const { data, error } = await supabaseAdmin
      .from("campaigns")
      .select("*, leads(count)")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false });
    if (error) throw ApiError.internal(error.message);
    return (data ?? []).map((row: Record<string, unknown>) => ({
      ...normalizeCampaign(toCamel<Campaign>(row)),
      leadCount: (row.leads as Array<{ count: number }> | undefined)?.[0]?.count ?? 0,
    }));
  },

  async create(input: Partial<Campaign> & { organizationId: string; createdBy: string }): Promise<Campaign> {
    const row = toSnake(input);
    const { data, error } = await supabaseAdmin.from("campaigns").insert(row).select("*").single();
    if (error) throw ApiError.conflict(error.message);
    return normalizeCampaign(toCamel<Campaign>(data));
  },

  async update(id: string, input: Partial<Campaign>): Promise<Campaign> {
    const row = toSnake(input);
    const { data, error } = await supabaseAdmin.from("campaigns").update(row).eq("id", id).select("*").single();
    if (error) throw ApiError.internal(error.message);
    return normalizeCampaign(toCamel<Campaign>(data));
  },

  async addLeads(campaignId: string, leadIds: string[]): Promise<void> {
    const { error } = await supabaseAdmin.from("leads").update({ campaign_id: campaignId }).in("id", leadIds);
    if (error) throw ApiError.internal(error.message);
  },

  async removeLeads(campaignId: string, leadIds: string[]): Promise<void> {
    const { error } = await supabaseAdmin
      .from("leads")
      .update({ campaign_id: null })
      .eq("campaign_id", campaignId)
      .in("id", leadIds);
    if (error) throw ApiError.internal(error.message);
  },

  async listLeadsForCampaign(campaignId: string): Promise<Lead[]> {
    const { data, error } = await supabaseAdmin
      .from("leads")
      .select(LEAD_WITH_RELATIONS)
      .eq("campaign_id", campaignId)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false });
    if (error) throw ApiError.internal(error.message);
    return toCamel<Lead[]>(data ?? []);
  },

  async statusBreakdown(campaignId: string): Promise<Record<string, number>> {
    const { data, error } = await supabaseAdmin.from("leads").select("pipeline_status").eq("campaign_id", campaignId);
    if (error) throw ApiError.internal(error.message);
    const breakdown: Record<string, number> = {};
    for (const row of data ?? []) {
      const status = row.pipeline_status as string;
      breakdown[status] = (breakdown[status] ?? 0) + 1;
    }
    return breakdown;
  },

  /** Email counts for a campaign via leads join (works even before emails.campaign_id is backfilled). */
  async emailStatsForCampaign(campaignId: string): Promise<CampaignEmailStats> {
    const { data: leads, error: leadsError } = await supabaseAdmin
      .from("leads")
      .select("id")
      .eq("campaign_id", campaignId)
      .is("deleted_at", null);
    if (leadsError) throw ApiError.internal(leadsError.message);
    const leadIds = (leads ?? []).map((l) => l.id as string);
    if (leadIds.length === 0) return { ...EMPTY_EMAIL_STATS };

    const { data, error } = await supabaseAdmin.from("emails").select("status").in("lead_id", leadIds);
    if (error) throw ApiError.internal(error.message);
    return mapEmailStats((data ?? []) as Array<{ status: string }>);
  },

  async whatsappStatsForCampaign(campaignId: string): Promise<CampaignEmailStats> {
    const { data: leads, error: leadsError } = await supabaseAdmin
      .from("leads")
      .select("id")
      .eq("campaign_id", campaignId)
      .is("deleted_at", null);
    if (leadsError) throw ApiError.internal(leadsError.message);
    const leadIds = (leads ?? []).map((l) => l.id as string);
    if (leadIds.length === 0) return { ...EMPTY_EMAIL_STATS };

    const { data, error } = await supabaseAdmin.from("whatsapp_messages").select("status").in("lead_id", leadIds);
    if (error) throw ApiError.internal(error.message);
    return mapEmailStats((data ?? []) as Array<{ status: string }>);
  },

  async performanceByOrganization(organizationId: string, userId?: string): Promise<CampaignPerformanceRow[]> {
    const campaigns = await this.list(organizationId);
    const rows: CampaignPerformanceRow[] = [];

    for (const campaign of campaigns) {
      let leads = await this.listLeadsForCampaign(campaign.id);
      if (userId) {
        const scopedIds = new Set(await resolveUserLeadIds(organizationId, userId));
        leads = leads.filter((lead) => scopedIds.has(lead.id));
      }
      const emailStats = await this.emailStatsForCampaign(campaign.id);
      const sentPlusStatuses = new Set(["sent", "interested", "meeting", "proposal", "won"]);
      const leadsAtSentPlus = leads.filter((l) => sentPlusStatuses.has(l.pipelineStatus)).length;

      rows.push({
        campaignId: campaign.id,
        campaignName: campaign.name,
        status: campaign.status,
        leadCount: leads.length,
        emailsSent: emailStats.sent,
        pendingApproval: emailStats.pendingApproval,
        leadsAtSentPlus,
      });
    }

    return rows.filter((row) => row.leadCount > 0 || row.emailsSent > 0 || row.pendingApproval > 0);
  },
};
