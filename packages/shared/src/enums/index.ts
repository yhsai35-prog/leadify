/**
 * Canonical enums shared between the API and the web client.
 * These MUST stay in sync with the Postgres enum types defined in
 * packages/db/migrations/001_initial_schema.sql.
 */

/**
 * Three-tier role model: super_admin > admin > user.
 * `user` is the merged operational role (formerly sales_manager/bde/viewer --
 * all of which had identical day-to-day screens and now share one rank).
 */
export const UserRole = {
  SUPER_ADMIN: "super_admin",
  ADMIN: "admin",
  USER: "user",
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

/** Roles ranked from least to most privileged, used for `requireRole` threshold checks. */
export const ROLE_RANK: Record<UserRole, number> = {
  [UserRole.USER]: 0,
  [UserRole.ADMIN]: 1,
  [UserRole.SUPER_ADMIN]: 2,
};

export const LeadSource = {
  APOLLO: "apollo",
  IMPORT: "import",
  MANUAL: "manual",
} as const;
export type LeadSource = (typeof LeadSource)[keyof typeof LeadSource];

/**
 * Pipeline state machine. Order matters: it defines the canonical funnel
 * sequence rendered in the Kanban board and analytics funnel chart.
 */
export const PipelineStatus = {
  IMPORTED: "imported",
  QUALIFIED: "qualified",
  RESEARCH_COMPLETE: "research_complete",
  DRAFT_READY: "draft_ready",
  PENDING_APPROVAL: "pending_approval",
  APPROVED: "approved",
  SENT: "sent",
  INTERESTED: "interested",
  MEETING: "meeting",
  PROPOSAL: "proposal",
  WON: "won",
  LOST: "lost",
} as const;
export type PipelineStatus = (typeof PipelineStatus)[keyof typeof PipelineStatus];

export const PIPELINE_ORDER: PipelineStatus[] = [
  PipelineStatus.IMPORTED,
  PipelineStatus.QUALIFIED,
  PipelineStatus.RESEARCH_COMPLETE,
  PipelineStatus.DRAFT_READY,
  PipelineStatus.PENDING_APPROVAL,
  PipelineStatus.APPROVED,
  PipelineStatus.SENT,
  PipelineStatus.INTERESTED,
  PipelineStatus.MEETING,
  PipelineStatus.PROPOSAL,
  PipelineStatus.WON,
  PipelineStatus.LOST,
];

/**
 * Allowed forward transitions for the pipeline state machine. `lost` is
 * reachable from most active stages (a deal can die at any point), so it is
 * appended to every non-terminal stage below rather than repeated per-row.
 */
const NON_TERMINAL: PipelineStatus[] = PIPELINE_ORDER.filter(
  (s) => s !== PipelineStatus.WON && s !== PipelineStatus.LOST,
);

export const PIPELINE_TRANSITIONS: Record<PipelineStatus, PipelineStatus[]> = {
  [PipelineStatus.IMPORTED]: [PipelineStatus.QUALIFIED, PipelineStatus.LOST],
  [PipelineStatus.QUALIFIED]: [PipelineStatus.RESEARCH_COMPLETE, PipelineStatus.LOST],
  [PipelineStatus.RESEARCH_COMPLETE]: [PipelineStatus.DRAFT_READY, PipelineStatus.LOST],
  [PipelineStatus.DRAFT_READY]: [PipelineStatus.PENDING_APPROVAL, PipelineStatus.LOST],
  [PipelineStatus.PENDING_APPROVAL]: [
    PipelineStatus.APPROVED,
    PipelineStatus.DRAFT_READY, // rejected -> back to draft
    PipelineStatus.LOST,
  ],
  // approved -> sent is exclusively driven by the n8n send webhook, never by direct user PATCH.
  [PipelineStatus.APPROVED]: [PipelineStatus.SENT, PipelineStatus.LOST],
  [PipelineStatus.SENT]: [PipelineStatus.INTERESTED, PipelineStatus.LOST],
  [PipelineStatus.INTERESTED]: [PipelineStatus.MEETING, PipelineStatus.LOST],
  [PipelineStatus.MEETING]: [PipelineStatus.PROPOSAL, PipelineStatus.LOST],
  [PipelineStatus.PROPOSAL]: [PipelineStatus.WON, PipelineStatus.LOST],
  [PipelineStatus.WON]: [],
  [PipelineStatus.LOST]: [],
};
void NON_TERMINAL;

export const Priority = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  CRITICAL: "critical",
} as const;
export type Priority = (typeof Priority)[keyof typeof Priority];

export const EmailType = {
  INITIAL: "initial",
  FOLLOW_UP: "follow_up",
} as const;
export type EmailType = (typeof EmailType)[keyof typeof EmailType];

/**
 * Email lifecycle. The `sent` state is a hard invariant: the API layer
 * (see ApprovalService) refuses to reach it unless approved_by is set and
 * the transition was triggered exclusively via the n8n send webhook.
 */
export const EmailStatus = {
  DRAFT: "draft",
  PENDING_APPROVAL: "pending_approval",
  APPROVED: "approved",
  REJECTED: "rejected",
  SCHEDULED: "scheduled",
  SENT: "sent",
  FAILED: "failed",
  SUPERSEDED: "superseded",
} as const;
export type EmailStatus = (typeof EmailStatus)[keyof typeof EmailStatus];

export const GeneratedBy = {
  AI: "ai",
  HUMAN: "human",
} as const;
export type GeneratedBy = (typeof GeneratedBy)[keyof typeof GeneratedBy];

export const ApprovalStatus = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  EDITED: "edited",
} as const;
export type ApprovalStatus = (typeof ApprovalStatus)[keyof typeof ApprovalStatus];

export const CampaignStatus = {
  DRAFT: "draft",
  ACTIVE: "active",
  PAUSED: "paused",
  COMPLETED: "completed",
} as const;
export type CampaignStatus = (typeof CampaignStatus)[keyof typeof CampaignStatus];

export const ActivityType = {
  IMPORTED: "imported",
  QUALIFIED: "qualified",
  RESEARCHED: "researched",
  DRAFT_CREATED: "draft_created",
  SUBMITTED: "submitted",
  APPROVED: "approved",
  REJECTED: "rejected",
  SENT: "sent",
  SEND_FAILED: "send_failed",
  REPLY_RECEIVED: "reply_received",
  STATUS_CHANGED: "status_changed",
  MEETING_SCHEDULED: "meeting_scheduled",
  NOTE: "note",
  EMAIL_ACKNOWLEDGED: "email_acknowledged",
  LINKEDIN_ACKNOWLEDGED: "linkedin_acknowledged",
} as const;
export type ActivityType = (typeof ActivityType)[keyof typeof ActivityType];

export const MeetingOutcome = {
  SCHEDULED: "scheduled",
  COMPLETED: "completed",
  NO_SHOW: "no_show",
  CANCELLED: "cancelled",
} as const;
export type MeetingOutcome = (typeof MeetingOutcome)[keyof typeof MeetingOutcome];

export const JobType = {
  QUALIFY: "qualify",
  RESEARCH: "research",
  GENERATE_EMAIL: "generate_email",
  SIMILARITY: "similarity",
  CLASSIFY_REPLY: "classify_reply",
} as const;
export type JobType = (typeof JobType)[keyof typeof JobType];

export const JobStatus = {
  PENDING: "pending",
  PROCESSING: "processing",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;
export type JobStatus = (typeof JobStatus)[keyof typeof JobStatus];

export const ExistingClientVertical = {
  LOGISTICS: "logistics",
  QUICK_COMMERCE: "quick_commerce",
  RETAIL: "retail",
  EV: "ev",
  MANUFACTURING: "manufacturing",
  FURNITURE: "furniture",
} as const;
export type ExistingClientVertical =
  (typeof ExistingClientVertical)[keyof typeof ExistingClientVertical];

export const ReplySentiment = {
  POSITIVE: "positive",
  NEUTRAL: "neutral",
  NEGATIVE: "negative",
} as const;
export type ReplySentiment = (typeof ReplySentiment)[keyof typeof ReplySentiment];

export const DiscoveredLeadStatus = {
  PENDING: "pending",
  PROMOTED: "promoted",
  DUPLICATE: "duplicate",
  FAILED: "failed",
} as const;
export type DiscoveredLeadStatus = (typeof DiscoveredLeadStatus)[keyof typeof DiscoveredLeadStatus];
