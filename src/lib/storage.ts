import { ALL_ENTRIES } from '../data/catalog';
import type { Entry, Mode } from '../data/types';
import { MODES, type WatchedState } from './progress';

/**
 * Where progress lives.
 *
 * v3 replaced the scrolling timeline with the route view, which changed the
 * shape of everything except `watched`. The key is versioned alongside it so a
 * rollback reads its own payload rather than misinterpreting this one.
 */
const STORAGE_KEY = 'road-to-doomsday:v3';

/** The v1/v2 key, read once so existing progress survives the upgrade. */
const LEGACY_KEY = 'road-to-doomsday:v1';

const SCHEMA_VERSION = 3;

/**
 * Toggling episodes fires in bursts, so writes are coalesced rather than
 * hitting localStorage (a synchronous, main-thread API) on every click.
 */
const WRITE_DELAY_MS = 200;

export interface TrackerState {
  mode: Mode;
  watched: WatchedState;
  /** Position along the derived route. Clamped whenever the route changes. */
  idx: number;
}

export const DEFAULT_STATE: TrackerState = {
  mode: 'completionist',
  watched: {},
  idx: 0,
};

const ENTRIES_BY_ID = new Map<string, Entry>(ALL_ENTRIES.map((entry) => [entry.id, entry]));
const VALID_MODES = new Set<string>(MODES.map((mode) => mode.id));

function isMode(value: unknown): value is Mode {
  return typeof value === 'string' && VALID_MODES.has(value);
}

/**
 * Rebuild trusted state from an untrusted payload.
 *
 * Progress can outlive the catalog that produced it — entries get added,
 * renamed or retired between visits — so every id is re-checked and every
 * episode index re-bounded here. Anything unrecognised is dropped rather than
 * carried forward, which keeps a stale write from corrupting the readiness
 * maths.
 *
 * Shared with the import path, where the payload is a user-supplied file and
 * so even less trustworthy than a value this app wrote itself.
 */
export function sanitiseState(raw: unknown): TrackerState {
  if (typeof raw !== 'object' || raw === null) return DEFAULT_STATE;
  const input = raw as Record<string, unknown>;

  const mode = isMode(input.mode) ? input.mode : DEFAULT_STATE.mode;

  const watched: Record<string, true | number[]> = {};
  if (typeof input.watched === 'object' && input.watched !== null) {
    for (const [id, value] of Object.entries(input.watched as Record<string, unknown>)) {
      const entry = ENTRIES_BY_ID.get(id);
      if (!entry) continue;

      if (entry.kind === 'film') {
        if (value) watched[id] = true;
        continue;
      }

      if (!Array.isArray(value)) continue;
      const episodes = [
        ...new Set(
          value.filter(
            (index): index is number =>
              Number.isInteger(index) && index >= 0 && index < entry.episodes.length,
          ),
        ),
      ].sort((a, b) => a - b);
      if (episodes.length) watched[id] = episodes;
    }
  }

  // Only a floor is enforced here; the ceiling depends on the derived route,
  // which this module knows nothing about, so the tracker clamps it.
  const idx =
    typeof input.idx === 'number' && Number.isInteger(input.idx) && input.idx >= 0 ? input.idx : 0;

  return { mode, watched, idx };
}

function readKey(key: string): unknown {
  const stored = localStorage.getItem(key);
  if (!stored) return null;
  return JSON.parse(stored);
}

/**
 * Read persisted progress, upgrading a v1/v2 payload if that is all there is.
 *
 * Never throws: a missing, unreadable or malformed entry just yields a fresh
 * slate, because losing a rewatch log is not worth failing to render over.
 */
export function load(): TrackerState {
  try {
    const current = readKey(STORAGE_KEY);
    if (current) return sanitiseState(current);
  } catch {
    // Fall through to the legacy read rather than giving up.
  }

  try {
    const legacy = readKey(LEGACY_KEY);
    // `watched` is unchanged between versions, so the upgrade is just a matter
    // of dropping the fields the route view no longer has.
    if (legacy) return sanitiseState(legacy);
  } catch {
    // Storage unavailable entirely (private mode, blocked cookies).
  }

  return DEFAULT_STATE;
}

let timer: ReturnType<typeof setTimeout> | undefined;
let pending: TrackerState | null = null;

/** Write immediately, dropping any queued write. */
export function flush(): void {
  if (timer !== undefined) {
    clearTimeout(timer);
    timer = undefined;
  }
  if (!pending) return;

  const snapshot = pending;
  pending = null;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: SCHEMA_VERSION,
        mode: snapshot.mode,
        watched: snapshot.watched,
        idx: snapshot.idx,
      }),
    );
  } catch {
    // Quota exceeded or storage disabled — the session still works in memory.
  }
}

/** Queue a debounced write. Call {@link flush} to force it out. */
export function save(state: TrackerState): void {
  pending = state;
  if (timer !== undefined) clearTimeout(timer);
  timer = setTimeout(flush, WRITE_DELAY_MS);
}
