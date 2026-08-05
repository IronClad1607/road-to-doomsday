import { supabase } from './supabase';

const IMAGE_BASE = 'https://image.tmdb.org/t/p';

export interface CastMember {
  name: string;
  character: string | null;
  profilePath: string | null;
}

export interface EntryMedia {
  entryId: string;
  tagline: string | null;
  overview: string | null;
  posterPath: string | null;
  backdropPath: string | null;
  voteAverage: number | null;
  cast: readonly CastMember[];
  watchUrl: string | null;
}

export interface EpisodeMedia {
  name: string | null;
  overview: string | null;
  stillPath: string | null;
  runtime: number | null;
}

/** Media keyed by entry id, and per-entry episode detail keyed by index. */
export interface MediaIndex {
  byEntry: ReadonlyMap<string, EntryMedia>;
  episodes: ReadonlyMap<string, ReadonlyMap<number, EpisodeMedia>>;
}

export const EMPTY_MEDIA: MediaIndex = { byEntry: new Map(), episodes: new Map() };

/**
 * Build a TMDB image URL at the requested width.
 *
 * Only the path is stored, so the size is chosen per use — a poster on the
 * stage and a cast headshot should not download the same bytes.
 */
export function imageUrl(path: string | null, size: 'w185' | 'w342' | 'w780' | 'original'): string | null {
  return path ? `${IMAGE_BASE}/${size}${path}` : null;
}

/**
 * Load enrichment for the whole catalog in two queries.
 *
 * Entirely optional: any failure returns empty maps and the app falls back to
 * the generated glyph posters and the clue line it has always had.
 */
export async function loadMedia(): Promise<MediaIndex> {
  if (!supabase) return EMPTY_MEDIA;

  try {
    const [media, episodes] = await Promise.all([
      supabase
        .from('entry_media')
        .select('entry_id, tagline, overview, poster_path, backdrop_path, vote_average, cast_json, watch_url'),
      supabase.from('episode_media').select('entry_id, episode_index, name, overview, still_path, runtime'),
    ]);
    if (media.error || episodes.error) return EMPTY_MEDIA;

    const byEntry = new Map<string, EntryMedia>();
    for (const row of media.data ?? []) {
      byEntry.set(row.entry_id, {
        entryId: row.entry_id,
        tagline: row.tagline,
        overview: row.overview,
        posterPath: row.poster_path,
        backdropPath: row.backdrop_path,
        voteAverage: row.vote_average === null ? null : Number(row.vote_average),
        cast: Array.isArray(row.cast_json) ? (row.cast_json as CastMember[]) : [],
        watchUrl: row.watch_url,
      });
    }

    const byEpisode = new Map<string, Map<number, EpisodeMedia>>();
    for (const row of episodes.data ?? []) {
      let forEntry = byEpisode.get(row.entry_id);
      if (!forEntry) {
        forEntry = new Map();
        byEpisode.set(row.entry_id, forEntry);
      }
      forEntry.set(row.episode_index, {
        name: row.name,
        overview: row.overview,
        stillPath: row.still_path,
        runtime: row.runtime,
      });
    }

    return { byEntry, episodes: byEpisode };
  } catch {
    return EMPTY_MEDIA;
  }
}
