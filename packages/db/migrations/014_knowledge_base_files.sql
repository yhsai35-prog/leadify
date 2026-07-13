-- ============================================================================
-- Migration 014: Knowledge base file uploads (PDF/DOCX) + vector search
-- ============================================================================
-- Adds source-file metadata so articles can originate from an uploaded
-- document (extracted text lands in the existing `content` column), plus an
-- embedding column + vector search RPC so qualification, outreach, and the
-- AI Copilot can retrieve relevant knowledge base content per organization.

alter table knowledge_base_articles
  add column if not exists source_type text not null default 'manual'
    check (source_type in ('manual', 'file')),
  add column if not exists source_filename text,
  add column if not exists source_mime_type text,
  add column if not exists source_storage_path text,
  add column if not exists extraction_status text not null default 'completed'
    check (extraction_status in ('pending', 'completed', 'failed')),
  add column if not exists embedding vector(1024);

create index if not exists idx_knowledge_base_articles_embedding_ivfflat
  on knowledge_base_articles
  using ivfflat (embedding vector_cosine_ops) with (lists = 10);

-- Org-scoped vector search over current articles only. Mirrors
-- `match_existing_clients` (003_similarity_function.sql / 012) but filtered
-- to a single tenant, since knowledge base content must never leak across
-- organizations.
create or replace function match_knowledge_base_articles(
  query_embedding vector(1024),
  org_id uuid,
  match_count int default 5
)
returns table (
  id uuid,
  title text,
  category text,
  content text,
  distance float
)
language sql stable
as $$
  select
    kb.id,
    kb.title,
    kb.category,
    kb.content,
    kb.embedding <=> query_embedding as distance
  from knowledge_base_articles kb
  where kb.organization_id = org_id
    and kb.is_current = true
    and kb.embedding is not null
  order by kb.embedding <=> query_embedding
  limit match_count;
$$;
