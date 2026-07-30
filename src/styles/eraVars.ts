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
  } as CSSProperties;
}
