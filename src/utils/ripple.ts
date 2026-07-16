/**
 * Shared MD3 press-ripple state machine, ported from material-web's md-ripple
 * (ripple/internal/ripple.ts) without the extra custom element.
 *
 * Usage: mark the interactive element with `data-ripple`, give it a
 * `<span class="md-ripple" aria-hidden="true"></span>` child (clips the wave,
 * see utils/ripple.css), and call `installRipple(this.el.shadowRoot)` once in
 * `componentDidLoad`. Event delegation keeps it working across re-renders and
 * multiple controls per shadow root.
 *
 * Press model (vs the old one-shot `:active` keyframe):
 *  - touch waits 150ms before showing, so scrolling across a control never
 *    flashes a ripple; a tap released within the delay still ripples;
 *  - the wave grows 450ms and *holds* at pressed opacity until release;
 *  - a quick tap stays pressed for a 225ms minimum, then fades 375ms;
 *  - keyboard activation (click without a preceding pointerdown) ripples
 *    from the center;
 *  - pointercancel / contextmenu / dragging off the control cancel the press.
 */

// Grow duration (450ms) lives in ripple.css; JS only tracks the press timing.
const MINIMUM_PRESS_MS = 225;
const INITIAL_ORIGIN_SCALE = 0.2;
const PADDING = 10;
const SOFT_EDGE_MINIMUM_SIZE = 75;
const SOFT_EDGE_CONTAINER_RATIO = 0.35;
const TOUCH_DELAY_MS = 150;

const enum State {
  Inactive,
  /** Touch is down, waiting out TOUCH_DELAY_MS to distinguish tap from scroll. */
  TouchDelay,
  /** Pressed and showing; waiting for pointerup. */
  Holding,
  /** Released (or mouse press); waiting for the click event to end the press. */
  WaitingForClick,
}

const forcedColors =
  typeof matchMedia !== 'undefined' ? matchMedia('(forced-colors: active)') : null;

function isDisabled(control: HTMLElement): boolean {
  return control.matches(':disabled, [disabled], [aria-disabled="true"]');
}

export interface RippleHandle {
  destroy(): void;
}

export function installRipple(root: ShadowRoot | HTMLElement): RippleHandle {
  let control: HTMLElement | null = null;
  let surface: HTMLElement | null = null;
  let state = State.Inactive;
  let pointerId = -1;
  let pressStartedAt = 0;
  let touchTimer: ReturnType<typeof setTimeout> | undefined;
  let fadeTimer: ReturnType<typeof setTimeout> | undefined;

  const findControl = (e: Event): HTMLElement | null => {
    const target = e.target as HTMLElement | null;
    const found = target?.closest?.('[data-ripple]') as HTMLElement | null;
    if (!found || isDisabled(found)) return null;
    return found;
  };

  // Prefer a direct child; fall back to a descendant so the wave can clip to
  // an inner visual box smaller than the control (e.g. icon-button's visual
  // circle inside its 48dp touch box).
  const surfaceOf = (c: HTMLElement): HTMLElement | null =>
    c.querySelector(':scope > .md-ripple') ?? c.querySelector('.md-ripple');

  const shouldReact = (e: PointerEvent): boolean => {
    if (forcedColors?.matches || !e.isPrimary) return false;
    // Mid-press events must belong to the pointer that started the press.
    if (state !== State.Inactive && e.pointerId !== pointerId) return false;
    return true;
  };

  const isTouch = (e: PointerEvent) => e.pointerType === 'touch';

  /** Compute geometry and start the grow animation, holding pressed opacity. */
  const startPress = (e?: PointerEvent) => {
    if (!control || !surface) return;
    const { width, height, left, top } = surface.getBoundingClientRect();
    const maxDim = Math.max(width, height);
    const softEdge = Math.max(maxDim * SOFT_EDGE_CONTAINER_RATIO, SOFT_EDGE_MINIMUM_SIZE);
    const initialSize = Math.max(Math.floor(maxDim * INITIAL_ORIGIN_SCALE), 1);
    const hypotenuse = Math.sqrt(width * width + height * height);
    const endScale = (hypotenuse + PADDING + softEdge) / initialSize;

    // Pointer presses grow from the pointer; keyboard presses from center.
    let startX = (width - initialSize) / 2;
    let startY = (height - initialSize) / 2;
    if (e) {
      startX = e.clientX - left - initialSize / 2;
      startY = e.clientY - top - initialSize / 2;
    }
    const endX = (width - initialSize) / 2;
    const endY = (height - initialSize) / 2;

    surface.style.setProperty('--md-ripple-size', `${initialSize}px`);
    surface.style.setProperty('--md-ripple-translate-start', `${startX}px, ${startY}px`);
    surface.style.setProperty('--md-ripple-translate-end', `${endX}px, ${endY}px`);
    surface.style.setProperty('--md-ripple-scale', `${endScale}`);

    clearTimeout(fadeTimer);
    // Restart the grow animation for consecutive presses.
    surface.classList.remove('growing');
    void surface.offsetWidth;
    surface.classList.add('growing', 'pressed');
    pressStartedAt = Date.now();
  };

  /** Fade out, but never before the wave has shown for MINIMUM_PRESS_MS. */
  const endPress = () => {
    const held = Date.now() - pressStartedAt;
    const pressedSurface = surface;
    clearTimeout(fadeTimer);
    fadeTimer = setTimeout(
      () => pressedSurface?.classList.remove('pressed'),
      Math.max(MINIMUM_PRESS_MS - held, 0),
    );
    reset();
  };

  const onControlLeaveOrCancel = (e: PointerEvent) => {
    if (!shouldReact(e)) return;
    if (state === State.TouchDelay) {
      // Scroll/swipe started before the delay elapsed — never show anything.
      clearTimeout(touchTimer);
      reset();
      return;
    }
    if (state !== State.Inactive) endPress();
  };

  const detachControl = () => {
    control?.removeEventListener('pointerleave', onControlLeaveOrCancel);
    control?.removeEventListener('pointercancel', onControlLeaveOrCancel);
  };

  const reset = () => {
    detachControl();
    state = State.Inactive;
    pointerId = -1;
    control = null;
    surface = null;
  };

  const onPointerDown = (e: PointerEvent) => {
    if (forcedColors?.matches || !e.isPrimary || state !== State.Inactive) return;
    // Mouse presses only ripple for the primary button.
    if (!isTouch(e) && e.buttons !== 1) return;
    const c = findControl(e);
    const s = c && surfaceOf(c);
    if (!c || !s) return;

    control = c;
    surface = s;
    pointerId = e.pointerId;
    // pointerleave/pointercancel don't bubble reliably — listen on the
    // control only for the duration of this press.
    c.addEventListener('pointerleave', onControlLeaveOrCancel);
    c.addEventListener('pointercancel', onControlLeaveOrCancel);

    if (isTouch(e)) {
      state = State.TouchDelay;
      clearTimeout(touchTimer);
      touchTimer = setTimeout(() => {
        if (state !== State.TouchDelay) return;
        state = State.Holding;
        startPress(e);
      }, TOUCH_DELAY_MS);
    } else {
      state = State.WaitingForClick;
      startPress(e);
    }
  };

  const onPointerUp = (e: PointerEvent) => {
    if (!shouldReact(e) || state === State.Inactive) return;
    if (state === State.TouchDelay) {
      // Released within the delay: it was a tap — show the full ripple now.
      clearTimeout(touchTimer);
      state = State.WaitingForClick;
      startPress(e);
      return;
    }
    if (state === State.Holding) state = State.WaitingForClick;
  };

  const onClick = (e: MouseEvent) => {
    if (forcedColors?.matches) return;
    if (state === State.WaitingForClick) {
      endPress();
      return;
    }
    if (state === State.Inactive) {
      // Keyboard-synthesized click (no preceding pointerdown): center ripple.
      const c = findControl(e);
      const s = c && surfaceOf(c);
      if (!c || !s) return;
      control = c;
      surface = s;
      startPress();
      endPress();
    }
  };

  const onContextMenu = () => {
    if (state === State.Inactive) return;
    clearTimeout(touchTimer);
    endPress();
  };

  const target = root as unknown as HTMLElement;
  target.addEventListener('pointerdown', onPointerDown as EventListener);
  target.addEventListener('pointerup', onPointerUp as EventListener);
  target.addEventListener('click', onClick as EventListener);
  target.addEventListener('contextmenu', onContextMenu);

  return {
    destroy() {
      clearTimeout(touchTimer);
      clearTimeout(fadeTimer);
      detachControl();
      target.removeEventListener('pointerdown', onPointerDown as EventListener);
      target.removeEventListener('pointerup', onPointerUp as EventListener);
      target.removeEventListener('click', onClick as EventListener);
      target.removeEventListener('contextmenu', onContextMenu);
    },
  };
}
