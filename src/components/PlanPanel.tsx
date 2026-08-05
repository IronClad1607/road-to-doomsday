import { useEffect, useMemo, useRef, useState } from 'react';
import type { Era, Mode } from '../data/types';
import type { Auth } from '../hooks/useAuth';
import { DOOMSDAY_AT } from '../hooks/useCountdown';
import {
  MODES,
  RANKS,
  hoursForMode,
  isUnlocked,
  paceLabel,
  type Readiness as ReadinessData,
} from '../lib/progress';
import type { TrackerState } from '../lib/storage';
import { AccountControls } from './AccountControls';
import { Archive } from './Archive';
import styles from './PlanPanel.module.css';

/** How long the purge button stays armed before disarming itself. */
const ARM_TIMEOUT_MS = 4000;

interface PlanPanelProps {
  mode: Mode;
  readiness: ReadinessData;
  catalog: readonly Era[];
  auth: Auth;
  syncing: boolean;
  snapshot: TrackerState;
  /** Route index of the next unwatched station, or -1 when the plan is done. */
  nextUnseen: number;
  onSelectMode: (mode: Mode) => void;
  onJumpToNextUnseen: () => void;
  onPurge: () => void;
  onImport: (incoming: TrackerState) => void;
  onClose: () => void;
}

/**
 * Slide-over holding everything that shapes the plan but is not needed while
 * travelling the route.
 */
export function PlanPanel({
  mode,
  readiness,
  catalog,
  auth,
  syncing,
  snapshot,
  nextUnseen,
  onSelectMode,
  onJumpToNextUnseen,
  onPurge,
  onImport,
  onClose,
}: PlanPanelProps) {
  const [armed, setArmed] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => setArmed(false), ARM_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [armed]);

  // Move focus into the panel so keyboard users are not left behind it.
  useEffect(() => {
    panelRef.current?.focus();
  }, []);

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
  const unlocked = isUnlocked(readiness.pct);

  const handlePurge = () => {
    if (!armed) {
      setArmed(true);
      return;
    }
    setArmed(false);
    onPurge();
  };

  return (
    <>
      <div className={styles.scrim} onClick={onClose} aria-hidden="true" />
      <div
        className={styles.panel}
        id="plan-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Plan"
        tabIndex={-1}
        ref={panelRef}
      >
        <div className={styles.panelHead}>
          <h2 className={styles.panelTitle}>Plan</h2>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close plan">
            ✕
          </button>
        </div>

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

        <h3 className={styles.ladderHeading}>CLEARANCE LADDER</h3>
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

        <div className={`${styles.finale} ${unlocked ? styles.finaleOpen : ''}`}>
          <div className={styles.finaleSeal}>
            LATVERIAN SEAL · CLEARANCE {Math.floor(readiness.pct)}%
          </div>
          <div className={styles.finaleTitle}>
            {unlocked ? 'The Chair Is Yours' : 'Sealed Until Ready'}
          </div>
          <p className={styles.finaleBody}>
            {unlocked
              ? 'Every station on your route is logged. You walk into the 09:00 show carrying the whole timeline in your head.'
              : 'This opens at 100% readiness in your chosen plan. Latveria does not reward the unprepared.'}
          </p>
        </div>

        <div className={styles.controls}>
          <button
            type="button"
            className={styles.control}
            disabled={nextUnseen < 0}
            onClick={onJumpToNextUnseen}
          >
            {nextUnseen < 0 ? 'ROUTE COMPLETE' : 'JUMP TO NEXT UNSEEN'}
          </button>
          <button
            type="button"
            onClick={handlePurge}
            className={`${styles.control} ${armed ? styles.controlArmed : ''}`}
          >
            {armed ? 'CONFIRM PURGE' : 'PURGE PROGRESS'}
          </button>
        </div>

        <Archive state={snapshot} onImport={onImport} />
        <AccountControls auth={auth} syncing={syncing} />
      </div>
    </>
  );
}
