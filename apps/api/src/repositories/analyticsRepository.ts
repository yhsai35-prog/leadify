import type {
  ActionQueueItem,
  DashboardKpis,
  DiscoveryFunnelStats,
  EmailEngagementStats,
  FunnelConversionStep,
  LeadQualityStats,
  RepPerformanceRow,
  TrendPoint,
} from "@bluwheelz/shared";
import { PIPELINE_ORDER, resolveCompanyCity, resolveCompanyState, type CityLeadBreakdown } from "@bluwheelz/shared";
import { supabaseAdmin } from "../config/supabase.js";
import { ApiError } from "../utils/errors.js";
import type { AnalyticsScope } from "../utils/analyticsScope.js";
import { resolveUserLeadIds } from "../utils/userLeadScope.js";

export interface AnalyticsContext {
  organizationId: string;
  scope: AnalyticsScope;
}

function scopeKey(ctx: AnalyticsContext): string {
  return ctx.scope.userId ?? "org";
}

async function countLeads(
  organizationId: string,
  filters: Record<string, string>,
  userId?: string,
  userLeadIds?: string[],
  dateRange?: { from: Date; to: Date },
  dateField: "created_at" | "updated_at" = "created_at",
): Promise<number> {
  let scopedIds = userLeadIds;
  if (userId && !scopedIds) scopedIds = await resolveUserLeadIds(organizationId, userId);
  if (userId && scopedIds && scopedIds.length === 0) return 0;

  let query = supabaseAdmin
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .is("deleted_at", null);
  for (const [key, value] of Object.entries(filters)) {
    query = query.eq(key, value);
  }
  if (scopedIds) query = query.in("id", scopedIds);
  if (dateRange) {
    query = query.gte(dateField, dateRange.from.toISOString()).lte(dateField, dateRange.to.toISOString());
  }
  const { count, error } = await query;
  if (error) throw ApiError.internal(error.message);
  return count ?? 0;
}

function weekStartKey(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

function enumerateWeeks(from: Date, to: Date): string[] {
  const weeks: string[] = [];
  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(to);
  while (cursor <= end) {
    const key = weekStartKey(cursor);
    if (!weeks.includes(key)) weeks.push(key);
    cursor.setDate(cursor.getDate() + 7);
  }
  if (weeks.length === 0) weeks.push(weekStartKey(from));
  return weeks;
}

export const analyticsRepository = {
  async kpis(ctx: AnalyticsContext): Promise<DashboardKpis> {
    const { organizationId, scope } = ctx;
    const { userId, from, to } = scope;
    const period = { from, to };
    const userLeadIds = userId ? await resolveUserLeadIds(organizationId, userId) : undefined;

    const [totalLeads, qualifiedLeads, wonLeads, lostLeads, leadsCreatedInPeriod, dealsWonInPeriod] =
      await Promise.all([
        countLeads(organizationId, {}, userId, userLeadIds),
        countLeads(organizationId, { pipeline_status: "qualified" }, userId, userLeadIds),
        countLeads(organizationId, { pipeline_status: "won" }, userId, userLeadIds),
        countLeads(organizationId, { pipeline_status: "lost" }, userId, userLeadIds),
        countLeads(organizationId, {}, userId, userLeadIds, period, "created_at"),
        countLeads(organizationId, { pipeline_status: "won" }, userId, userLeadIds, period, "updated_at"),
      ]);

    let approvalQuery = supabaseAdmin
      .from("approval_queue")
      .select("id, lead:leads!inner(organization_id, deleted_at)", { count: "exact", head: true })
      .eq("status", "pending")
      .eq("lead.organization_id", organizationId)
      .is("lead.deleted_at", null);
    if (userId) approvalQuery = approvalQuery.eq("submitted_by", userId);
    const { count: pendingApprovals, error: approvalError } = await approvalQuery;
    if (approvalError) throw ApiError.internal(approvalError.message);

    let emailsQuery = supabaseAdmin
      .from("emails")
      .select("id, lead:leads!inner(organization_id, deleted_at)", { count: "exact", head: true })
      .eq("status", "sent")
      .gte("sent_at", from.toISOString())
      .lte("sent_at", to.toISOString())
      .eq("lead.organization_id", organizationId)
      .is("lead.deleted_at", null);
    if (userLeadIds) {
      if (userLeadIds.length === 0) {
        // skip — emailsSent stays 0
      } else {
        emailsQuery = emailsQuery.in("lead_id", userLeadIds);
      }
    }
    const { count: emailsSentInPeriod, error: emailError } =
      userLeadIds && userLeadIds.length === 0
        ? { count: 0, error: null }
        : await emailsQuery;
    if (emailError) throw ApiError.internal(emailError.message);

    let meetingsQuery = supabaseAdmin
      .from("meetings")
      .select("id, lead:leads!inner(organization_id, deleted_at)", { count: "exact", head: true })
      .gte("scheduled_at", from.toISOString())
      .lte("scheduled_at", to.toISOString())
      .eq("lead.organization_id", organizationId)
      .is("lead.deleted_at", null);
    if (userLeadIds) {
      if (userLeadIds.length === 0) {
        // skip
      } else {
        meetingsQuery = meetingsQuery.in("lead_id", userLeadIds);
      }
    }
    const { count: meetingsInPeriod, error: meetingError } =
      userLeadIds && userLeadIds.length === 0
        ? { count: 0, error: null }
        : await meetingsQuery;
    if (meetingError) throw ApiError.internal(meetingError.message);

    const closedCount = wonLeads + lostLeads;
    const overallConversionPct = closedCount > 0 ? Math.round((wonLeads / closedCount) * 1000) / 10 : 0;

    return {
      totalLeads,
      qualifiedLeads,
      leadsCreatedInPeriod,
      pendingApprovals: pendingApprovals ?? 0,
      emailsSentInPeriod: emailsSentInPeriod ?? 0,
      meetingsInPeriod: meetingsInPeriod ?? 0,
      dealsWon: wonLeads,
      dealsWonInPeriod,
      overallConversionPct,
    };
  },

  async pipelineFunnel(ctx: AnalyticsContext): Promise<Record<string, number>> {
    const { organizationId, scope } = ctx;
    const breakdown: Record<string, number> = {};
    for (const status of PIPELINE_ORDER) breakdown[status] = 0;

    const userLeadIds = scope.userId ? await resolveUserLeadIds(organizationId, scope.userId) : undefined;
    if (userLeadIds?.length === 0) return breakdown;

    let query = supabaseAdmin
      .from("leads")
      .select("pipeline_status")
      .eq("organization_id", organizationId)
      .is("deleted_at", null);
    if (userLeadIds) query = query.in("id", userLeadIds);
    const { data, error } = await query;
    if (error) throw ApiError.internal(error.message);
    for (const row of data ?? []) {
      const status = row.pipeline_status as string;
      breakdown[status] = (breakdown[status] ?? 0) + 1;
    }
    return breakdown;
  },

  async industryBreakdown(ctx: AnalyticsContext): Promise<Record<string, number>> {
    const { organizationId, scope } = ctx;
    const userLeadIds = scope.userId ? await resolveUserLeadIds(organizationId, scope.userId) : undefined;
    if (userLeadIds?.length === 0) return {};

    let query = supabaseAdmin
      .from("leads")
      .select("company:companies(industry)")
      .eq("organization_id", organizationId)
      .is("deleted_at", null);
    if (userLeadIds) query = query.in("id", userLeadIds);
    const { data, error } = await query;
    if (error) throw ApiError.internal(error.message);
    const breakdown: Record<string, number> = {};
    for (const row of data ?? []) {
      const industry = (row.company as unknown as { industry: string | null } | null)?.industry ?? "Unclassified";
      breakdown[industry] = (breakdown[industry] ?? 0) + 1;
    }
    return breakdown;
  },

  async stateBreakdown(ctx: AnalyticsContext): Promise<Record<string, number>> {
    const { organizationId, scope } = ctx;
    const userLeadIds = scope.userId ? await resolveUserLeadIds(organizationId, scope.userId) : undefined;
    if (userLeadIds?.length === 0) return {};

    let query = supabaseAdmin
      .from("leads")
      .select("company:companies(metadata)")
      .eq("organization_id", organizationId)
      .is("deleted_at", null);
    if (userLeadIds) query = query.in("id", userLeadIds);
    const { data, error } = await query;
    if (error) throw ApiError.internal(error.message);
    const breakdown: Record<string, number> = {};
    for (const row of data ?? []) {
      const metadata = (row.company as unknown as { metadata?: { state?: string; city?: string } } | null)?.metadata;
      const state = resolveCompanyState(metadata);
      breakdown[state] = (breakdown[state] ?? 0) + 1;
    }
    return breakdown;
  },

  async cityBreakdown(ctx: AnalyticsContext): Promise<CityLeadBreakdown[]> {
    const { organizationId, scope } = ctx;
    const userLeadIds = scope.userId ? await resolveUserLeadIds(organizationId, scope.userId) : undefined;
    if (userLeadIds?.length === 0) return [];

    let query = supabaseAdmin
      .from("leads")
      .select("company:companies(metadata)")
      .eq("organization_id", organizationId)
      .is("deleted_at", null);
    if (userLeadIds) query = query.in("id", userLeadIds);
    const { data, error } = await query;
    if (error) throw ApiError.internal(error.message);

    const byCity = new Map<string, CityLeadBreakdown>();
    for (const row of data ?? []) {
      const metadata = (row.company as unknown as { metadata?: { state?: string; city?: string } } | null)?.metadata;
      const city = resolveCompanyCity(metadata);
      const state = resolveCompanyState(metadata);
      const key = city.toLowerCase();
      const existing = byCity.get(key);
      if (existing) existing.count += 1;
      else byCity.set(key, { city, state, count: 1 });
    }
    return Array.from(byCity.values()).sort((a, b) => b.count - a.count);
  },

  async conversionByStage(ctx: AnalyticsContext): Promise<Array<{ stage: string; count: number }>> {
    const funnel = await this.pipelineFunnel(ctx);
    return Object.entries(funnel).map(([stage, count]) => ({ stage, count }));
  },

  async funnelConversion(ctx: AnalyticsContext): Promise<FunnelConversionStep[]> {
    const funnel = await this.pipelineFunnel(ctx);
    const steps: FunnelConversionStep[] = [];

    for (let i = 0; i < PIPELINE_ORDER.length - 1; i++) {
      const fromStage = PIPELINE_ORDER[i]!;
      const toStage = PIPELINE_ORDER[i + 1]!;
      const entered = PIPELINE_ORDER.slice(i).reduce((sum, s) => sum + (funnel[s] ?? 0), 0);
      const progressed = PIPELINE_ORDER.slice(i + 1).reduce((sum, s) => sum + (funnel[s] ?? 0), 0);
      const conversionPct = entered > 0 ? Math.round((progressed / entered) * 1000) / 10 : 0;
      steps.push({
        fromStage,
        toStage,
        entered,
        progressed,
        conversionPct,
        dropOff: entered - progressed,
      });
    }
    return steps;
  },

  async trends(ctx: AnalyticsContext): Promise<TrendPoint[]> {
    const { organizationId, scope } = ctx;
    const { from, to, userId } = scope;
    const weeks = enumerateWeeks(from, to);
    const buckets = new Map<string, TrendPoint>(
      weeks.map((week) => [week, { week, leadsCreated: 0, emailsSent: 0, dealsWon: 0, meetingsHeld: 0 }]),
    );
    const userLeadIds = userId ? await resolveUserLeadIds(organizationId, userId) : undefined;

    if (!userLeadIds || userLeadIds.length > 0) {
      let leadsQuery = supabaseAdmin
        .from("leads")
        .select("created_at, pipeline_status, updated_at")
        .eq("organization_id", organizationId)
        .is("deleted_at", null)
        .gte("created_at", from.toISOString())
        .lte("created_at", to.toISOString());
      if (userLeadIds) leadsQuery = leadsQuery.in("id", userLeadIds);
      const { data: leads, error: leadsError } = await leadsQuery;
      if (leadsError) throw ApiError.internal(leadsError.message);

      for (const row of leads ?? []) {
        const key = weekStartKey(new Date(row.created_at as string));
        const bucket = buckets.get(key);
        if (bucket) bucket.leadsCreated += 1;
        if (row.pipeline_status === "won") {
          const wonKey = weekStartKey(new Date(row.updated_at as string));
          const wonBucket = buckets.get(wonKey);
          if (wonBucket) wonBucket.dealsWon += 1;
        }
      }

      let emailsQuery = supabaseAdmin
        .from("emails")
        .select("sent_at, lead:leads!inner(organization_id, deleted_at)")
        .eq("status", "sent")
        .gte("sent_at", from.toISOString())
        .lte("sent_at", to.toISOString())
        .eq("lead.organization_id", organizationId)
        .is("lead.deleted_at", null);
      if (userLeadIds) emailsQuery = emailsQuery.in("lead_id", userLeadIds);
      const { data: emails, error: emailsError } = await emailsQuery;
      if (emailsError) throw ApiError.internal(emailsError.message);

      for (const row of emails ?? []) {
        const sentAt = row.sent_at as string | null;
        if (!sentAt) continue;
        const key = weekStartKey(new Date(sentAt));
        const bucket = buckets.get(key);
        if (bucket) bucket.emailsSent += 1;
      }

      let meetingsQuery = supabaseAdmin
        .from("meetings")
        .select("scheduled_at, lead:leads!inner(organization_id, deleted_at)")
        .gte("scheduled_at", from.toISOString())
        .lte("scheduled_at", to.toISOString())
        .eq("lead.organization_id", organizationId)
        .is("lead.deleted_at", null);
      if (userLeadIds) meetingsQuery = meetingsQuery.in("lead_id", userLeadIds);
      const { data: meetings, error: meetingsError } = await meetingsQuery;
      if (meetingsError) throw ApiError.internal(meetingsError.message);

      for (const row of meetings ?? []) {
        const key = weekStartKey(new Date(row.scheduled_at as string));
        const bucket = buckets.get(key);
        if (bucket) bucket.meetingsHeld += 1;
      }
    }

    return Array.from(buckets.values()).sort((a, b) => a.week.localeCompare(b.week));
  },

  async actionQueue(ctx: AnalyticsContext, limit = 10): Promise<ActionQueueItem[]> {
    const { organizationId, scope } = ctx;
    const { userId } = scope;
    const items: ActionQueueItem[] = [];
    const userLeadIds = userId ? await resolveUserLeadIds(organizationId, userId) : undefined;

    let approvalQuery = supabaseAdmin
      .from("approval_queue")
      .select("id, lead:leads!inner(organization_id, deleted_at)", { count: "exact", head: true })
      .eq("status", "pending")
      .eq("lead.organization_id", organizationId)
      .is("lead.deleted_at", null);
    if (userId) approvalQuery = approvalQuery.eq("submitted_by", userId);
    const { count: pendingApproval } = await approvalQuery;
    if ((pendingApproval ?? 0) > 0) {
      items.push({
        type: "pending_approval",
        label: "Emails pending approval",
        count: pendingApproval ?? 0,
        href: "/approval",
        priority: 1,
      });
    }

    const draftReady = await countLeads(organizationId, { pipeline_status: "draft_ready" }, userId, userLeadIds);
    if (draftReady > 0) {
      let draftHref = "/pipeline?status=draft_ready";
      if (draftReady === 1) {
        let draftQuery = supabaseAdmin
          .from("leads")
          .select("id")
          .eq("organization_id", organizationId)
          .eq("pipeline_status", "draft_ready")
          .is("deleted_at", null)
          .limit(1);
        if (userLeadIds) draftQuery = draftQuery.in("id", userLeadIds);
        const { data: draftLead, error: draftLeadError } =
          userLeadIds?.length === 0 ? { data: null, error: null } : await draftQuery.maybeSingle();
        if (draftLeadError) throw ApiError.internal(draftLeadError.message);
        if (draftLead?.id) draftHref = `/pipeline/${draftLead.id as string}?tab=outreach`;
      }
      items.push({
        type: "draft_ready",
        label: "Drafts ready to submit",
        count: draftReady,
        href: draftHref,
        priority: 2,
      });
    }

    let qualifiedQuery = supabaseAdmin
      .from("leads")
      .select("id, company_id")
      .eq("organization_id", organizationId)
      .eq("pipeline_status", "qualified")
      .is("deleted_at", null);
    if (userLeadIds) qualifiedQuery = qualifiedQuery.in("id", userLeadIds);
    const { data: qualifiedLeads, error: qualifiedError } =
      userLeadIds?.length === 0 ? { data: [], error: null } : await qualifiedQuery;
    if (qualifiedError) throw ApiError.internal(qualifiedError.message);

    const companyIds = Array.from(new Set((qualifiedLeads ?? []).map((l) => l.company_id as string)));
    let researchedCompanyIds = new Set<string>();
    if (companyIds.length > 0) {
      const { data: intel } = await supabaseAdmin.from("company_intelligence").select("company_id").in("company_id", companyIds);
      researchedCompanyIds = new Set((intel ?? []).map((r) => r.company_id as string));
    }
    const awaitingResearch = (qualifiedLeads ?? []).filter((l) => !researchedCompanyIds.has(l.company_id as string)).length;
    if (awaitingResearch > 0) {
      items.push({
        type: "awaiting_research",
        label: "Qualified leads need research",
        count: awaitingResearch,
        href: "/pipeline?status=qualified",
        priority: 3,
      });
    }

    const staleCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    let staleQuery = supabaseAdmin
      .from("leads")
      .select("id, created_at")
      .eq("organization_id", organizationId)
      .eq("pipeline_status", "imported")
      .is("deleted_at", null)
      .lt("created_at", staleCutoff);
    if (userLeadIds) staleQuery = staleQuery.in("id", userLeadIds);
    const { data: staleLeads, error: staleError } =
      userLeadIds?.length === 0 ? { data: [], error: null } : await staleQuery;
    if (staleError) throw ApiError.internal(staleError.message);

    const staleIds = (staleLeads ?? []).map((l) => l.id as string);
    let recentActivityLeadIds = new Set<string>();
    if (staleIds.length > 0) {
      const { data: acts } = await supabaseAdmin
        .from("activities")
        .select("lead_id")
        .in("lead_id", staleIds)
        .gte("created_at", staleCutoff);
      recentActivityLeadIds = new Set((acts ?? []).map((a) => a.lead_id as string));
    }
    const staleCount = staleIds.filter((id) => !recentActivityLeadIds.has(id)).length;
    if (staleCount > 0) {
      items.push({
        type: "stale_leads",
        label: "Imported leads with no activity (7d+)",
        count: staleCount,
        href: "/pipeline?status=imported",
        priority: 4,
      });
    }

    const upcomingEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    let meetingsQuery = supabaseAdmin
      .from("meetings")
      .select("id, lead:leads!inner(organization_id, deleted_at)", { count: "exact", head: true })
      .gte("scheduled_at", new Date().toISOString())
      .lte("scheduled_at", upcomingEnd)
      .eq("lead.organization_id", organizationId)
      .is("lead.deleted_at", null);
    if (userLeadIds) {
      if (userLeadIds.length === 0) {
        // upcomingMeetings stays 0
      } else {
        meetingsQuery = meetingsQuery.in("lead_id", userLeadIds);
      }
    }
    const { count: upcomingMeetings } =
      userLeadIds?.length === 0 ? { count: 0 } : await meetingsQuery;
    if ((upcomingMeetings ?? 0) > 0) {
      items.push({
        type: "upcoming_meetings",
        label: "Meetings in the next 7 days",
        count: upcomingMeetings ?? 0,
        href: "/pipeline?status=meeting",
        priority: 5,
      });
    }

    const sentPlus = ["sent", "interested", "meeting", "proposal", "won"];
    let nurturingQuery = supabaseAdmin
      .from("leads")
      .select("id")
      .eq("organization_id", organizationId)
      .in("pipeline_status", sentPlus)
      .is("deleted_at", null);
    if (userLeadIds) nurturingQuery = nurturingQuery.in("id", userLeadIds);
    const { data: nurturingLeads, error: nurturingError } =
      userLeadIds?.length === 0 ? { data: [], error: null } : await nurturingQuery;
    if (nurturingError) throw ApiError.internal(nurturingError.message);

    const nurturingIds = (nurturingLeads ?? []).map((l) => l.id as string);
    let nurturingGaps = 0;
    if (nurturingIds.length > 0) {
      const [{ data: sentEmails }, { data: acks }] = await Promise.all([
        supabaseAdmin.from("emails").select("lead_id").in("lead_id", nurturingIds).eq("status", "sent"),
        supabaseAdmin.from("outreach_acknowledgements").select("lead_id").in("lead_id", nurturingIds).eq("acknowledged", true),
      ]);
      const emailedLeads = new Set((sentEmails ?? []).map((e) => e.lead_id as string));
      const ackedLeads = new Set((acks ?? []).map((a) => a.lead_id as string));
      nurturingGaps = Array.from(emailedLeads).filter((id) => !ackedLeads.has(id)).length;
    }
    if (nurturingGaps > 0) {
      items.push({
        type: "nurturing_gaps",
        label: "Outreach sent but not acknowledged",
        count: nurturingGaps,
        href: "/sales-activity",
        priority: 6,
      });
    }

    return items.sort((a, b) => a.priority - b.priority).slice(0, limit);
  },

  async repPerformance(ctx: AnalyticsContext): Promise<RepPerformanceRow[]> {
    const { organizationId, scope } = ctx;
    const { from, to } = scope;

    const { data: users, error: usersError } = await supabaseAdmin
      .from("users")
      .select("id, full_name")
      .eq("organization_id", organizationId)
      .eq("is_active", true);
    if (usersError) throw ApiError.internal(usersError.message);

    const rows: RepPerformanceRow[] = [];
    for (const user of users ?? []) {
      const uid = user.id as string;
      const [totalLeads, won, lost, emailsSent, pendingApprovals] = await Promise.all([
        countLeads(organizationId, {}, uid),
        countLeads(organizationId, { pipeline_status: "won" }, uid),
        countLeads(organizationId, { pipeline_status: "lost" }, uid),
        (async () => {
          const repLeadIds = await resolveUserLeadIds(organizationId, uid);
          if (repLeadIds.length === 0) return 0;
          const { count } = await supabaseAdmin
            .from("emails")
            .select("id", { count: "exact", head: true })
            .eq("status", "sent")
            .gte("sent_at", from.toISOString())
            .lte("sent_at", to.toISOString())
            .in("lead_id", repLeadIds);
          return count ?? 0;
        })(),
        (async () => {
          const { count } = await supabaseAdmin
            .from("approval_queue")
            .select("id", { count: "exact", head: true })
            .eq("status", "pending")
            .eq("submitted_by", uid);
          return count ?? 0;
        })(),
      ]);
      const closed = won + lost;
      rows.push({
        userId: uid,
        userName: (user.full_name as string) || "Unknown",
        totalLeads,
        won,
        lost,
        conversionPct: closed > 0 ? Math.round((won / closed) * 1000) / 10 : 0,
        emailsSent,
        pendingApprovals,
      });
    }

    return rows.filter((r) => r.totalLeads > 0 || r.emailsSent > 0).sort((a, b) => b.won - a.won || b.totalLeads - a.totalLeads);
  },

  async emailEngagement(ctx: AnalyticsContext): Promise<EmailEngagementStats> {
    const { organizationId, scope } = ctx;
    const { userId, from, to } = scope;
    const userLeadIds = userId ? await resolveUserLeadIds(organizationId, userId) : undefined;
    if (userLeadIds?.length === 0) {
      return { emailsSent: 0, repliesReceived: 0, replyRate: 0, sentiment: {} };
    }

    let emailsQuery = supabaseAdmin
      .from("emails")
      .select("id, lead:leads!inner(organization_id, deleted_at)")
      .eq("status", "sent")
      .gte("sent_at", from.toISOString())
      .lte("sent_at", to.toISOString())
      .eq("lead.organization_id", organizationId)
      .is("lead.deleted_at", null);
    if (userLeadIds) emailsQuery = emailsQuery.in("lead_id", userLeadIds);
    const { data: sentEmails, error: sentError } = await emailsQuery;
    if (sentError) throw ApiError.internal(sentError.message);

    const emailIds = (sentEmails ?? []).map((e) => e.id as string);
    const emailsSent = emailIds.length;
    if (emailsSent === 0) {
      return { emailsSent: 0, repliesReceived: 0, replyRate: 0, sentiment: {} };
    }

    const { data: replies, error: repliesError } = await supabaseAdmin
      .from("email_replies")
      .select("sentiment, email_id")
      .in("email_id", emailIds);
    if (repliesError) throw ApiError.internal(repliesError.message);

    const sentiment: Record<string, number> = {};
    for (const reply of replies ?? []) {
      const key = (reply.sentiment as string) ?? "unknown";
      sentiment[key] = (sentiment[key] ?? 0) + 1;
    }

    const repliesReceived = replies?.length ?? 0;
    const replyRate = Math.round((repliesReceived / emailsSent) * 1000) / 10;

    return { emailsSent, repliesReceived, replyRate, sentiment };
  },

  async discoveryFunnel(ctx: AnalyticsContext): Promise<DiscoveryFunnelStats> {
    const { organizationId, scope } = ctx;
    const { from, to } = scope;

    let query = supabaseAdmin
      .from("discovered_leads")
      .select("status")
      .eq("organization_id", organizationId)
      .gte("created_at", from.toISOString())
      .lte("created_at", to.toISOString());
    if (scope.userId) query = query.eq("discovered_by", scope.userId);
    const { data, error } = await query;
    if (error) throw ApiError.internal(error.message);

    const stats = { pending: 0, promoted: 0, duplicate: 0, failed: 0 };
    for (const row of data ?? []) {
      const status = row.status as keyof typeof stats;
      if (status in stats) stats[status] += 1;
    }
    const total = stats.pending + stats.promoted + stats.duplicate + stats.failed;
    const promotionRate = total > 0 ? Math.round((stats.promoted / total) * 1000) / 10 : 0;
    return { ...stats, total, promotionRate };
  },

  async leadQuality(ctx: AnalyticsContext): Promise<LeadQualityStats> {
    const { organizationId, scope } = ctx;
    const userLeadIds = scope.userId ? await resolveUserLeadIds(organizationId, scope.userId) : undefined;
    if (userLeadIds?.length === 0) {
      return {
        icpBuckets: { "0-40": 0, "41-70": 0, "71-100": 0, Unscored: 0 },
        priorityMix: {},
        sourceMix: {},
      };
    }

    let query = supabaseAdmin
      .from("leads")
      .select("icp_score, priority, source")
      .eq("organization_id", organizationId)
      .is("deleted_at", null);
    if (userLeadIds) query = query.in("id", userLeadIds);
    const { data, error } = await query;
    if (error) throw ApiError.internal(error.message);

    const icpBuckets: Record<string, number> = { "0-40": 0, "41-70": 0, "71-100": 0, Unscored: 0 };
    const priorityMix: Record<string, number> = {};
    const sourceMix: Record<string, number> = {};

    for (const row of data ?? []) {
      const score = row.icp_score as number | null;
      if (score == null) icpBuckets.Unscored = (icpBuckets.Unscored ?? 0) + 1;
      else if (score <= 40) icpBuckets["0-40"] = (icpBuckets["0-40"] ?? 0) + 1;
      else if (score <= 70) icpBuckets["41-70"] = (icpBuckets["41-70"] ?? 0) + 1;
      else icpBuckets["71-100"] = (icpBuckets["71-100"] ?? 0) + 1;

      const priority = (row.priority as string) ?? "unknown";
      priorityMix[priority] = (priorityMix[priority] ?? 0) + 1;

      const source = (row.source as string) ?? "unknown";
      sourceMix[source] = (sourceMix[source] ?? 0) + 1;
    }

    return { icpBuckets, priorityMix, sourceMix };
  },
};
