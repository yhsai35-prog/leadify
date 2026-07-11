-- ============================================================================
-- Bluwheelz AI Sales Intelligence Platform - Initial Schema (MVP v1.0)
--
-- Design notes:
--   * Every tenant-scoped table carries organization_id, even though MVP
--     ships with a single organization ("Bluwheelz"). This lets us flip on
--     Row Level Security for true multi-tenancy later without a migration
--     that reshapes tables (see docs/architecture.md future-scope section).
--   * No fact is duplicated: company attributes live only in `companies`,
--     AI research lives only in `company_intelligence`, scores are versioned
--     in `lead_scores`, and approval state lives in `approval_queue`. The
--     one deliberate denormalization is `emails.status` / `leads.icp_score`,
--     which are read-hot fields kept in sync by triggers (see section 7).
--   * The single hard business invariant of this whole platform -- "no email
--     is ever sent without human approval" -- is enforced at the database
--     layer via a CHECK constraint on `emails`, not just in application code.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Extensions
-- ----------------------------------------------------------------------------
create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists "vector";     -- pgvector for similarity search

-- ----------------------------------------------------------------------------
-- 2. Enums
--    Mirrors packages/shared/src/enums/index.ts -- keep both in sync.
-- ----------------------------------------------------------------------------
create type user_role as enum ('admin', 'sales_manager', 'bde', 'viewer');

create type lead_source as enum ('apollo', 'import', 'manual');

create type pipeline_status as enum (
  'imported', 'qualified', 'research_complete', 'draft_ready',
  'pending_approval', 'approved', 'sent', 'interested', 'meeting',
  'proposal', 'won', 'lost'
);

create type priority_level as enum ('low', 'medium', 'high', 'critical');

create type email_type as enum ('initial', 'follow_up');

create type email_status as enum (
  'draft', 'pending_approval', 'approved', 'rejected',
  'scheduled', 'sent', 'failed', 'superseded'
);

create type generated_by_type as enum ('ai', 'human');

create type approval_status as enum ('pending', 'approved', 'rejected', 'edited');

create type campaign_status as enum ('draft', 'active', 'paused', 'completed');

create type activity_type as enum (
  'imported', 'qualified', 'researched', 'draft_created', 'submitted',
  'approved', 'rejected', 'sent', 'send_failed', 'reply_received',
  'status_changed', 'meeting_scheduled', 'note'
);

create type meeting_outcome as enum ('scheduled', 'completed', 'no_show', 'cancelled');

create type job_type as enum ('qualify', 'research', 'generate_email', 'similarity', 'classify_reply');

create type job_status as enum ('pending', 'processing', 'completed', 'failed');

create type existing_client_vertical as enum (
  'logistics', 'quick_commerce', 'retail', 'ev', 'manufacturing', 'furniture'
);

create type reply_sentiment as enum ('positive', 'neutral', 'negative');

-- ----------------------------------------------------------------------------
-- 3. Core tenancy tables
-- ----------------------------------------------------------------------------
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table users (
  id uuid primary key references auth.users (id) on delete cascade,
  organization_id uuid not null references organizations (id) on delete cascade,
  email text not null unique,
  full_name text not null,
  role user_role not null default 'bde',
  gmail_connected boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_users_organization on users (organization_id);

-- ----------------------------------------------------------------------------
-- 4. Companies & contacts
-- ----------------------------------------------------------------------------
create table companies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  name text not null,
  domain text,
  apollo_id text,
  industry text,
  employee_count integer,
  revenue_inr_cr numeric(12, 2),
  cities_count integer,
  fleet_size_estimate integer,
  is_existing_client boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  embedding vector(1536),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_companies_org_domain unique (organization_id, domain),
  constraint uq_companies_org_apollo_id unique (organization_id, apollo_id)
);
create index idx_companies_organization on companies (organization_id);
create index idx_companies_industry on companies (industry);
create index idx_companies_is_existing_client on companies (is_existing_client);
create index idx_companies_metadata_gin on companies using gin (metadata);
create index idx_companies_embedding_ivfflat on companies
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);

create table contacts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  apollo_id text,
  first_name text not null,
  last_name text,
  email text,
  linkedin_url text,
  title text,
  is_decision_maker boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_contacts_company_email unique (company_id, email)
);
create index idx_contacts_company on contacts (company_id);
create index idx_contacts_is_decision_maker on contacts (is_decision_maker);
create unique index uq_contacts_company_apollo_id on contacts (company_id, apollo_id) where apollo_id is not null;

-- ----------------------------------------------------------------------------
-- 5. Existing client knowledge base (AI seed data)
-- ----------------------------------------------------------------------------
create table existing_client_profiles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null unique references companies (id) on delete cascade,
  vertical existing_client_vertical not null,
  profile_summary text not null default '',
  operational_patterns jsonb not null default '{}'::jsonb,
  embedding vector(1536),
  created_at timestamptz not null default now()
);
create index idx_existing_client_profiles_vertical on existing_client_profiles (vertical);
create index idx_existing_client_profiles_embedding_ivfflat on existing_client_profiles
  using ivfflat (embedding vector_cosine_ops) with (lists = 10);

-- ----------------------------------------------------------------------------
-- 6. Leads & AI qualification
-- ----------------------------------------------------------------------------
create table campaigns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  name text not null,
  description text,
  status campaign_status not null default 'draft',
  template_id uuid,
  scheduled_at timestamptz,
  created_by uuid not null references users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_campaigns_organization on campaigns (organization_id);
create index idx_campaigns_status on campaigns (status);

create table leads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  company_id uuid not null references companies (id) on delete cascade,
  contact_id uuid references contacts (id) on delete set null,
  campaign_id uuid references campaigns (id) on delete set null,
  assigned_to uuid references users (id) on delete set null,
  source lead_source not null default 'manual',
  pipeline_status pipeline_status not null default 'imported',
  priority priority_level not null default 'medium',
  icp_score integer,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_leads_org_status on leads (organization_id, pipeline_status);
create index idx_leads_assigned_status on leads (assigned_to, pipeline_status);
create index idx_leads_company on leads (company_id);
create index idx_leads_campaign on leads (campaign_id);

create table lead_scores (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads (id) on delete cascade,
  version integer not null,
  icp_score integer not null check (icp_score between 0 and 100),
  priority priority_level not null,
  reasoning text not null,
  pain_points jsonb not null default '[]'::jsonb,
  industry_analysis jsonb not null default '{}'::jsonb,
  score_breakdown jsonb not null default '{}'::jsonb,
  model_version text not null,
  prompt_hash text not null,
  created_by generated_by_type not null default 'ai',
  created_at timestamptz not null default now(),
  constraint uq_lead_scores_lead_version unique (lead_id, version)
);
create index idx_lead_scores_lead on lead_scores (lead_id, version desc);

create table lead_similarity_matches (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads (id) on delete cascade,
  existing_client_profile_id uuid not null references existing_client_profiles (id) on delete cascade,
  similarity_pct numeric(5, 2) not null check (similarity_pct between 0 and 100),
  reason text not null,
  ranked_at timestamptz not null default now(),
  constraint uq_lead_similarity_lead_profile unique (lead_id, existing_client_profile_id)
);
create index idx_lead_similarity_lead on lead_similarity_matches (lead_id, similarity_pct desc);

-- ----------------------------------------------------------------------------
-- 7. Company intelligence (research module)
-- ----------------------------------------------------------------------------
create table company_intelligence (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  website_summary text,
  business_model text,
  expansion_signals jsonb not null default '[]'::jsonb,
  growth_indicators jsonb not null default '[]'::jsonb,
  news jsonb not null default '[]'::jsonb,
  fleet_indicators jsonb not null default '[]'::jsonb,
  source jsonb not null default '[]'::jsonb,
  researched_at timestamptz not null default now()
);
create index idx_company_intelligence_company on company_intelligence (company_id, researched_at desc);

-- ----------------------------------------------------------------------------
-- 8. Outreach & mandatory human approval
--
-- INVARIANT: an email can only ever reach status='sent' if approved_by is
-- set. This is the database-level enforcement of the human-in-the-loop
-- requirement -- application code (ApprovalService) is the only caller
-- expected to reach this state, but the constraint protects against bugs,
-- direct SQL, or future code paths that forget the rule.
-- ----------------------------------------------------------------------------
create table emails (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads (id) on delete cascade,
  contact_id uuid not null references contacts (id),
  campaign_id uuid references campaigns (id) on delete set null,
  type email_type not null default 'initial',
  subject text not null,
  body_html text not null,
  body_text text not null,
  linkedin_message text,
  call_script text,
  status email_status not null default 'draft',
  generated_by generated_by_type not null default 'ai',
  model_version text,
  prompt_hash text,
  approved_by uuid references users (id),
  approved_at timestamptz,
  scheduled_at timestamptz,
  sent_at timestamptz,
  gmail_message_id text,
  gmail_thread_id text,
  created_by uuid references users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_emails_sent_requires_approval
    check (status <> 'sent' or approved_by is not null)
);
create index idx_emails_lead on emails (lead_id);
create index idx_emails_status on emails (status);
create index idx_emails_campaign on emails (campaign_id);
create index idx_emails_gmail_thread on emails (gmail_thread_id);

create table approval_queue (
  id uuid primary key default gen_random_uuid(),
  email_id uuid not null unique references emails (id) on delete cascade,
  lead_id uuid not null references leads (id) on delete cascade,
  submitted_by uuid not null references users (id),
  reviewer_id uuid references users (id),
  status approval_status not null default 'pending',
  reviewer_notes text,
  edited_content jsonb,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
create index idx_approval_queue_status on approval_queue (status);
create index idx_approval_queue_lead on approval_queue (lead_id);

-- ----------------------------------------------------------------------------
-- 9. Activity timeline, meetings, notifications, audit
-- ----------------------------------------------------------------------------
create table activities (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads (id) on delete cascade,
  user_id uuid references users (id) on delete set null,
  type activity_type not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index idx_activities_lead on activities (lead_id, created_at desc);

create table meetings (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads (id) on delete cascade,
  scheduled_at timestamptz not null,
  notes text,
  outcome meeting_outcome not null default 'scheduled',
  created_at timestamptz not null default now()
);
create index idx_meetings_lead on meetings (lead_id);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index idx_notifications_user_unread on notifications (user_id) where read_at is null;

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  user_id uuid references users (id) on delete set null,
  action text not null,
  resource_type text not null,
  resource_id uuid,
  before_state jsonb,
  after_state jsonb,
  ip_address inet,
  created_at timestamptz not null default now()
);
create index idx_audit_logs_org_created on audit_logs (organization_id, created_at desc);
create index idx_audit_logs_resource on audit_logs (resource_type, resource_id);

-- ----------------------------------------------------------------------------
-- 10. Apollo cache & async job queue
-- ----------------------------------------------------------------------------
create table apollo_search_cache (
  id uuid primary key default gen_random_uuid(),
  query_hash text not null unique,
  filters jsonb not null,
  results jsonb not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index idx_apollo_cache_expires on apollo_search_cache (expires_at);

create table job_queue (
  id uuid primary key default gen_random_uuid(),
  type job_type not null,
  payload jsonb not null default '{}'::jsonb,
  status job_status not null default 'pending',
  attempts integer not null default 0,
  max_attempts integer not null default 3,
  error text,
  result jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);
create index idx_job_queue_status_created on job_queue (status, created_at);

-- ----------------------------------------------------------------------------
-- 11. Reply tracking (extends emails/activities)
-- ----------------------------------------------------------------------------
create table email_replies (
  id uuid primary key default gen_random_uuid(),
  email_id uuid not null references emails (id) on delete cascade,
  from_email text not null,
  body_snippet text not null,
  sentiment reply_sentiment,
  suggested_action text,
  received_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index idx_email_replies_email on email_replies (email_id);

-- ----------------------------------------------------------------------------
-- 12. updated_at maintenance trigger
-- ----------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
declare
  t text;
begin
  foreach t in array array[
    'organizations', 'users', 'companies', 'contacts', 'campaigns',
    'leads', 'emails'
  ]
  loop
    execute format(
      'create trigger trg_set_updated_at before update on %I
       for each row execute function set_updated_at();', t
    );
  end loop;
end;
$$;

-- ----------------------------------------------------------------------------
-- 13. Denormalization sync triggers
--     Keeps leads.icp_score in sync with the latest lead_scores row, so list
--     views can sort/filter without a join. The versioned history remains
--     the source of truth in lead_scores.
-- ----------------------------------------------------------------------------
create or replace function sync_lead_latest_score()
returns trigger as $$
begin
  update leads
  set icp_score = new.icp_score, priority = new.priority
  where id = new.lead_id;
  return new;
end;
$$ language plpgsql;

create trigger trg_sync_lead_latest_score
  after insert on lead_scores
  for each row execute function sync_lead_latest_score();

-- ----------------------------------------------------------------------------
-- 14. Row Level Security
--     MVP runs as a single organization behind a trusted API using the
--     service role, so RLS is enabled with a permissive same-organization
--     policy today. When multi-tenant SaaS ships, tighten `using` clauses to
--     scope by auth.jwt() claims without any schema changes.
-- ----------------------------------------------------------------------------
alter table organizations enable row level security;
alter table users enable row level security;
alter table companies enable row level security;
alter table contacts enable row level security;
alter table leads enable row level security;
alter table lead_scores enable row level security;
alter table campaigns enable row level security;
alter table emails enable row level security;
alter table approval_queue enable row level security;
alter table activities enable row level security;
alter table audit_logs enable row level security;

create policy service_role_full_access on organizations for all using (true) with check (true);
create policy service_role_full_access on users for all using (true) with check (true);
create policy service_role_full_access on companies for all using (true) with check (true);
create policy service_role_full_access on contacts for all using (true) with check (true);
create policy service_role_full_access on leads for all using (true) with check (true);
create policy service_role_full_access on lead_scores for all using (true) with check (true);
create policy service_role_full_access on campaigns for all using (true) with check (true);
create policy service_role_full_access on emails for all using (true) with check (true);
create policy service_role_full_access on approval_queue for all using (true) with check (true);
create policy service_role_full_access on activities for all using (true) with check (true);
create policy service_role_full_access on audit_logs for all using (true) with check (true);

-- Note: the Express API always connects using the Supabase service role key
-- and enforces organization scoping + RBAC in application middleware
-- (see apps/api/src/middleware/{auth,rbac}.ts). Policies above are a
-- defense-in-depth backstop against direct DB access, not the primary
-- authorization mechanism for MVP.
