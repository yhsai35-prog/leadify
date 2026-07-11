import type { NurturingLead } from "@bluwheelz/shared";
import { supabaseAdmin } from "../config/supabase.js";
import { toCamel } from "../utils/caseConverter.js";
import { ApiError } from "../utils/errors.js";

interface LeadRow {
  id: string;
  company_id: string;
  pipeline_status: string;
  assigned_to: string | null;
  company: { id: string; name: string; industry: string | null } | null;
}

export const nurturingRepository = {
  /**
   * Mirrors the discoveredLeads repository pattern: one bulk leads query plus
   * a handful of `.in(...)` lookups (contacts/emails/acknowledgements/
   * activities/users), joined in memory. Avoids N+1 round trips per lead
   * while sidestepping guesswork around PostgREST embed/FK constraint names.
   */
  async list(organizationId: string, assignedTo?: string): Promise<NurturingLead[]> {
    let leadsQuery = supabaseAdmin
      .from("leads")
      .select("id, company_id, pipeline_status, assigned_to, company:companies(id, name, industry)")
      .eq("organization_id", organizationId)
      .is("deleted_at", null);
    if (assignedTo) leadsQuery = leadsQuery.eq("assigned_to", assignedTo);

    const { data: leadRows, error: leadsError } = await leadsQuery.order("created_at", { ascending: false });
    if (leadsError) throw ApiError.internal(leadsError.message);
    const leads = (leadRows ?? []) as unknown as LeadRow[];
    if (leads.length === 0) return [];

    const leadIds = leads.map((l) => l.id);
    const companyIds = Array.from(new Set(leads.map((l) => l.company_id)));
    const ownerIds = Array.from(new Set(leads.map((l) => l.assigned_to).filter((id): id is string => Boolean(id))));

    const [contactsRes, emailsRes, acksRes, activitiesRes, usersRes] = await Promise.all([
      supabaseAdmin.from("contacts").select("id, company_id").in("company_id", companyIds),
      supabaseAdmin.from("emails").select("lead_id, status").in("lead_id", leadIds).eq("status", "sent"),
      supabaseAdmin
        .from("outreach_acknowledgements")
        .select("lead_id, channel, acknowledged")
        .in("lead_id", leadIds),
      supabaseAdmin
        .from("activities")
        .select("lead_id, created_at")
        .in("lead_id", leadIds)
        .order("created_at", { ascending: false }),
      ownerIds.length > 0
        ? supabaseAdmin.from("users").select("id, full_name").in("id", ownerIds)
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (contactsRes.error) throw ApiError.internal(contactsRes.error.message);
    if (emailsRes.error) throw ApiError.internal(emailsRes.error.message);
    if (acksRes.error) throw ApiError.internal(acksRes.error.message);
    if (activitiesRes.error) throw ApiError.internal(activitiesRes.error.message);
    if (usersRes.error) throw ApiError.internal(usersRes.error.message);

    const contactsByCompany = new Map<string, number>();
    for (const c of (contactsRes.data ?? []) as Array<{ company_id: string }>) {
      contactsByCompany.set(c.company_id, (contactsByCompany.get(c.company_id) ?? 0) + 1);
    }

    const emailsSentByLead = new Map<string, number>();
    for (const e of (emailsRes.data ?? []) as Array<{ lead_id: string }>) {
      emailsSentByLead.set(e.lead_id, (emailsSentByLead.get(e.lead_id) ?? 0) + 1);
    }

    const ackByLead = new Map<string, { email: boolean; linkedin: boolean }>();
    for (const a of (acksRes.data ?? []) as Array<{ lead_id: string; channel: "email" | "linkedin"; acknowledged: boolean }>) {
      const entry = ackByLead.get(a.lead_id) ?? { email: false, linkedin: false };
      if (a.acknowledged) entry[a.channel] = true;
      ackByLead.set(a.lead_id, entry);
    }

    const lastActivityByLead = new Map<string, string>();
    for (const act of (activitiesRes.data ?? []) as Array<{ lead_id: string; created_at: string }>) {
      if (!lastActivityByLead.has(act.lead_id)) lastActivityByLead.set(act.lead_id, act.created_at);
    }

    const userNameById = new Map<string, string>();
    for (const u of (usersRes.data ?? []) as Array<{ id: string; full_name: string }>) {
      userNameById.set(u.id, u.full_name);
    }

    return leads.map((lead) => {
      const ack = ackByLead.get(lead.id) ?? { email: false, linkedin: false };
      const camelStatus = toCamel<{ pipelineStatus: string }>({ pipeline_status: lead.pipeline_status }).pipelineStatus;
      return {
        leadId: lead.id,
        companyId: lead.company_id,
        companyName: lead.company?.name ?? "Unknown company",
        industry: lead.company?.industry ?? null,
        pipelineStatus: camelStatus as NurturingLead["pipelineStatus"],
        ownerId: lead.assigned_to,
        ownerName: lead.assigned_to ? userNameById.get(lead.assigned_to) ?? "Unknown" : null,
        contactsCount: contactsByCompany.get(lead.company_id) ?? 0,
        emailsSentCount: emailsSentByLead.get(lead.id) ?? 0,
        emailAcknowledged: ack.email,
        linkedinAcknowledged: ack.linkedin,
        lastActivityAt: lastActivityByLead.get(lead.id) ?? null,
      } satisfies NurturingLead;
    });
  },
};
