import { useCountdown } from '../hooks/useCountdown';
import styles from './Header.module.css';

/**
 * Compact hero: the lockup and the countdown share a row, with days as the
 * headline figure and the rest of the clock beneath it. The four-tile
 * countdown grid it replaces cost most of a phone screen before any content.
 */
export function Header() {
  const { days, hours, minutes, seconds } = useCountdown();

  return (
    <header>
      <div className={styles.protocol}>
        <span>REWATCH PROTOCOL · EARTH-616 · IST</span>
        <span>18 DEC 2026</span>
      </div>

      <div className={styles.masthead}>
        <div className={styles.lockup}>
          <h1 className={styles.title}>
            Road to
            <span className={styles.titleAccent}>Doomsday</span>
          </h1>
          <div className={styles.showtime}>09:00 IST · THEATRICAL INCURSION</div>
        </div>

        <div
          className={styles.countdown}
          role="timer"
          aria-label={`${Number(days)} days, ${Number(hours)} hours, ${Number(minutes)} minutes and ${Number(seconds)} seconds until Avengers: Doomsday`}
        >
          <div aria-hidden="true">
            <div className={styles.days}>{days}</div>
            <div className={styles.daysUnit}>DAYS</div>
            <div className={styles.clock}>
              {hours}:{minutes}:{seconds}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
