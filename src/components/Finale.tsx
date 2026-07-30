import { isUnlocked } from '../lib/progress';
import styles from './Finale.module.css';

interface FinaleProps {
  pct: number;
}

const LOCKED_BODY =
  'This panel opens at 100% readiness in your chosen plan. Latveria does not reward the unprepared.';

const UNLOCKED_BODY =
  'Every entry in your plan is logged. You walk into the 09:00 show carrying the whole timeline in your head — every stinger, every branch, every unpaid promise. Nothing on screen will surprise you except the thing that should.';

/** The reward panel. Sealed until the selected plan is fully logged. */
export function Finale({ pct }: FinaleProps) {
  const unlocked = isUnlocked(pct);
  const percent = Math.floor(pct);

  return (
    <section className={`${styles.panel} ${unlocked ? styles.panelUnlocked : ''}`}>
      <div className={styles.content}>
        <div className={styles.seal}>LATVERIAN SEAL · CLEARANCE {percent}%</div>
        <h2 className={styles.title}>{unlocked ? 'The Chair Is Yours' : 'Sealed Until Ready'}</h2>
        <p className={styles.body}>{unlocked ? UNLOCKED_BODY : LOCKED_BODY}</p>
        <div className={styles.foot}>
          {unlocked
            ? 'CLEARANCE: WORTHY · 18 DEC 2026 · 09:00 IST'
            : `LOCKED · ${percent}% OF PLAN LOGGED`}
        </div>
      </div>
    </section>
  );
}
