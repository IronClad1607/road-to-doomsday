import { useCountdown } from '../hooks/useCountdown';
import { pace } from '../lib/progress';
import styles from './RouteHeader.module.css';

interface RouteHeaderProps {
  station: number;
  total: number;
  logged: number;
  pct: number;
  /** Minutes of the plan still unwatched, for the pace readout. */
  remainingMinutes: number;
  planOpen: boolean;
  onTogglePlan: () => void;
  onOpenSearch: () => void;
}

export function RouteHeader({
  station,
  total,
  logged,
  pct,
  remainingMinutes,
  planOpen,
  onTogglePlan,
  onOpenSearch,
}: RouteHeaderProps) {
  const { days, hours, minutes, seconds, msRemaining } = useCountdown();
  const { perWeek, severity } = pace(msRemaining, remainingMinutes);

  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        Road to
        <span className={styles.brandAccent}>Doomsday</span>
      </div>

      <div className={styles.station}>
        <span className={styles.stationWords}>STATION </span>
        {station} / {total}
        <span className={styles.stationWords}> · {logged} LOGGED</span>
      </div>

      <div className={styles.progress}>
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
      </div>

      <div
        className={styles.countdown}
        role="timer"
        aria-label={`${Number(days)} days until Avengers: Doomsday`}
      >
        <div aria-hidden="true">
          <span className={styles.days}>{days}</span>
          <span className={styles.daysUnit}>DAYS</span>
        </div>
        <div className={styles.clock} aria-hidden="true">
          {hours}:{minutes}:{seconds}
        </div>
      </div>

      {/* Required pace, not achieved pace — nothing records watch dates. */}
      <div
        className={`${styles.pace} ${styles['pace_' + severity]}`}
        title={perWeek === null ? 'Plan complete' : `${perWeek} hours per week needed to finish before release`}
      >
        {perWeek === null ? 'CLEARED' : `${perWeek} H/WK`}
      </div>

      <button
        type="button"
        className={styles.icon}
        onClick={onOpenSearch}
        aria-label="Find a station"
      >
        <span aria-hidden="true">⌕</span>
      </button>

      <button
        type="button"
        className={`${styles.plan} ${planOpen ? styles.planOpen : ''}`}
        aria-expanded={planOpen}
        aria-controls="plan-panel"
        onClick={onTogglePlan}
      >
        PLAN
      </button>
    </header>
  );
}
