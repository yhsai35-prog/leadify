-- Step 1 of the role restructure: add new enum values only.
--
-- IMPORTANT: run this file FIRST, on its own, and let it commit before running
-- 008_role_data_migration.sql. Postgres does not allow a new enum value to be
-- used (e.g. in an UPDATE) within the same transaction/script that created it.
--
-- New role model: super_admin > admin > user.
-- 'sales_manager', 'bde', 'viewer' remain defined on the enum (Postgres cannot
-- drop enum values cleanly) but are migrated away from in 008 and unused after.
alter type user_role add value if not exists 'super_admin';
alter type user_role add value if not exists 'user';

-- New activity types for the outreach acknowledgement checkboxes (User role).
alter type activity_type add value if not exists 'email_acknowledged';
alter type activity_type add value if not exists 'linkedin_acknowledged';
