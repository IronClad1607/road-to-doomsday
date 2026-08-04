-- Road to Doomsday — initial schema.
--
-- Run this once in the Supabase SQL editor (Dashboard → SQL Editor → New query).
-- Safe to re-run: every statement is guarded.
--
-- Two halves:
--   catalog (eras, entries)      — world-readable, written only by the seed
--   user data (progress, prefs)  — private to its owner, enforced by RLS
--
-- Row Level Security is the ONLY thing protecting user data here. The anon key
-- ships in the browser bundle by design, so without the policies below anyone
-- holding it could read and write every row.

-- ---------------------------------------------------------------- catalog --

create table if not exists public.eras (
  id        text primary key,
  -- Story order. The whole point of the app, so it is stored, not inferred.
  position  int  not null,
  name      text not null,
  span      text not null,
  dialect   text not null,
  parallel  boolean not null default false,
  palette   jsonb not null
);

create table if not exists public.entries (
  id              text primary key,
  era_id          text not null references public.eras (id) on delete cascade,
  position        int  not null,
  kind            text not null check (kind in ('film', 'series')),
  title           text not null,
  year            text not null,
  -- Films carry minutes; series carry an episode title array and a per-episode
  -- runtime. Exactly one shape must be populated.
  minutes         int,
  episodes        jsonb,
  episode_minutes int,
  tier            smallint not null check (tier between 1 and 3),
  stingers        smallint not null default 0,
  clue            text not null,
  service         text,
  url             text,
  drop_label      text,
  constraint entries_shape check (
    (kind = 'film'   and minutes is not null
                     and episodes is null and episode_minutes is null)
    or
    (kind = 'series' and episodes is not null and episode_minutes is not null
                     and minutes is null)
  )
);

create index if not exists entries_era_position_idx
  on public.entries (era_id, position);

-- -------------------------------------------------------------- user data --

-- One row per entry a user has touched. Absent means unwatched — nothing is
-- ever stored as "watched: false".
create table if not exists public.progress (
  user_id    uuid not null references auth.users (id) on delete cascade,
  entry_id   text not null references public.entries (id) on delete cascade,
  -- Null for films (presence is the signal); for series, the watched episode
  -- indices.
  episodes   int[],
  updated_at timestamptz not null default now(),
  primary key (user_id, entry_id)
);

create table if not exists public.preferences (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  mode        text not null default 'completionist'
                check (mode in ('focused', 'completionist', 'everything')),
  open_era    text,
  hide_logged boolean not null default false,
  open_series text[] not null default '{}',
  updated_at  timestamptz not null default now()
);

-- -------------------------------------------------------------------- RLS --

alter table public.eras        enable row level security;
alter table public.entries     enable row level security;
alter table public.progress    enable row level security;
alter table public.preferences enable row level security;

-- The catalog is public reference data. Read-only to clients: no insert,
-- update or delete policy exists, so the seed must run as service_role.
drop policy if exists "eras are readable by anyone" on public.eras;
create policy "eras are readable by anyone"
  on public.eras for select
  using (true);

drop policy if exists "entries are readable by anyone" on public.entries;
create policy "entries are readable by anyone"
  on public.entries for select
  using (true);

-- Progress and preferences are visible and writable only to their owner.
-- `using` guards reads and the pre-image of writes; `with check` guards the
-- post-image, so a row cannot be inserted or moved onto another user.
drop policy if exists "progress is private to its owner" on public.progress;
create policy "progress is private to its owner"
  on public.progress for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "preferences are private to their owner" on public.preferences;
create policy "preferences are private to their owner"
  on public.preferences for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
