# Bluwheelz AI Sales Intelligence Platform — Architecture Reference

This document is the living reference for implementation details that don't belong in code comments. The original planning document (product architecture, full database design, API catalog, roadmap) is the source of truth for scope; this file covers the operational details engineers need day-to-day.

## Background Jobs

Long-running AI calls (qualification, research, similarity, email generation) run through `job_queue` instead of blocking the HTTP request that triggered them for slow-but-optional work, and synchronously for user-initiated actions where the UI is expected to wait (see `apps/api/src/jobs/jobProcessor.ts`).

- **Local development**: `apps/api/src/index.ts` starts an in-process `setInterval` poller (`startJobProcessorLoop`) so no external scheduler is needed.
- **Production**: the in-process poller is disabled. Instead, n8n's `WF-3: Scheduled Send Dispatcher` workflow calls `POST /v1/internal/jobs/process` every minute, guarded by `INTERNAL_SERVICE_KEY`. This lets job processing scale independently of the web dyno and survives API restarts without losing queued work (jobs live in Postgres, not memory).

## AI Prompt Architecture — No PII in Logs

Every Claude call goes through `callClaudeStructured` (`apps/api/src/services/claude/client.ts`), which logs only a truncated SHA-256 hash of the prompt (`promptHash`), never the prompt or response body. `lead_scores` and `emails` persist `prompt_hash` and `model_version` for auditability without storing what was actually sent to a third-party model provider in application logs.

## Gmail Integration

Each BDE connects their own Gmail account via OAuth2, stored as an n8n credential (not in the Bluwheelz database). `users.gmail_connected` only tracks whether the connection exists; the token itself never touches the API or Postgres. `emails.gmail_thread_id` is the join key between a Bluwheelz email and the Gmail conversation it lives in, used by both the send confirmation webhook and the reply tracker.

## Reply Tracking Workflow

1. n8n's `WF-2: Gmail Reply Tracker` polls each mailbox every 5 minutes for new inbound messages on threads with more than one message (i.e., skip the original outbound send).
2. It forwards `{ gmailThreadId, fromEmail, bodySnippet, receivedAt }` to `POST /v1/webhooks/n8n/reply-received`.
3. `n8nWebhookService.handleReplyReceived` looks up the matching email by thread ID, classifies sentiment with Claude, and stores an `email_replies` row plus a `reply_received` activity.
4. Sentiment is a suggestion, not an automatic action — a human still decides whether to advance the lead's pipeline stage (e.g. to `interested`).

## Risks

- **Apollo/Claude/Voyage rate limits and cost**: mitigated with `apollo_search_cache` (6h TTL) and per-user AI rate limiting (`aiRateLimit` middleware, 10 req/min).
- **Approval bypass bugs**: mitigated in three layers — the `chk_emails_sent_requires_approval` Postgres constraint, `ApprovalService` being the only code path that calls `n8nService.triggerSend`, and the `chk_approval_no_self_approval` constraint plus `requireNotSelfApproval` for separation of duties.
- **Thin research signal**: `ResearchService` only scrapes a company's homepage; a dedicated news API is tracked as future scope rather than papering over the gap with fabricated content.
- **Single organization assumption leaking into code**: every tenant-scoped table carries `organization_id` from day one specifically to keep this migration-free when multi-tenancy ships.

## Future Scope

- Multi-tenant SaaS: tighten RLS policies to scope by `auth.jwt()` claims instead of the current service-role bypass.
- Dedicated news/signals API integration for `ResearchService`.
- LinkedIn Sales Navigator integration as a second lead-discovery source alongside Apollo.
- Multi-touch campaign sequencing (currently a campaign is a flat grouping of leads, not a drip sequence).
- Voice/call transcription ingestion feeding back into `activities` and lead scoring.
