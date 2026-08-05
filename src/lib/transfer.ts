import { HISTORY_LIMIT, sanitiseState, type TrackerState } from './storage';

/** Marker so an imported file can be recognised as ours. */
const APP_ID = 'road-to-doomsday';
const EXPORT_VERSION = 1;

export interface ExportPayload {
  app: typeof APP_ID;
  version: number;
  exportedAt: string;
  mode: TrackerState['mode'];
  watched: TrackerState['watched'];
}

export function buildExport(state: TrackerState): ExportPayload {
  return {
    app: APP_ID,
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    mode: state.mode,
    watched: state.watched,
  };
}

/** `road-to-doomsday-2026-08-04.json` */
export function exportFilename(now: Date = new Date()): string {
  const stamp = now.toISOString().slice(0, 10);
  return `${APP_ID}-${stamp}.json`;
}

export function serialiseExport(state: TrackerState): string {
  return `${JSON.stringify(buildExport(state), null, 2)}\n`;
}

/**
 * Parse an uploaded file back into trusted state.
 *
 * Returns null when the text is not JSON, or is JSON that carries no progress
 * at all — that is a wrong-file mistake worth reporting, rather than something
 * to silently treat as an empty log. Anything that does carry progress goes
 * through the same sanitiser as stored state, so a hand-edited or hostile file
 * cannot inject unknown ids or out-of-range episodes.
 */
export function parseImport(text: string): TrackerState | null {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof raw !== 'object' || raw === null) return null;

  const input = raw as Record<string, unknown>;
  if (!('watched' in input) && !('mode' in input)) return null;

  return sanitiseState(raw);
}

/** How many entries a state has any progress against. */
export function entryCount(state: TrackerState): number {
  return Object.keys(state.watched).length;
}

/** Union two event logs, de-duplicated and oldest first. */
function mergeHistory(
  current: TrackerState['history'],
  incoming: TrackerState['history'],
): TrackerState['history'] {
  const seen = new Set<string>();
  const merged: { at: string; minutes: number }[] = [];
  for (const event of [...current, ...incoming]) {
    const key = `${event.at}|${event.minutes}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(event);
  }
  merged.sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  return merged.slice(-HISTORY_LIMIT);
}

/**
 * Fold an imported log into the current one.
 *
 * Import merges rather than replaces: there is no undo here, and a restore
 * that quietly deleted progress made since the export would be the worst
 * possible failure. Watched stays watched, episode lists union, and the
 * imported plan wins since choosing it is an explicit act.
 */
export function mergeStates(current: TrackerState, incoming: TrackerState): TrackerState {
  const watched: Record<string, true | number[]> = {};

  for (const [id, progress] of Object.entries(current.watched)) {
    watched[id] = Array.isArray(progress) ? [...progress] : true;
  }

  for (const [id, progress] of Object.entries(incoming.watched)) {
    const existing = watched[id];
    if (progress === true || existing === true) {
      watched[id] = true;
      continue;
    }
    const combined = new Set<number>(Array.isArray(existing) ? existing : []);
    for (const index of progress) combined.add(index);
    watched[id] = [...combined].sort((a, b) => a - b);
  }

  return {
    mode: incoming.mode,
    watched,
    // Position is local to this browser, not part of the log — importing a
    // backup should not teleport you somewhere else along the route.
    idx: current.idx,
    // Union by timestamp+minutes, so re-importing the same backup cannot
    // double-count and inflate the observed pace.
    history: mergeHistory(current.history, incoming.history),
  };
}
