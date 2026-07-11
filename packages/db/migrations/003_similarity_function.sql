-- ============================================================================
-- Vector similarity RPC used by SimilarityService (apps/api) to find the
-- closest existing-client profiles for a prospect's company embedding.
-- Exposed as a Postgres function (rather than a raw query from the API) so
-- the ivfflat index and cosine-distance operator stay colocated with the
-- schema that defines them.
-- ============================================================================
create or replace function match_existing_clients(
  query_embedding vector(1536),
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
