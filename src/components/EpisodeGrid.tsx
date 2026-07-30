import type { Series } from '../data/types';
import styles from './EpisodeGrid.module.css';

interface EpisodeGridProps {
  entry: Series;
  /** Indices of the episodes logged so far. */
  watched: readonly number[];
  onToggle: (entry: Series, index: number) => void;
}

export function EpisodeGrid({ entry, watched, onToggle }: EpisodeGridProps) {
  return (
    <div className={styles.grid}>
      {entry.episodes.map((title, index) => {
        const done = watched.includes(index);
        return (
          <button
            key={title + index}
            type="button"
            aria-pressed={done}
            onClick={() => onToggle(entry, index)}
            className={`${styles.episode} ${done ? styles.episodeWatched : ''}`}
          >
            <span className={styles.number}>{String(index + 1).padStart(2, '0')}</span>
            <span className={styles.title}>{title}</span>
          </button>
        );
      })}
    </div>
  );
}
