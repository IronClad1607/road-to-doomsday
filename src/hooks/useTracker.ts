import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Entry, Mode } from '../data/types';
import type { WatchedState } from '../lib/progress';
import { flush, load, save, type TrackerState } from '../lib/storage';
import { mergeStates } from '../lib/transfer';

export interface Tracker {
  mode: Mode;
  watched: WatchedState;
  /** Ids of series whose episode lists are expanded. */
  open: ReadonlySet<string>;
  setMode: (mode: Mode) => void;
  /** Mark an entry watched, or unwatched. Series toggle all-or-nothing. */
  toggleEntry: (entry: Entry) => void;
  toggleEpisode: (entry: Entry, index: number) => void;
  toggleOpen: (entry: Entry) => void;
  /** Wipe all progress. Keeps the selected mode. */
  purge: () => void;
  /** Fold an imported log into the current one. */
  merge: (incoming: TrackerState) => void;
  /** Current state, for export. */
  snapshot: TrackerState;
}

/**
 * Owns watch progress and keeps it on disk.
 *
 * State is read from storage synchronously on first render, so a reload paints
 * the logged state immediately rather than flashing an empty tracker and then
 * filling in.
 */
export function useTracker(): Tracker {
  const [state, setState] = useState<TrackerState>(load);

  const update = useCallback((updater: (prev: TrackerState) => TrackerState) => {
    setState((prev) => {
      const next = updater(prev);
      save(next);
      return next;
    });
  }, []);

  // Writes are debounced, so force any queued one out before the page goes
  // away. pagehide covers navigation and tab close; visibilitychange covers
  // mobile backgrounding, where pagehide is not guaranteed to fire.
  useEffect(() => {
    const onHide = () => flush();
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('pagehide', onHide);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', onHide);
      document.removeEventListener('visibilitychange', onVisibility);
      flush();
    };
  }, []);

  const setMode = useCallback(
    (mode: Mode) => update((prev) => (prev.mode === mode ? prev : { ...prev, mode })),
    [update],
  );

  const toggleEntry = useCallback(
    (entry: Entry) =>
      update((prev) => {
        const watched = { ...prev.watched };
        if (entry.kind === 'film') {
          if (watched[entry.id]) delete watched[entry.id];
          else watched[entry.id] = true;
        } else {
          const current = watched[entry.id];
          const logged = Array.isArray(current) ? current.length : 0;
          if (logged === entry.episodes.length) delete watched[entry.id];
          else watched[entry.id] = entry.episodes.map((_, index) => index);
        }
        return { ...prev, watched };
      }),
    [update],
  );

  const toggleEpisode = useCallback(
    (entry: Entry, index: number) =>
      update((prev) => {
        if (entry.kind !== 'series') return prev;
        const current = prev.watched[entry.id];
        const episodes = Array.isArray(current) ? [...current] : [];
        const at = episodes.indexOf(index);
        if (at >= 0) episodes.splice(at, 1);
        else episodes.push(index);

        const watched = { ...prev.watched };
        // Unwatched entries are absent rather than empty, so progress stays a
        // record of what was actually logged.
        if (episodes.length) watched[entry.id] = episodes.sort((a, b) => a - b);
        else delete watched[entry.id];
        return { ...prev, watched };
      }),
    [update],
  );

  const toggleOpen = useCallback(
    (entry: Entry) =>
      update((prev) => {
        const open = prev.open.includes(entry.id)
          ? prev.open.filter((id) => id !== entry.id)
          : [...prev.open, entry.id];
        return { ...prev, open };
      }),
    [update],
  );

  const purge = useCallback(
    () => update((prev) => ({ mode: prev.mode, watched: {}, open: [] })),
    [update],
  );

  const merge = useCallback(
    (incoming: TrackerState) => update((prev) => mergeStates(prev, incoming)),
    [update],
  );

  const open = useMemo(() => new Set(state.open), [state.open]);

  return {
    mode: state.mode,
    watched: state.watched,
    open,
    setMode,
    toggleEntry,
    toggleEpisode,
    toggleOpen,
    purge,
    merge,
    snapshot: state,
  };
}
