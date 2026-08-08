# Progress & loading — material-linear-progress, material-circular-progress, material-loading-indicator, material-skeleton

Determinate/indeterminate progress and content placeholders. All read the active theme's `primary` color. Give any of them a `label` for the accessible name.

## material-linear-progress

Horizontal bar.

```html
<material-linear-progress value="50" label="50%"></material-linear-progress>   <!-- determinate -->
<material-linear-progress label="Loading"></material-linear-progress>          <!-- indeterminate: omit value -->
```

- `value` — 0–100; **omit it for the indeterminate animation.**
- `label`, `thickness` (px), `wavy` (MD3 wavy track), `stop-indicator` (`auto` default | `always` | `never` — the trailing dot), `paused`.

## material-circular-progress

Ring form; same value contract.

```html
<material-circular-progress value="60" size="44" thickness="8" label="60%"></material-circular-progress>
<material-circular-progress label="Loading"></material-circular-progress>       <!-- indeterminate -->
```

- `value` (omit → indeterminate), `size` (px), `thickness` (px), `wavy`, `paused`, `label`.

## material-loading-indicator

MD3 expressive loading glyph (a morphing shape) for indeterminate waits — not tied to a percentage.

```html
<material-loading-indicator size="48" label="Loading"></material-loading-indicator>
```

- `size` (px), `variant` (`default` | `contained`), `paused`, `label`.

## material-skeleton

Shimmer placeholder shown while a fragment loads. Three primitives; compose larger placeholders from plain markup + utility classes.

```html
<!-- Text block: N lines, last line shortened -->
<material-skeleton lines="3"></material-skeleton>

<!-- Avatar + two-line text row -->
<div class="flex items-center gap-3">
  <material-skeleton variant="circular"></material-skeleton>
  <material-skeleton lines="2" class="flex-1"></material-skeleton>
</div>

<!-- Card: media block + title/body -->
<material-skeleton variant="rectangular" class="h-32"></material-skeleton>
<material-skeleton lines="2"></material-skeleton>
```

- `variant` — `text` (default, stacked lines) | `circular` (avatar) | `rectangular` (image/media).
- `lines` — number of text lines (`text` variant); the last line renders shortened.
- Sizing: `text` sizes from font metrics; `circular` / `rectangular` size from the host element — set height/width with classes or inline style (e.g. `class="h-32 w-full"`).
- Presentational and `aria-hidden`; reduced-motion falls back to a pulse.
