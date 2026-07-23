import type {
  ActivityType,
  ApprovalStatus,
  CampaignChannel,
  CampaignStatus,
  DiscoveredLeadStatus,
  EmailStatus,
  EmailType,
  ExistingClientVertical,
  GeneratedBy,
  LeadSource,
  MeetingOutcome,
  PipelineStatus,
  Priority,
  UserRole,
} from "../enums/index.js";
import type { IndustryAnalysis, ScoreBreakdown } from "../schemas/qualification.js";
import type { NewsItem } from "../schemas/intelligence.js";
import type { PreferredEmailClient, SmtpSettings } from "../schemas/userSettings.js";
import type { CampaignFlowDefinition } from "../schemas/campaignFlow.js";

/**
 * Wire-format domain types returned by the REST API. These are the camelCase
 * projections of the snake_case Postgres rows (mapping happens in the
 * repository layer) and are the single contract the frontend depends on.
 */

export interface User {
  id: string;
  organizationId: string;
  email: string;
  fullName: string;
  role: UserRole;
  gmailConnected: boolean;
  isActive: boolean;
  preferredEmailClient: PreferredEmailClient;
  smtpSettings: SmtpSettings;
  createdAt: string;
}

export interface Company {
  id: string;
  organizationId: string;
  name: string;
  domain: string | null;
  apolloId: string | null;
  industry: string | null;
  employeeCount: number | null;
  revenueInrCr: number | null;
  citiesCount: number | null;
  fleetSizeEstimate: number | null;
  isExistingClient: boolean;
  metadata: Record<string, unknown>;
  embedding?: number[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface Contact {
  id: string;
  companyId: string;
  apolloId: string | null;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  linkedinUrl: string | null;
  title: string | null;
  isDecisionMaker: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface Lead {
  id: string;
  organizationId: string;
  companyId: string;
  contactId: string | null;
  campaignId: string | null;
  assignedTo: string | null;
  source: LeadSource;
  pipelineStatus: PipelineStatus;
  priority: Priority;
  icpScore: number | null;
  createdAt: string;
  updatedAt: string;
  company?: Company;
  contact?: Contact;
}

export interface LeadScore {
  id: string;
  leadId: string;
  version: number;
  icpScore: number;
  priority: Priority;
  reasoning: string;
  painPoints: string[];
  industryAnalysis: IndustryAnalysis;
  scoreBreakdown: ScoreBreakdown;
  modelVersion: string;
  promptHash: string;
  createdBy: GeneratedBy;
  createdAt: string;
}

export interface CompanyIntelligence {
  id: string;
  companyId: string;
  websiteSummary: string;
  businessModel: string;
  expansionSignals: string[];
  growthIndicators: string[];
  news: NewsItem[];
  fleetIndicators: string[];
  source: string[];
  researchedAt: string;
}

export interface ExistingClientProfile {
  id: string;
  companyId: string;
  vertical: ExistingClientVertical;
  profileSummary: string;
  operationalPatterns?: Record<string, unknown>;
}

export interface ExistingClientWithStats {
  companyId: string;
  companyName: string;
  vertical: ExistingClientVertical;
  profileSummary: string;
  prospectMatchCount: number;
}

export interface SimilarityCoverageStats {
  leadsWithSimilarity: number;
  totalLeads: number;
}

export interface SimilarityClientsResult {
  clients: ExistingClientWithStats[];
  coverage: SimilarityCoverageStats;
}

export interface SimilarProspectMatch {
  leadId: string;
  companyName: string;
  industry: string | null;
  pipelineStatus: string;
  priority: string;
  icpScore: number | null;
  similarityPct: number;
  reason: string;
}

export interface LeadSimilarityMatch {
  id: string;
  leadId: string;
  existingClientProfileId: string;
  existingClientName: string;
  similarityPct: number;
  reason: string;
  rankedAt: string;
}

export interface Email {
  id: string;
  leadId: string;
  contactId: string;
  campaignId: string | null;
  type: EmailType;
  subject: string;
  bodyHtml: string;
  bodyText: string;
  linkedinMessage: string | null;
  callScript: string | null;
  status: EmailStatus;
  generatedBy: GeneratedBy;
  modelVersion?: string | null;
  promptHash?: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  scheduledAt: string | null;
  sentAt: string | null;
  gmailMessageId?: string | null;
  gmailThreadId: string | null;
  createdBy?: string | null;
  createdAt: string;
  /** Present when nested via approval ready-to-send joins. */
  contact?: Contact;
}

export interface ApprovalQueueItem {
  id: string;
  emailId: string | null;
  whatsappMessageId: string | null;
  leadId: string;
  submittedBy: string;
  reviewerId: string | null;
  status: ApprovalStatus;
  reviewerNotes: string | null;
  decidedAt: string | null;
  createdAt: string;
  email?: Email;
  whatsappMessage?: WhatsappMessage;
  lead?: Lead;
}

export interface WhatsappMessage {
  id: string;
  leadId: string;
  contactId: string;
  campaignId: string | null;
  templateName: string;
  templateLanguage: string;
  templateComponents: unknown[];
  bodyPreview: string;
  status: EmailStatus;
  generatedBy: GeneratedBy;
  modelVersion?: string | null;
  promptHash?: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  scheduledAt: string | null;
  sentAt: string | null;
  waMessageId?: string | null;
  waConversationId?: string | null;
  errorPayload?: Record<string, unknown> | null;
  createdBy?: string | null;
  createdAt: string;
  contact?: Contact;
}

export interface WhatsappTemplate {
  id: string;
  organizationId: string;
  metaId: string | null;
  name: string;
  language: string;
  status: string;
  category: string | null;
  components: unknown[];
  syncedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface Campaign {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  status: CampaignStatus;
  channel: CampaignChannel;
  flowDefinition: CampaignFlowDefinition;
  scheduledAt: string | null;
  createdBy: string;
  leadCount?: number;
  emailStats?: CampaignEmailStats;
  createdAt: string;
}

export interface CampaignEmailStats {
  draft: number;
  pendingApproval: number;
  approved: number;
  scheduled: number;
  sent: number;
  failed: number;
}

export interface CampaignCompanyContact {
  contactId: string;
  name: string;
  email: string | null;
  phone: string | null;
  isPrimary: boolean;
  latestEmailStatus: string | null;
  latestWhatsappStatus: string | null;
}

export interface CampaignLeadSummary {
  leadId: string;
  companyName: string;
  pipelineStatus: PipelineStatus;
  latestEmailStatus: string | null;
  latestWhatsappStatus: string | null;
  contactId: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  companyContacts: CampaignCompanyContact[];
}

export interface CampaignDetail {
  campaign: Campaign;
  leads: CampaignLeadSummary[];
  pipelineBreakdown: Record<string, number>;
  emailStats: CampaignEmailStats;
  whatsappStats: CampaignEmailStats;
}

export interface CampaignBatchResult {
  generated?: number;
  skipped?: number;
  submitted?: number;
  scheduled?: number;
  failed: Array<{
    leadId?: string;
    emailId?: string;
    whatsappMessageId?: string;
    contactId?: string;
    name?: string;
    reason: string;
  }>;
}

export interface CampaignPerformanceRow {
  campaignId: string;
  campaignName: string;
  status: CampaignStatus;
  leadCount: number;
  emailsSent: number;
  pendingApproval: number;
  leadsAtSentPlus: number;
}

export interface Activity {
  id: string;
  leadId: string;
  userId: string | null;
  type: ActivityType;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface Meeting {
  id: string;
  leadId: string;
  scheduledAt: string;
  notes: string | null;
  outcome: MeetingOutcome;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  payload: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

export interface DashboardKpis {
  totalLeads: number;
  qualifiedLeads: number;
  leadsCreatedInPeriod: number;
  pendingApprovals: number;
  emailsSentInPeriod: number;
  meetingsInPeriod: number;
  dealsWon: number;
  dealsWonInPeriod: number;
  overallConversionPct: number;
}

export interface DashboardFilters {
  from?: string;
  to?: string;
  userId?: string;
}

export type ActionQueueType =
  | "pending_approval"
  | "draft_ready"
  | "awaiting_research"
  | "stale_leads"
  | "upcoming_meetings"
  | "nurturing_gaps";

export interface ActionQueueItem {
  type: ActionQueueType;
  label: string;
  count: number;
  href: string;
  priority: number;
}

export interface TrendPoint {
  week: string;
  leadsCreated: number;
  emailsSent: number;
  dealsWon: number;
  meetingsHeld: number;
}

export interface FunnelConversionStep {
  fromStage: string;
  toStage: string;
  entered: number;
  progressed: number;
  conversionPct: number;
  dropOff: number;
}

export interface RepPerformanceRow {
  userId: string;
  userName: string;
  totalLeads: number;
  won: number;
  lost: number;
  conversionPct: number;
  emailsSent: number;
  pendingApprovals: number;
}

export interface EmailEngagementStats {
  emailsSent: number;
  repliesReceived: number;
  replyRate: number;
  sentiment: Record<string, number>;
}

export interface DiscoveryFunnelStats {
  pending: number;
  promoted: number;
  duplicate: number;
  failed: number;
  total: number;
  promotionRate: number;
}

export interface LeadQualityStats {
  icpBuckets: Record<string, number>;
  priorityMix: Record<string, number>;
  sourceMix: Record<string, number>;
}

export interface DiscoveredLead {
  id: string;
  organizationId: string;
  searchBatchId: string;
  apolloId: string;
  companyName: string;
  domain: string | null;
  industry: string | null;
  employeeCount: number | null;
  city: string | null;
  searchState: string | null;
  searchIndustry: string | null;
  people: Array<{
    apolloId: string;
    firstName: string;
    lastName?: string | null;
    email?: string | null;
    phone?: string | null;
    title?: string | null;
    linkedinUrl?: string | null;
    organizationApolloId: string;
    hasEmail?: boolean;
  }>;
  status: DiscoveredLeadStatus;
  leadId: string | null;
  companyId: string | null;
  failureReason: string | null;
  discoveredBy: string;
  createdAt: string;
  promotedAt: string | null;
  /** Contact count when `people` is empty (pipeline leads without Apollo discovery metadata). */
  contactCount?: number;
}

export type OutreachChannel = "email" | "linkedin" | "whatsapp";

export interface OutreachAcknowledgement {
  id: string;
  leadId: string;
  contactId: string;
  channel: OutreachChannel;
  acknowledged: boolean;
  acknowledgedBy: string;
  acknowledgedAt: string;
}

export interface NurturingLead {
  leadId: string;
  companyId: string;
  companyName: string;
  industry: string | null;
  pipelineStatus: PipelineStatus;
  ownerId: string | null;
  ownerName: string | null;
  contactsCount: number;
  emailsSentCount: number;
  emailAcknowledged: boolean;
  linkedinAcknowledged: boolean;
  lastActivityAt: string | null;
}

export interface AiUsageSummaryRow {
  provider: "apollo" | "claude";
  action: string;
  count: number;
}

export interface AiUsageByUserRow {
  userId: string;
  userName: string;
  provider: "apollo" | "claude";
  count: number;
}
