# Cards, media & status — material-card, material-carousel, material-avatar, material-avatar-group, material-badge

Content containers and status decorations.

## material-card

Surface container with named slots for the MD3 card anatomy.

```html
<material-card variant="elevated">
  <img slot="media" src="cover.jpg" alt="" />
  <h3 slot="headline">Elevated</h3>
  <span slot="subhead">Sept 14 · 5 min read</span>
  <p slot="supporting">Soft shadow over a low-tone surface.</p>
  <material-button slot="actions" variant="text" label="Read more"></material-button>
</material-card>
```

- `variant` — `elevated` (default) | `filled` | `outlined`.
- Slots: `media`, `headline`, `subhead`, `supporting`, `actions` (button row). Any non-slotted children fall into the body.
- `clickable` — makes the whole card an interactive/hoverable surface; `href` (+ `target` / `rel` / `download`) turns it into a navigation link. `disabled`.
- No default padding assumptions — the slots handle MD3 spacing; don't wrap content in extra padding wrappers.

## material-carousel (+ material-carousel-item)

Horizontal scroller of media items with MD3 snap.

```html
<material-carousel layout="uncontained" large-width="220" aria-label="Gallery">
  <material-carousel-item><img slot="media" src="1.jpg" alt="" /></material-carousel-item>
  <material-carousel-item><img slot="media" src="2.jpg" alt="" /></material-carousel-item>
</material-carousel>
```

- Carousel: `layout` (`uncontained` default | `uncontained-multi-aspect`), `large-width` (px width of the focused large item), `snap` (`mandatory` default | `proximity` | `none`), `parallax`.
- Item: put the image in `slot="media"`. `aspect` (`16:9` default, `1:1`, `4:3`, …), `clickable`, `href` (+ `target`/`rel`) link mode, `disabled`.
- Keyboard arrows scroll the track; direction is RTL-aware.

## material-avatar

Circular identity image with initials/icon fallback.

```html
<material-avatar src="/u/42.jpg" name="Grace Hopper"></material-avatar>
<material-avatar name="Ada Lovelace"></material-avatar>            <!-- initials from name -->
<material-avatar icon="person"></material-avatar>                 <!-- icon fallback -->
```

- `src` (image; falls back to initials/icon on error), `name` (derives initials + accessible name), `initials` (explicit), `icon` (Material Symbols fallback).
- `size` — `xs` (24) | `s` (32) | `m` (40, default) | `l` (48) | `xl` (64).
- `color` — background when showing initials/icon: `auto` (default, hashed from name) | `primary` | `secondary` | `tertiary` | their `-container` variants | `surface`.

## material-avatar-group

Overlapping stack with an overflow count.

```html
<material-avatar-group max="4" size="m">
  <material-avatar name="Anna Petersen"></material-avatar>
  <material-avatar name="Robert Chen"></material-avatar>
  <material-avatar name="Carol Diaz"></material-avatar>
  <material-avatar name="Dmitri Volkov"></material-avatar>
  <material-avatar name="Elena Marquez"></material-avatar>
</material-avatar-group>
```

- `max` — how many avatars to show before collapsing the rest into a "+N" chip. `size` — applied to all children (don't size them individually).

## material-badge

Small count/dot marker, usually positioned over an icon or nav item by the parent's own CSS.

```html
<!-- dot: no value -->
<material-badge></material-badge>
<!-- count -->
<material-badge value="8"></material-badge>
```

- `value` — the number/label; omit for a bare dot.
- `color` — `error` (default) | other theme roles per the readme.
- The badge doesn't position itself over a target — wrap the target and badge in a positioned container (e.g. `position: relative` on the wrapper, absolute on the badge), as the demo does. Navigation components that accept a badge do this positioning for you.
