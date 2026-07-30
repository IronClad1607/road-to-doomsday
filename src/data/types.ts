/**
 * Watch tiers. Every entry carries one, and the selected {@link Mode} decides
 * how deep into the tiers a run goes.
 *
 * 1 — the Doomsday spine: required viewing.
 * 2 — recommended: strongly connected, but skippable.
 * 3 — completionist: one-shots, Netflix, S.H.I.E.L.D., animation, the Fox rail.
 */
export type Tier = 1 | 2 | 3;

/** The three watch plans, in ascending order of how much they include. */
export type Mode = 'focused' | 'completionist' | 'everything';

/**
 * Per-era colour palette. Each era renders in its own visual dialect, so these
 * are published as CSS custom properties on the era section and inherited by
 * every card inside it — no component hardcodes a colour.
 */
export interface EraPalette {
  /** Era section background (may be a gradient). */
  bg: string;
  /** Primary text colour. */
  ink: string;
  /** Secondary/muted text colour. */
  sub: string;
  /** Accent used for borders, years, and progress. */
  accent: string;
  /** Entry card background. */
  card: string;
  /** Border colour for cards and chips. */
  border: string;
  /** Poster artwork background (gradient stack standing in for key art). */
  posterBg: string;
  /** Colour of the glyph drawn on the poster. */
  posterInk: string;
}

interface EntryBase {
  /**
   * Stable, unique short code — e.g. `CA1`, `DPW`. Doubles as the glyph drawn
   * on the poster, and is the key progress is persisted under, so it must never
   * change once shipped.
   */
  id: string;
  title: string;
  /** In-universe year, as displayed. Not always numeric (`1260 BC`, `∞`). */
  year: string;
  tier: Tier;
  /** Number of post-credits scenes. */
  stingers: number;
  /** The one thing to watch for — why this entry is on the road to Doomsday. */
  clue: string;
  /** Streaming service label. Defaults to JIOHOTSTAR when omitted. */
  service?: string;
  /** Explicit watch link. Defaults to a JioHotstar title search when omitted. */
  url?: string;
  /** Release/airing badge, e.g. `WEEKLY · FROM 14 OCT`. */
  drop?: string;
}

export interface Film extends EntryBase {
  kind: 'film';
  /** Runtime in minutes. */
  minutes: number;
}

export interface Series extends EntryBase {
  kind: 'series';
  /** Episode titles, in order. Length is the episode count. */
  episodes: readonly string[];
  /** Average episode runtime in minutes, used for the readiness maths. */
  episodeMinutes: number;
}

export type Entry = Film | Series;

export interface Era {
  id: string;
  name: string;
  /** Date range or descriptor shown above the era title. */
  span: string;
  /** Short description of the era's visual treatment. */
  dialect: string;
  /** Marks a parallel timeline, which renders with collision rails. */
  parallel?: boolean;
  palette: EraPalette;
  entries: readonly Entry[];
}
