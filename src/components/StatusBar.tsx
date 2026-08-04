import type { CSSProperties } from 'react';
import type { Era } from '../data/types';
import type { EraProgress } from '../lib/progress';
import styles from './StatusBar.module.css';

/**
 * Short rail labels. Purely presentational — the full era names are far too
 * long for chips, so they are abbreviated here rather than in the catalog.
 */
const SHORT_LABELS: Record<string, string> = {
  ancient: 'ANCIENT',
  war: 'WAR',
  vhs: '1995',
  birth: 'BIRTH',
  street: 'STREET',
  shield: 'S.H.I.E.L.D.',
  blip: 'BLIP',
  tva: 'TVA',
  multi: 'MULTIVERSE',
  x828: '828',
  x10005: '10005 ✕',
  x97: 'ANIMATED',
  finale: 'DOOM',
};

interface StatusBarProps {
  pct: number;
  eras: readonly Era[];
  progressFor: (eraId: string) => EraProgress;
  openEra: string | null;
  planOpen: boolean;
  onTogglePlan: () => void;
  onJumpToEra: (eraId: string) => void;
}

export function StatusBar({
  pct,
  eras,
  progressFor,
  openEra,
  planOpen,
  onTogglePlan,
  onJumpToEra,
}: StatusBarProps) {
  return (
    <div className={styles.bar}>
      <div className={styles.row}>
        <div
          className={styles.meter}
          role="progressbar"
          aria-valuenow={Math.floor(pct)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${Math.floor(pct)}% of your watch plan logged`}
        >
          <div className={styles.fill} style={{ width: `${pct}%` }} />
        </div>
        <div className={styles.percent}>{Math.floor(pct)}%</div>
        <button
          type="button"
          className={`${styles.plan} ${planOpen ? styles.planOpen : ''}`}
          aria-expanded={planOpen}
          aria-controls="plan-panel"
          onClick={onTogglePlan}
        >
          PLAN {planOpen ? '▴' : '▾'}
        </button>
      </div>

      <div className={styles.rail}>
        {eras.map((era) => {
          const progress = progressFor(era.id);
          const active = era.id === openEra;
          return (
            <button
              key={era.id}
              type="button"
              aria-current={active ? 'true' : undefined}
              className={`${styles.chip} ${active ? styles.chipActive : ''}`}
              style={{ '--chip-accent': era.palette.accent } as CSSProperties}
              onClick={() => onJumpToEra(era.id)}
            >
              {SHORT_LABELS[era.id] ?? era.name.toUpperCase()}
              <span className={styles.chipCount}>
                {progress.done}/{progress.inMode}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
