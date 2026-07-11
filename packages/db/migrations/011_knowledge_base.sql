-- ============================================================================
-- Migration 011: Knowledge base articles with monthly versioning
-- ============================================================================

create table if not exists knowledge_base_articles (
  id               uuid        primary key default gen_random_uuid(),
  organization_id  uuid        not null references organizations(id) on delete cascade,

  -- Content fields
  title            text        not null,
  content          text        not null,
  category         text        not null default 'General',

  -- Versioning: each "Publish Monthly Update" action creates a new row with
  -- version = old_version + 1 and sets the previous row's is_current = false.
  -- Only one row per (organization_id, title, is_current=true) should exist at
  -- a time; enforced at the application layer.
  version          integer     not null default 1,
  is_current       boolean     not null default true,
  published_at     timestamptz not null default now(),

  -- Audit columns
  created_by       uuid        references users(id) on delete set null,
  updated_by       uuid        references users(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Fast lookup for the active articles shown to all users
create index if not exists idx_kb_articles_org_current
  on knowledge_base_articles(organization_id, is_current)
  where is_current = true;

-- Trigger to keep updated_at in sync
create or replace function update_kb_article_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_kb_article_updated_at on knowledge_base_articles;
create trigger trg_kb_article_updated_at
  before update on knowledge_base_articles
  for each row execute function update_kb_article_updated_at();
