import { useMemo } from 'react';
import { CATALOG } from '../data/catalog';
import type { Mode } from '../data/types';
import { MODES, hoursForMode } from '../lib/progress';
import styles from './ModeSelector.module.css';

interface ModeSelectorProps {
  mode: Mode;
  onSelect: (mode: Mode) => void;
}

export function ModeSelector({ mode, onSelect }: ModeSelectorProps) {
  // The catalog is static, so the per-mode totals are computed once.
  const hours = useMemo(
    () => new Map(MODES.map((meta) => [meta.id, hoursForMode(CATALOG, meta.id)])),
    [],
  );

  const active = MODES.find((meta) => meta.id === mode) ?? MODES[1];

  return (
    <>
      <div className={styles.modes} role="group" aria-label="Watch plan">
        {MODES.map((meta) => {
          const selected = meta.id === mode;
          return (
            <button
              key={meta.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onSelect(meta.id)}
              className={`${styles.mode} ${selected ? styles.modeSelected : ''}`}
            >
              <div className={styles.label}>{meta.label}</div>
              <div className={styles.hours}>~{hours.get(meta.id)} HRS</div>
            </button>
          );
        })}
      </div>
      <p className={styles.description}>{active?.description}</p>
    </>
  );
}
