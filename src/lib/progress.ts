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
  if (remainingMinutes <= 0) return 'PACE CLEARED';
  const weeks = Math.max(0.15, msRemaining / WEEK_MS);
  const perWeek = Math.max(1, Math.round(remainingMinutes / 60 / weeks));
  return `${perWeek} HRS/WEEK REQUIRED`;
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
export function watchUrl(entry: Entry): string {
  if (entry.url) return entry.url;
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
