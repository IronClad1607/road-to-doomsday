/** Distance from the viewport top a jumped-to era should land at. */
export const SCROLL_OFFSET = 96;

/**
 * The element that actually scrolls this document.
 *
 * Which element owns the scroll depends on the CSS, and getting it wrong makes
 * every jump a silent no-op — so resolve it by measurement rather than
 * assumption. `document.scrollingElement` is right in the normal case; the
 * body fallback covers layouts where the body has become the scroller.
 */
export function scroller(): Element {
  const root = document.scrollingElement ?? document.documentElement;
  if (root.scrollHeight > root.clientHeight + 1) return root;
  if (document.body.scrollHeight > document.body.clientHeight + 1) return document.body;
  return root;
}

export function scrollTop(): number {
  return scroller().scrollTop;
}

/**
 * Scroll so `element` sits just below the sticky bar.
 *
 * Deliberately not `scrollIntoView`: that resolves its own scroll container and
 * ignores the sticky header, landing targets underneath it.
 */
export function scrollToElement(element: Element): void {
  const node = scroller();
  const top = element.getBoundingClientRect().top + node.scrollTop - SCROLL_OFFSET;
  node.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
}

export function scrollToTop(): void {
  scroller().scrollTo({ top: 0, behavior: 'smooth' });
}
