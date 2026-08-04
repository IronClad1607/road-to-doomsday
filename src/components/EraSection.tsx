import type { Entry, Era, Mode, Series } from '../data/types';
import { isInMode, statusOf, type EraProgress, type WatchedState } from '../lib/progress';
import { eraVars } from '../styles/eraVars';
import { EntryCard } from './EntryCard';
import styles from './EraSection.module.css';

interface EraSectionProps {
  era: Era;
  watched: WatchedState;
  mode: Mode;
  progress: EraProgress;
  /** Whether this era's entries are expanded. */
  isOpen: boolean;
  /** Ids of series whose episode lists are expanded. */
  open: ReadonlySet<string>;
  hideLogged: boolean;
  onToggleEra: (eraId: string) => void;
  onToggleEntry: (entry: Entry) => void;
  onToggleEpisode: (entry: Series, index: number) => void;
  onToggleOpen: (entry: Entry) => void;
}

/** DOM id used as the scroll target when jumping to an era. */
export const eraDomId = (eraId: string) => `era-${eraId}`;

export function EraSection({
  era,
  watched,
  mode,
  progress,
  isOpen,
  open,
  hideLogged,
  onToggleEra,
  onToggleEntry,
  onToggleEpisode,
  onToggleOpen,
}: EraSectionProps) {
  const panelId = `era-panel-${era.id}`;

  const visible = hideLogged
    ? era.entries.filter((entry) => statusOf(entry, watched[entry.id]) !== 'full')
    : era.entries;

  return (
    <section
      id={eraDomId(era.id)}
      className={`${styles.era} ${era.parallel ? styles.eraParallel : ''}`}
      style={eraVars(era.palette)}
      aria-labelledby={`era-heading-${era.id}`}
    >
      <div className={styles.seam} aria-hidden="true" />

      <button
        type="button"
        className={styles.head}
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => onToggleEra(era.id)}
      >
        <span className={styles.headText}>
          <span className={styles.span}>{era.span}</span>
          <span className={styles.name} id={`era-heading-${era.id}`}>
            {era.name}
          </span>
          <span className={styles.dialect}>{era.dialect}</span>
        </span>

        <span className={styles.headMeta}>
          <span className={styles.progress}>
            {progress.done}/{progress.inMode}
          </span>
          <span className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`} aria-hidden="true">
            ▾
          </span>
        </span>
      </button>

      {isOpen && (
        <div className={styles.body} id={panelId}>
          {visible.length === 0 ? (
            <p className={styles.empty}>ALL LOGGED IN THIS ERA</p>
          ) : (
            <div className={styles.entries}>
              {visible.map((entry) => (
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
          )}
        </div>
      )}
    </section>
  );
}
