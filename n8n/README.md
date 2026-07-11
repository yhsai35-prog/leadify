# n8n Workflows

Four workflows automate everything that happens *after* a human has approved outreach, or that ingests external signals back into the platform. None of them contain business logic beyond orchestration -- every decision (approval, scoring, state transitions) is made by the API, and n8n only calls it.

| Workflow | Trigger | Purpose |
|---|---|---|
| `email-send-gmail.json` | Webhook (`POST /webhook/trigger-email-send`) called by `ApprovalService.dispatchToN8n` | Sends an already-approved email via the BDE's connected Gmail account, then confirms delivery back to the API. |
| `gmail-reply-tracker.json` | Schedule (every 5 minutes) | Polls connected mailboxes for replies on platform-initiated threads and forwards them to the API for Claude-based sentiment classification. |
| `scheduled-campaign-dispatch.json` | Schedule (every 1 minute) | Asks the API to dispatch any approved emails whose `scheduled_at` is now due, and drives the async AI job queue in production. |
| `activity-webhook-ingest.json` | Webhook (`POST /webhook/activity-ingest`) | Generic ingress for third-party signals (e.g. calendar booking tools) that should append to a lead's timeline. |

## Setup

1. Import each JSON file into your n8n instance (self-hosted on Railway or n8n Cloud).
2. Create one Gmail OAuth2 credential per BDE mailbox in n8n's Credential Vault; map `fromMailboxUserId` (the Supabase `users.id`) to the corresponding credential in the "Gmail: Send Message" node.
3. Set the following n8n environment variables:
   - `N8N_WEBHOOK_SECRET` -- shared HMAC secret, must match `N8N_WEBHOOK_SECRET` in the API's environment.
   - `BLUWHEELZ_API_BASE_URL` -- e.g. `https://api.bluwheelz-sales.up.railway.app`.
   - `BLUWHEELZ_INTERNAL_SERVICE_KEY` -- must match `INTERNAL_SERVICE_KEY` in the API's environment.
4. Activate all four workflows.

## Why n8n never decides anything

The single hard requirement of this platform is that no email is ever sent without human approval. To keep that guarantee auditable in one place, n8n workflows are intentionally "dumb pipes": they call the API, the API enforces every invariant (see `apps/api/src/services/approval/approvalService.ts` and the `chk_emails_sent_requires_approval` database constraint), and n8n just executes the mechanical steps (calling Gmail, waiting on a timer, forwarding a webhook).
