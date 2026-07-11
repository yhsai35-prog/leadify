-- ============================================================================
-- Migration 013: Multi-tenancy foundations
--
--   * Tenant branding: per-organization logo + free-text company profile that
--     parametrizes the AI prompts (replaces the hardcoded Bluwheelz identity).
--   * Tenant lifecycle: organizations.is_active lets the platform super admin
--     disable an entire tenant (login blocked for all its members).
--   * demo_requests: public "Book a Demo" submissions from the landing page.
--   * follow_up_reminders: 3-day follow-up nudges created when a user marks
--     an email as sent (acknowledgement checkbox or manual Gmail confirm).
-- ============================================================================

-- 1. Organization branding + lifecycle -----------------------------------------
alter table organizations
  add column if not exists logo_url text,
  add column if not exists is_active boolean not null default true,
  add column if not exists company_profile text;

-- The original organization becomes the first tenant; keep its logistics
-- identity as the AI prompt profile so existing scoring/outreach behavior
-- is unchanged.
update organizations
set company_profile = 'Provides outsourced fleet management, last-mile delivery, and logistics operations support to companies with logistics-heavy operations.'
where id = '00000000-0000-0000-0000-000000000001'
  and company_profile is null;

-- 2. Landing-page demo requests -------------------------------------------------
create table if not exists demo_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  company text,
  message text,
  status text not null default 'new' check (status in ('new', 'contacted', 'closed')),
  created_at timestamptz not null default now()
);

create index if not exists idx_demo_requests_created on demo_requests (created_at desc);

-- 3. Follow-up reminders ---------------------------------------------------------
create table if not exists follow_up_reminders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  user_id uuid not null references users (id) on delete cascade,
  lead_id uuid references leads (id) on delete cascade,
  contact_id uuid references contacts (id) on delete set null,
  email_subject_hint text,
  due_at timestamptz not null,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Poller scans only reminders that are still pending.
create index if not exists idx_follow_up_reminders_due
  on follow_up_reminders (due_at)
  where completed_at is null;

create index if not exists idx_follow_up_reminders_user on follow_up_reminders (user_id);

-- Avoid duplicate reminders for the same ack (one live reminder per lead+contact per user).
create unique index if not exists uq_follow_up_reminders_pending
  on follow_up_reminders (user_id, lead_id, contact_id)
  where completed_at is null;
