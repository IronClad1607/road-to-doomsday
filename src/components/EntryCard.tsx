import { memo } from 'react';
import type { Entry, Series } from '../data/types';
import {
  episodesWatched,
  runtimeLabel,
  serviceLabel,
  statusOf,
  stingerLabel,
  watchUrl,
  type EntryProgress,
} from '../lib/progress';
import { EpisodeGrid } from './EpisodeGrid';
import styles from './EntryCard.module.css';

const NO_EPISODES: readonly number[] = [];

export interface EntryCardProps {
  entry: Entry;
  /** This entry's slice of watch state. */
  progress: EntryProgress;
  /** Whether the entry falls inside the selected plan. */
  inMode: boolean;
  /** Whether the episode list is expanded. */
  open: boolean;
  onToggle: (entry: Entry) => void;
  onToggleEpisode: (entry: Series, index: number) => void;
  onToggleOpen: (entry: Entry) => void;
}

/**
 * One film or series.
 *
 * Memoised, and given only its own slice of watch state rather than the whole
 * map, so checking one card re-renders that card instead of all 104. The
 * entry and the handlers are stable, so they do not defeat it.
 */
export const EntryCard = memo(function EntryCard({
  entry,
  progress,
  inMode,
  open,
  onToggle,
  onToggleEpisode,
  onToggleOpen,
}: EntryCardProps) {
  const status = statusOf(entry, progress);
  const full = status === 'full';
  const watchedEpisodes = Array.isArray(progress) ? progress : NO_EPISODES;
  const episodeCount = episodesWatched(entry, progress);

  const checkLabel = full
    ? '✓ LOGGED'
    : status === 'partial' && entry.kind === 'series'
      ? `${episodeCount}/${entry.episodes.length}`
      : 'MARK WATCHED';

  const panelId = `episodes-${entry.id}`;

  return (
    <article
      className={[
        styles.card,
        status === 'partial' ? styles.cardPartial : '',
        full ? styles.cardFull : '',
        inMode ? '' : styles.cardOut,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className={styles.inner}>
        <div className={`${styles.poster} ${full ? styles.posterWatched : ''}`} aria-hidden="true">
          <div className={styles.glyph}>{entry.id}</div>
          <div className={styles.kind}>{entry.kind === 'series' ? 'SERIES' : 'FILM'}</div>
        </div>

        <div className={styles.details}>
          <div className={styles.meta}>
            <span className={styles.year}>{entry.year}</span>
            <span className={styles.runtime}>{runtimeLabel(entry)}</span>
            {entry.stingers > 0 && <span className={styles.stingers}>{stingerLabel(entry)}</span>}
            {entry.drop && <span className={styles.drop}>{entry.drop}</span>}
          </div>

          <h3 className={styles.title}>{entry.title}</h3>

          <p className={styles.clue}>
            <span className={styles.clueLabel}>CLUE ▸ </span>
            {entry.clue}
          </p>

          <div className={styles.actions}>
            <button
              type="button"
              aria-pressed={full}
              onClick={() => onToggle(entry)}
              className={`${styles.check} ${full ? styles.checkDone : ''}`}
            >
              {checkLabel}
              <span className="sr-only"> — {entry.title}</span>
            </button>

            <a
              className={styles.service}
              href={watchUrl(entry)}
              target="_blank"
              rel="noopener noreferrer"
            >
              {serviceLabel(entry)} ▸<span className="sr-only"> — watch {entry.title}</span>
            </a>

            {entry.kind === 'series' && (
              <button
                type="button"
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => onToggleOpen(entry)}
                className={styles.episodes}
              >
                EP {episodeCount}/{entry.episodes.length} {open ? '▴' : '▾'}
              </button>
            )}
          </div>

          {entry.kind === 'series' && open && (
            <div id={panelId}>
              <EpisodeGrid entry={entry} watched={watchedEpisodes} onToggle={onToggleEpisode} />
            </div>
          )}
        </div>
      </div>
    </article>
  );
});
