-- Voyage voyage-3 outputs 1024-dimensional vectors; the schema originally used 1536
-- (OpenAI text-embedding-3-small). Align Postgres pgvector columns and the similarity RPC.

drop function if exists match_existing_clients(vector, int);
drop index if exists idx_companies_embedding_ivfflat;
drop index if exists idx_existing_client_profiles_embedding_ivfflat;

-- Existing 1536-d vectors cannot be cast to 1024; re-embed after this migration.
update companies set embedding = null where embedding is not null;
update existing_client_profiles set embedding = null where embedding is not null;

alter table companies alter column embedding type vector(1024);
alter table existing_client_profiles alter column embedding type vector(1024);

create or replace function match_existing_clients(
  query_embedding vector(1024),
  match_count int default 3
)
returns table (
  profile_id uuid,
  company_id uuid,
  company_name text,
  distance float
)
language sql stable
as $$
  select
    ecp.id as profile_id,
    c.id as company_id,
    c.name as company_name,
    ecp.embedding <=> query_embedding as distance
  from existing_client_profiles ecp
  join companies c on c.id = ecp.company_id
  where ecp.embedding is not null
  order by ecp.embedding <=> query_embedding
  limit match_count;
$$;

create index idx_companies_embedding_ivfflat on companies
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);

create index idx_existing_client_profiles_embedding_ivfflat on existing_client_profiles
  using ivfflat (embedding vector_cosine_ops) with (lists = 10);
