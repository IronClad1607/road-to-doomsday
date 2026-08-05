-- Watch history, so pace can be measured rather than only demanded.
--
-- Run in the Supabase SQL editor after 0003_media.sql. Safe to re-run.
--
-- Stored as a jsonb array on preferences rather than its own table: the sync
-- model replaces a user's state wholesale on every change, and an append-only
-- table would need its own reconciliation. The array is bounded in the client
-- (most recent 400 events), so at roughly 40 bytes an event this stays well
-- under 20 KB.
--
-- Each element is { at: ISO-8601 string, minutes: number } and records minutes
-- *added*, so unmarking never contributes.

alter table public.preferences
  add column if not exists history jsonb not null default '[]'::jsonb;
