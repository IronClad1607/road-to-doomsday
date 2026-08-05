import type { Series } from '../data/types';
import type { Anim } from '../hooks/useTracker';
import { imageUrl, type EntryMedia, type EpisodeMedia } from '../lib/media';
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
  /** TMDB enrichment, absent until it loads — and permanently if unseeded. */
  media: EntryMedia | undefined;
  episodeMedia: ReadonlyMap<number, EpisodeMedia> | undefined;
  onToggle: (entry: Station['entry']) => void;
  onToggleEpisode: (entry: Series, index: number) => void;
}

/**
 * The current station, full bleed in its era's palette.
 *
 * The era owns the whole viewport here rather than a card, so the background,
 * texture and watermark all come from the palette custom properties.
 */
export function Stage({
  station,
  watched,
  anim,
  stamped,
  media,
  episodeMedia,
  onToggle,
  onToggleEpisode,
}: StageProps) {
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
  const poster = imageUrl(media?.posterPath ?? null, 'w342');
  const backdrop = imageUrl(media?.backdropPath ?? null, 'w780');

  return (
    <div className={styles.stage} style={eraVars(era.palette)}>
      {backdrop && (
        <div
          className={styles.backdrop}
          style={{ backgroundImage: `url(${backdrop})` }}
          aria-hidden="true"
        />
      )}

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
              {entry.stingers > 0 && (
                <span className={styles.stingers}>
                  {stingerLabel(entry)} · STAY THROUGH THE CREDITS
                </span>
              )}
              {entry.drop && <span className={styles.drop}>{entry.drop}</span>}
            </div>

            <p className={styles.clue}>
              <span className={styles.clueLabel}>CLUE ▸ </span>
              {entry.clue}
            </p>

            {media?.overview && <p className={styles.overview}>{media.overview}</p>}

            {media && media.cast.length > 0 && (
              <div className={styles.cast}>
                {media.cast.slice(0, 6).map((person) => {
                  const face = imageUrl(person.profilePath, 'w185');
                  return (
                    <div key={person.name} className={styles.castMember}>
                      <div className={styles.castFace}>
                        {face ? (
                          <img src={face} alt="" loading="lazy" />
                        ) : (
                          <span aria-hidden="true">
                            {person.name.slice(0, 1)}
                          </span>
                        )}
                      </div>
                      <div className={styles.castName}>{person.name}</div>
                      {person.character && (
                        <div className={styles.castRole}>{person.character}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

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
                href={watchUrl(entry, media?.watchUrl)}
                target="_blank"
                rel="noopener noreferrer"
              >
                {media?.watchUrl && !entry.url ? 'WATCH' : serviceLabel(entry)} ▸
              </a>
            </div>
          </div>

          <div className={styles.aside}>
            <div className={styles.poster} aria-hidden="true">
              {poster ? (
                <img className={styles.posterArt} src={poster} alt="" />
              ) : (
                <div className={styles.glyph}>{entry.id}</div>
              )}
              <div className={styles.kind}>{entry.kind === 'series' ? 'SERIES' : 'FILM'}</div>
              {stamped && (
                <div className={styles.stamp}>
                  <span className={styles.stampInk}>LOGGED</span>
                  {entry.stingers > 0 && (
                    <span className={styles.stampAsk}>
                      {entry.stingers === 1 ? '1 STINGER' : `${entry.stingers} STINGERS`} · DID YOU
                      STAY?
                    </span>
                  )}
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
                    const detail = episodeMedia?.get(index);
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
                        <span className={styles.episodeTitle} title={detail?.overview ?? undefined}>
                          {detail?.name ?? title}
                        </span>
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
