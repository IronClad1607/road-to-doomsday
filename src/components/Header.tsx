import { useEffect, useState } from 'react';
import { useCountdown } from '../hooks/useCountdown';
import styles from './Header.module.css';

/** How long the purge button stays armed before disarming itself. */
const ARM_TIMEOUT_MS = 4000;

interface HeaderProps {
  onPurge: () => void;
}

export function Header({ onPurge }: HeaderProps) {
  const { days, hours, minutes, seconds } = useCountdown();
  const [armed, setArmed] = useState(false);

  // Purging destroys a rewatch log that can represent months of viewing, and
  // there is no undo — so it takes two deliberate clicks, and forgetting about
  // a half-pressed button disarms it rather than leaving a trap.
  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => setArmed(false), ARM_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [armed]);

  const handlePurge = () => {
    if (!armed) {
      setArmed(true);
      return;
    }
    setArmed(false);
    onPurge();
  };

  return (
    <header>
      <div className={styles.protocol}>
        <span>REWATCH PROTOCOL · EARTH-616 · IST</span>
        <button
          type="button"
          onClick={handlePurge}
          className={`${styles.purge} ${armed ? styles.purgeArmed : ''}`}
        >
          {armed ? 'CONFIRM PURGE' : 'PURGE'}
        </button>
      </div>

      <div className={styles.masthead}>
        <h1 className={styles.title}>
          Road to
          <span className={styles.titleAccent}>Doomsday</span>
        </h1>
        <div className={styles.showtime}>18 DEC 2026 · 09:00 IST · THEATRICAL INCURSION</div>

        <div
          className={styles.countdown}
          role="timer"
          aria-label={`${Number(days)} days, ${Number(hours)} hours, ${Number(minutes)} minutes and ${Number(seconds)} seconds until Avengers: Doomsday`}
        >
          <CountdownCell value={days} unit="DAYS" />
          <CountdownCell value={hours} unit="HRS" />
          <CountdownCell value={minutes} unit="MIN" />
          <CountdownCell value={seconds} unit="SEC" accent />
        </div>
      </div>
    </header>
  );
}

function CountdownCell({ value, unit, accent }: { value: string; unit: string; accent?: boolean }) {
  return (
    <div className={styles.cell} aria-hidden="true">
      <div className={`${styles.value} ${accent ? styles.seconds : ''}`}>{value}</div>
      <div className={styles.unit}>{unit}</div>
    </div>
  );
}
