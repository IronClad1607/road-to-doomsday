import { useCountdown } from '../hooks/useCountdown';
import { pace, project } from '../lib/progress';
import type { TrackerState } from '../lib/storage';
import styles from './RouteHeader.module.css';

interface RouteHeaderProps {
  station: number;
  total: number;
  logged: number;
  pct: number;
  /** Minutes of the plan still unwatched, for the pace readout. */
  remainingMinutes: number;
  /** Logging history, for the finish-date projection. */
  history: TrackerState['history'];
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
  history,
  planOpen,
  onTogglePlan,
  onOpenSearch,
}: RouteHeaderProps) {
  const { days, hours, minutes, seconds, msRemaining } = useCountdown();
  const { perWeek, severity } = pace(msRemaining, remainingMinutes);
  // Prefer the measured projection; fall back to the required pace until there
  // is enough history to say anything honest about the rate.
  const forecast = project(history, remainingMinutes, msRemaining);

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

      {forecast.kind === 'stalled' ? (
        <div
          className={`${styles.pace} ${styles.pace_critical}`}
          title={`Nothing logged in four weeks. ${perWeek} hours per week needed from here.`}
        >
          STALLED
        </div>
      ) : forecast.kind === 'projected' ? (
        <div
          className={`${styles.pace} ${
            forecast.daysLate! > 0 ? styles.pace_critical : styles.pace_cleared
          }`}
          title={`At ${forecast.observedPerWeek} h/week observed, you finish ${
            forecast.daysLate! > 0
              ? `${forecast.daysLate} days after release`
              : `${Math.abs(forecast.daysLate!)} days before release`
          }. Required: ${perWeek} h/week.`}
        >
          {forecast.daysLate! > 0
            ? `${forecast.daysLate}D LATE`
            : `${Math.abs(forecast.daysLate!)}D SPARE`}
        </div>
      ) : (
        <div
          className={`${styles.pace} ${styles['pace_' + severity]}`}
          title={
            perWeek === null
              ? 'Plan complete'
              : `${perWeek} hours per week needed from here. After ${forecast.daysNeeded ?? 3} days of logging this becomes a projected finish date — ${forecast.events ?? 0} events over ${forecast.daysOfData ?? 0} days so far.`
          }
        >
          {perWeek === null ? 'CLEARED' : `REQ ${perWeek} H/WK`}
        </div>
      )}

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
