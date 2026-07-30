import type { Entry, Era, Mode } from '../data/types';
import {
  isFullyWatched,
  isInMode,
  isPartiallyWatched,
  watchedEpisodeCount,
  type EraProgress,
  type WatchedState,
} from '../lib/progress';
import { eraVars } from '../styles/eraVars';
import { EntryCard } from './EntryCard';
import styles from './EraSection.module.css';

interface EraSectionProps {
  era: Era;
  watched: WatchedState;
  mode: Mode;
  progress: EraProgress;
  onToggleEntry: (entry: Entry) => void;
}

export function EraSection({ era, watched, mode, progress, onToggleEntry }: EraSectionProps) {
  return (
    <section
      className={`${styles.era} ${era.parallel ? styles.eraParallel : ''}`}
      style={eraVars(era.palette)}
      aria-labelledby={`era-${era.id}`}
    >
      <div className={styles.seam} aria-hidden="true" />

      <div className={styles.body}>
        <div className={styles.head}>
          <div>
            <div className={styles.span}>{era.span}</div>
            <h2 className={styles.name} id={`era-${era.id}`}>
              {era.name}
            </h2>
            <div className={styles.dialect}>{era.dialect}</div>
          </div>
          <div className={styles.progress} aria-label={`${progress.done} of ${progress.inMode} logged`}>
            {progress.done}/{progress.inMode}
          </div>
        </div>

        <div className={styles.entries}>
          {era.entries.map((entry) => (
            <EntryCard
              key={entry.id}
              entry={entry}
              status={
                isFullyWatched(entry, watched)
                  ? 'full'
                  : isPartiallyWatched(entry, watched)
                    ? 'partial'
                    : 'none'
              }
              inMode={isInMode(entry, mode)}
              episodesWatched={watchedEpisodeCount(entry, watched)}
              onToggle={onToggleEntry}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
