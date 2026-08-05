# Road to Doomsday

**→ [ironclad1607.github.io/road-to-doomsday](https://ironclad1607.github.io/road-to-doomsday/)**

An MCU rewatch tracker counting down to *Avengers: Doomsday* — 18 Dec 2026, 09:00 IST.

90 films and series in story order (in-universe chronology, not release order), grouped into
13 eras that each render in their own visual dialect: wartime propaganda litho for Captain
America, VHS tracking error for Captain Marvel, brutalist CRT amber for the TVA, yellow-and-blue
collision rails for the Fox canon.

A full-viewport **route**: one station at a time, travelled with the rail at the bottom or the
arrow keys. Marking something watched stamps it LOGGED and carries you to the next station.

## Features

- **Three watch plans** — `FOCUSED` (the Doomsday spine, ~59h), `COMPLETE` (spine plus
  recommended, ~156h), `EVERYTHING` (full canon including one-shots, Netflix, S.H.I.E.L.D.,
  animation and the Fox rail, ~352h). The plan defines the route: entries outside it are not
  stations at all, and readiness rescales to whatever you picked rather than punishing you
  for opting out.
- **One station at a time** — the page never scrolls. The era owns the whole viewport, in its
  own palette and texture, so moving between eras reads as a reality bleed.
- **Advance on mark** — completing an entry stamps it and slides you to the next station.
  Completing a series' last episode does the same. Unmarking never moves you.
- **Route rail** — the whole plan as a horizontal line, grouped into legs by era, with the
  current station centred. Tap any node or era label to jump.
- **Episode-level tracking** — series show every episode, with real titles where the catalog
  has them, so partial progress is never lost.
- **Readiness and pace** — percentage complete, hours logged against hours required, and the
  hours-per-week you need to sustain to finish before release.
- **Clearance ladder** — six ranks from `CIVILIAN BYSTANDER` to `WORTHY`.
- **A finale panel** sealed until your plan hits 100%.
- **Sign-in is required** when Supabase is configured — a blocking magic-link gate, so
  progress always belongs to an account and follows you to every device. A build with no
  credentials skips the gate and runs on browser-local progress instead.
- **Export and import** your log as a JSON file, to back it up or move it to another
  browser or machine. Import *merges* — watched stays watched and episode lists union, so a
  restore can never delete progress you made since the export.

Each entry also carries a *clue* — the one thing to watch for, and why it's on the road to
Doomsday.

## Running it

```bash
npm install
npm run dev
```

| Script | Does |
| --- | --- |
| `npm run dev` | Dev server with HMR |
| `npm run build` | Typecheck, then bundle to `dist/` |
| `npm run preview` | Serve the built bundle |
| `npm run typecheck` | `tsc --noEmit` |

## How it's put together

Vite + React + TypeScript, no state library and no UI framework.

```
src/
  data/        catalog.ts — 13 eras, 90 entries (generated); types.ts — the data model
  lib/         progress.ts — readiness/rank/pace, route and leg derivation
               storage.ts  — validated, debounced localStorage; v1 -> v3 upgrade
               transfer.ts — JSON export, import parsing, merge
               supabase.ts, remoteCatalog.ts, remoteProgress.ts — optional sync
  hooks/       useTracker  — watch state, route position, advance sequence
               useAuth     — Supabase session; 'disabled' when unconfigured
               useCountdown — the 1s tick, isolated so the stage doesn't re-render
  components/  AuthGate, RouteHeader, Stage, Rail, PlanPanel, Archive, AccountControls
  supabase/    migrations/ — schema and RLS; seed/ — generated catalog
  styles/      global.css — shell tokens; eraVars.ts — per-era CSS custom properties
```

A few things worth knowing:

- **Era colours live in the cascade.** Each era publishes its palette as CSS custom
  properties on its section, and everything inside inherits them — no component takes a
  palette prop or hardcodes a colour.
- **Persistence is defensive.** Stored progress can outlive the catalog that produced it, so
  every entry id is re-checked and every episode index re-bounded on load. Unrecognised keys
  are dropped rather than fed into the readiness maths, and a malformed or unreadable payload
  yields a fresh slate instead of a blank page. Writes are debounced and flushed on
  `pagehide`/`visibilitychange`. Imported files go through the same sanitiser — they are
  user-supplied, so even less trustworthy than something this app wrote itself.
- **Entries are keyed by short code** (`CA1`, `DPW`) — stable ids, so reordering the catalog
  never remaps someone's saved progress.
- **Re-render scope is deliberate.** The countdown owns its own tick inside the header, so a
  second passing does not redraw the stage or the rail.
- **Overflow rules live on `html`/`body` only.** The route view is a fixed viewport, so the
  page itself never scrolls; the stage body and the rail opt in individually. Putting
  `overflow` on a wrapper div makes that div the scroll container, which is what silently
  broke sticky positioning and `scrollTo` in the previous layout. Rail centring uses
  `scrollTo` on the rail element — `scrollIntoView` would move ancestor scrollers too.
- **Every advance timeout is tracked.** The stamp/hold/slide sequence is several chained
  timers; they are cleared before starting a new transition and on unmount, or rapid clicking
  desyncs the position from the stamp.
- **Signed in is not the same as synced.** A remote read that fails means the network is down,
  not that the account is empty — so nothing is pushed, and the panel says sync is unavailable
  rather than claiming success.

## Supabase (optional)

The app runs fully local with no configuration. Adding Supabase credentials turns on two
things: the catalog is read from a table (falling back to the bundled copy on any failure),
and progress syncs across devices behind a magic-link sign-in.

**Setup**

1. In the Supabase SQL editor, run the migrations in order —
   [`0001_init.sql`](supabase/migrations/0001_init.sql) then
   [`0002_route_state.sql`](supabase/migrations/0002_route_state.sql) — followed by
   [`supabase/seed/catalog.sql`](supabase/seed/catalog.sql). The seed must run there rather
   than from the app: the catalog tables have no write policy.
2. Auth → Providers: enable **Email**. Auth → URL Configuration: add your redirect URLs
   (`http://localhost:5173/**` and the deployed URL with `/**`). Sign-in is a hard gate, so
   a wrong redirect URL locks the app out entirely.
   A new project's built-in mailer only delivers to the address on your Supabase account and
   is rate-limited — add real SMTP under Auth → Emails before anyone else can sign in.
3. Locally: `cp .env.example .env.local` and fill in the two values.
4. For deploys: add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as repository secrets
   (Settings → Secrets and variables → Actions).

**On the anon key.** It is compiled into the browser bundle — unavoidable for a static site,
and expected: it is a *publishable* key. Row Level Security is what actually protects data, so
the policies in the migration are load-bearing rather than decorative. Never put the
`service_role` key in `.env` — it bypasses RLS entirely.

**Re-seeding.** Edit the prototype, run `node scripts/generate-catalog.mjs` (which rewrites
both `src/data/catalog.ts` and the seed), then re-run the seed SQL. Removing an entry from the
catalog cascades to anyone's progress against it, which is what removing it means.

## Deployment

Pushing to `main` builds and publishes to GitHub Pages via
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml). The build typechecks first, so
a type error fails the deploy rather than shipping.

Without Supabase credentials there is no backend at all: progress is per-browser and never
leaves your machine except through an export you trigger. With them, progress syncs to your
account and localStorage becomes an offline cache.

## `design/`

The Claude Design prototype this app was ported from — a `.dc.html` component and its runtime,
kept as the design's source of truth. It is **not part of the build**: it only runs inside
claude.ai, since the runtime fetches React from a CDN and the logic calls a host-provided
`window.storage` that no normal browser has. Replacing that with real persistence is why this
port exists.

**The prototype is the catalog's source of truth.** `src/data/catalog.ts` is generated from it
by executing the prototype's own data method and emitting TypeScript from the result, so the
two cannot drift. To change the catalog, edit the prototype and regenerate:

```bash
node scripts/generate-catalog.mjs
```

Do not hand-edit `src/data/catalog.ts` — the next regeneration overwrites it.

## Notes

Watch links point at JioHotstar search by default, with per-entry overrides for titles that
live elsewhere (SonyLIV, Netflix) or are still theatrical. Nothing is scraped and no ratings
or artwork are fetched — posters are generated from each entry's short code.
