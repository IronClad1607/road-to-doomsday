import type { CSSProperties } from 'react';
import { runtimeLabel, type NextUp as NextUpData } from '../lib/progress';
import styles from './NextUp.module.css';

interface NextUpProps {
  next: NextUpData | null;
  onGo: (eraId: string) => void;
  onPlanComplete: () => void;
}

/**
 * The single next thing to watch. With ~90 entries behind an accordion, the
 * most common question is "what now?" — this answers it without navigating.
 */
export function NextUp({ next, onGo, onPlanComplete }: NextUpProps) {
  if (!next) {
    return (
      <button
        type="button"
        className={`${styles.card} ${styles.complete}`}
        onClick={onPlanComplete}
      >
        <span className={styles.label}>DONE</span>
        <span className={styles.body}>
          <span className={styles.title}>Plan Complete</span>
          <span className={styles.meta}>EVERY ENTRY IN THIS PLAN IS LOGGED · CHANGE PLAN ▸</span>
        </span>
        <span className={styles.go} aria-hidden="true">
          ✓
        </span>
      </button>
    );
  }

  const { entry, era } = next;

  return (
    <button
      type="button"
      className={styles.card}
      style={{ '--accent': era.palette.accent } as CSSProperties}
      onClick={() => onGo(era.id)}
    >
      <span className={styles.label}>NEXT</span>
      <span className={styles.body}>
        <span className={styles.title}>{entry.title}</span>
        <span className={styles.meta}>
          {era.name.toUpperCase()} · {entry.year} · {runtimeLabel(entry)}
        </span>
      </span>
      <span className={styles.go} aria-hidden="true">
        ▸
      </span>
    </button>
  );
}
