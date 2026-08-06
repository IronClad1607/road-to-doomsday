# CLAUDE.md

Operating notes for Claude Code in this repo. The README explains what the app
*is*; this file covers what will bite you.

**Road to Doomsday** — a personal MCU rewatch tracker counting down to
*Avengers: Doomsday*, 18 Dec 2026 09:00 IST. Vite + React + TypeScript,
deployed to GitHub Pages, with an optional Supabase backend.

---

## Commands

```bash
npm run dev          # dev server (use preview_start, never bare `vite` in Bash)
npm run build        # typechecks first, then bundles — a type error fails the build
npm run typecheck    # tsc --noEmit
node scripts/generate-catalog.mjs                    # regenerate catalog + seed
TMDB_API_KEY=... node scripts/enrich-catalog.mjs     # refresh TMDB media
```

Deploy is automatic: push to `main` → GitHub Actions → Pages. No manual step.

---

## Non-negotiable invariants

Breaking any of these fails **silently** — no error, no test, just wrong
behaviour someone notices weeks later.

### 1. `src/data/catalog.ts` is generated. Never hand-edit it.

The prototype at `design/Road to Doomsday.dc.html` is the catalog's source of
truth. To change entries: edit the prototype, run
`node scripts/generate-catalog.mjs`. That rewrites both `catalog.ts` **and**
`supabase/seed/catalog.sql`, so the bundled copy and the remote table can never
disagree. A hand edit is silently reverted on the next regeneration.

### 2. Entry ids are stable short codes (`CA1`, `DPW`) and must never change.

All watch progress is keyed on them, locally and in Supabase. The original
prototype used positional ids (`f1`, `s2`) that shifted whenever the catalog was
reordered — that would remap someone's history onto the wrong titles. Adding,
removing and reordering entries is now safe; renaming an id is not.

### 3. `entry.year` is **in-universe chronology**, not release year.

*Captain America: The First Avenger* is `1943`. Never feed it to a search API as
a year hint — it poisons every query. The enrichment script has a comment saying
so; heed it.

### 4. Never write a TMDB id from memory. Always look it up.

This has already gone wrong: four ids in `OVERRIDES` were recalled rather than
fetched, and pointed at *Secret Invasion*, *Black Bird*, *ONE PIECE* and
*Agent Carter*. A wrong id produces a complete, plausible-looking row for the
wrong title and nothing complains. The script's verification pass exists for
exactly this — run it and read the output.

### 5. Overflow rules live on `html`/`body` only.

Two separate failures were caused by putting `overflow` on a wrapper div:

- on a wrapper it becomes the scroll container, so `position: sticky` inside it
  silently stops working;
- on `body` it makes the body the scroller, so document-level `scrollTo` and
  `scrollTop` become no-ops.

v3 is a fixed viewport (`100dvh` flex column) and the page never scrolls. Only
the stage body and the rail scroll, each opting in locally.

### 6. Never use `scrollIntoView`.

It resolves its own scroll container and will move ancestors, dragging the whole
shell. The rail centres itself with `scrollTo` on the rail element.

### 7. Clear every advance timer before starting a new one.

The mark → stamp → slide → advance sequence is several chained `setTimeout`s.
They are tracked in a ref and cleared on new transitions and on unmount. Without
that, rapid clicking desyncs the route position from the stamp.

---

## Supabase

Entirely optional. With no credentials the app runs on the bundled catalog and
browser-local progress, **and skips the sign-in gate** — that fallback is load
bearing, since a build with no project has no way to sign in and gating it would
brick forks and fresh clones.

### Migrations are applied by hand

There is no migration runner. The user pastes SQL into the Supabase SQL editor,
in order:

| File | What |
| --- | --- |
| `migrations/0001_init.sql` | eras, entries, progress, preferences + RLS |
| `migrations/0002_route_state.sql` | `preferences.idx`; drops the v2 accordion columns |
| `migrations/0003_media.sql` | `entry_media`, `episode_media` |
| `migrations/0004_watch_history.sql` | `preferences.history` |
| `seed/catalog.sql` | 13 eras, 90 entries |
| `seed/media.sql` | TMDB enrichment (~178 KB) |

**Validate SQL locally before asking anyone to run it.** A throwaway Postgres
catches syntax errors, constraint violations and RLS mistakes in a minute:

```bash
docker run -d --name rtd-pg -e POSTGRES_PASSWORD=test postgres:17
# stub the Supabase-managed objects the migrations reference:
#   create schema auth; create table auth.users (id uuid primary key);
#   create function auth.uid() returns uuid ...
```

This has already caught real problems. Do it every time.

### Security posture

- The **anon key is public by design** and ships in the browser bundle. Row
  Level Security is the only thing protecting user rows — the policies in
  `0001_init.sql` are load bearing, not boilerplate.
- **Never handle the `service_role` key.** It bypasses RLS entirely. It must
  never appear in `.env`, in the repo, or in a conversation.
- Catalog and media tables have **no write policy at all**, so seeds must run
  from the SQL editor, never from the app.

### Sync rules that are easy to get wrong

- **Media lives in its own tables**, not columns on `entries`. The catalog seed
  does `delete from entries` and re-inserts, which would destroy anything
  stored there on every catalog change.
- **Do not send `updated_at` on the progress upsert.** Upsert only writes the
  columns it is given; sending a fresh timestamp rewrote every row on every sync
  and destroyed the record of when anything was first logged.
- **A failed remote read means the network is down, not that the account is
  empty.** Never push on a failed read — that would wipe a real log. `synced`
  only arms after a read actually succeeds, and the UI says "SYNC UNAVAILABLE"
  rather than claiming success.
- **Sign-in reconciles, it never overwrites.** Local and remote logs are
  unioned; the browser you are sitting in front of keeps its plan and position.

---

## Honesty rules in the product

Several features exist specifically to avoid confidently stating things that
are not known. Do not "simplify" these away.

- **The pace projection refuses to guess.** Under three events, or a span under
  three days, it reports `insufficient` and falls back to the required pace.
  Four weeks of nothing reports `stalled` rather than averaging the gap away —
  without that, someone who stopped watching two months ago was told they had
  52 days to spare. Lowering these thresholds to make the feature visible sooner
  is the wrong trade.
- **Rate is measured to *now***, not to the last event, so idle time counts.
- **Only increases are recorded** in watch history. Unmarking is a correction,
  not negative viewing.
- **Enrichment comes from TMDB, not scraping.** Scraping a streaming site would
  be brittle, against its terms, and would mean redistributing stills from a
  public repo. If asked for scraped trivia, say why this is the wrong tool —
  and note that fabricated "facts" would be caught instantly by the audience
  and would poison trust in the other 89 entries.

---

## Layout

```
src/
  data/        catalog.ts (GENERATED), types.ts
  lib/         progress.ts  — readiness, route/legs, pace, projection
               storage.ts   — validated localStorage, v1→v3 upgrade
               transfer.ts  — export/import + merge
               supabase.ts, remoteCatalog.ts, remoteProgress.ts, media.ts
  hooks/       useTracker (state + advance), useAuth, useCountdown
  components/  AuthGate, RouteHeader, Stage, Rail, StationSearch,
               PlanPanel, Archive, AccountControls
  styles/      global.css (tokens), eraVars.ts (per-era CSS custom properties)
scripts/       generate-catalog.mjs, enrich-catalog.mjs
supabase/      migrations/, seed/
design/        the source prototype — reference only, NOT in the build
```

**Era colours live in the cascade.** Each era publishes its palette as CSS
custom properties on the stage; nothing takes a palette prop or hardcodes a
colour. Add a colour by adding a token, not a literal.

**Type scale is tokenised** (`--fs-micro` 10px … `--fs-body` 13px) with a 10px
floor. The design leans on small letter-spaced uppercase mono, which stops being
legible below that. Don't reintroduce raw `font-size: 8px`.

---

## Verification expectations

The browser tools are available — use them rather than asserting things work.

- **Read the console from a fresh tab.** The console buffer persists stale
  entries across reloads and server restarts; errors from a mid-edit HMR state
  will look current and are not.
- Cross-origin fetches do not show in the network panel. Check behaviour from
  inside the page instead.
- CSS-module class names are hashed — `[class*="Foo"]` selectors are unreliable.
  Query by `role`, `aria-label` or element structure.
- When claiming data is correct, **verify it against the source**, don't trust
  the code path. Cross-checking all 90 TMDB rows is what caught the fabricated
  ids.

---

## Known gaps

- `design/` still carries the **v1 scrolling UI**. Only the catalog data is kept
  in sync there; the v2 and v3 redesigns were never mirrored back. Opening it in
  claude.ai shows the old layout.
- Route position (`idx`) was once observed diverging between local (74) and
  remote (89) while watch data matched exactly. Cause not established.
- `X98` and `YF2` have no episode detail, and six unreleased titles have no
  watch link — both because TMDB has nothing yet, not because of a bug.
- Watch links resolve to TMDB's "where to watch" page. **JioHotstar deep links
  are not obtainable**: no public API, and their search renders client-side, so
  there is nothing to read. Per-entry `url` overrides take priority if someone
  collects them by hand.

---

## Context worth carrying

This is a **seasonal product with a hard expiry** — it stops mattering on
18 Dec 2026. Anything that takes six weeks to build and pays back over a year is
already dead. Favour cheap, high-leverage changes over editorial mountains.

An open product question gates the "fandom content" work: **is this a private
tool or a product for an audience?** The auth gate says the former; the request
for trivia says the latter. They imply very different feature sets.
