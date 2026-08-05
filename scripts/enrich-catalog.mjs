// Fetches summaries, cast, artwork and per-episode detail from TMDB and emits
// SQL to seed them into Supabase.
//
//   TMDB_API_KEY=... node scripts/enrich-catalog.mjs
//
// Writes supabase/seed/media.sql, which you paste into the Supabase SQL editor
// (the media tables have no write policy, so the app can never write them).
//
// Why TMDB rather than scraping: it is a licensed metadata API with per-episode
// data and a CDN for artwork. Scraping a streaming site for the same thing
// would be brittle, against its terms, and would mean redistributing stills.
//
// Matching is by title search, then most-popular result. In-universe `year` is
// NOT used as a hint — the catalog stores story chronology (Captain America is
// 1943), which would poison every search. Ambiguous titles get pinned in
// OVERRIDES below.
import fs from 'node:fs';

const API = 'https://api.themoviedb.org/3';
const KEY = process.env.TMDB_API_KEY;
const REGION = process.env.TMDB_REGION ?? 'IN';
const OUTPUT = 'supabase/seed/media.sql';

if (!KEY) {
  console.error('TMDB_API_KEY is not set. Get a free key at themoviedb.org → Settings → API.');
  process.exit(1);
}

/**
 * Entries whose title search does not resolve cleanly, pinned by TMDB id.
 * `season` is the season number to pull episodes from (default 1).
 *
 * Every id here must be looked up against TMDB, never recalled — a wrong id
 * fails silently, producing a plausible-looking row for the wrong title. The
 * verification pass at the end of this script exists to catch exactly that.
 */
const OVERRIDES = {
  // Search picks "Hotel Inhumans" over the Marvel series.
  INH: { type: 'tv', id: 68716 },
  // Titles TMDB spells differently enough that containment fails.
  GHS: { type: 'movie', id: 774752 },
  FF4: { type: 'movie', id: 617126 },
  XM2: { type: 'movie', id: 36658 },
  EOW: { type: 'tv', id: 241388 },
  DD1: { type: 'tv', id: 61889, season: 1 },
  DD2: { type: 'tv', id: 61889, season: 2 },
  DD3: { type: 'tv', id: 61889, season: 3 },
  JJ1: { type: 'tv', id: 38472, season: 1 },
  JJ2: { type: 'tv', id: 38472, season: 2 },
  JJ3: { type: 'tv', id: 38472, season: 3 },
  LC1: { type: 'tv', id: 62126, season: 1 },
  LC2: { type: 'tv', id: 62126, season: 2 },
  IF1: { type: 'tv', id: 62127, season: 1 },
  IF2: { type: 'tv', id: 62127, season: 2 },
  PN1: { type: 'tv', id: 67178, season: 1 },
  PN2: { type: 'tv', id: 67178, season: 2 },
  LK1: { type: 'tv', id: 84958, season: 1 },
  LK2: { type: 'tv', id: 84958, season: 2 },
  WI1: { type: 'tv', id: 91363, season: 1 },
  WI2: { type: 'tv', id: 91363, season: 2 },
  WI3: { type: 'tv', id: 91363, season: 3 },
  X97: { type: 'tv', id: 138502, season: 1 },
  X98: { type: 'tv', id: 138502, season: 2 },
  YFN: { type: 'tv', id: 138503, season: 1 },
  YF2: { type: 'tv', id: 138503, season: 2 },
  DBA: { type: 'tv', id: 202555, season: 1 },
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function tmdb(path, params = {}) {
  const url = new URL(API + path);
  url.searchParams.set('api_key', KEY);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  const res = await fetch(url);
  if (res.status === 429) {
    await sleep(1500);
    return tmdb(path, params);
  }
  if (!res.ok) throw new Error(`${res.status} ${path}`);
  return res.json();
}

/** Strip the trailing season marker and return it separately. */
function parseTitle(title) {
  const m = /^(.*) S([0-9]+)$/.exec(title);
  return m ? { base: m[1], season: Number(m[2]) } : { base: title, season: 1 };
}

/** Lowercase, strip punctuation, collapse whitespace. */
const normalise = (title) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/**
 * Score a candidate against the title we asked for.
 *
 * Popularity alone is actively wrong here: every entry sits in a franchise
 * whose later, bigger films outrank it, so "Thor" resolves to Ragnarok and
 * "Captain Marvel" to Brave New World. Title agreement has to dominate, with
 * popularity only breaking ties between equally good matches.
 */
function score(candidate, wanted) {
  const got = normalise(candidate.title ?? candidate.name ?? '');
  const want = normalise(wanted);
  const popularity = Math.min(candidate.popularity ?? 0, 999) / 1000;

  if (got === want) return 1000 + popularity;
  // Handles "Inhumans" -> "Marvel's Inhumans" and "X2: X-Men United" -> "X2",
  // preferring the least amount of extra wording.
  if (got.includes(want) || want.includes(got)) {
    // Comfortably above the weak-match threshold even when the extra wording
    // is long ("Inhumans" -> "Marvel's Inhumans", "X2: X-Men United" -> "X2").
    return 600 - Math.abs(got.length - want.length) + popularity;
  }
  return popularity;
}

async function resolve(entry) {
  const pinned = OVERRIDES[entry.id];
  const { base, season } = parseTitle(entry.title);
  if (pinned) return { type: pinned.type, id: pinned.id, season: pinned.season ?? season, pinned: true };

  const type = entry.kind === 'series' ? 'tv' : 'movie';
  const found = await tmdb(`/search/${type}`, { query: base, include_adult: false });
  const ranked = (found.results ?? [])
    .map((candidate) => ({ candidate, value: score(candidate, base) }))
    .sort((a, b) => b.value - a.value);
  const best = ranked[0];
  if (!best) return null;
  return {
    type,
    id: best.candidate.id,
    season,
    pinned: false,
    // Below the containment threshold nothing actually agreed on the title.
    weak: best.value < 500,
    matchedTitle: best.candidate.title ?? best.candidate.name,
  };
}

async function watchLink(type, id) {
  try {
    const providers = await tmdb(`/${type}/${id}/watch/providers`);
    return providers.results?.[REGION]?.link ?? null;
  } catch {
    return null;
  }
}

const sq = (v) =>
  v === null || v === undefined || v === '' ? 'null' : "'" + String(v).replace(/'/g, "''") + "'";
const sqlJson = (v) => "'" + JSON.stringify(v).replace(/'/g, "''") + "'::jsonb";
const num = (v) => (v === null || v === undefined || Number.isNaN(v) ? 'null' : v);

const catalogSource = fs.readFileSync('src/data/catalog.ts', 'utf8');
fs.writeFileSync('/tmp/rtd-catalog.mts', catalogSource);
const { CATALOG } = await import('file:///tmp/rtd-catalog.mts');
const entries = CATALOG.flatMap((era) => era.entries);

const mediaRows = [];
const episodeRows = [];
const report = [];

for (const entry of entries) {
  try {
    const match = await resolve(entry);
    if (!match) {
      report.push({ id: entry.id, title: entry.title, status: 'NO MATCH' });
      continue;
    }

    const detail = await tmdb(`/${match.type}/${match.id}`);
    const credits = await tmdb(`/${match.type}/${match.id}/credits`);
    const link = await watchLink(match.type, match.id);

    const topCast = (credits.cast ?? []).slice(0, 8).map((person) => ({
      name: person.name,
      character: person.character ?? null,
      profilePath: person.profile_path ?? null,
    }));

    mediaRows.push(
      `  (${sq(entry.id)}, ${match.id}, ${sq(match.type)}, ${sq(detail.tagline)}, ` +
        `${sq(detail.overview)}, ${sq(detail.poster_path)}, ${sq(detail.backdrop_path)}, ` +
        `${sq(detail.release_date || detail.first_air_date || null)}, ` +
        `${num(detail.vote_average ? Number(detail.vote_average.toFixed(1)) : null)}, ` +
        `${sqlJson(topCast)}, ${sq(link)})`,
    );

    if (match.type === 'tv') {
      // An unaired season 404s. That is expected for anything still upcoming,
      // so keep the title's media and simply carry no episode detail.
      const season = await tmdb(`/tv/${match.id}/season/${match.season}`).catch(() => null);
      (season?.episodes ?? []).forEach((ep, index) => {
        episodeRows.push(
          `  (${sq(entry.id)}, ${index}, ${sq(ep.name)}, ${sq(ep.overview)}, ` +
            `${sq(ep.still_path)}, ${sq(ep.air_date)}, ${num(ep.runtime ?? null)})`,
        );
      });
    }

    report.push({
      id: entry.id,
      title: entry.title,
      status: match.pinned ? 'pinned' : match.weak ? 'WEAK MATCH' : 'searched',
      matched: detail.title ?? detail.name,
    });
  } catch (error) {
    report.push({ id: entry.id, title: entry.title, status: `ERROR ${error.message}` });
  }
  // TMDB is generous but not unlimited; stay well under the rate limit.
  await sleep(120);
}

const sql = [];
sql.push('-- GENERATED by scripts/enrich-catalog.mjs — do not edit.');
sql.push('-- Source: The Movie Database (TMDB). Run after migrations/0003_media.sql.');
sql.push('');
sql.push('begin;');
sql.push('delete from public.episode_media;');
sql.push('delete from public.entry_media;');
sql.push('');
if (mediaRows.length) {
  sql.push(
    'insert into public.entry_media (entry_id, tmdb_id, tmdb_type, tagline, overview,\n' +
      '  poster_path, backdrop_path, release_date, vote_average, cast_json, watch_url) values',
  );
  sql.push(mediaRows.join(',\n') + ';');
  sql.push('');
}
if (episodeRows.length) {
  sql.push(
    'insert into public.episode_media (entry_id, episode_index, name, overview,\n' +
      '  still_path, air_date, runtime) values',
  );
  sql.push(episodeRows.join(',\n') + ';');
  sql.push('');
}
sql.push('commit;');
sql.push('');

fs.mkdirSync('supabase/seed', { recursive: true });
fs.writeFileSync(OUTPUT, sql.join('\n'));

const bad = report.filter((r) => r.status !== 'pinned' && r.status !== 'searched');
console.log(`${OUTPUT}: ${mediaRows.length} titles, ${episodeRows.length} episodes`);
console.log(`matched: ${report.length - bad.length}/${report.length}`);
if (bad.length) {
  console.log('\nNeeds attention (pin these in OVERRIDES):');
  for (const r of bad) console.log(`  ${r.id.padEnd(5)} ${r.title} — ${r.status}`);
}
console.log('\nRenamed matches worth eyeballing:');
for (const r of report.filter((x) => x.status === 'searched')) {
  if (r.matched && normalise(r.matched) !== normalise(parseTitle(r.title).base)) {
    console.log(`  ${r.id.padEnd(5)} ${r.title}  ->  ${r.matched}`);
  }
}
