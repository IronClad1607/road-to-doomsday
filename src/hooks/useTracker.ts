import { useCallback, useEffect, useRef, useState } from 'react';
import type { Entry, Mode, Series } from '../data/types';
import { fetchRemoteState, pushRemoteState, reconcile } from '../lib/remoteProgress';
import { statusOf, type WatchedState } from '../lib/progress';
import { flush, load, save, type TrackerState } from '../lib/storage';
import { mergeStates } from '../lib/transfer';

/**
 * Advance-on-mark timings. The stamp lands first, holds long enough to read,
 * then the station slides out and the next slides in.
 */
export const STAMP_MS = 500;
export const HOLD_MS = 820;
export const SLIDE_OUT_MS = 190;
export const SLIDE_IN_MS = 280;

export type Anim = 'in' | 'out';

export interface Tracker {
  mode: Mode;
  watched: WatchedState;
  idx: number;
  anim: Anim;
  /** Whether the LOGGED stamp is showing on the current station. */
  stamped: boolean;
  setMode: (mode: Mode) => void;
  /** Move to a station directly. Cancels any in-flight advance. */
  goTo: (index: number) => void;
  /** Mark an entry watched or unwatched. Completing it advances the route. */
  toggleEntry: (entry: Entry) => void;
  toggleEpisode: (entry: Series, index: number) => void;
  purge: () => void;
  merge: (incoming: TrackerState) => void;
  snapshot: TrackerState;
  /** True while the account's log is being reconciled with this browser's. */
  syncing: boolean;
  /**
   * True only once a remote read has actually succeeded. Being signed in is
   * not enough — if the read fails the UI must not claim to be synced.
   */
  synced: boolean;
}

/**
 * Owns watch progress, position along the route, and the advance animation.
 *
 * `routeLength` is passed in rather than derived here so this hook stays
 * independent of the catalog; it is only used to clamp `idx`.
 */
export function useTracker(userId: string | null, routeLength: number): Tracker {
  const [state, setState] = useState<TrackerState>(load);
  const [anim, setAnim] = useState<Anim>('in');
  const [stamped, setStamped] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [synced, setSynced] = useState(false);

  const ownerRef = useRef<string | null>(null);
  // Every pending step of an advance, so a second mark can cancel the first.
  // Without this, rapid clicking desyncs idx from the stamp.
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    for (const timer of timers.current) clearTimeout(timer);
    timers.current = [];
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const update = useCallback((updater: (prev: TrackerState) => TrackerState) => {
    setState((prev) => {
      const next = updater(prev);
      save(next);
      if (ownerRef.current) void pushRemoteState(ownerRef.current, next);
      return next;
    });
  }, []);

  // Clamp whenever the route shrinks — changing plan mode can strand idx past
  // the end of the new route.
  useEffect(() => {
    if (routeLength <= 0) return;
    setState((prev) => {
      const clamped = Math.min(prev.idx, routeLength - 1);
      if (clamped === prev.idx) return prev;
      const next = { ...prev, idx: clamped };
      save(next);
      return next;
    });
  }, [routeLength]);

  useEffect(() => {
    if (!userId) {
      ownerRef.current = null;
      setSynced(false);
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
      // empty — so nothing is pushed and local progress is left alone.
      ownerRef.current = remote ? userId : null;
      setSynced(remote !== null);
      setSyncing(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

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

  const goTo = useCallback(
    (index: number) => {
      clearTimers();
      setStamped(false);
      setAnim('in');
      update((prev) => ({
        ...prev,
        idx: Math.max(0, Math.min(index, Math.max(0, routeLength - 1))),
      }));
    },
    [clearTimers, routeLength, update],
  );

  /** Stamp, hold, slide out, step forward, slide in. */
  const advance = useCallback(() => {
    clearTimers();
    const at = (ms: number, fn: () => void) => {
      timers.current.push(setTimeout(fn, ms));
    };

    setStamped(true);
    at(HOLD_MS, () => setAnim('out'));
    at(HOLD_MS + SLIDE_OUT_MS, () => {
      setStamped(false);
      setAnim('in');
      update((prev) => ({ ...prev, idx: Math.min(prev.idx + 1, Math.max(0, routeLength - 1)) }));
    });
  }, [clearTimers, routeLength, update]);

  const setMode = useCallback(
    (mode: Mode) => {
      clearTimers();
      setStamped(false);
      // Position is kept, not reset — the clamp effect pulls it back into
      // range if the new route is shorter. Switching plans should not cost you
      // your place when the station you were on still exists.
      update((prev) => (prev.mode === mode ? prev : { ...prev, mode }));
    },
    [clearTimers, update],
  );

  const toggleEntry = useCallback(
    (entry: Entry) => {
      let completed = false;
      update((prev) => {
        const watched = { ...prev.watched };
        const before = statusOf(entry, watched[entry.id]);

        if (entry.kind === 'film') {
          if (watched[entry.id]) delete watched[entry.id];
          else watched[entry.id] = true;
        } else {
          const current = watched[entry.id];
          const logged = Array.isArray(current) ? current.length : 0;
          if (logged === entry.episodes.length) delete watched[entry.id];
          else watched[entry.id] = entry.episodes.map((_, index) => index);
        }

        // Only completing advances. Unmarking must never move you on.
        completed = before !== 'full' && statusOf(entry, watched[entry.id]) === 'full';
        return { ...prev, watched };
      });
      if (completed) advance();
    },
    [advance, update],
  );

  const toggleEpisode = useCallback(
    (entry: Series, index: number) => {
      let completed = false;
      update((prev) => {
        const current = prev.watched[entry.id];
        const episodes = Array.isArray(current) ? [...current] : [];
        const at = episodes.indexOf(index);
        if (at >= 0) episodes.splice(at, 1);
        else episodes.push(index);

        const watched = { ...prev.watched };
        if (episodes.length) watched[entry.id] = episodes.sort((a, b) => a - b);
        else delete watched[entry.id];

        completed =
          statusOf(entry, current) !== 'full' && statusOf(entry, watched[entry.id]) === 'full';
        return { ...prev, watched };
      });
      if (completed) advance();
    },
    [advance, update],
  );

  const purge = useCallback(() => {
    clearTimers();
    setStamped(false);
    update((prev) => ({ ...prev, watched: {}, idx: 0 }));
  }, [clearTimers, update]);

  const merge = useCallback(
    (incoming: TrackerState) => update((prev) => mergeStates(prev, incoming)),
    [update],
  );

  return {
    mode: state.mode,
    watched: state.watched,
    idx: state.idx,
    anim,
    stamped,
    setMode,
    goTo,
    toggleEntry,
    toggleEpisode,
    purge,
    merge,
    snapshot: state,
    syncing,
    synced,
  };
}
