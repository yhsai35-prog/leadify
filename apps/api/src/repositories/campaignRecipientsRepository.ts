import type { CampaignRecipient } from "@bluwheelz/shared";
import { supabaseAdmin } from "../config/supabase.js";
import { toCamel, toSnake } from "../utils/caseConverter.js";
import { ApiError } from "../utils/errors.js";

type RecipientRow = {
  id: string;
  campaign_id: string;
  lead_id: string;
  contact_id: string;
  phone: string | null;
  email: string | null;
  selected: boolean;
  created_at: string;
  contact?: { first_name?: string; last_name?: string | null } | null;
  lead?: {
    pipeline_status?: string;
    company?: { name?: string } | null;
  } | null;
};

function mapRecipient(row: RecipientRow): CampaignRecipient {
  const contact = row.contact;
  const name = contact
    ? [contact.first_name, contact.last_name].filter(Boolean).join(" ").trim() || null
    : null;
  return {
    ...toCamel<CampaignRecipient>(row),
    contactName: name,
    companyName: row.lead?.company?.name ?? null,
    leadPipelineStatus: (row.lead?.pipeline_status as CampaignRecipient["leadPipelineStatus"]) ?? null,
  };
}

export const campaignRecipientsRepository = {
  async listByCampaign(campaignId: string): Promise<CampaignRecipient[]> {
    const { data, error } = await supabaseAdmin
      .from("campaign_recipients")
      .select(
        "*, contact:contacts(first_name, last_name), lead:leads(pipeline_status, company:companies(name))",
      )
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: true });
    if (error) throw ApiError.internal(error.message);
    return ((data ?? []) as RecipientRow[]).map(mapRecipient);
  },

  async listSelected(campaignId: string): Promise<CampaignRecipient[]> {
    const all = await this.listByCampaign(campaignId);
    return all.filter((r) => r.selected);
  },

  async upsertMany(
    rows: Array<{
      campaignId: string;
      leadId: string;
      contactId: string;
      phone?: string | null;
      email?: string | null;
      selected?: boolean;
    }>,
  ): Promise<void> {
    if (rows.length === 0) return;
    const payload = rows.map((r) =>
      toSnake({
        campaignId: r.campaignId,
        leadId: r.leadId,
        contactId: r.contactId,
        phone: r.phone ?? null,
        email: r.email ?? null,
        selected: r.selected ?? true,
        updatedAt: new Date().toISOString(),
      }),
    );
    const { error } = await supabaseAdmin
      .from("campaign_recipients")
      .upsert(payload, { onConflict: "campaign_id,contact_id" });
    if (error) throw ApiError.internal(error.message);
  },

  async setSelected(campaignId: string, contactId: string, selected: boolean): Promise<CampaignRecipient> {
    const { data, error } = await supabaseAdmin
      .from("campaign_recipients")
      .update({ selected, updated_at: new Date().toISOString() })
      .eq("campaign_id", campaignId)
      .eq("contact_id", contactId)
      .select(
        "*, contact:contacts(first_name, last_name), lead:leads(pipeline_status, company:companies(name))",
      )
      .single();
    if (error) throw ApiError.internal(error.message);
    return mapRecipient(data as RecipientRow);
  },

  async setManySelected(
    campaignId: string,
    updates: Array<{ contactId: string; selected: boolean }>,
  ): Promise<void> {
    for (const u of updates) {
      await this.setSelected(campaignId, u.contactId, u.selected);
    }
  },

  async removeByLeadIds(campaignId: string, leadIds: string[]): Promise<void> {
    if (leadIds.length === 0) return;
    const { error } = await supabaseAdmin
      .from("campaign_recipients")
      .delete()
      .eq("campaign_id", campaignId)
      .in("lead_id", leadIds);
    if (error) throw ApiError.internal(error.message);
  },
};
