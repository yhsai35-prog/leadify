-- Multi-channel campaigns (Email + WhatsApp) + flow canvas persistence.
-- Run after 014_knowledge_base_files.sql.

-- ----------------------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------------------
create type campaign_channel as enum ('email', 'whatsapp');

alter type activity_type add value if not exists 'whatsapp_sent';
alter type activity_type add value if not exists 'whatsapp_reply_received';

-- ----------------------------------------------------------------------------
-- Contacts: first-class phone (backfill from Apollo metadata)
-- ----------------------------------------------------------------------------
alter table contacts add column if not exists phone text;

update contacts
set phone = nullif(trim(metadata->>'phone'), '')
where phone is null
  and metadata ? 'phone'
  and nullif(trim(metadata->>'phone'), '') is not null;

create index if not exists idx_contacts_phone on contacts (phone) where phone is not null;

-- ----------------------------------------------------------------------------
-- Campaigns: channel + React Flow definition
-- ----------------------------------------------------------------------------
alter table campaigns
  add column if not exists channel campaign_channel not null default 'email';

alter table campaigns
  add column if not exists flow_definition jsonb not null default '{}'::jsonb;

-- ----------------------------------------------------------------------------
-- WhatsApp template cache (synced from Meta WABA)
-- ----------------------------------------------------------------------------
create table if not exists whatsapp_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  meta_id text,
  name text not null,
  language text not null,
  status text not null default 'APPROVED',
  category text,
  components jsonb not null default '[]'::jsonb,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_whatsapp_templates_org_name_lang unique (organization_id, name, language)
);
create index if not exists idx_whatsapp_templates_org on whatsapp_templates (organization_id);

-- ----------------------------------------------------------------------------
-- WhatsApp messages (parallel to emails; same approval lifecycle)
-- ----------------------------------------------------------------------------
create table if not exists whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads (id) on delete cascade,
  contact_id uuid not null references contacts (id),
  campaign_id uuid references campaigns (id) on delete set null,
  template_name text not null,
  template_language text not null default 'en',
  template_components jsonb not null default '[]'::jsonb,
  body_preview text not null default '',
  status email_status not null default 'draft',
  generated_by generated_by_type not null default 'ai',
  model_version text,
  prompt_hash text,
  approved_by uuid references users (id),
  approved_at timestamptz,
  scheduled_at timestamptz,
  sent_at timestamptz,
  wa_message_id text,
  wa_conversation_id text,
  error_payload jsonb,
  created_by uuid references users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_whatsapp_sent_requires_approval
    check (status <> 'sent' or approved_by is not null)
);
create index if not exists idx_whatsapp_messages_lead on whatsapp_messages (lead_id);
create index if not exists idx_whatsapp_messages_campaign on whatsapp_messages (campaign_id);
create index if not exists idx_whatsapp_messages_status on whatsapp_messages (status);
create index if not exists idx_whatsapp_messages_scheduled
  on whatsapp_messages (scheduled_at)
  where status = 'scheduled';

-- ----------------------------------------------------------------------------
-- Approval queue: support email XOR whatsapp message
-- ----------------------------------------------------------------------------
alter table approval_queue alter column email_id drop not null;

alter table approval_queue
  add column if not exists whatsapp_message_id uuid unique references whatsapp_messages (id) on delete cascade;

alter table approval_queue drop constraint if exists chk_approval_queue_one_message;
alter table approval_queue
  add constraint chk_approval_queue_one_message
  check (
    (email_id is not null and whatsapp_message_id is null)
    or (email_id is null and whatsapp_message_id is not null)
  );

-- ----------------------------------------------------------------------------
-- Outreach acknowledgements: allow whatsapp channel
-- ----------------------------------------------------------------------------
alter table outreach_acknowledgements drop constraint if exists outreach_acknowledgements_channel_check;
alter table outreach_acknowledgements
  add constraint outreach_acknowledgements_channel_check
  check (channel in ('email', 'linkedin', 'whatsapp'));

-- ----------------------------------------------------------------------------
-- WhatsApp inbound replies (mirror email_replies lightly)
-- ----------------------------------------------------------------------------
create table if not exists whatsapp_replies (
  id uuid primary key default gen_random_uuid(),
  whatsapp_message_id uuid references whatsapp_messages (id) on delete set null,
  lead_id uuid not null references leads (id) on delete cascade,
  wa_message_id text,
  from_phone text,
  body_text text not null default '',
  sentiment reply_sentiment,
  received_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists idx_whatsapp_replies_lead on whatsapp_replies (lead_id, received_at desc);

-- ----------------------------------------------------------------------------
-- RLS (service-role full access, matching existing tables)
-- ----------------------------------------------------------------------------
alter table whatsapp_templates enable row level security;
alter table whatsapp_messages enable row level security;
alter table whatsapp_replies enable row level security;

drop policy if exists service_role_full_access on whatsapp_templates;
create policy service_role_full_access on whatsapp_templates for all using (true) with check (true);

drop policy if exists service_role_full_access on whatsapp_messages;
create policy service_role_full_access on whatsapp_messages for all using (true) with check (true);

drop policy if exists service_role_full_access on whatsapp_replies;
create policy service_role_full_access on whatsapp_replies for all using (true) with check (true);
