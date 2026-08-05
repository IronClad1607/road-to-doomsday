import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { statusOf, type Station, type WatchedState } from '../lib/progress';
import styles from './StationSearch.module.css';

/** Results shown at once. Enough to scan, few enough to keep the list fast. */
const LIMIT = 40;

interface StationSearchProps {
  route: readonly Station[];
  watched: WatchedState;
  onGoTo: (index: number) => void;
  onClose: () => void;
}

/** Case- and punctuation-insensitive, so "spiderman" finds "Spider-Man". */
const normalise = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '');

/**
 * Jump straight to a station by name.
 *
 * With ~90 stations behind a single-station view, the only way to reach a
 * specific title was scrubbing the rail. Matches on title, era and year.
 */
export function StationSearch({ route, watched, onGoTo, onClose }: StationSearchProps) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const results = useMemo(() => {
    const needle = normalise(query);
    const scored = route
      .map((station, index) => ({ station, index }))
      .filter(({ station }) => {
        if (!needle) return true;
        return (
          normalise(station.entry.title).includes(needle) ||
          normalise(station.era.name).includes(needle) ||
          normalise(station.entry.year).includes(needle)
        );
      });
    return scored.slice(0, LIMIT);
  }, [route, query]);

  // A shrinking result list must not leave the highlight past the end.
  useEffect(() => {
    setActive(0);
  }, [query]);

  // Keep the highlighted row in view while arrowing through.
  useEffect(() => {
    listRef.current?.querySelector('[data-active="1"]')?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      onClose();
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((current) => Math.min(current + 1, results.length - 1));
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((current) => Math.max(current - 1, 0));
    }
    if (event.key === 'Enter') {
      const chosen = results[active];
      if (chosen) {
        onGoTo(chosen.index);
        onClose();
      }
    }
  };

  return (
    <>
      <div className={styles.scrim} onClick={onClose} aria-hidden="true" />
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label="Jump to station"
        onKeyDown={onKeyDown}
      >
        <div className={styles.field}>
          <span className={styles.prompt} aria-hidden="true">
            ▸
          </span>
          <input
            ref={inputRef}
            className={styles.input}
            type="text"
            placeholder="Jump to a title, era or year…"
            aria-label="Search stations"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <span className={styles.count}>
            {results.length}
            {results.length === LIMIT ? '+' : ''}
          </span>
        </div>

        <div className={styles.results} ref={listRef}>
          {results.length === 0 ? (
            <p className={styles.empty}>NOTHING ON THE ROUTE MATCHES</p>
          ) : (
            results.map(({ station, index }, position) => {
              const done = statusOf(station.entry, watched[station.entry.id]) === 'full';
              return (
                <button
                  key={station.entry.id}
                  type="button"
                  data-active={position === active ? '1' : undefined}
                  className={`${styles.result} ${position === active ? styles.resultActive : ''}`}
                  style={{ '--dot': station.era.palette.accent } as CSSProperties}
                  onMouseEnter={() => setActive(position)}
                  onClick={() => {
                    onGoTo(index);
                    onClose();
                  }}
                >
                  <span
                    className={`${styles.dot} ${done ? styles.dotDone : ''}`}
                    aria-hidden="true"
                  />
                  <span className={styles.body}>
                    <span className={styles.title}>{station.entry.title}</span>
                    <span className={styles.meta}>
                      {station.era.name.toUpperCase()} · {station.entry.year}
                      {done ? ' · LOGGED' : ''}
                    </span>
                  </span>
                  <span className={styles.station}>{index + 1}</span>
                </button>
              );
            })
          )}
        </div>

        <div className={styles.hint}>↑↓ MOVE · ↵ JUMP · ESC CLOSE</div>
      </div>
    </>
  );
}
