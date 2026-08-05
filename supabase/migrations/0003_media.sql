-- Enriched metadata from TMDB: summaries, cast, artwork, per-episode detail.
--
-- Run in the Supabase SQL editor after 0002_route_state.sql. Safe to re-run.
--
-- Deliberately separate tables rather than columns on public.entries. The
-- catalog seed does `delete from public.entries` and re-inserts, so anything
-- stored there would be destroyed on every catalog change. These are keyed by
-- entry_id and refreshed on their own schedule.
--
-- Only TMDB *paths* are stored, not full URLs — the client picks an image size
-- at render time, and TMDB's CDN host can change without a re-seed.

create table if not exists public.entry_media (
  entry_id       text primary key references public.entries (id) on delete cascade,
  tmdb_id        int,
  tmdb_type      text check (tmdb_type in ('movie', 'tv')),
  tagline        text,
  overview       text,
  poster_path    text,
  backdrop_path  text,
  release_date   date,
  vote_average   numeric(3, 1),
  -- [{ name, character, profilePath }] — a handful of top-billed names.
  cast_json      jsonb not null default '[]'::jsonb,
  -- Region-specific provider deep link, where one exists.
  watch_url      text,
  updated_at     timestamptz not null default now()
);

create table if not exists public.episode_media (
  entry_id      text not null references public.entries (id) on delete cascade,
  -- Zero-based, matching the episode indices progress is stored against.
  episode_index int  not null,
  name          text,
  overview      text,
  still_path    text,
  air_date      date,
  runtime       int,
  primary key (entry_id, episode_index)
);

create index if not exists episode_media_entry_idx on public.episode_media (entry_id);

-- Same posture as the catalog: world-readable reference data, with no write
-- policy at all, so it can only be seeded from the SQL editor.
alter table public.entry_media   enable row level security;
alter table public.episode_media enable row level security;

drop policy if exists "entry media is readable by anyone" on public.entry_media;
create policy "entry media is readable by anyone"
  on public.entry_media for select
  using (true);

drop policy if exists "episode media is readable by anyone" on public.episode_media;
create policy "episode media is readable by anyone"
  on public.episode_media for select
  using (true);
