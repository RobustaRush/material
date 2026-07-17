// Native form-event helpers, mirroring material-web's
// internal/events/redispatch-event.ts + internal/events/form-label-activation.ts.
//
// Our components only emit typed CustomEvents (valueChange, checkedChange,
// selectedChange, ...) — those never reach vanilla JS listeners bound to
// 'input'/'change', and form libraries expecting native events see nothing.
// dispatchNativeEvents fixes that by firing the native-named events *from the
// host* alongside the existing custom ones.
//
// Native <label for> / internals.labels click-forwarding also stops at the
// shadow boundary: a label click dispatches its synthetic click at the host,
// but the host has no listener wiring it to the control inside shadow DOM.
// activateOnLabelClick fixes that half.

/** Dispatch native-named form events from `host`. `input` is composed+bubbles
 *  (matches a real <input>'s input event, so it escapes the shadow root);
 *  `change` is bubbles-only, NOT composed — dispatched directly on the host
 *  (not inside shadow DOM) so it's still visible to light-DOM listeners
 *  without needing to cross a shadow boundary. */
export function dispatchNativeEvents(
  host: HTMLElement,
  events: { input?: boolean; change?: boolean },
) {
  if (events.input) {
    host.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  }
  if (events.change) {
    host.dispatchEvent(new Event('change', { bubbles: true, composed: false }));
  }
}

/** Returns true when `event` is an "activation click" per the reference's
 *  isActivationClick: the click landed directly on `host` — not retargeted
 *  from inside its shadow tree — which happens when an associated <label>
 *  (via internals.labels) is clicked, or `host.click()` is called, and the
 *  host isn't disabled. A normal click on an inner shadow element never
 *  satisfies this, so it can't double-fire alongside the element's own
 *  click handling. */
function isActivationClick(event: Event, host: EventTarget): boolean {
  if (event.composedPath()[0] !== host) return false;
  if ((host as unknown as { disabled?: boolean }).disabled) return false;
  // This is an activation if the event should not be squelched.
  return !squelchEvent(event);
}

// Firefox dispatches a second click for a label click on a form-associated
// custom element (https://bugzilla.mozilla.org/show_bug.cgi?id=1804576) —
// squelch activation clicks for one microtask after each one, per the
// reference implementation, so a label click can't double-toggle.
let isSquelchingEvents = false;

function squelchEvent(event: Event): boolean {
  const squelched = isSquelchingEvents;
  if (squelched) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
  squelchEventsForMicrotask();
  return squelched;
}

async function squelchEventsForMicrotask() {
  isSquelchingEvents = true;
  // Pause for exactly one microtask.
  await null;
  isSquelchingEvents = false;
}

/** Wires a host 'click' listener that calls `activate()` only for external
 *  activation clicks (external <label for>, `host.click()`) — never for
 *  clicks that originate inside the shadow tree, since those are handled by
 *  the component's own interactive element. Returns a teardown function;
 *  call it from disconnectedCallback. */
export function activateOnLabelClick(host: HTMLElement, activate: () => void): () => void {
  const handleClick = (event: MouseEvent) => {
    if (!isActivationClick(event, host)) return;
    activate();
  };
  host.addEventListener('click', handleClick);
  return () => host.removeEventListener('click', handleClick);
}
