-- Staging table for Apollo search results before promotion to pipeline.
create type discovered_lead_status as enum ('pending', 'promoted', 'duplicate', 'failed');

create table discovered_leads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  search_batch_id uuid not null,
  apollo_id text not null,
  company_name text not null,
  domain text,
  industry text,
  employee_count integer,
  city text,
  search_state text,
  search_industry text,
  people jsonb not null default '[]'::jsonb,
  status discovered_lead_status not null default 'pending',
  lead_id uuid references leads (id) on delete set null,
  company_id uuid references companies (id) on delete set null,
  failure_reason text,
  discovered_by uuid not null references users (id),
  created_at timestamptz not null default now(),
  promoted_at timestamptz,
  constraint uq_discovered_leads_org_apollo unique (organization_id, apollo_id)
);

create index idx_discovered_leads_organization on discovered_leads (organization_id);
create index idx_discovered_leads_status on discovered_leads (status);
create index idx_discovered_leads_batch on discovered_leads (search_batch_id);
create index idx_discovered_leads_created on discovered_leads (created_at desc);
