# Code, Visual & MD3 Conformance Review

**Date:** 2026-07-02
**Scope:** Core interactive set (buttons family, form fields, selection controls, overlays, tabs/chips/progress) reviewed in depth; remaining components quick-passed.
**Method:** Source review of `.tsx`/`.css` against the extracted m3.material.io specs in `docs/wiki/specs/google-material/`; visual verification via the Stencil dev server — screenshots of all 22 core demo pages in light theme, 9 in dark, plus interactive states (open menu/select/dialog, snackbar, tooltip) and in-browser geometry measurements at density 0.9 and 1.0.

---

## 1. Executive summary

The library's **metric fidelity to MD3 is excellent** — nearly every dp table in the wiki specs (icon-button width variants, split-button XS tokens, slider size table, switch track/handle sizes, menu/dialog/snackbar/tooltip anatomy, chip and tab measurements) is implemented exactly, and the light/dark theme token cascade works correctly in both themes end-to-end. Expressive-spec features that most libraries skip are present: wavy progress indicators with stop dots, the 7-shape loading-indicator morph, slider inset handles with track gaps, split-button corner morphs, connected button groups, `@starting-style` popover animation, `prefers-reduced-motion` handling in the animated components.

The weaknesses cluster in four areas:

1. **Accessibility wiring** — visual labels not associated with inputs, several role/state mismatches (`option` inside `role="menu"`, `aria-checked` missing on the checkbox's focusable element, `menuitemcheckbox` outside a menu, radiogroup over `aria-pressed` buttons), and two components whose keyboard navigation is silently a no-op (fab-menu, radio-group roving tabindex).
2. **A missing motion-token layer** — every duration/easing is hardcoded per file; three exit animations ship the M2 accelerate curve, several state transitions use `linear`, and the two "appearing mark" animations (checkbox check, radio dot) are structurally impossible because the mark is conditionally rendered.
3. **Disabled-state treatment** — a blanket `opacity: .4` everywhere instead of MD3's on-surface 38% content / 12% container / 4% fill system; disabled fields also keep live hover styling.
4. **A handful of real behavior bugs** — chip remove-button covering the whole chip, snackbar exit animation cut off by unmount, textarea programmatic value updates not reaching the DOM, an invalid `max(0, …)` killing the slider's leading track segment (visually confirmed), and the switch handle overflowing its track at non-default density (measured).

---

## 2. Top issues (ranked)

| # | Sev | Component | Issue |
|---|-----|-----------|-------|
| 1 | critical | material-chip | Remove-button hit-area pseudo covers the entire input chip — label clicks fire `remove` (`material-chip.css:188` — missing `position: relative` on `.trailing-btn`) |
| 2 | critical | material-fab-menu | Arrow/Home/End roving focus is a no-op: `focus()` called on non-focusable hosts, no `delegatesFocus` anywhere in the repo (`material-fab-menu.tsx:153`); Enter/Space on `href` items `preventDefault`s away the navigation (`material-fab-menu-item.tsx:45`) |
| 3 | critical | material-textarea | Programmatic `value` writes never reach the rendered textarea — value is a JSX child, no watcher sync (`material-textarea.tsx:167`, cf. `material-textfield.tsx:105`) |
| 4 | critical | material-textfield / textarea | Visual `<label>` has no `htmlFor` and the input no `aria-labelledby` — fields are nameless for AT unless `aria-label` is passed (`material-textfield.tsx:284`) |
| 5 | critical | material-select | Single-select trigger has no combobox semantics (no `aria-haspopup/expanded/controls`); options are `role="option"` inside `role="menu"` (`material-select.tsx:688`, `material-menu.tsx:198`, `material-option.tsx:84`) |
| 6 | critical | material-checkbox | Focusable `role="checkbox"` button has no `aria-checked`; state lives only on the un-roled host via `internals.ariaChecked` (`material-checkbox.tsx:90,153`) |
| 7 | critical | material-radio-group | Roving tabindex never initializes — `syncChildren` pokes child shadow buttons before they render; every radio stays `tabIndex=0` (`material-radio-group.tsx:59-65,84`) |
| 8 | critical | material-snackbar-host | Exit animation never plays: host unmounts the snackbar immediately on close, cutting the 150 ms transition (`material-snackbar-host.tsx:176-184`) |
| 9 | critical | material-tooltip | Not hoverable (WCAG 1.4.13): nothing cancels the 1.5 s hide when the pointer/focus moves onto the surface — rich-tooltip action buttons vanish under the user (`material-tooltip.tsx:184-201`) |
| 10 | critical | material-menu | Typeahead matches `textContent` only, so prop-labeled items (`<material-menu-item label="Cut">`) never match (`material-menu.tsx:184`) |
| 11 | major | material-slider | Invalid CSS `max(0, calc(…))` (unitless 0) drops the declaration — leading inactive segment renders 0-wide on range/centered sliders. **Visually confirmed** (`material-slider.css:94,128`) |
| 12 | major | material-switch | Handle geometry in px while the track is rem: at demo-default density 0.9 the ON handle overflows the track right edge by ~3 px (**measured**: handle right 506.9 vs track right 503.7); at density 1.0 it's still 2 px off center due to the border-box offset (`material-switch.css:90-98`) |
| 13 | major | material-tabs | No indicator slide between tabs — indicator is conditionally rendered per tab, selection pops (`material-tab.tsx:174`) |
| 14 | major | material-button | Toggle variant and square resting shape missing entirely (blocks label-button selection in `material-button-group`); submit `name`/`value` are dead props (`material-button.tsx:25-26,63`) |
| 15 | major | material-dialog | No elevation shadow on the basic dialog (spec: level 3). **Visually confirmed** (`material-dialog.css:90-101`) |

---

## 3. Cross-cutting findings

### 3.1 No motion-token layer (affects every component)

`theme.css` defines color + typography tokens but no `--md-sys-motion-*` custom properties. Every duration/easing is hardcoded per component CSS. Measured distribution across `src/components/*/*.css`:

- 19× `cubic-bezier(.2, 0, 0, 1)` — correct MD3 standard easing ✓
- 7× `cubic-bezier(0.05, 0.7, 0.1, 1)` — correct emphasized-decelerate ✓
- 7× `cubic-bezier(0.4, 0, 1, 1)` — **M2 legacy accelerate**, used for every exit animation (menu, dialog, snackbar)
- Many `linear` transitions (state layers, tooltip fade, chip/switch color changes) where MD3 pairs standard easing with short durations

**Recommendation:** add to `theme.css` once:

```css
:root {
  --md-sys-motion-easing-standard: cubic-bezier(0.2, 0, 0, 1);
  --md-sys-motion-easing-standard-decelerate: cubic-bezier(0, 0, 0, 1);
  --md-sys-motion-easing-standard-accelerate: cubic-bezier(0.3, 0, 1, 1);
  --md-sys-motion-easing-emphasized-decelerate: cubic-bezier(0.05, 0.7, 0.1, 1);
  --md-sys-motion-easing-emphasized-accelerate: cubic-bezier(0.3, 0, 0.8, 0.15);
  --md-sys-motion-duration-short2: 100ms;  /* …short4: 200ms, medium2: 300ms, medium4: 400ms */
}
```

then sweep the components. One pass fixes the three M2 exit curves and all `linear` state transitions. For the expressive spring cases (`spring.fast.spatial` — switch slide, icon-button shape morph, tab indicator), a CSS `linear()` approximation like `linear(0, 0.4 20%, 0.9 40%, 1.04 65%, 0.99 85%, 1)` over ~350 ms gives the intended slight overshoot.

### 3.2 State-layer opacity drift

Spec: hover 8%, focus 10%, pressed 10%. Implementations vary per component:

- ✓ correct: material-switch (8/10 via `color-mix`), material-snackbar (8/10), material-icon-button (8/10/10), material-fab (8/10/10)
- ✗ hover 10% / pressed 15%: material-checkbox (`material-checkbox.tsx:28-35` — code comment even mis-cites spec as "8/12"), material-radio (`material-radio.tsx:25-32`), material-option (`material-option.tsx:104`), material-menu-item (`material-menu-item.tsx:96`)
- ✗ pressed 12%: material-button (`material-button.css:85`), material-split-button (`material-split-button.css:212`), material-chip (`material-chip.css:148`)

**Recommendation:** a shared state-layer utility (or Tailwind `/8` custom steps) so the numbers can't drift. The pressed color flip from the spec (selected → on-surface layer, unselected → primary layer) is unimplemented everywhere.

### 3.3 Disabled-state system

MD3 disabled = on-surface @ 38% for content, @ 12% for outlines/containers (4% for filled text-field containers). Implementation is a blanket `opacity: .4` in buttons, icon-button, fab, split-button, chip, checkbox, radio, tabs — so disabled filled controls keep their primary hue instead of going neutral (visible in the button demo screenshot: "Disabled" filled/tonal buttons read blue-grey, not grey). Text fields dim only the input text and **keep live hover styling when disabled** (`material-textfield.tsx:258,269,309`). The slider gets it right (38%/12%, `material-slider.css:348`), proving the pattern is available in-repo.

### 3.4 Density scaling: px vs rem audit needed

The demo's density switcher rescales root font-size (0.8/0.9/1.0×) and component CSS is intended to be rem-based. The switch handle (and its `--handle-x` offsets) are specified in px, so at the **default demo density (0.9)** every ON switch handle overflows its track (measured +3.2 px past the right edge; screenshots show it clearly). Icon-button, slider, and button sizes measured correctly (all rem). **Recommendation:** audit remaining px values in component CSS (`grep -n '[0-9]px' src/components/*/*.css`) and convert size/position values to rem; px is fine for hairlines (1–2 px borders).

### 3.5 Form-association maturity is uneven

`material-switch` and `material-slider` are the reference implementations (`formDisabledCallback`, `setValidity`, reset/restore). Gaps elsewhere:

- material-checkbox: no `formDisabledCallback`, `required` never blocks submission (`material-checkbox.tsx:46-50`)
- material-radio-group: same two gaps; group `disabled` toggle is one-way and clobbers per-radio state (`material-radio-group.tsx:81`)
- material-button: submit `name`/`value` never reach FormData (`requestSubmit()` without submitter, no `setFormValue`)
- material-icon-button / material-chip: `name` property not reflected → JS-set names never submit
- material-file-field: `required` is decorative (readonly inner field + hidden native input); `multiple` accepted but only `files[0]` is used (`material-file-field.tsx:87,177`)

### 3.6 Overlay stacking strategies diverge

Menu uses the Popover API (top layer ✓), dialog uses native `<dialog>` (top layer ✓), tooltip and snackbar-host use `position: fixed` + z-index — both render **under** an open modal dialog, and the tooltip additionally breaks inside transformed ancestors. Recommendation: `popover="hint"` (fallback `manual`) on the tooltip surface; document the snackbar limitation.

### 3.7 `aria-label` host duplication pattern

The `@Prop({ attribute: 'aria-label' })` pattern (textfield, textarea, tabs, button, icon-button, fab, split-button) leaves the attribute on the host *and* copies it to the inner control — a double-announcement hazard. Standard fix: remove the host attribute in `componentWillLoad` (or use ElementInternals).

### 3.8 Theme bridge gaps

- Fixed-color roles (`--md-sys-color-primary-fixed`, `-fixed-dim`, `on-…-fixed[-variant]`, secondary/tertiary equivalents) exist in the six theme files but are **not bridged** in `material.css` `@theme` — `bg-primary-fixed` etc. don't exist as utilities.
- No shape tokens (`--md-sys-shape-corner-*`) and no elevation tokens — each component hardcodes its radii and shadows (dialog then forgot its shadow; tooltip invented an ad-hoc one).
- Scrim color hardcoded `rgb(0 0 0 / .32)` in dialog instead of `var(--md-sys-color-scrim)` (`material-dialog.css:69`).

### 3.9 Stencil warnings in the demo console

`@Prop() "disabled" on <material-button> is immutable but was modified from within the component` — fires 6× on the button demo page alone. Either mark the prop `{ mutable: true }` or move the internal write to a `@State`.

---

## 4. Per-component findings

Severity: **[C]** critical · **[M]** major · **[m]** minor · **[s]** suggestion. Spec references are to `docs/wiki/specs/google-material/`.

### 4.1 material-button

**Code**
- [M] Submit `name`/`value` are dead props — `form.requestSubmit()` with no submitter, no `setFormValue` (`material-button.tsx:25-26,63`).
- [M] Mutates its immutable `disabled` prop internally (Stencil console warning on the demo page).
- [m] No `:focus-visible` state layer — every sibling component has one (`material-button.css:84-85`).
- [s] Popover-invoker code duplicated verbatim in button/icon-button/fab — extract to `src/utils/`.

**MD3 conformance**
- [M] Toggle variant (selected state + shape morph) missing — also blocks label-button selection in button groups (buttons-specs.md:11-15,44-50,94-96).
- [M] Square resting-shape option missing (buttons-specs.md:24-25,114-117); icon-button has a `shape` prop, button doesn't.
- [m] Pressed state layer 12% vs 10%; disabled `opacity:.4` (see 3.2/3.3).
- ✓ Verified: XS–XL height/padding scale, pressed corner radii 8/8/12/16/16, all five variant color sets, elevated level-1 shadow. Visual check (light+dark): passes.

**Motion**
- [M] Ripple is 1.2 s linear (`material-button.css:104`) — press feedback should be ≤450 ms standard-decelerate. Same keyframes in fab and split-button.
- [M] Shape-morph on press is opt-in here but always-on in icon-button — the two should agree (spec treats it as default expressive behavior).

### 4.2 material-icon-button

**Code**
- [M] `toggle` + `href` silently breaks: anchor branch has no `aria-pressed` and skips toggle logic (`material-icon-button.tsx:89,132-150`).
- [m] `name` prop not reflected → JS-configured toggles submit nothing; `formStateRestoreCallback` signature too narrow; `selectedChange` event name unprefixed.

**MD3 conformance**
- ✓ All measurements verified in-browser: default/narrow/wide widths per size (56/48/72 dp at M etc., icon-buttons/specs.md:84-104), 48 dp XS/S touch targets, all four variants' selected/unselected colors, state layers 8/10/10. The strongest conformance in the set.
- [m] Disabled `opacity:.4` (see 3.3).

**Motion**
- [m] Selected shape morph uses 180 ms standard easing — the canonical `spring.fast.spatial` candidate; a `linear()` spring would land the expressive bounce.

### 4.3 material-fab

**Code**
- [M] `hide-near-end` hides via `opacity:0; pointer-events:none` but the button stays in tab order — invisible focus stop (`material-fab.css:52-57`; same in fab-menu). Add `visibility: hidden` with `allow-discrete`.
- [m] Scroll-hide block copy-pasted into fab-menu — extract.

**MD3 conformance**
- [M] Size naming off-by-one vs spec: spec FAB(56)/Medium(80)/Large(96); impl maps `small→56, medium→80, large→96` and defaults to `medium` — users following M3 docs get a FAB one size larger (fab/specs.md:6-12,27-31; `material-fab.css:70-72`, `material-fab.tsx:23`).
- [m] Disabled state invented (spec has none for FAB); [s] Extended FAB missing (spec'd in buttons/extended-fab-specs.md) — backlog note.
- ✓ State layers 8/10/10, elevation 3→4 on hover, all six color styles. Visual check: passes (container + vivid rows, shadows correct).

**Motion**
- [M] Same 1.2 s linear ripple.
- [m] Hide-near-end exit should use emphasized-accelerate rather than standard.

### 4.4 material-fab-menu (+ item)

**Code**
- [C] Roving focus is a complete no-op — `items[j].focus()` on hosts with no tabindex and no `delegatesFocus`; `focusFirstItem()` fails identically (`material-fab-menu.tsx:140-180`). Fix: `shadow: { delegatesFocus: true }` on the item or a `@Method() setFocus()`.
- [C] Enter/Space on an `href` item `preventDefault`s and only emits — keyboard users can never follow the link (`material-fab-menu-item.tsx:45-51`).
- [M] Enter/exit animations are dead code: closed panel is `display:none` with no `@starting-style`/`allow-discrete`, so it pops (`material-fab-menu.css:133-145`).
- [M] Tab-to-close steals focus back to the FAB — spec says Tab moves on (fab-menu/accessibility.md:39-44).
- [m] `role="menuitem"` on host wrapping a nested button (spec actually says role Button); disabled host lacks `aria-disabled`; `open` set before first render is ignored.

**MD3 conformance**
- [M] Initial focus should land on the close button, not the first item (fab-menu/accessibility.md:28-37).
- [m] No item scrolling behind the close button on short viewports (`overflow: visible`).
- ✓ Item anatomy (56 dp, paddings, title-medium), color sets close=container/items=vivid, 4 dp/8 dp spacing chain.

**Motion**
- [M] No entrance choreography: after fixing `@starting-style`, add per-index `translateY(8px)→0` + fade with ~25 ms stagger, enter emphasized-decelerate ~400 ms, exit emphasized-accelerate ~200 ms.
- [m] FAB icon swap (add→close) is a hard cut — cross-fade/rotate it.

### 4.5 material-split-button

**Code**
- [m] `.trailing` state selectors only test `:disabled`, not the `aria-disabled` anchor case; otherwise clean ARIA wiring (`aria-haspopup/expanded/controls`, default `menuLabel`).

**MD3 conformance**
- [M] No 48 dp touch target for XS/S sizes — icon-button implements this, split-button doesn't (split-button/accessibility.md:17-19).
- [m] Pressed 12% vs 10%; disabled `opacity:.4`.
- ✓ Exceptional token fidelity: every XS token, inner corners 4/4/4/8/12 per size, optical chevron offsets −1/−1/−2/−3/−6 incl. selected re-centering, 4 color styles.

**Motion**
- ✓ Inner-corner morph on hover/focus/press with standard easing is the strongest motion conformance in the set.
- [M] Same 1.2 s linear ripple.

### 4.6 material-button-group

**Code**
- [M] `role="radiogroup"` over children exposing `aria-pressed` — AT announces a radiogroup with zero radios (`material-button-group.tsx:68-71`). Keep `role="group"`, or propagate radio semantics.
- [M] Selection only works with `material-icon-button[toggle]` — label buttons can't participate until material-button grows a toggle variant.
- [m] `selectedChange` handler doesn't verify the event came from a direct child.

**MD3 conformance**
- [M] Group CSS pins `--btn-r-start/end` on slotted hosts, which suppresses the children's pressed/selected shape morphs entirely (they set the fallback `--btn-r`) — the signature "selected segment becomes a pill" behavior can't happen (`material-button-group.css:35-49` vs `material-icon-button.css:77-98`).
- [M] Connected 2 dp gap breaks with XS/S icon buttons: their 48 px a11y boxes widen the visible gap to ~6–10 px (button-groups-specs.md:118-128,144-148).
- [M] Standard-group press interaction (selected button and neighbors change width) unimplemented — the group is a static flex row (button-groups-specs.md:70-84). This is primarily a motion feature; `flex-grow` transitions with a spring `linear()` would close it.
- ✓ Gaps 18/12/8/8/8, connected inner corners, square series all match.

### 4.7 material-textfield

**Code**
- [C] No label association — `<label>` without `htmlFor`, input named only by optional `aria-label` (`material-textfield.tsx:284,340,218`).
- [M] Disabled field keeps live hover styling on container/indicator/fieldset (`material-textfield.tsx:258,269,309`).
- [m] `aria-label` host duplication (3.7); slot presence read in render without `slotchange`; hardcoded English password-toggle labels while select uses `gettext`; `role="alert"` on mutated (not inserted) node may not announce; char counter not in `aria-describedby`.

**MD3 conformance**
- [M] Disabled colors missing entirely (38% content / 4% container / 12% outline — text-fields-specs.md:47-48,170-171).
- [m] Filled hover swaps container tone instead of an 8% on-surface layer; icon-to-text gap 12 dp vs 16 dp; caret color not primary.
- ✓ Verified: 56 dp height, filled 4 dp top corners / outlined 4 dp, indicator 1→2 dp, floated label metrics, supporting-text geometry, prefix/suffix visibility rules, fieldset notch technique (works on tinted bg — clever and spec-clean). Visual check light+dark: passes, error states correct.

**Motion**
- [M] Focus indicator/outline thickness change doesn't animate at all (`h-px↔h-0.5`, `border↔border-2` snap) while the label animates — reads unsynchronized.
- [m] Label float uses Tailwind default (M2) easing; filled label animates `font-size` producing the wobble that textarea already fixed with `scale-75` (`material-textarea.tsx:185-189`) — port the fix back.

### 4.8 material-textarea

**Code**
- [C] Programmatic `value` updates don't reach the DOM textarea (JSX-child value, no watcher sync, no autoResize re-run) (`material-textarea.tsx:76-80,94-96,167`).
- [M] Safari label-float fallback (`is-filled` class) implemented in textfield but missing here (`material-textfield.tsx:240-245` vs `material-textarea.tsx:195`).
- [M] autoResize min/max math ignores padding under border-box — `min-rows=3` yields ~1.5 visible lines (`material-textarea.tsx:100-106`).
- [m] Same label-association and aria-label issues as textfield.

**MD3 conformance**
- [M] Outlined multi-line top padding 16 dp vs spec 24 dp (text-fields-specs.md:253; `material-textarea.tsx:260`).
- [M] Same missing disabled treatment.
- ✓ Filled top-mask trick for scrolled text, 24 dp line box, `scale-75` label technique — all correct and well-commented.

### 4.9 material-select (+ option, optgroup)

**Code**
- [C] Single-select trigger has no combobox semantics — readonly textbox to AT, open state never announced (`material-select.tsx:688-731`).
- [C] `role="option"` inside `role="menu"` — invalid in both directions; popup should present as listbox (`material-menu.tsx:198`, `material-option.tsx:84`).
- [M] Multi-shell ARIA invalid: `aria-multiselectable` on combobox, `role="listitem"` chips without a list, interactive remove buttons inside the combobox (`material-select.tsx:522-585`).
- [M] Comma in an option value corrupts multi-select state (CSV interchange: `material-select.tsx:94,117,167`).
- [m] Typeahead timer leaks on disconnect; menu width set post-open in rAF (first-frame flicker); focus-dependent label drops while menu is open; `setValidity` anchor may not be focusable.
- ✓ Form association is thorough (FormData multi-entry for Django `getlist`, reset/restore, disabled→null); closed-state typeahead matches native `<select>` parity.

**MD3 conformance**
- ✓ Menu container tokens, item heights, selected tertiary-container, field-width popover, two-line items, grouped headers — visual check of the open popover passes (groups, two-line, disabled option all render correctly).
- [m] Option state layers 10/15 vs 8/10; multi checkbox glyph keeps on-surface-variant on selected rows; optgroup header styling off-token; multi-shell disabled is blanket opacity.

**Motion**
- ✓ Menu enter is exactly emphasized-decelerate 150 ms with anchor-corner origin + reduced-motion guard.
- [m] Exit is M2 accelerate (3.1); chevron doesn't rotate on open; clear/chevron buttons appear with no transition (layout jump).

### 4.10 material-file-field

- [M] `required` never blocks submission (readonly inner field + hidden input) — needs ElementInternals validity.
- [M] `multiple` accepted but only `files[0]` is read/displayed/emitted (`material-file-field.tsx:87,111,177`).
- [m] Picker-cancel emits a spurious `fileChange`; any click in the host (incl. helper text) opens the picker; download link a11y name falls back to icon ligature text.
- ✓ Django ClearableFileInput contract faithfully reproduced (light-DOM inputs, `${name}-clear` checkbox, pick-overrides-clear, dimmed deferred-clear).

### 4.11 material-checkbox

**Code**
- [C] Focusable button has no `aria-checked` — reads permanently unchecked; `mixed` invisible (`material-checkbox.tsx:90,153-164`).
- [M] No `formDisabledCallback`; `required` cosmetic (both implemented in switch — mirror it).
- [m] Checked+indeterminate submits null (native still submits); label keeps `cursor-pointer` when disabled; render blocked forever if the adopted stylesheet fetch rejects.

**MD3 conformance**
- ✓ 18 dp box / 40 dp layer / 48 dp target; error palette legitimate.
- [m] Corner radius 4 px vs spec 2 dp (`rounded-sm` → use `rounded-xs`/`rounded-[2px]`); state layers 10/15 vs 8/10; disabled dimmed-primary vs on-surface 38%.

**Motion**
- [M] No mark animation and none possible — the icon is conditionally rendered. Always render the mark; draw the check via `clip-path: inset(0 100% 0 0) → inset(0)` at 200 ms standard easing (motion spec: "selection controls use 200 ms + standard").

### 4.12 material-radio / material-radio-group

**Code**
- [C] Roving tabindex never initializes (shadow-piercing before child render; light-DOM-only MutationObserver) — Tab stops on every radio (`material-radio-group.tsx:59-65,84`). Make focusability a prop on `material-radio` instead.
- [M] Group `disabled` un-toggle leaves children disabled forever (`material-radio-group.tsx:81`).
- [M] `required` not enforced via `setValidity`; no `formDisabledCallback`.
- ✓ Arrow-key selection-follows-focus with wrap, Home/End, `aria-checked` on the focusable button (done right here, unlike checkbox).

**MD3 conformance**
- ✓ 20 dp ring / 10 dp dot / 40 dp layer / 48 dp target; label on-surface.
- [m] State layers 10/15 vs 8/10; disabled dimmed vs on-surface 38%; error state is a beyond-spec extension (fine, document it).

**Motion**
- [M] No dot scale-in — dot conditionally rendered. Always render with `scale(0)→scale(1)` at 200 ms standard, or spring `linear(0, 0.6 30%, 1.05 60%, 0.98 80%, 1)` for the expressive bounce.

### 4.13 material-switch

**Code**
- [M] Touch target is the bare 52×32 track — under the 48 dp guidance the other controls meet (`material-switch.css:54-68`).
- [M] **Density bug (measured):** handle sizes/offsets in px against a rem track — at the demo default 0.9 density the ON handle overflows the track by ~3 px; at 1.0 it's 2 px off-center (border-box offset uncompensated) (`material-switch.css:90-98`; see 3.4).
- [m] Label text doesn't toggle (plain divs, not `<label>`).
- ✓ Otherwise the strongest of the four selection controls: `formDisabledCallback`, `setValidity`, `role="switch"` + `aria-checked` on the real button.

**MD3 conformance**
- ✓ Track/handle size table 16→24→28, exact 8/10 state-layer opacities via `color-mix`, correct color roles.
- [m] Hover/focus handle color changes missing; focus ring 2 px vs 3 dp; disabled selected handle should stay opacity 1 with surface color.

**Motion**
- ✓ Slide + grow-on-press implemented at 180 ms standard easing — closest to spec in the set.
- [s] Bump to 200 ms; replace `120ms linear` color transitions; the slide is the canonical `spring.fast.spatial` candidate.

### 4.14 material-slider

**Code**
- [M] `max(0, calc(...))` is invalid CSS (unitless zero) — declaration dropped, leading inactive segment renders 0-wide on range/centered sliders. **Visually confirmed in light and dark screenshots.** Fix: `max(0%, …)` (`material-slider.css:94,128`).
- [M] RTL: pointer math inverts but positioning is physical — thumb moves away from the cursor in RTL (`material-slider.tsx:170`, `material-slider.css:239`).
- [m] `valueChange` fires on every pointermove without an old≠new guard; min/max/step only sanitized at load; both range bubbles show while dragging; xs/s container 44 px < 48 dp target.
- ✓ Keyboard/ARIA complete per thumb; pointer capture, FormData range value, `formDisabledCallback`, `setValidity`.

**MD3 conformance**
- ✓ Size table exactly matches spec (track 16/24/40/56/96, radii, handle widths 4→2 dp on press, 6 dp gap, 4 dp stops).
- [M] Inactive track is `primary/20` instead of secondary-container — the on-secondary-container stop dots sit on a mismatched background; breaks under custom themes (`material-slider.css:17` vs sliders/specs.md:71).
- [m] Default size `s` vs spec XS; value-label weight 500 vs 400; no end-stop dot on continuous sliders (a11y relies on it).

**Motion**
- ✓ Handle narrow-on-press animated correctly.
- [s] Value indicator: opacity-only 120 ms linear → scale-from-bottom + fade (enter 250 ms standard-decelerate, exit 200 ms standard-accelerate); no position animation on keyboard/discrete jumps — add `transition: left 200ms` gated off while `.dragging`.

### 4.15 material-menu (+ item)

**Code**
- [C] Typeahead never matches prop-labeled items — reads light-DOM `textContent`, but `label` renders as shadow slot fallback (`material-menu.tsx:184`, `material-menu-item.tsx:112`).
- [M] Focus stolen on light-dismiss — unconditional `returnTo.focus()` on every close yanks focus back from wherever the user clicked; Tab handler fights the browser (`material-menu.tsx:124-126,173-175`).
- [M] `anchor` prop breaks for class/attribute selectors (auto-prefixes `#`) (`material-menu.tsx:93-96`).
- [M] `aria-selected` invalid on `role="menuitem"`; no `aria-haspopup/expanded` management on the trigger.
- [m] Disabled items skipped instead of focusable-but-inert (spec); typeahead timer leak; dead `group-focus-visible` state-layer selector.

**MD3 conformance**
- ✓ Container (surface-container-low, 16 dp, level-2 shadow), item 48 dp / 2 dp gaps / selected tertiary-container — open-menu screenshot passes (icons, shortcuts, disabled item, divider all correct).
- [m] State layers 10/15 vs 8/10; per-item rounded segments are the expressive grouped style — document the choice.

**Motion**
- ✓ Enter: 150 ms emphasized-decelerate, scale-from-anchor-corner, `@starting-style` + `allow-discrete`, reduced-motion — exemplary.
- [m] Exit is M2 accelerate (3.1); missing transform-origin for `-center` placements.

### 4.16 material-dialog

**Code**
- [M] Scrim click closes via `dialog.close()` bypassing the cancelable `materialDialogCancel` path Esc gets — "unsaved changes" guards can't veto backdrop dismiss (`material-dialog.tsx:190`).
- [m] Click-outside uses `click` (text-selection drag can close); stale `open` prop if removed while open.
- ✓ Native `<dialog>`/`showModal` architecture (top layer, focus trap, Esc, focus restore); command/commandfor support; clean listener lifecycle.

**MD3 conformance**
- [M] No elevation shadow on the basic dialog — spec level 3. **Visually confirmed**: container floats flat against the scrim (`material-dialog.css:90-101`).
- [m] Scrim hardcoded black instead of `var(--md-sys-color-scrim)`; full-screen headline weight 500 vs title-large 400.
- ✓ Everything else: 28 dp radius, 280–560 dp, 24 dp padding, icon/headline/supporting tokens, full-screen 56 dp header, adaptive variant.

**Motion**
- [M] Enter 150 ms is too fast for a "larger area" component — spec suggests emphasized-decelerate ~300–400 ms; exit should be emphasized-accelerate ~200 ms instead of M2 100 ms.
- ✓ Fade+scale with synchronized backdrop, `@starting-style`, reduced-motion.

### 4.17 material-tooltip

**Code**
- [C] WCAG 1.4.13: surface not hoverable, rich actions close after 1.5 s while the user reaches for them (`material-tooltip.tsx:184-209`). Add pointerenter/focusin on the surface to cancel the hide timer.
- [M] `position:fixed` + z-index 1000 — renders under modal dialogs, breaks in transformed ancestors; use `popover="hint"`.
- [M] Two permanent document listeners per instance even while closed; one-shot trigger binding misses dynamically added triggers.
- [m] `variant` switch doesn't rebind ARIA; long-press doesn't suppress context menu; `tooltipShow/Hide` names break the `material*` event convention.
- ✓ role/describedby/details wiring, single-open-instance rule, `title` suppression, Esc dismiss.

**MD3 conformance**
- ✓ Plain tooltip verified in screenshot (inverse-surface pill, correct typography). Rich anatomy correct.
- [m] Rich subhead should be on-surface-variant; body→actions gap 8 dp vs 12 dp; ad-hoc shadow vs level-2 pair.

**Motion**
- [m] `opacity 120ms linear` both ways → enter 150 ms standard-decelerate, exit 100 ms standard-accelerate; add reduced-motion guard for parity.

### 4.18 material-snackbar (+ host)

**Code**
- [C] Exit animation never plays — host sets `current = undefined` immediately on close, unmounting mid-transition (`material-snackbar-host.tsx:176-184`). Keep mounted until `transitionend`.
- [M] `onAction` returning `false` doesn't keep the snackbar open (host never calls `preventDefault` — contradicts its own doc at `material-snackbar-host.tsx:21-26`).
- [M] Same-id `enqueue` with unchanged duration doesn't reset the auto-dismiss timer (Stencil skips same-value watchers).
- [m] `replace()` with only actionLabel changed doesn't re-render; standalone snackbar has no live region and no Esc.
- ✓ Host live region (polite/assertive, re-announcement trick), one-at-a-time queue, Django messages mapping.

**MD3 conformance**
- ✓ Verified in screenshot: inverse-surface, 4 dp radius, level-3 shadow, bottom placement. Heights, typography, action colors, state layers 8/10 all token-correct.
- [m] Close icon 20 px vs 24 dp.

**Motion**
- ✓ Enter 200 ms emphasized-decelerate with 8 px rise — token-correct.
- [m] Exit M2 curve (moot until the unmount bug is fixed).

### 4.19 material-tabs

**Code**
- [M] No tab↔panel association API (`aria-controls`/`tabpanel` nowhere) — tablist with no announced target.
- [m] `role="tab"` not a direct tablist child in the flattened tree (host needs `role="presentation"`); indicator min-width anchors left instead of centering when it kicks in; deep `querySelectorAll` catches nested tabs; no RTL arrow flip; click doesn't scroll a clipped tab into view.
- ✓ Roving tabindex, manual activation, disabled skipping — the keyboard model itself is correct.

**MD3 conformance**
- ✓ 48/64 dp heights, primary 3 dp hugging indicator / secondary 2 dp full-width, colors, badges — screenshot passes.
- [m] Inactive state layer should be on-surface (hover/focus) and primary (pressed), not `currentColor`; focus ring 2 dp vs 3 dp; disabled state invented.

**Motion**
- [M] **No indicator slide between tabs** — conditionally rendered per tab, selection pops. Hoist a single indicator into `material-tabs` and FLIP-animate `translateX/scaleX`; spring `default.spatial` (damping 0.9, stiffness 700) or 300 ms standard easing. This is the most visible missing animation in the library.

### 4.20 material-chip

**Code**
- [C] Remove-button hit-area `::before` uses `inset` against the chip (`.trailing-btn` isn't positioned) — an invisible overlay covers the whole input chip and steals label clicks, firing `remove` (`material-chip.css:176-192`). Fix: `position: relative` on `.trailing-btn`.
- [M] No Backspace/Delete removal on focused input chips (chips/accessibility.md:41).
- [M] Remove label is generic "Remove" — spec wants "Remove {label}" (`material-chip.tsx:174`).
- [m] Avatar slot detection not reactive; `name` not reflected; `href` ignores selectable variants; only component not using `adoptMaterialStyles` (second styling convention — decide deliberately).

**MD3 conformance**
- ✓ 32 dp / 8 dp radius, icon sizes, paddings, avatar spec, selected secondary-container, elevated level-1 — screenshot passes.
- [m] Pressed 12% vs 10%; disabled split values (38%/12%) vs blanket opacity; suggestion-chip outline role; selected filter chip with custom icon shows no checkmark swap.

**Motion**
- [M] No check-in animation on filter selection (conditional render + width jump). Animate check width 0→18 px and `scale(0.6→1)` at 200 ms standard; keep it in the DOM.
- [s] Input-chip removal exit motion (200 ms emphasized-accelerate collapse).

### 4.21 material-linear-progress

**Code**
- [M] Missing `@Watch('stopIndicator')` — toggling it leaves stale track segments until the next value/resize.
- [m] rAF loop never idles (runs per-frame even static/paused/reduced-motion — loading-indicator cancels correctly, copy that); `aria-valuenow` unclamped; reduced-motion indeterminate freezes on an arbitrary frame.

**MD3 conformance**
- ✓ 4 dp track/stop/gaps, squashed stop at 8 dp thickness, wavy 3 dp/40 dp geometry, colors — screenshots pass (incl. wavy + reduced-motion demo cases).
- [M] Indeterminate draws bars over a full-length track with no 4 dp gap — legacy look; expressive keeps the separation in all modes (specs.md:48).
- [m] Internal 4 dp `PADDING` misreads the "inset from screen edge" guidance — a 100%-width host renders short; at value=100 the bar never covers the stop dot.

**Motion**
- [M] Determinate value changes jump — tween toward target in the existing rAF loop (spring default.spatial or ~500 ms emphasized).
- [m] Indeterminate uses symmetric easeInOutCubic — head/tail should run different accelerate/decelerate curves (2000 ms cycle) for the characteristic stretch-and-snap.

### 4.22 material-circular-progress

- [M] No gap between active arc and track (full ring underneath) — expressive spec retracts the track ~4 dp + cap radius from each active end.
- [m] Same rAF-never-idles and unclamped `aria-valuenow`; full-circle track resampled ~200 segments per frame in wavy mode (cache it); wavy doesn't default to 48 dp.
- [m] Indeterminate "breathes" symmetrically (cosine pulse) instead of the chase (alternating head/tail phases ~1333 ms with standard easing + accumulating rotation offset).
- ✓ Defaults 40/4 dp, wavy 1.6/15 dp, colors, in-button usage — screenshots pass.

### 4.23 material-loading-indicator

- [m] Reduced-motion branch rebuilds the identical path every frame (set once, cancel loop); imperative DOM writes race Stencil re-renders on prop change; `paused` resume restarts the cycle from zero.
- ✓ 7-shape sequence and order, ~4.7 s cycle, 38/48 sizing, both color schemes, morph/spin coupling matches the documented canonical behavior. ARIA correct.
- [s] Spring-based morph (`spring.default.effects`) worth an A/B against the reference `animation.mp4` — current hand-tuned ease was validated against it, don't change blind.

---

## 5. Quick pass (lower-priority components)

- **material-card, material-divider, material-badge** — no notable findings (badge 6/16 dp verified).
- **material-list / list-item** — [M] `role="menuitemcheckbox"` under `role="group"` is invalid (multi-select should be listbox/option); [m] no roving tabindex despite arrow-key nav. Heights 56/72/88 ✓.
- **material-app-bar / search-app-bar** — [m] `:has(::slotted(*))` is invalid CSS in both; in search-app-bar it leaves a phantom 4 px flex gap after the input (`material-search-app-bar.css:99`). Heights/scroll colors ✓.
- **material-toolbar** — [m] `role="toolbar"` without the roving-focus contract or `aria-orientation`.
- **material-navigation-rail / item** — [m] expanded active label should be on-secondary-container, not secondary (`material-navigation-item.tsx:144`). Widths 96/220 ✓.
- **date/time/datetime fields** — [M] light-DOM `valueChange` name collision: inner textfield/time-picker events leak to consumers as canonical field events — `stopPropagation` inner emits or rename; [M] date-field typed input bypasses min/max (time-field validates — mirror it). Parsing stack (`src/utils/date-utils.ts`) is solid.
- **material-calendar** — [M] Enter/Space dead on first focus (empty `focusedDate` fallback misses the focused button's `data-iso`); [M] `role="grid"` without row/gridcell structure and `aria-selected` on buttons — not exposed as a grid; [m] no month-transition animation. Keyboard model otherwise unusually thorough.
- **material-time-picker** — [m] documented Intl locale default for `mode` is dead code; dial can't reach off-5-minute values (keyboard-only); number inputs fight multi-digit typing (normalize on blur).
- **material-carousel / item** — [M] arrow-key nav is a focus no-op for `href`/`clickable` items (host not focusable, no `delegatesFocus`). Parallax implementation otherwise good (rAF-throttled, reduced-motion in JS+CSS, clean teardown); 28 dp/16 dp/8 dp ✓.

---

## 6. Visual review notes

Screenshots at 1280×1600, densities per demo default (0.9), light + dark (`scratchpad` session artifacts; reproduce via `npm start` + the demo pages).

**Passing:** button variants/sizes incl. XS–XL expressive scale; icon-button all variants/sizes/widths (widths measured: 43/50/65 px = 48/56/72 dp × 0.9 — exact); FAB color sets + elevation; split-button incl. RTL; button-group standard/connected; textfield/textarea/select all states incl. error, tinted-background notch, dark theme; select popover (groups, two-line items, disabled options); menu open state (icons, shortcuts, divider, disabled); dialog anatomy; snackbar (inverse-surface, shadow, placement); plain tooltip; tabs primary/secondary indicators; chips all variants; linear/circular progress incl. wavy; loading indicator.

**Failing / confirmed visually:**
- Switch ON handle overflows the track at density 0.9 (multiple demo rows).
- Slider leading inactive segment missing on range/centered sliders (light and dark).
- Dialog has no elevation shadow against the scrim.
- Disabled filled/tonal buttons read blue-tinted rather than neutral on-surface grey.

**Console:** Stencil `disabled` prop-mutation warnings on the button demo (6×). No errors on any core page.

---

## 7. Suggested order of work

1. **Behavior bugs users hit immediately:** chip remove-overlay (#1), snackbar exit unmount (#8), textarea value sync (#3), slider `max(0%…)` one-liner (#11), switch px→rem (#12), menu typeahead (#10).
2. **A11y wiring sweep:** label association (textfield/textarea), select combobox+listbox roles, checkbox `aria-checked`, radio-group roving tabindex, fab-menu `delegatesFocus`, tooltip hoverability. Mostly mechanical; unlocks screen-reader usability across the form suite.
3. **Motion token layer (3.1) + easing sweep**, then the three high-visibility animations: tab indicator slide, checkbox/radio mark animations (requires the always-render structural change), fab-menu stagger. Then dialog enter timing, determinate progress tweening, indeterminate curve shapes.
4. **Disabled-state system (3.3)** as one cross-component pass.
5. **Spec variants backlog:** button toggle + square shape, FAB size renaming + small/extended FAB, button-group width redistribution, linear-progress indeterminate gap, circular-progress track gap.
