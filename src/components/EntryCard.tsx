import { memo } from 'react';
import type { Entry } from '../data/types';
import { runtimeLabel, serviceLabel, stingerLabel, watchUrl } from '../lib/progress';
import styles from './EntryCard.module.css';

export interface EntryCardProps {
  entry: Entry;
  /** How much of this entry is logged. */
  status: 'none' | 'partial' | 'full';
  /** Whether the entry falls inside the selected plan. */
  inMode: boolean;
  /** Episodes logged so far. Only meaningful for series. */
  episodesWatched: number;
  onToggle: (entry: Entry) => void;
}

/**
 * One film or series.
 *
 * Memoised on primitive props with the entry and handler passed through
 * untouched, so toggling one card re-renders that card rather than all 104.
 */
export const EntryCard = memo(function EntryCard({
  entry,
  status,
  inMode,
  episodesWatched,
  onToggle,
}: EntryCardProps) {
  const full = status === 'full';

  const checkLabel = full
    ? '✓ LOGGED'
    : status === 'partial' && entry.kind === 'series'
      ? `${episodesWatched}/${entry.episodes.length}`
      : 'MARK WATCHED';

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
        <div
          className={`${styles.poster} ${full ? styles.posterWatched : ''}`}
          aria-hidden="true"
        >
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
            </button>

            <a
              className={styles.service}
              href={watchUrl(entry)}
              target="_blank"
              rel="noopener noreferrer"
            >
              {serviceLabel(entry)} ▸<span className="sr-only"> — watch {entry.title}</span>
            </a>
          </div>
        </div>
      </div>
    </article>
  );
});
