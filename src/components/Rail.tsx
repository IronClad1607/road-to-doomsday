import { useEffect, useRef, type CSSProperties } from 'react';
import { statusOf, type Leg, type Station, type WatchedState } from '../lib/progress';
import styles from './Rail.module.css';

/** Short rail labels — the full era names are far too long for a route line. */
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

interface RailProps {
  legs: readonly Leg[];
  route: readonly Station[];
  watched: WatchedState;
  idx: number;
  mode: string;
  onGoTo: (index: number) => void;
}

export function Rail({ legs, route, watched, idx, mode, onGoTo }: RailProps) {
  const railRef = useRef<HTMLDivElement>(null);

  // Keep the current station centred. Deliberately not scrollIntoView — that
  // scrolls ancestor containers too, which would move the whole shell.
  useEffect(() => {
    const rail = railRef.current;
    const node = rail?.querySelector<HTMLElement>('[data-here="1"]');
    if (!rail || !node) return;
    rail.scrollTo({
      left: Math.max(0, node.offsetLeft - rail.clientWidth / 2 + node.offsetWidth / 2),
      behavior: 'smooth',
    });
  }, [idx, mode]);

  return (
    <div className={styles.bar}>
      <button
        type="button"
        className={styles.transport}
        aria-label="Previous station"
        disabled={idx <= 0}
        onClick={() => onGoTo(idx - 1)}
      >
        <span aria-hidden="true">◂</span>
      </button>

      <div className={styles.rail} ref={railRef}>
        {legs.map((leg) => (
          <div
            key={leg.era.id}
            className={styles.leg}
            style={{ '--leg-accent': leg.era.palette.accent } as CSSProperties}
          >
            <div className={styles.nodes}>
              {leg.indices.map((routeIndex, position) => {
                const station = route[routeIndex];
                if (!station) return null;
                const done = statusOf(station.entry, watched[station.entry.id]) === 'full';
                const here = routeIndex === idx;
                return (
                  <span key={station.entry.id} className={styles.nodes}>
                    {position > 0 && <span className={styles.link} aria-hidden="true" />}
                    <button
                      type="button"
                      data-here={here ? '1' : undefined}
                      aria-current={here ? 'true' : undefined}
                      aria-label={`${station.entry.title}${done ? ', logged' : ''}`}
                      className={[
                        styles.node,
                        done ? styles.nodeDone : '',
                        here ? styles.nodeHere : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      onClick={() => onGoTo(routeIndex)}
                    />
                  </span>
                );
              })}
            </div>

            <button
              type="button"
              className={styles.label}
              onClick={() => leg.indices[0] !== undefined && onGoTo(leg.indices[0])}
            >
              {SHORT_LABELS[leg.era.id] ?? leg.era.name.toUpperCase()}
              <span className={styles.labelCount}>
                {leg.done}/{leg.indices.length}
              </span>
            </button>
          </div>
        ))}

        <div className={styles.terminus} aria-hidden="true">
          <span className={styles.diamond} />
          <span className={styles.terminusLabel}>18 DEC</span>
        </div>
      </div>

      <button
        type="button"
        className={styles.transport}
        aria-label="Next station"
        disabled={idx >= route.length - 1}
        onClick={() => onGoTo(idx + 1)}
      >
        <span aria-hidden="true">▸</span>
      </button>
    </div>
  );
}
