import { CATALOG } from '../data/catalog';
import type { Entry, Era, EraPalette, Tier } from '../data/types';
import { supabase } from './supabase';

interface EraRow {
  id: string;
  position: number;
  name: string;
  span: string;
  dialect: string;
  parallel: boolean;
  palette: EraPalette;
}

interface EntryRow {
  id: string;
  era_id: string;
  position: number;
  kind: 'film' | 'series';
  title: string;
  year: string;
  minutes: number | null;
  episodes: string[] | null;
  episode_minutes: number | null;
  tier: number;
  stingers: number;
  clue: string;
  service: string | null;
  url: string | null;
  drop_label: string | null;
}

function toEntry(row: EntryRow): Entry | null {
  const base = {
    id: row.id,
    title: row.title,
    year: row.year,
    tier: Math.min(3, Math.max(1, row.tier)) as Tier,
    stingers: row.stingers ?? 0,
    clue: row.clue,
    ...(row.service ? { service: row.service } : {}),
    ...(row.url ? { url: row.url } : {}),
    ...(row.drop_label ? { drop: row.drop_label } : {}),
  };

  if (row.kind === 'film') {
    if (typeof row.minutes !== 'number') return null;
    return { ...base, kind: 'film', minutes: row.minutes };
  }
  if (!Array.isArray(row.episodes) || typeof row.episode_minutes !== 'number') return null;
  return { ...base, kind: 'series', episodes: row.episodes, episodeMinutes: row.episode_minutes };
}

/**
 * Load the catalog from Supabase, falling back to the bundled copy.
 *
 * The fallback is not a nicety — the catalog is the entire page. A cold load
 * on a flaky connection, an unreachable project or a half-seeded table would
 * otherwise render nothing, so any failure quietly serves the generated copy
 * that shipped in the bundle. Both come from the same generator pass, so they
 * only differ if the table has been edited since the last deploy.
 */
export async function loadCatalog(): Promise<{ catalog: readonly Era[]; remote: boolean }> {
  if (!supabase) return { catalog: CATALOG, remote: false };

  try {
    const [eras, entries] = await Promise.all([
      supabase.from('eras').select('*').order('position'),
      supabase.from('entries').select('*').order('position'),
    ]);
    if (eras.error) throw eras.error;
    if (entries.error) throw entries.error;

    const eraRows = (eras.data ?? []) as EraRow[];
    const entryRows = (entries.data ?? []) as EntryRow[];
    if (eraRows.length === 0 || entryRows.length === 0) {
      return { catalog: CATALOG, remote: false };
    }

    const byEra = new Map<string, Entry[]>();
    for (const row of entryRows) {
      const entry = toEntry(row);
      if (!entry) continue;
      const list = byEra.get(row.era_id);
      if (list) list.push(entry);
      else byEra.set(row.era_id, [entry]);
    }

    const catalog: Era[] = [];
    for (const row of eraRows) {
      const list = byEra.get(row.id);
      // An era with no usable entries would render as a dead header.
      if (!list?.length) continue;
      catalog.push({
        id: row.id,
        name: row.name,
        span: row.span,
        dialect: row.dialect,
        ...(row.parallel ? { parallel: true } : {}),
        palette: row.palette,
        entries: list,
      });
    }

    return catalog.length ? { catalog, remote: true } : { catalog: CATALOG, remote: false };
  } catch {
    return { catalog: CATALOG, remote: false };
  }
}
