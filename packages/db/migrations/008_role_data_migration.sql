-- Step 2 of the role restructure. Run AFTER 007_role_restructure.sql has committed.
--
-- Data migration: existing 'sales_manager' accounts become 'admin' (preserves
-- approval capability); existing 'bde' and 'viewer' accounts become 'user'.
-- No account is auto-promoted to 'super_admin' -- promote one manually after
-- this runs, e.g.:
--   update users set role = 'super_admin' where email = 'you@bluwheelz.com';
update users set role = 'admin' where role = 'sales_manager';
update users set role = 'user' where role in ('bde', 'viewer');

alter table users alter column role set default 'user';

-- Staging table for per-contact "I sent the email / LinkedIn message" checkboxes
-- (User role). Independent of the real send pipeline (emails.status) and does
-- not affect leads.pipeline_status -- purely a self-reported nurturing signal.
create table outreach_acknowledgements (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads (id) on delete cascade,
  contact_id uuid not null references contacts (id) on delete cascade,
  channel text not null check (channel in ('email', 'linkedin')),
  acknowledged boolean not null default true,
  acknowledged_by uuid not null references users (id),
  acknowledged_at timestamptz not null default now(),
  unique (lead_id, contact_id, channel)
);
create index idx_outreach_ack_lead on outreach_acknowledgements (lead_id);

-- Lightweight call-counters for Apollo/Claude usage, surfaced to Super Admin.
create table ai_usage_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  user_id uuid references users (id) on delete set null,
  provider text not null check (provider in ('apollo', 'claude')),
  action text not null,
  created_at timestamptz not null default now()
);
create index idx_ai_usage_org_created on ai_usage_events (organization_id, created_at desc);
create index idx_ai_usage_user on ai_usage_events (user_id);
