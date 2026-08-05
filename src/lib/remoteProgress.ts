import type { Mode } from '../data/types';
import { DEFAULT_STATE, type TrackerState } from './storage';
import { supabase } from './supabase';
import { mergeStates } from './transfer';

interface ProgressRow {
  entry_id: string;
  episodes: number[] | null;
}

interface PreferencesRow {
  mode: Mode;
  idx: number | null;
  history: { at: string; minutes: number }[] | null;
}

/**
 * Read a signed-in user's progress and preferences.
 *
 * Returns null when the read fails, so callers can tell "nothing stored yet"
 * (an empty state) apart from "could not reach the server" — the difference
 * between seeding a new account and destroying an existing log.
 */
export async function fetchRemoteState(userId: string): Promise<TrackerState | null> {
  if (!supabase) return null;

  try {
    const [progress, preferences] = await Promise.all([
      supabase.from('progress').select('entry_id, episodes').eq('user_id', userId),
      supabase.from('preferences').select('mode, idx, history').eq('user_id', userId).maybeSingle(),
    ]);
    if (progress.error) throw progress.error;
    if (preferences.error) throw preferences.error;

    const watched: Record<string, true | number[]> = {};
    for (const row of (progress.data ?? []) as ProgressRow[]) {
      watched[row.entry_id] = Array.isArray(row.episodes) ? row.episodes : true;
    }

    const prefs = preferences.data as PreferencesRow | null;
    return {
      mode: prefs?.mode ?? DEFAULT_STATE.mode,
      watched,
      idx: prefs?.idx ?? 0,
      history: prefs?.history ?? [],
    };
  } catch {
    return null;
  }
}

/**
 * Replace the user's stored progress with `state`.
 *
 * Progress is diffed rather than wiped and rewritten: deleting every row and
 * re-inserting would briefly leave the account empty, and a failure halfway
 * through would leave it that way.
 */
export async function pushRemoteState(userId: string, state: TrackerState): Promise<boolean> {
  if (!supabase) return false;

  try {
    // `updated_at` is deliberately not sent. Upsert only writes the columns it
    // is given, so leaving it out preserves each row's insert time — roughly
    // when the entry was first logged. Sending a fresh timestamp rewrote every
    // row on every sync, which destroyed that record entirely.
    const rows = Object.entries(state.watched).map(([entryId, progress]) => ({
      user_id: userId,
      entry_id: entryId,
      episodes: Array.isArray(progress) ? [...progress] : null,
    }));

    if (rows.length) {
      const { error } = await supabase.from('progress').upsert(rows, {
        onConflict: 'user_id,entry_id',
      });
      if (error) throw error;
    }

    // Anything no longer watched must go, or unchecking would never stick.
    const keep = Object.keys(state.watched);
    const stale = supabase.from('progress').delete().eq('user_id', userId);
    const { error: deleteError } = keep.length
      ? await stale.not('entry_id', 'in', `(${keep.map((id) => `"${id}"`).join(',')})`)
      : await stale;
    if (deleteError) throw deleteError;

    const { error: prefsError } = await supabase.from('preferences').upsert(
      {
        user_id: userId,
        mode: state.mode,
        idx: state.idx,
        history: state.history,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );
    if (prefsError) throw prefsError;

    return true;
  } catch {
    return false;
  }
}

/**
 * What the account should hold the first time this browser signs in.
 *
 * Local and remote logs are merged rather than one overwriting the other:
 * signing in on a machine where you had already logged things should not
 * discard either side. Same union rule as file import.
 */
export function reconcile(local: TrackerState, remote: TrackerState): TrackerState {
  // Union of both logs, keeping the plan and position of the browser you are
  // actually sitting in front of.
  return { ...mergeStates(local, remote), mode: local.mode, idx: local.idx };
}
