-- ============================================================================
-- Migration 010: Per-user settings (Gmail integration + SMTP credentials)
-- ============================================================================

-- Preferred email client for each user: 'gmail' opens Gmail compose URL,
-- 'smtp' uses stored SMTP credentials, 'none' means no preference set yet.
alter table users
  add column if not exists preferred_email_client text not null default 'none'
    check (preferred_email_client in ('gmail', 'smtp', 'none'));

-- SMTP credentials stored per-user as JSONB.
-- Schema: { host?: string, port?: number, email?: string, password?: string }
-- Note: password is stored as plaintext in this JSONB field.
-- A future hardening pass should encrypt at rest using pgcrypto.
alter table users
  add column if not exists smtp_settings jsonb not null default '{}'::jsonb;
