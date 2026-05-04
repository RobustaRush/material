/**
 * Anchored positioning for popover-based overlays (menus, tooltips, etc.).
 *
 * Given a floating element and an anchor element, places the floater at the
 * requested side/alignment relative to the anchor, flipping to the opposite
 * side if it would overflow the viewport, shifting horizontally to stay
 * on-screen, and clamping its block-size so it can scroll internally rather
 * than spilling outside the viewport.
 *
 * The floater is expected to use `position: fixed` (which the HTML popover
 * API does by default once `popover="auto"` is set and the element is open),
 * with `inset: unset` so we can drive `top`/`left` directly.
 */

export type AnchorPlacement =
  | 'bottom-start' | 'bottom-end' | 'bottom-center'
  | 'top-start' | 'top-end' | 'top-center';

export interface AnchorPositionOptions {
  placement?: AnchorPlacement;
  /** Gap between anchor edge and floater edge, in px. */
  offset?: number;
  /** Hard cap on floater height, in px. Viewport room is the other ceiling. */
  maxHeight?: number;
  /** Viewport edge padding kept clear, in px. */
  viewportPadding?: number;
}

const DEFAULTS: Required<AnchorPositionOptions> = {
  placement: 'bottom-start',
  offset: 4,
  maxHeight: Number.POSITIVE_INFINITY,
  viewportPadding: 8,
};

export function positionAnchored(
  floater: HTMLElement,
  anchor: Element,
  opts: AnchorPositionOptions = {},
): void {
  const placement = opts.placement ?? DEFAULTS.placement;
  const offset = opts.offset ?? DEFAULTS.offset;
  const maxHeight = opts.maxHeight ?? DEFAULTS.maxHeight;
  const viewportPadding = opts.viewportPadding ?? DEFAULTS.viewportPadding;

  const a = anchor.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Reset overrides so the floater reports its natural layout size.
  // Use offsetWidth/Height — getBoundingClientRect would report the
  // transformed visual size (we animate scale during enter), which would
  // shrink our measurement and place the menu in the wrong spot.
  floater.style.maxBlockSize = '';
  floater.style.top = '0px';
  floater.style.left = '0px';
  const f = { width: floater.offsetWidth, height: floater.offsetHeight };

  const wantsBottom = placement.startsWith('bottom');
  const wantsEnd = placement.endsWith('end');
  const wantsCenter = placement.endsWith('center');

  // Vertical: try requested side, flip if it doesn't fit and the other side has more room.
  const roomBelow = vh - a.bottom - viewportPadding;
  const roomAbove = a.top - viewportPadding;
  let placeBottom = wantsBottom;
  if (placeBottom && f.height + offset > roomBelow && roomAbove > roomBelow) placeBottom = false;
  else if (!placeBottom && f.height + offset > roomAbove && roomBelow > roomAbove) placeBottom = true;

  const availableHeight = (placeBottom ? roomBelow : roomAbove) - offset;
  const cappedHeight = Math.max(48, Math.min(maxHeight, availableHeight));
  floater.style.maxBlockSize = `${cappedHeight}px`;

  const top = placeBottom
    ? a.bottom + offset
    : a.top - offset - Math.min(f.height, cappedHeight);

  // Horizontal: align to start, end, or center of anchor, then clamp to viewport.
  let left = wantsCenter
    ? a.left + (a.width - f.width) / 2
    : wantsEnd
      ? a.right - f.width
      : a.left;
  const minLeft = viewportPadding;
  const maxLeft = vw - f.width - viewportPadding;
  if (left < minLeft) left = minLeft;
  if (left > maxLeft) left = Math.max(minLeft, maxLeft);

  floater.style.top = `${Math.round(top)}px`;
  floater.style.left = `${Math.round(left)}px`;
  // Reflect actual placement so consumers (e.g. CSS transform-origin) can key off it.
  floater.dataset.placedSide = placeBottom ? 'bottom' : 'top';
  floater.dataset.placedAlign = wantsCenter ? 'center' : wantsEnd ? 'end' : 'start';
}

/**
 * Keep the floater positioned while it stays open. Returns a cleanup fn that
 * removes the listeners. Re-positions on resize and on any scroll in the page
 * (capture phase, so scrolling ancestors are covered).
 */
export function trackAnchored(
  floater: HTMLElement,
  anchor: Element,
  opts?: AnchorPositionOptions,
): () => void {
  let frame = 0;
  const schedule = () => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      positionAnchored(floater, anchor, opts);
    });
  };
  // Skip scroll events originating inside the floater itself — re-running
  // positionAnchored mutates max-block-size, which can clobber the user's
  // in-progress scroll on the menu's internal overflow.
  const onScroll = (e: Event) => {
    if (e.target === floater || (e.target instanceof Node && floater.contains(e.target as Node))) {
      return;
    }
    schedule();
  };
  positionAnchored(floater, anchor, opts);
  window.addEventListener('resize', schedule);
  window.addEventListener('scroll', onScroll, true);
  return () => {
    if (frame) cancelAnimationFrame(frame);
    window.removeEventListener('resize', schedule);
    window.removeEventListener('scroll', onScroll, true);
  };
}
