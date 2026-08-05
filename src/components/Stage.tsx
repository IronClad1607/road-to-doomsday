import type { Series } from '../data/types';
import type { Anim } from '../hooks/useTracker';
import {
  episodesWatched,
  runtimeLabel,
  serviceLabel,
  statusOf,
  stingerLabel,
  watchUrl,
  type Station,
} from '../lib/progress';
import type { WatchedState } from '../lib/progress';
import { eraVars } from '../styles/eraVars';
import styles from './Stage.module.css';

interface StageProps {
  station: Station | null;
  watched: WatchedState;
  anim: Anim;
  stamped: boolean;
  onToggle: (entry: Station['entry']) => void;
  onToggleEpisode: (entry: Series, index: number) => void;
}

/**
 * The current station, full bleed in its era's palette.
 *
 * The era owns the whole viewport here rather than a card, so the background,
 * texture and watermark all come from the palette custom properties.
 */
export function Stage({ station, watched, anim, stamped, onToggle, onToggleEpisode }: StageProps) {
  if (!station) {
    return (
      <div className={styles.stage}>
        <div className={styles.scroll}>
          <p className={styles.empty}>NO STATIONS IN THIS PLAN</p>
        </div>
      </div>
    );
  }

  const { entry, era } = station;
  const progress = watched[entry.id];
  const status = statusOf(entry, progress);
  const full = status === 'full';
  const logged = episodesWatched(entry, progress);
  const episodes = Array.isArray(progress) ? progress : [];

  return (
    <div className={styles.stage} style={eraVars(era.palette)}>
      <div className={styles.watermark} aria-hidden="true">
        {entry.id}
      </div>

      <div className={styles.scroll}>
        <div className={`${styles.inner} ${anim === 'out' ? styles.animOut : styles.animIn}`}>
          <div>
            <div className={styles.eraLine}>
              {era.name.toUpperCase()} · {era.span}
            </div>

            {/* Announce the station change without narrating every keystroke. */}
            <h1 className={styles.title} aria-live="polite">
              {entry.title}
            </h1>

            <div className={styles.meta}>
              <span className={styles.chip}>{entry.year}</span>
              <span className={styles.runtime}>{runtimeLabel(entry)}</span>
              {entry.stingers > 0 && <span className={styles.stingers}>{stingerLabel(entry)}</span>}
              {entry.drop && <span className={styles.drop}>{entry.drop}</span>}
            </div>

            <p className={styles.clue}>
              <span className={styles.clueLabel}>CLUE ▸ </span>
              {entry.clue}
            </p>

            <div className={styles.actions}>
              <button
                type="button"
                aria-pressed={full}
                onClick={() => onToggle(entry)}
                className={`${styles.mark} ${full ? styles.markDone : ''}`}
              >
                {full
                  ? '✓ LOGGED'
                  : entry.kind === 'series'
                    ? `MARK SEASON WATCHED${logged ? ` (${logged}/${entry.episodes.length})` : ''}`
                    : 'MARK WATCHED'}
              </button>

              <a
                className={styles.watch}
                href={watchUrl(entry)}
                target="_blank"
                rel="noopener noreferrer"
              >
                {serviceLabel(entry)} ▸
              </a>
            </div>
          </div>

          <div className={styles.aside}>
            <div className={styles.poster} aria-hidden="true">
              <div className={styles.glyph}>{entry.id}</div>
              <div className={styles.kind}>{entry.kind === 'series' ? 'SERIES' : 'FILM'}</div>
              {stamped && (
                <div className={styles.stamp}>
                  <span className={styles.stampInk}>LOGGED</span>
                </div>
              )}
            </div>

            {entry.kind === 'series' && (
              <div className={styles.episodesPanel}>
                <div className={styles.episodesHeading}>
                  EPISODES {logged}/{entry.episodes.length}
                </div>
                <div className={styles.episodes}>
                  {entry.episodes.map((title, index) => {
                    const done = episodes.includes(index);
                    return (
                      <button
                        key={title + index}
                        type="button"
                        aria-pressed={done}
                        onClick={() => onToggleEpisode(entry, index)}
                        className={`${styles.episode} ${done ? styles.episodeWatched : ''}`}
                      >
                        <span className={styles.episodeNumber}>
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <span className={styles.episodeTitle}>{title}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
