import { useCountdown } from '../hooks/useCountdown';
import styles from './RouteHeader.module.css';

interface RouteHeaderProps {
  station: number;
  total: number;
  logged: number;
  pct: number;
  planOpen: boolean;
  onTogglePlan: () => void;
}

export function RouteHeader({
  station,
  total,
  logged,
  pct,
  planOpen,
  onTogglePlan,
}: RouteHeaderProps) {
  const { days, hours, minutes, seconds } = useCountdown();

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
