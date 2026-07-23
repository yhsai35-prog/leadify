-- Recipient selection + WhatsApp delivery/conversation history.
-- Run after 015_whatsapp_campaigns.sql.

-- ----------------------------------------------------------------------------
-- Campaign recipients (explicit phone/email targets for a campaign)
-- ----------------------------------------------------------------------------
create table if not exists campaign_recipients (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns (id) on delete cascade,
  lead_id uuid not null references leads (id) on delete cascade,
  contact_id uuid not null references contacts (id) on delete cascade,
  phone text,
  email text,
  selected boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_campaign_recipients_campaign_contact unique (campaign_id, contact_id)
);
create index if not exists idx_campaign_recipients_campaign
  on campaign_recipients (campaign_id) where selected = true;
create index if not exists idx_campaign_recipients_lead on campaign_recipients (lead_id);

alter table campaign_recipients enable row level security;
drop policy if exists service_role_full_access on campaign_recipients;
create policy service_role_full_access on campaign_recipients for all using (true) with check (true);

-- ----------------------------------------------------------------------------
-- WhatsApp message delivery tracking
-- ----------------------------------------------------------------------------
alter table whatsapp_messages add column if not exists to_phone text;
alter table whatsapp_messages add column if not exists delivery_status text
  not null default 'pending';
alter table whatsapp_messages add column if not exists delivered_at timestamptz;
alter table whatsapp_messages add column if not exists read_at timestamptz;

-- pending | accepted | sent | delivered | read | failed
comment on column whatsapp_messages.delivery_status is
  'Meta delivery lifecycle: pending|accepted|sent|delivered|read|failed';

create table if not exists whatsapp_message_events (
  id uuid primary key default gen_random_uuid(),
  whatsapp_message_id uuid not null references whatsapp_messages (id) on delete cascade,
  lead_id uuid not null references leads (id) on delete cascade,
  campaign_id uuid references campaigns (id) on delete set null,
  event_type text not null,
  body_text text,
  detail jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists idx_whatsapp_message_events_message
  on whatsapp_message_events (whatsapp_message_id, occurred_at);
create index if not exists idx_whatsapp_message_events_campaign
  on whatsapp_message_events (campaign_id, occurred_at desc);
create index if not exists idx_whatsapp_message_events_lead
  on whatsapp_message_events (lead_id, occurred_at desc);

alter table whatsapp_message_events enable row level security;
drop policy if exists service_role_full_access on whatsapp_message_events;
create policy service_role_full_access on whatsapp_message_events for all using (true) with check (true);
