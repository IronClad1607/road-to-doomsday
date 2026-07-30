import type { Entry, Era, Mode, Series } from '../data/types';
import { isInMode, type EraProgress, type WatchedState } from '../lib/progress';
import { eraVars } from '../styles/eraVars';
import { EntryCard } from './EntryCard';
import styles from './EraSection.module.css';

interface EraSectionProps {
  era: Era;
  watched: WatchedState;
  mode: Mode;
  progress: EraProgress;
  open: ReadonlySet<string>;
  onToggleEntry: (entry: Entry) => void;
  onToggleEpisode: (entry: Series, index: number) => void;
  onToggleOpen: (entry: Entry) => void;
}

export function EraSection({
  era,
  watched,
  mode,
  progress,
  open,
  onToggleEntry,
  onToggleEpisode,
  onToggleOpen,
}: EraSectionProps) {
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
              progress={watched[entry.id]}
              inMode={isInMode(entry, mode)}
              open={open.has(entry.id)}
              onToggle={onToggleEntry}
              onToggleEpisode={onToggleEpisode}
              onToggleOpen={onToggleOpen}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
