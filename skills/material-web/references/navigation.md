# Navigation & app shell — material-app-bar, material-search-app-bar, material-toolbar, material-tabs, material-navigation-bar, material-navigation-rail, material-navigation-item, material-navigation-group, material-breadcrumbs, material-pagination

Top bars, side/bottom navigation, tabs, and paging. Navigation items support both `href` links and event-driven selection. Badges attach to items/tabs via `slot="badge"` with a `material-badge`.

## material-app-bar

Top app bar with leading/headline/trailing slots and scroll behavior.

```html
<material-app-bar scroll-target="#main" variant="small">
  <material-icon-button slot="leading" icon="menu" aria-label="Open menu"></material-icon-button>
  <span slot="headline">Inbox</span>
  <material-icon-button slot="trailing" icon="search" aria-label="Search"></material-icon-button>
</material-app-bar>
```

- Slots: `leading`, `headline`, `trailing`.
- `variant` — `small` (default) | `medium` | `large`. `align` (`leading` default | `centered`).
- `scroll-target` (CSS selector of the scroll container) + `collapse-on-scroll` — the bar collapses/tints as that element scrolls; `scrolled` reflects the state.

## material-search-app-bar

App bar whose center is a search input. Form-associated via `name`.

```html
<material-search-app-bar name="q" placeholder="Search" search-icon></material-search-app-bar>
```

- `placeholder`, `value`, `search-icon` (show the leading magnifier), `scroll-target` / `scrolled`.
- Events: `materialSearchInput` (`{value}`, per keystroke), `materialSearchSubmit` (`{value}`, Enter). For a full search-view experience use `material-search` (see `references/search.md`).

## material-toolbar

Cluster of actions (docked or floating), horizontal or vertical.

```html
<material-toolbar variant="floating" color="standard">
  <material-icon-button icon="format_bold" aria-label="Bold"></material-icon-button>
  <material-icon-button icon="format_italic" aria-label="Italic"></material-icon-button>
</material-toolbar>
```

- `variant` (`docked` default | `floating`), `color` (`standard` | `vibrant`…), `orientation` (`horizontal` | `vertical`).

## material-tabs (+ material-tab)

Tab bar; `material-tab` children carry the labels. Selection is event-driven — you show/hide the matching panel yourself.

```html
<material-tabs id="tabs" variant="primary">
  <material-tab value="flights" label="Flights" icon="flight" selected></material-tab>
  <material-tab value="trips" label="Trips" icon="luggage">
    <material-badge slot="badge" value="3"></material-badge>
  </material-tab>
</material-tabs>
```

- Tabs: `variant` (`primary` default | `secondary`), `scrollable` (many tabs → horizontal scroll). Event: `materialTabSelect` (`{value}`).
- Tab: `value`, `label`, `icon`, `selected`; put a `material-badge` in `slot="badge"`.

## material-navigation-bar / -rail / -item / -group

One item component (`material-navigation-item`) serves the bottom **bar**, the side **rail**, and expanded rail rows via its `variant`. The container sets context; you usually don't set the item `variant` by hand inside a matching container.

```html
<!-- Bottom bar (compact) -->
<material-navigation-bar>
  <material-navigation-item icon="home" label="Home" active></material-navigation-item>
  <material-navigation-item icon="notifications" label="Alerts" aria-label="Alerts, 12">
    <material-badge slot="badge" value="12"></material-badge>
  </material-navigation-item>
</material-navigation-bar>

<!-- Side rail (adaptive) -->
<material-navigation-rail label="Mail" modality="auto" breakpoint="640">
  <material-icon-button slot="menu" icon="menu" aria-label="Toggle navigation"></material-icon-button>
  <material-navigation-item icon="inbox" label="Inbox" active></material-navigation-item>
  <material-navigation-group icon="folder" label="Projects">
    <material-navigation-item icon="tag" label="Alpha"></material-navigation-item>
  </material-navigation-group>
</material-navigation-rail>
```

- Item: `icon`, `label` (**required**), `active-icon` (filled variant when active), `active`, `href` (link mode; otherwise selection is event-driven), `value`, `disabled`. Event: `materialSelect` (`{value}`). Method: `setFocus()`. Put a `material-badge` in `slot="badge"`.
- Bar: `activation` (`auto` | manual), `orientation` (`auto` adapts), `breakpoint`.
- Rail: `expanded` / `concealed` (collapsed state), `modality` (`auto` — modal drawer on narrow, inline rail on wide), `breakpoint`, `alignment` (`center` | `top`), `hide-on-collapse`, `label`, `toggle-label`. Put the hamburger in `slot="menu"`. Event: `materialRailToggle` (`{expanded, concealed}`). Methods: `expand()`, `collapse()`, `reveal()`, `conceal()`, `toggle()`.
- Group: `label` (**required**), `icon`, `open`, `storage-key` (persist open/closed). Event: `materialGroupToggle` (`{open}`). Slot children are `material-navigation-item`s.

## material-breadcrumbs

Wraps plain `<a>` links; the current page is a non-link `<span>`. Separators/overflow are handled for you.

```html
<material-breadcrumbs>
  <a href="/">Home</a>
  <a href="/orders">Orders</a>
  <span>PO-2026-0142</span>
</material-breadcrumbs>
```

## material-pagination

Page navigator, link-based or event-based.

```html
<!-- Event-driven (client) -->
<material-pagination page="7" pages="24"></material-pagination>
<!-- Link-based: {page} is substituted -->
<material-pagination page="7" pages="24" href-template="?page={page}"></material-pagination>
```

- `page` (current, 1-based), `pages` (total), `siblings` (page numbers shown around the current), `href-template` (`{page}` placeholder → renders real links).
- Event: `materialPageChange` (`{page}`) — fires when no `href-template` is set.
