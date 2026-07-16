# Comparison: our components vs Google material-web

Comparison of this library (Stencil + Tailwind v4, MD3) against the reference
implementation `material-components/material-web` (Lit, tokens v0.192).
Five clusters reviewed: interaction primitives, buttons, selection controls,
text fields & select, containers & navigation.

`REF/` = material-web sources. Our paths relative to `src/`.

## Verdict

Token-level fidelity is good: our motion/easing/duration tokens in
`src/theme/system.css` match v0.192 exactly, elevation shadow values match, and
several components (button sizes, FAB 56/80/96, slider handle, button-group,
loading-indicator) track the **2024 MD3-expressive spec that material-web
itself doesn't implement**. The systematic gaps are in interaction micro-detail
(ripple lifecycle), native form integration (`change`/`input` events, external
labels, `SubmitEvent.submitter`), and a11y hardening (focus rings, 48dp
targets, `forced-colors`, roving tabindex). A handful of real bugs surfaced.

> **Status (2026-07-16):** all 13 bugs below fixed in `abe0c33`/`d2d02bb`;
> shared ripple primitive shipped in `d2d02bb` (backlog #1 and #3 done, plus a
> hover fix not in the original list: state-layer hover transitions were
> 120ms linear vs the reference's 15ms — visible as hover lag in long option
> lists; swept to 15ms everywhere). Remaining backlog items unchanged.

## Real bugs — all fixed ✓

1. **Switch RTL slide** — handle positioned via `inset-inline-start`
   (material-switch.css:107) but transitions `left` (css:117-121, 158-159):
   in RTL the handle/state-layer jump instead of sliding.
   Fix: transition `inset-inline-start`.
2. **Radio group arrows ignore RTL** (material-radio-group.tsx:159-166) —
   ArrowLeft always moves backwards. Reference flips on
   `getComputedStyle(host).direction === 'rtl'`
   (REF/radio/internal/single-selection-controller.ts:197).
3. **Radio group `document.activeElement`** (radio-group.tsx:155) breaks
   inside another shadow root — use `getRootNode().activeElement`.
4. **Checkbox/radio keyboard focus nearly invisible** — both set
   `.target:focus-visible { outline: none }` (material-checkbox.css:26-29,
   material-radio.css:26-29); only a 10% state layer signals focus.
   Switch/slider have outlines; these two don't.
5. **Linear progress has no RTL handling** — paths drawn in physical
   coordinates. Reference: `:host(:dir(rtl)) { transform: scale(-1) }`
   (REF/progress/internal/_linear-progress.scss:172-174).
6. **Circular progress rAF never idles** (material-circular-progress.tsx:102-112) —
   re-arms every frame even for static determinate and when `paused`; also
   rebuilds SVG path strings per frame (the approach reference abandoned for
   perf — their CSS border trick is 4.5× faster). Linear component already has
   the idling pattern (material-linear-progress.tsx:138-152) to copy. Add
   `contain: strict; content-visibility: auto` to both hosts.
7. **Dialog basic variant content can't scroll** — only full-screen body has
   `overflow: auto` (material-dialog.css:236-242); a long basic dialog
   overflows the viewport.
8. **Slotted `<form method="dialog">` navigates instead of closing** — needs a
   host `submit` listener: `preventDefault()` + `close(submitter.value)`
   (REF/dialog/internal/dialog.ts:371-381).
9. **Ripple keyboard origin is stale** — `--ripple-x/y` persist from the last
   pointerdown, so Space-activation ripples from the previous mouse position.
   Reference centers keyboard ripples.
10. **Slider `formStateRestoreCallback` shape** (material-slider.tsx:129-143)
    assumes string-or-FormData; restored multi-entry state may arrive as
    `Array<[name, value]>` (reference handles it, slider.ts:751-764) — then
    `state.getAll` throws.
11. **Slider `required` is half-dead** — renders mark + `aria-required` but
    `syncValidity` never sets `valueMissing` (tsx:105-117).
12. **`valueCommit` fires on clamped keys** — ArrowUp at slider max keeps
    emitting commits (tsx:280-281); reference squelches unchanged values.
13. **Elevated button hardcodes its shadow** (material-button.css:83-85)
    instead of `var(--md-sys-elevation-1)` from system.css.

## Systemic gaps (every cluster hit these)

### Native form/event integration
- **No native-named events.** We emit only `valueChange`/`checkedChange`/
  `selectedChange` CustomEvents; native `change` dies at the shadow boundary.
  Reference re-dispatches composed `input` + non-composed `change` from the
  host (REF/internal/events/redispatch-event.ts) — that's what form libraries
  and vanilla JS listen for. Applies to textfield, textarea, select, checkbox,
  radio, switch, slider, chips, icon-button toggle, tabs.
- **External `<label for="…">` doesn't activate** checkbox/switch/radio — our
  click handlers live on the shadow button; label clicks dispatch at the host
  and die. Reference: host click listener + `isActivationClick`
  (REF/internal/events/form-label-activation.ts:62-77).
- **Form submit quirks** (button/split-button): our default `type="button"`
  deviates from native `<button>` (`submit`); we don't patch
  `SubmitEvent.submitter` (capture-once `Object.defineProperty` trick,
  REF/labs/behaviors/form-submitter.ts:116-131); we submit inside our own
  click handler so outside listeners can't `preventDefault` first.
- **Validation messages hardcoded in English** (checkbox tsx:87, radio-group
  tsx:112-114). Reference reads `validationMessage` from a detached native
  input — browser-localized for free (~15-line shared util).
- **`reportValidity()` shows the native bubble** instead of MD3 inline error
  text. Reference cancels the `invalid` event and swaps supporting→error text,
  with `role="alert"` re-announce (REF/labs/behaviors/on-report-validity.ts,
  text-field.ts:799-810).

### A11y hardening
- **`forced-colors: active`: zero coverage** (grep = 0 hits) vs 28 files in
  reference. Filled buttons lose their fill with no border fallback
  (`border: 1px solid CanvasText`), ripples keep animating. Mechanical CSS.
- **Focus rings inconsistent** across ~30 components: secondary vs primary
  color (8 files), 2px vs 3px, 8 distinct offsets. Spec: secondary / 3px /
  2px outward. No entrance animation (150ms grow to 8px → 450ms settle to 3px,
  emphasized easing, reduced-motion guarded).
- **48dp touch targets missing** on material-button xs/s (32/40px,
  `overflow: hidden` blocks a pseudo hit-area — use split-button's `.fx` clip
  trick) and on 32px chips. No `touch-target="wrapper"|"none"` API.
- **No soft-disabled** anywhere (focusable-but-disabled with `aria-disabled` +
  `stopImmediatePropagation`); our disabled controls silently leave tab order.
- **Host aria-label duplicated** — copied to inner button but left on host
  (material-button.tsx:51); reference strips it (`mixinDelegatesAria`).

### Ripple — fixed ✓ (`d2d02bb`)
Shipped `src/utils/ripple.ts` + `src/utils/ripple.css` — a port of the
reference state machine (touch delay, min press, held 12% layer, cancels,
keyboard-center, soft edge, reduced-motion/forced-colors fallbacks) — and
rolled it out to 17 components; old `:active` press tints removed, hover
layers kept at 8%/15ms. Original findings for the record:

Only button/split-button/fab had one, as a one-shot `:active` keyframe
(3 duplicated copies). Reference (REF/ripple/internal/ripple.ts) vs ours:
- **150ms touch delay** before showing (scroll/swipe over a control never
  ripples). Requires moving off `:active` — CSS alone can't express it.
- **225ms minimum press** — quick taps show a complete ripple; ours cuts off
  the instant `:active` drops.
- **Growth decoupled from fade** — reference holds `pressed` opacity 0.12
  (fill: forwards) until release, then fades 375ms; our opacity animates
  0.25→0 over 450ms regardless of hold.
- Opacity **0.25 vs spec 0.12**; hard edge vs soft radial gradient
  (`max(calc(100% - 70px), 65%)`); easing standard-decelerate vs standard
  `cubic-bezier(0.2, 0, 0, 1)`; end radius fixed scale(50) vs
  hypotenuse-derived.
- No `pointercancel`/`contextmenu`/drag-out cancellation, no isPrimary/
  pointerId filtering, no `-webkit-tap-highlight-color: transparent`, ignores
  reduced-motion and forced-colors.
- ~20 other interactive components (icon-button, chip, list-item, menu-item,
  tabs, checkbox…) have hover/press layers but no ripple at all.
- State-layer press/focus at 10% should be **12%** (hover 8% is correct).

## Animation fidelity vs spec

| Component | Reference | Ours | Gap |
|---|---|---|---|
| Checkbox | 350ms decelerate in / 150ms accelerate out, container scale(0.6)+fade, two-rect SVG mark that *morphs* checked↔indeterminate, `prev-*` state classes, draw-from-point keyframe | 200ms symmetric clip-path glyph reveal | Asymmetry, container motion, indeterminate morph (glyph swap is instant), animates while disabled |
| Switch | 300ms overshoot `cubic-bezier(0.175,0.885,0.32,1.275)`, icon cross-fade + -45° rotate-in, 100ms linear press-grow | 180ms standard, instant glyph swap | Overshoot is *the* MD3 switch signature; icon morph |
| Radio | 300ms decelerate dot grow / 50ms fade out | 200ms symmetric | Asymmetry |
| Dialog | 6-element stagger: height clip-reveal 35%→100% 500ms emphasized, sections fade at offsets 0.2/0.5; close 150ms | scale(0.85)+fade 300/200ms | Biggest visual-fidelity delta; our `::backdrop` + `@starting-style` approach itself is fine (reference avoided ::backdrop only for old-Firefox reasons) |
| Menu | Height reveal 500ms + per-item stagger, upward-open counter-translate | scale(0.85) from placement-derived origin, 150/100ms | Spec motion differs; ours is compositor-cheap — decide deliberately |
| Tabs indicator | Per-tab WAAPI FLIP `translateX+scaleX`, 250ms, reduced-motion→opacity fallback | Hoisted indicator, width+translateX CSS transition 300ms | Functionally equivalent; ours animates layout (width) but avoids scaleX corner-squash — defensible |
| Linear progress | MDC two-bar asymmetric keyframes (exact beziers incl. overshoot `(0.257,-0.003,0.211,1.381)`) | Symmetric easeInOutCubic 1800ms | Rhythm visibly different; ours is expressive-spec (gap + stop indicator) so partly intentional |
| Circular progress | CSS-only two-half-circle border trick, stepped 8×135° rotate-arc | Per-frame SVG path via rAF | Motion + perf (see bugs) |
| Slider label | scale(0)→(1) pop, bottom origin, cone tail | 120ms opacity fade, plain rect | Visibly off-spec |
| Focus ring | 150ms grow →8px / 450ms settle →3px | none | Pure CSS to add |
| Field label float | JS-measured two-label WAAPI (scrollWidth-ratio scale) | CSS `:focus-within`/`:placeholder-shown` | **Don't port** — ours is simpler and beats reference on autofill; just replace `transition: all` with explicit properties + `.disable-transitions` for programmatic flips |

## Notable quirks reference handles (adoption candidates)

- Dialog: slotted `[autofocus]` focused manually after `showModal()` (native
  ignores it for slotted children), scroller reset on reopen, scroll dividers
  via IntersectionObserver, Chrome-120 Escape-without-cancel workaround,
  cancelable `open`/`close`, focus-trap sentinels rendered only post-open.
- Menu: typeahead rebases search order around the active item so repeated
  letters cycle (REF typeaheadController.ts:262-299); Space mid-buffer neither
  opens nor activates (capture-phase keydown); submenu hover-intent uses
  mouse (not pointer) events at 400ms to avoid touch misfires; Escape closes
  one level. We have no submenus — if added, our popover base makes it easier
  than reference's overflow contortions.
- Select: `role="combobox"`/`aria-expanded` belong on the focused element (ours
  sit on the chevron button in single mode); closed typeahead needs
  `aria-live="polite"` on the value; Home/End should open; programmatic
  `option.selected = true` doesn't notify our select (no request-selection
  channel — add `@Watch('selected')` emit in material-option).
- Textfield: `delegatesFocus` + `select()`/`setSelectionRange()`/
  `setRangeText()`/`setCustomValidity()` passthrough missing entirely; icon
  slot detection is render-time `querySelector`, not reactive `slotchange`.
- Tabs: roving tab stop should return to the *active* tab on focusout
  (tabs.ts:289-299); scroll-into-view with 48px margin; cancelable select
  event with revert; auto-select first tab when none active after slotchange.
- List: `request-activation` event when an item is focused with
  `tabIndex === -1`; keydown should respect `event.defaultPrevented`.
- Chips: **no chip-set** — reference has `role="toolbar"` + roving tabindex +
  RTL-aware arrows/Home/End + intra-chip arrow nav between primary/trailing
  actions + the shift-tab `tabIndex=-1` trick (multi-action-chip.ts:113-127).
  `remove` should be cancelable with self-removal from DOM on non-prevented
  dispatch. Avatar input chips should go fully-rounded.
- Ripple/geometry: CSS `zoom` compensation via `currentCSSZoom`.
- Radio: when none checked, native makes *all* radios tabbable (we make only
  the first) — divergence to decide.
- Menu item under `menuRole="listbox"` renders invalid `role="menuitem"`;
  and `selected` maps to `aria-current` where `aria-checked` fits the pattern.

## Where we're ahead (keep; document as deliberate)

- 2024 expressive spec coverage material-web lacks: 5 button sizes,
  shape-morph, FAB 56/80/96 + container variants, connected button-group,
  slider sizes/vertical/origin/tick-labels/inset handle, loading-indicator,
  linear-progress gap + stop indicator, expressive spring `linear()` tokens.
- Components with no reference counterpart: fab-menu, split-button,
  bottom-sheet, side-sheet, and the whole long tail (data-table, calendar,
  autocomplete, tree, transfer, stepper, …).
- Form association is broader: form-associated toggle icon-buttons and chips
  (reference has none), select `multiple` with real multi-entry FormData,
  default-state capture for reflected props at form reset.
- Filter-chip checkmark grow animation (reference pops it in with none).
- Autofill: CSS `:placeholder-shown` float matches autofilled inputs;
  reference has no autofill handling at all.
- `popovertarget` support on buttons/FAB; popover-based menu (top layer,
  light dismiss, scroll tracking in `anchor-position.ts` — reference only
  listens to resize); `hide-near-end` FAB.
- Home/End in radio group; group-vs-item disabled separation; checkbox
  `nested` mode; switch `readonly` + error palette; help-text/error layouts.
- Reduced-motion coverage in ~25 files (reference barely has any) — though
  freezing indeterminate progress entirely is too aggressive; slow it instead.
- Do **not** port: the 650-line SurfacePositionController, the measured
  two-label float animation, dialog focus-trap sentinels (unless Tab-to-chrome
  draws complaints).

## Ranked adoption backlog

1. ~~Fix the outright bugs (§ Real bugs)~~ **done ✓** (`abe0c33`, `d2d02bb`) —
   switch RTL transition, radio RTL/activeElement, checkbox/radio focus
   outline, linear-progress RTL, circular rAF idle + containment, dialog
   scroll + `method="dialog"`, ripple keyboard origin, slider
   restore/required/commit, elevation token use.
2. Native `change`/`input` re-dispatch + external-label activation across all
   form controls (small shared utils; biggest integration win).
3. ~~Shared ripple primitive~~ **done ✓** (`d2d02bb`) — `installRipple(root)`
   in `src/utils/ripple.ts` + `src/utils/ripple.css`: touch-delay/min-press/
   pressed-class lifecycle, 0.12 held opacity, soft edge, standard easing,
   reduced-motion + forced-colors fallbacks; rolled out to 17 components.
   Bonus: hover state layers swept 120ms → 15ms linear (reference value).
4. Unified focus ring tokens (`--md-focus-ring-*` in system.css) + two-phase
   animation; sweep all `:focus-visible` rules. *(Partial: checkbox/radio got
   visible outlines in `abe0c33`; unification/animation still open.)*
5. `forced-colors: active` blocks across interactive components. *(Partial:
   the shared ripple layer disables itself under forced colors (`d2d02bb`);
   component fill/border fallbacks still open.)*
6. reportValidity → inline MD3 error text (cancel `invalid`, render
   `internals.validationMessage`, `role="alert"` re-announce) +
   `setCustomValidity` + i18n'd messages via detached-native-input trick.
7. Form-submitter parity: default `type="submit"`, `SubmitEvent.submitter`
   patch, submit-after-listeners.
8. material-chip-set with roving tabindex + intra-chip arrows; cancelable
   self-removing `remove`.
9. 48dp touch targets (button xs/s, chips) + `touch-target` API.
10. Motion fidelity pass: switch overshoot + icon morph, checkbox asymmetric
    timings + prev-state classes, radio asymmetry, slider label pop, dialog
    stagger/clip-reveal (decide: spec fidelity vs current compositor-cheap
    style).
11. Typeahead upgrade shared by select/menu/autocomplete: rebase-around-active,
    repeat-letter cycling, Space handling, ~300ms buffer, `aria-live` on
    closed-select commit.
12. Textfield `delegatesFocus` + selection API passthrough; select combobox
    ARIA on the focused element.
13. soft-disabled support; extended FAB (label collapse); tabs polish
    (focusout reset, scroll margin, cancelable select); themeable elevation
    shadow color via `color-mix(var(--md-sys-color-shadow))`.
