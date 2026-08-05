import type { Entry, Era, Mode, Tier } from '../data/types';

/**
 * Watch progress, keyed by entry id.
 *
 * Films are `true` once watched. Series hold the indices of the episodes
 * watched so far, so partial progress survives. Entries absent from the map
 * are unwatched — nothing is ever stored as "watched: false".
 */
export type WatchedState = Readonly<Record<string, true | readonly number[]>>;

/** The deepest tier each mode includes. */
export const TIER_FOR_MODE: Readonly<Record<Mode, Tier>> = {
  focused: 1,
  completionist: 2,
  everything: 3,
};

export interface ModeMeta {
  id: Mode;
  label: string;
  description: string;
}

export const MODES: readonly ModeMeta[] = [
  {
    id: 'focused',
    label: 'FOCUSED',
    description: 'The Doomsday spine only — nothing that does not point at the film.',
  },
  {
    id: 'completionist',
    label: 'COMPLETE',
    description: 'Spine plus everything recommended — the honest fan’s run.',
  },
  {
    id: 'everything',
    label: 'EVERYTHING',
    description: 'Full canon. One-shots, Netflix, S.H.I.E.L.D., animation, the Fox rail.',
  },
];

/**
 * Clearance ladder: the readiness percentage at which each rank is earned.
 * Ordered ascending — the highest threshold at or below the current percentage
 * wins.
 */
export const RANKS: readonly (readonly [threshold: number, name: string])[] = [
  [0, 'CIVILIAN BYSTANDER'],
  [15, 'TVA ANALYST'],
  [35, 'VARIANT OF INTEREST'],
  [55, 'AVENGER'],
  [75, 'MULTIVERSAL THREAT'],
  [100, 'WORTHY'],
];

/**
 * Floating-point slack when comparing accumulated minutes. Runtimes are whole
 * numbers, so anything within this of the total counts as complete.
 */
const EPSILON = 0.01;

/**
 * One entry's slice of {@link WatchedState}. Passing this around instead of
 * the whole map keeps a card's props stable while unrelated entries change.
 */
export type EntryProgress = true | readonly number[] | undefined;

export type EntryStatus = 'none' | 'partial' | 'full';

/** Total runtime of an entry in minutes. */
export function runtimeMinutes(entry: Entry): number {
  return entry.kind === 'series' ? entry.episodes.length * entry.episodeMinutes : entry.minutes;
}

/** Episodes of a series watched so far. Always 0 for films. */
export function episodesWatched(entry: Entry, progress: EntryProgress): number {
  if (entry.kind !== 'series' || !Array.isArray(progress)) return 0;
  return progress.length;
}

/** Minutes logged against an entry so far. */
export function minutesWatched(entry: Entry, progress: EntryProgress): number {
  if (entry.kind === 'film') return progress ? entry.minutes : 0;
  return episodesWatched(entry, progress) * entry.episodeMinutes;
}

export function statusOf(entry: Entry, progress: EntryProgress): EntryStatus {
  const logged = minutesWatched(entry, progress);
  if (logged >= runtimeMinutes(entry) - EPSILON) return 'full';
  return logged > 0 ? 'partial' : 'none';
}

/** How many episodes of a series have been watched. Always 0 for films. */
export function watchedEpisodeCount(entry: Entry, watched: WatchedState): number {
  return episodesWatched(entry, watched[entry.id]);
}

/** Minutes logged against an entry so far. */
export function watchedMinutes(entry: Entry, watched: WatchedState): number {
  return minutesWatched(entry, watched[entry.id]);
}

export function isFullyWatched(entry: Entry, watched: WatchedState): boolean {
  return statusOf(entry, watched[entry.id]) === 'full';
}

export function isPartiallyWatched(entry: Entry, watched: WatchedState): boolean {
  return statusOf(entry, watched[entry.id]) === 'partial';
}

/** Whether an entry falls inside the currently selected plan. */
export function isInMode(entry: Entry, mode: Mode): boolean {
  return entry.tier <= TIER_FOR_MODE[mode];
}

export interface EraProgress {
  /** Entries in this era that are inside the plan and fully watched. */
  done: number;
  /** Entries in this era that are inside the plan. */
  inMode: number;
}

export interface Readiness {
  /** Completion of the selected plan, 0–100. */
  pct: number;
  /** Minutes logged within the plan. */
  doneMinutes: number;
  /** Total minutes the plan demands. */
  totalMinutes: number;
  /** Current clearance rank. */
  rank: string;
  /** Per-era counts, keyed by era id. */
  perEra: ReadonlyMap<string, EraProgress>;
}

/**
 * Roll up progress across the catalog for the selected plan. Entries outside
 * the plan are excluded from both sides of the ratio, so switching modes
 * rescales readiness rather than penalising you for what you opted out of.
 */
export function computeReadiness(
  catalog: readonly Era[],
  watched: WatchedState,
  mode: Mode,
): Readiness {
  let totalMinutes = 0;
  let doneMinutes = 0;
  const perEra = new Map<string, EraProgress>();

  for (const era of catalog) {
    let done = 0;
    let inMode = 0;
    for (const entry of era.entries) {
      if (!isInMode(entry, mode)) continue;
      inMode += 1;
      totalMinutes += runtimeMinutes(entry);
      doneMinutes += watchedMinutes(entry, watched);
      if (isFullyWatched(entry, watched)) done += 1;
    }
    perEra.set(era.id, { done, inMode });
  }

  const pct = totalMinutes ? Math.min(100, (doneMinutes / totalMinutes) * 100) : 0;
  return { pct, doneMinutes, totalMinutes, rank: rankFor(pct), perEra };
}

/** Eras with at least one entry in the selected plan. */
export function erasInMode(catalog: readonly Era[], mode: Mode): readonly Era[] {
  return catalog.filter((era) => era.entries.some((entry) => isInMode(entry, mode)));
}

/** One stop on the route: an entry together with the era it belongs to. */
export interface Station {
  entry: Entry;
  era: Era;
}

export type NextUp = Station;

/**
 * The route: every in-plan entry flattened into story order.
 *
 * The route view travels this list one station at a time, so the era grouping
 * survives only as each station's `era` reference and as the rail's legs.
 */
export function buildRoute(catalog: readonly Era[], mode: Mode): readonly Station[] {
  return catalog.flatMap((era) =>
    era.entries.filter((entry) => isInMode(entry, mode)).map((entry) => ({ entry, era })),
  );
}

/** Consecutive runs of stations sharing an era — one leg of the rail. */
export interface Leg {
  era: Era;
  /** Route indices belonging to this leg, in order. */
  indices: readonly number[];
  done: number;
}

export function buildLegs(route: readonly Station[], watched: WatchedState): readonly Leg[] {
  const legs: Leg[] = [];
  route.forEach((station, index) => {
    const last = legs[legs.length - 1];
    const done = statusOf(station.entry, watched[station.entry.id]) === 'full' ? 1 : 0;
    if (last && last.era.id === station.era.id) {
      (last.indices as number[]).push(index);
      last.done += done;
    } else {
      legs.push({ era: station.era, indices: [index], done });
    }
  });
  return legs;
}

/**
 * Index of the next station that is not fully logged, searching forward from
 * `from` and wrapping. Returns -1 when the whole route is done.
 */
export function nextUnseenIndex(
  route: readonly Station[],
  watched: WatchedState,
  from: number,
): number {
  for (let step = 1; step <= route.length; step += 1) {
    const index = (from + step) % route.length;
    const station = route[index];
    if (station && statusOf(station.entry, watched[station.entry.id]) !== 'full') return index;
  }
  const current = route[from];
  if (current && statusOf(current.entry, watched[current.entry.id]) !== 'full') return from;
  return -1;
}

/**
 * The next thing to watch: the first entry in story order that is inside the
 * plan and not yet fully logged. Null once the plan is complete.
 */
export function nextUnwatched(
  catalog: readonly Era[],
  watched: WatchedState,
  mode: Mode,
): NextUp | null {
  for (const era of catalog) {
    for (const entry of era.entries) {
      if (!isInMode(entry, mode)) continue;
      if (statusOf(entry, watched[entry.id]) !== 'full') return { entry, era };
    }
  }
  return null;
}

/**
 * Which era to expand when nothing was restored from storage — the first with
 * unfinished business, rather than simply the first in the list.
 */
export function eraToAutoOpen(
  catalog: readonly Era[],
  watched: WatchedState,
  mode: Mode,
): string | null {
  const next = nextUnwatched(catalog, watched, mode);
  if (next) return next.era.id;
  return erasInMode(catalog, mode)[0]?.id ?? null;
}

/** The highest rank earned at this readiness percentage. */
export function rankFor(pct: number): string {
  let name = 'CIVILIAN BYSTANDER';
  for (const [threshold, rankName] of RANKS) {
    if (pct >= threshold) name = rankName;
  }
  return name;
}

/** Whether the finale panel has been earned. */
export function isUnlocked(pct: number): boolean {
  return pct >= 99.999;
}

const WEEK_MS = 7 * 86_400_000;

/**
 * Hours per week needed to finish the plan before the film. The week count is
 * floored well below one so the number stays finite (rather than exploding) in
 * the last days before release.
 */
export function paceLabel(msRemaining: number, remainingMinutes: number): string {
  const { perWeek } = pace(msRemaining, remainingMinutes);
  return perWeek === null ? 'PACE CLEARED' : `${perWeek} HRS/WEEK REQUIRED`;
}

/**
 * How hard the remaining plan is, as a severity band.
 *
 * Note this is the pace *required*, not the pace being achieved — nothing
 * records when entries were watched, so a genuine "you will finish N days
 * late" projection is not computable and is deliberately not faked.
 */
export type PaceSeverity = 'cleared' | 'steady' | 'tight' | 'critical';

export interface Pace {
  /** Hours per week needed from here, or null once the plan is done. */
  perWeek: number | null;
  severity: PaceSeverity;
}

/**
 * Finish-date projection from observed logging rate.
 *
 * `insufficient` is a first-class answer, not a failure: with one or two
 * events there is no rate worth extrapolating, and a confident-looking date
 * built on nothing would be worse than admitting we cannot say yet.
 */
export interface Projection {
  kind: 'cleared' | 'insufficient' | 'stalled' | 'projected';
  /** Observed hours per week over the sampled window. */
  observedPerWeek?: number;
  /** Days past the deadline the plan lands. Negative means days to spare. */
  daysLate?: number;
  /** How close the history is to arming a projection. */
  events?: number;
  daysOfData?: number;
  daysNeeded?: number;
}

/** Recent window preferred, so a change of habit shows up rather than averaging out. */
const RECENT_WINDOW_MS = 28 * 86_400_000;
const MIN_EVENTS = 3;
const MIN_SPAN_MS = 3 * 86_400_000;

export function project(
  history: readonly { at: string; minutes: number }[],
  remainingMinutes: number,
  msRemaining: number,
  now: number = Date.now(),
): Projection {
  if (remainingMinutes <= 0) return { kind: 'cleared' };

  const parsed = history
    .map((event) => ({ at: Date.parse(event.at), minutes: event.minutes }))
    .filter((event) => !Number.isNaN(event.at))
    .sort((a, b) => a.at - b.at);

  const spanDays = parsed.length
    ? (now - (parsed[0]?.at ?? now)) / 86_400_000
    : 0;
  const pending = {
    events: parsed.length,
    daysOfData: Math.floor(spanDays * 10) / 10,
    daysNeeded: MIN_SPAN_MS / 86_400_000,
  };

  const recent = parsed.filter((event) => now - event.at <= RECENT_WINDOW_MS);

  // Nothing at all lately, but a history behind it. Averaging the whole run
  // would quietly absorb the gap and report a comfortable finish date to
  // someone who has stopped watching, so say so instead.
  if (recent.length === 0 && parsed.length > 0) return { kind: 'stalled' };

  const sample = recent.length >= MIN_EVENTS ? recent : parsed;
  if (sample.length < MIN_EVENTS) return { kind: 'insufficient', ...pending };

  const first = sample[0];
  const last = sample[sample.length - 1];
  if (!first || !last) return { kind: 'insufficient' };

  // Measure to now, not to the last event: a week of doing nothing since is
  // part of the rate, and ignoring it would flatter a stalled run.
  const spanMs = Math.max(now - first.at, MIN_SPAN_MS);
  if (now - first.at < MIN_SPAN_MS) return { kind: 'insufficient', ...pending };

  const minutes = sample.reduce((total, event) => total + event.minutes, 0);
  const perWeek = (minutes / spanMs) * WEEK_MS;
  if (perWeek <= 0) return { kind: 'insufficient', ...pending };

  const msNeeded = (remainingMinutes / perWeek) * WEEK_MS;
  const daysLate = Math.round((msNeeded - msRemaining) / 86_400_000);
  return { kind: 'projected', observedPerWeek: Math.round((perWeek / 60) * 10) / 10, daysLate };
}

export function pace(msRemaining: number, remainingMinutes: number): Pace {
  if (remainingMinutes <= 0) return { perWeek: null, severity: 'cleared' };
  const weeks = Math.max(0.15, msRemaining / WEEK_MS);
  const perWeek = Math.max(1, Math.round(remainingMinutes / 60 / weeks));
  // Roughly: under an hour a day is steady, under two is tight, beyond that
  // the plan is not going to happen without a change.
  const severity: PaceSeverity = perWeek <= 7 ? 'steady' : perWeek <= 14 ? 'tight' : 'critical';
  return { perWeek, severity };
}

/** Total hours a mode demands, regardless of what has been watched. */
export function hoursForMode(catalog: readonly Era[], mode: Mode): number {
  let minutes = 0;
  for (const era of catalog) {
    for (const entry of era.entries) {
      if (isInMode(entry, mode)) minutes += runtimeMinutes(entry);
    }
  }
  return Math.round(minutes / 60);
}

/**
 * Where to watch an entry. Falls back to a JioHotstar title search, with any
 * trailing season marker stripped so `Daredevil S1` searches for `Daredevil`.
 */
export function watchUrl(entry: Entry, providerUrl?: string | null): string {
  // A hand-set link wins; then the region's provider link from TMDB, which
  // actually resolves to the title. The search fallback is last because it
  // only ever lands on a results page.
  if (entry.url) return entry.url;
  if (providerUrl) return providerUrl;
  const query = encodeURIComponent(entry.title.replace(/ S[0-9]$/, ''));
  return `https://www.hotstar.com/in/search?q=${query}`;
}

export function serviceLabel(entry: Entry): string {
  return entry.service ?? 'JIOHOTSTAR';
}

/** Runtime as displayed on a card: `2H 04M` for films, `13 EP · 10H` for series. */
export function runtimeLabel(entry: Entry): string {
  if (entry.kind === 'series') {
    const hours = Math.round(runtimeMinutes(entry) / 60);
    return `${entry.episodes.length} EP · ${hours}H`;
  }
  const hours = Math.floor(entry.minutes / 60);
  const minutes = String(entry.minutes % 60).padStart(2, '0');
  return `${hours}H ${minutes}M`;
}

export function stingerLabel(entry: Entry): string {
  return `${entry.stingers} ${entry.stingers === 1 ? 'STINGER' : 'STINGERS'}`;
}
