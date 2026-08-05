import type { CSSProperties } from 'react';
import type { EraPalette } from '../data/types';

/**
 * Publish an era's palette as CSS custom properties.
 *
 * Every era renders in its own visual dialect, so colours are set once on the
 * era section and inherited by the cards, chips and buttons inside it. Keeping
 * them in the cascade means no component has to be handed a palette, and none
 * of them hardcode a colour.
 */
export function eraVars(palette: EraPalette): CSSProperties {
  return {
    '--era-bg': palette.bg,
    '--era-ink': palette.ink,
    '--era-sub': palette.sub,
    '--era-accent': palette.accent,
    '--era-card': palette.card,
    '--era-border': palette.border,
    '--era-poster-bg': palette.posterBg,
    '--era-poster-ink': palette.posterInk,
    '--era-tex': palette.texture,
    // Accent tints, as 8-digit hex. Partly-watched borders, checked episodes
    // and the torn seam are all the accent at reduced strength.
    '--era-accent-soft': `${palette.accent}99`,
    '--era-accent-seam': `${palette.accent}55`,
    '--era-accent-wash': `${palette.accent}22`,
  } as CSSProperties;
}
