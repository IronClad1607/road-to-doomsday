import { DOOMSDAY_AT } from '../hooks/useCountdown';
import { RANKS, paceLabel, type Readiness as ReadinessData } from '../lib/progress';
import styles from './Readiness.module.css';

interface ReadinessProps {
  readiness: ReadinessData;
}

export function Readiness({ readiness }: ReadinessProps) {
  const { pct, doneMinutes, totalMinutes, rank } = readiness;
  const done = Math.round(doneMinutes / 60);
  const total = Math.round(totalMinutes / 60);

  // Read the clock at render rather than ticking. Hours-per-week only moves as
  // entries are logged — which re-renders this anyway — so a second interval
  // here would re-render the ladder every second to show the same number.
  const pace = paceLabel(Math.max(0, DOOMSDAY_AT - Date.now()), totalMinutes - doneMinutes);

  return (
    <section className={styles.panel} aria-label="Readiness">
      <div className={styles.head}>
        <h2 className={styles.heading}>READINESS</h2>
        <div className={styles.percent}>{Math.floor(pct)}%</div>
      </div>

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

      <div className={styles.stats}>
        <span>
          {done}H / {total}H LOGGED
        </span>
        <span>{pace}</span>
      </div>

      <div className={styles.ladder}>
        <h3 className={styles.ladderHeading}>CLEARANCE LADDER</h3>
        <ul className={styles.ranks}>
          {RANKS.map(([threshold, name]) => {
            const current = name === rank;
            return (
              <li
                key={name}
                aria-current={current ? 'step' : undefined}
                className={[
                  styles.rank,
                  pct >= threshold ? styles.rankEarned : '',
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
      </div>
    </section>
  );
}
