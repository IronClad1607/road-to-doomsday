import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CATALOG } from '../data/catalog';
import type { Entry, Mode } from '../data/types';
import { eraToAutoOpen, type WatchedState } from '../lib/progress';
import { fetchRemoteState, pushRemoteState, reconcile } from '../lib/remoteProgress';
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
  /** Id of the expanded era, or null. Only one is open at a time. */
  openEra: string | null;
  hideLogged: boolean;
  /** Open an era, or pass the open era's id to collapse it. */
  setOpenEra: (eraId: string | null) => void;
  toggleHideLogged: () => void;
  collapseAll: () => void;
  /** Wipe all progress. Keeps the selected mode. */
  purge: () => void;
  /** Fold an imported log into the current one. */
  merge: (incoming: TrackerState) => void;
  /** Current state, for export. */
  snapshot: TrackerState;
  /** True while the account's log is being reconciled with this browser's. */
  syncing: boolean;
}

/**
 * Owns watch progress and keeps it on disk.
 *
 * State is read from storage synchronously on first render, so a reload paints
 * the logged state immediately rather than flashing an empty tracker and then
 * filling in.
 */
/**
 * Restore state, expanding the era with unfinished business when storage did
 * not carry one. Done at hydration rather than in an effect so the first paint
 * already shows the right era open.
 */
function hydrate(): TrackerState {
  const restored = load();
  if (restored.openEra) return restored;
  return { ...restored, openEra: eraToAutoOpen(CATALOG, restored.watched, restored.mode) };
}

export function useTracker(userId: string | null): Tracker {
  const [state, setState] = useState<TrackerState>(hydrate);
  const [syncing, setSyncing] = useState(false);
  // Which account the current state belongs to, so a sign-out does not push
  // one user's log into another's account.
  const ownerRef = useRef<string | null>(null);

  const update = useCallback(
    (updater: (prev: TrackerState) => TrackerState) => {
      setState((prev) => {
        const next = updater(prev);
        // localStorage stays the offline cache even when signed in — a dropped
        // connection should cost you nothing.
        save(next);
        if (ownerRef.current) void pushRemoteState(ownerRef.current, next);
        return next;
      });
    },
    [],
  );

  // On sign-in, fold the account's log together with whatever this browser
  // already had, then push the union back. On sign-out, just stop syncing —
  // the local copy is left exactly as it is.
  useEffect(() => {
    if (!userId) {
      ownerRef.current = null;
      return;
    }
    let cancelled = false;
    setSyncing(true);

    void (async () => {
      const remote = await fetchRemoteState(userId);
      if (cancelled) return;

      if (remote) {
        setState((prev) => {
          const merged = reconcile(prev, remote);
          save(merged);
          void pushRemoteState(userId, merged);
          return merged;
        });
      }
      // A failed read means the network is down, not that the account is
      // empty — so nothing is pushed, and local progress is left untouched.
      ownerRef.current = remote ? userId : null;
      setSyncing(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

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

  const setOpenEra = useCallback(
    (eraId: string | null) =>
      // Opening one era closes whichever was open — the accordion holds a
      // single id rather than a set.
      update((prev) => ({ ...prev, openEra: prev.openEra === eraId ? null : eraId })),
    [update],
  );

  const toggleHideLogged = useCallback(
    () => update((prev) => ({ ...prev, hideLogged: !prev.hideLogged })),
    [update],
  );

  const collapseAll = useCallback(
    () => update((prev) => ({ ...prev, openEra: null, open: [] })),
    [update],
  );

  const purge = useCallback(
    () => update((prev) => ({ ...prev, watched: {}, open: [] })),
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
    openEra: state.openEra,
    hideLogged: state.hideLogged,
    setOpenEra,
    toggleHideLogged,
    collapseAll,
    purge,
    merge,
    snapshot: state,
    syncing,
  };
}
