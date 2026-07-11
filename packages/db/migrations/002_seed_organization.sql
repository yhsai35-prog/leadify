-- ============================================================================
-- Seeds the single Bluwheelz organization row that every tenant-scoped table
-- references in MVP. Ships as a migration (not a seed script) because the
-- application cannot boot without at least one organization to attach the
-- first admin user to.
-- ============================================================================
insert into organizations (id, name, settings)
values (
  '00000000-0000-0000-0000-000000000001',
  'Bluwheelz',
  '{"icpWeights": {"industry": 30, "size": 25, "operations": 25, "growth": 10, "similarity": 10}}'::jsonb
)
on conflict (id) do nothing;
