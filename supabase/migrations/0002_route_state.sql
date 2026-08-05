-- v3: the route view replaces the scrolling timeline.
--
-- Run this in the Supabase SQL editor after 0001_init.sql. Safe to re-run.
--
-- The v3 UI shows one station at a time, so the position along the route
-- (`idx`) is the state worth carrying between devices. The three columns it
-- replaces described the old accordion — which era was expanded, which series
-- were expanded, whether logged entries were filtered — and none of that
-- exists any more.
--
-- Progress itself is untouched: public.progress keeps exactly the same shape,
-- so no watch history is migrated or at risk here.

alter table public.preferences
  add column if not exists idx int not null default 0;

alter table public.preferences drop column if exists open_era;
alter table public.preferences drop column if exists hide_logged;
alter table public.preferences drop column if exists open_series;
