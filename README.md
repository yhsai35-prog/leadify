# Bluwheelz AI Sales Intelligence Platform

An AI Sales Operating System for Bluwheelz's business development team — not a CRM, not a lead dashboard, not an email sender. It discovers companies, scores them against Bluwheelz's Ideal Customer Profile, researches them, drafts outreach, and routes every draft through mandatory human approval before anything is sent. No email is ever sent automatically.

## Repository Structure

```
apps/
  web/            React + TypeScript + Tailwind + Vite frontend
  api/            Node + Express + TypeScript backend
packages/
  shared/         Shared enums, zod schemas, and domain types
  db/             Supabase Postgres migrations and seed data
n8n/
  workflows/      n8n workflow definitions (Gmail send, reply tracking, scheduling)
docs/
  architecture.md Operational reference for background jobs, prompts, and risks
```

## Prerequisites

- Node.js 20+
- A Supabase project (Postgres 15+, with the `pgvector` extension enabled)
- An Anthropic API key (Claude)
- A Voyage AI or OpenAI API key (embeddings)
- An Apollo.io API key
- An n8n instance (self-hosted on Railway, or n8n Cloud)

## Setup

1. Install dependencies from the repo root:

   ```bash
   npm install
   ```

2. Apply the database schema. From the Supabase SQL editor (or the Supabase CLI), run the migrations in order:

   ```
   packages/db/migrations/001_initial_schema.sql
   packages/db/migrations/002_seed_organization.sql
   packages/db/migrations/003_similarity_function.sql
   packages/db/seeds/existing_clients.sql
   packages/db/migrations/004_contacts_email_unique_fix.sql
   packages/db/migrations/005_admin_self_approval.sql
   packages/db/migrations/006_discovered_leads.sql
   packages/db/migrations/007_role_restructure.sql
   packages/db/migrations/008_role_data_migration.sql
   ```

   `007` and `008` **must** be run as two separate statements/round trips (not pasted and run together) -- Postgres does not allow a newly added enum value (`super_admin`, `user`) to be referenced by an `UPDATE` in the same transaction that created it.

3. Backfill embeddings for the 22 seeded existing clients (requires `apps/api/.env` to be configured first, see below):

   ```bash
   npm run seed:embeddings --workspace=apps/api
   ```

4. Configure environment variables:

   ```bash
   cp apps/api/.env.example apps/api/.env
   cp apps/web/.env.example apps/web/.env
   ```

   Fill in the Supabase, Anthropic, Voyage/OpenAI, Apollo, and n8n credentials.

5. Import the n8n workflows in `n8n/workflows/` into your n8n instance and configure them per `n8n/README.md`.

6. Start the API and web app in separate terminals:

   ```bash
   npm run dev:api
   npm run dev:web
   ```

   The API runs on `http://localhost:4000`, the web app on `http://localhost:5173`.

## Roles

Three tiers, each inheriting everything below it: **`user`** (day-to-day operational screens: discovery, pipeline, approvals, campaigns, copilot), **`admin`** (adds the Consolidated Dashboard per-user drill-down and the Sales Activity screen, plus approving outreach), and **`super_admin`** (adds Platform Settings, User Management, and AI Credit Usage).

## Creating the First Super Admin

Since sign-up is invite-only, create the first user directly:

1. In the Supabase Dashboard, go to Authentication → Users → Add User, and create a user with an email/password.
2. Insert a matching row into `public.users` with that user's `id`, the default organization ID (`00000000-0000-0000-0000-000000000001`), and `role = 'super_admin'`.

From there, the super admin can invite the rest of the team via **Settings → Users → Invite user** in the app, which uses `POST /v1/users/invite` and assigns them `user`, `admin`, or `super_admin`.

## Scripts

| Command | Description |
|---|---|
| `npm run dev:api` / `npm run dev:web` | Start the API / web app in watch mode |
| `npm run build` | Build shared package, API, and web app in dependency order |
| `npm run typecheck` | Typecheck all workspaces |
| `npm run test --workspace=apps/api` | Run the API test suite |

## Core Invariant

No email ever reaches `status = 'sent'` without `approved_by` set. This is enforced at three layers: a Postgres `CHECK` constraint (`chk_emails_sent_requires_approval`), `ApprovalService` being the only code path allowed to trigger a send, and `chk_approval_no_self_approval` plus `requireNotSelfApproval` enforcing separation of duties between the `user` who drafts outreach and the `admin`/`super_admin` who approves it.

See `docs/architecture.md` for deeper operational notes on background jobs, the AI prompt architecture, and known risks.
