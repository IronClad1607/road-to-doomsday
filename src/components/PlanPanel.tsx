import { useEffect, useMemo, useState } from 'react';
import type { Era, Mode } from '../data/types';
import type { Auth } from '../hooks/useAuth';
import { DOOMSDAY_AT } from '../hooks/useCountdown';
import {
  MODES,
  RANKS,
  hoursForMode,
  paceLabel,
  type Readiness as ReadinessData,
} from '../lib/progress';
import { AccountControls } from './AccountControls';
import styles from './PlanPanel.module.css';

/** How long the purge button stays armed before disarming itself. */
const ARM_TIMEOUT_MS = 4000;

interface PlanPanelProps {
  mode: Mode;
  readiness: ReadinessData;
  hideLogged: boolean;
  auth: Auth;
  syncing: boolean;
  catalog: readonly Era[];
  onSelectMode: (mode: Mode) => void;
  onToggleHideLogged: () => void;
  onCollapseAll: () => void;
  onPurge: () => void;
}

/**
 * Everything that shapes the plan but is not needed on every scroll: the mode
 * selector, the pace readout, the rank ladder, and the view controls. Kept
 * behind the sticky bar's PLAN toggle so the timeline starts near the top.
 */
export function PlanPanel({
  mode,
  readiness,
  hideLogged,
  auth,
  syncing,
  catalog,
  onSelectMode,
  onToggleHideLogged,
  onCollapseAll,
  onPurge,
}: PlanPanelProps) {
  const [armed, setArmed] = useState(false);

  // Purging destroys a rewatch log with no undo, so it takes two deliberate
  // clicks, and a forgotten half-press disarms rather than lying in wait.
  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => setArmed(false), ARM_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [armed]);

  // Recomputed when the catalog changes, since a remote catalog can differ
  // from the one that shipped in the bundle.
  const hours = useMemo(
    () => new Map(MODES.map((meta) => [meta.id, hoursForMode(catalog, meta.id)])),
    [catalog],
  );

  const active = MODES.find((meta) => meta.id === mode) ?? MODES[1];
  const done = Math.round(readiness.doneMinutes / 60);
  const total = Math.round(readiness.totalMinutes / 60);
  const pace = paceLabel(
    Math.max(0, DOOMSDAY_AT - Date.now()),
    readiness.totalMinutes - readiness.doneMinutes,
  );

  const handlePurge = () => {
    if (!armed) {
      setArmed(true);
      return;
    }
    setArmed(false);
    onPurge();
  };

  return (
    <div className={styles.panel} id="plan-panel">
      <div className={styles.modes} role="group" aria-label="Watch plan">
        {MODES.map((meta) => {
          const selected = meta.id === mode;
          return (
            <button
              key={meta.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onSelectMode(meta.id)}
              className={`${styles.mode} ${selected ? styles.modeSelected : ''}`}
            >
              <div className={styles.modeLabel}>{meta.label}</div>
              <div className={styles.modeHours}>~{hours.get(meta.id)} HRS</div>
            </button>
          );
        })}
      </div>
      <p className={styles.description}>{active?.description}</p>

      <div className={styles.stats}>
        <span>
          {done}H / {total}H LOGGED
        </span>
        <span>{pace}</span>
      </div>

      <h2 className={styles.ladderHeading}>CLEARANCE LADDER</h2>
      <ul className={styles.ranks}>
        {RANKS.map(([threshold, name]) => {
          const current = name === readiness.rank;
          return (
            <li
              key={name}
              aria-current={current ? 'step' : undefined}
              className={[
                styles.rank,
                readiness.pct >= threshold ? styles.rankEarned : '',
                current ? styles.rankCurrent : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <span>{name}</span>
              <span className={styles.rankAt}>{threshold}%</span>
            </li>
          );
        })}
      </ul>

      <div className={styles.controls}>
        <button
          type="button"
          aria-pressed={hideLogged}
          onClick={onToggleHideLogged}
          className={`${styles.control} ${hideLogged ? styles.controlOn : ''}`}
        >
          HIDE LOGGED
        </button>
        <button type="button" onClick={onCollapseAll} className={styles.control}>
          COLLAPSE ALL
        </button>
        <button
          type="button"
          onClick={handlePurge}
          className={`${styles.control} ${armed ? styles.controlArmed : ''}`}
        >
          {armed ? 'CONFIRM PURGE' : 'PURGE PROGRESS'}
        </button>
      </div>

      <AccountControls auth={auth} syncing={syncing} />
    </div>
  );
}
