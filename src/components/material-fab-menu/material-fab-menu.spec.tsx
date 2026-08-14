/*
 * advanced-material-web — Material 3 web components
 * Copyright (c) 2017-2026 Mikhail Podgurskiy
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * AGPLv3 with the Viewflow Library Exception — see LICENSE_EXCEPTION.
 *
 * The copyright holder regards code produced from this file with an LLM's
 * help as a derived work: placing it in a model's context is copying it.
 * A commercial licence without copyleft: https://viewflow.io/pro.html
 */

import { newSpecPage } from '@stencil/core/testing';
import { MaterialFabMenu } from './material-fab-menu';

// Only static, prop-driven rendering is covered here. Anything that flips
// `open` after the component has mounted — show()/hide()/toggle(), a click
// on the FAB, any keydown while the panel could be open — runs through
// `panel.matches(':popover-open')` (@Watch('open') / @Listen('keydown')),
// and mock-doc's selector engine doesn't implement the `:popover-open`
// pseudo-class at all: it throws "unsupported pseudo" synchronously,
// regardless of the actual state, the moment that selector is evaluated.
// Setting `open` as an *initial* HTML attribute is fine (Stencil doesn't run
// @Watch for a prop's first value), so that's how the open-state markup
// below is exercised. All of the popover-driven interaction — open/close,
// focus management, materialFabMenuOpen/Close — is covered by
// material-fab-menu.e2e.tsx in a real browser instead.

describe('material-fab-menu', () => {
  it('renders the closed state with default props', async () => {
    const page = await newSpecPage({
      components: [MaterialFabMenu],
      html: `<material-fab-menu></material-fab-menu>`,
    });
    expect(page.root!.getAttribute('size')).toBe('medium');
    expect(page.root!.getAttribute('color-set')).toBe('primary');

    const fab = page.root!.shadowRoot!.querySelector('[part="fab"]')!;
    expect(fab.getAttribute('aria-haspopup')).toBe('menu');
    expect(fab.getAttribute('aria-expanded')).toBe('false');
    expect(fab.getAttribute('aria-label')).toBe('Toggle menu');
    expect(fab.querySelector('.icon')!.textContent).toBe('add');

    const panel = page.root!.shadowRoot!.querySelector('[part="panel"]')!;
    expect(panel.getAttribute('role')).toBe('menu');
    expect(panel.getAttribute('aria-orientation')).toBe('vertical');
    expect(panel.getAttribute('popover')).toBe('auto');
    expect(fab.getAttribute('aria-controls')).toBe(panel.id);
  });

  it('an initial open attribute renders the open state and the close icon', async () => {
    const page = await newSpecPage({
      components: [MaterialFabMenu],
      html: `<material-fab-menu open close-icon="clear"></material-fab-menu>`,
    });
    const fab = page.root!.shadowRoot!.querySelector('[part="fab"]')!;
    expect(fab.getAttribute('aria-expanded')).toBe('true');
    expect(fab.querySelector('.icon')!.textContent).toBe('clear');
  });

  it('a custom icon prop replaces the default glyph while closed', async () => {
    const page = await newSpecPage({
      components: [MaterialFabMenu],
      html: `<material-fab-menu icon="edit"></material-fab-menu>`,
    });
    expect(page.root!.shadowRoot!.querySelector('.icon')!.textContent).toBe('edit');
  });

  it('an explicit aria-label overrides the default "Toggle menu"', async () => {
    const page = await newSpecPage({
      components: [MaterialFabMenu],
      html: `<material-fab-menu aria-label="Quick actions"></material-fab-menu>`,
    });
    expect(page.root!.shadowRoot!.querySelector('[part="fab"]')!.getAttribute('aria-label')).toBe(
      'Quick actions',
    );
  });

  it('reflects size and colorSet prop variants to host attributes', async () => {
    const page = await newSpecPage({
      components: [MaterialFabMenu],
      html: `<material-fab-menu size="large" color-set="tertiary"></material-fab-menu>`,
    });
    expect(page.root!.getAttribute('size')).toBe('large');
    expect(page.root!.getAttribute('color-set')).toBe('tertiary');
  });

  it('hideNearEnd reflects to the host and attaching/detaching its scroll listener does not throw', async () => {
    // The near-end/not-near-end *outcome* depends on real document
    // layout (scrollHeight), which mock-doc doesn't compute (reports
    // `undefined`, so the component's own math always resolves to "not
    // near the end" here) — that threshold behavior is covered by
    // material-fab-menu.e2e.tsx against a real scrollable page instead.
    // This only asserts the prop wiring: the attribute reflects, and
    // wiring/unwiring the listener on prop change is safe.
    const page = await newSpecPage({
      components: [MaterialFabMenu],
      html: `<material-fab-menu hide-near-end hide-offset="200"></material-fab-menu>`,
    });
    await page.waitForChanges();
    expect(page.root!.getAttribute('hide-near-end')).toBe('');
    expect(page.root!.hasAttribute('near-end')).toBe(false);

    page.root!.removeAttribute('hide-near-end');
    await page.waitForChanges();
    expect(page.root!.hasAttribute('near-end')).toBe(false);
  });

  it('without hideNearEnd, near-end is never set', async () => {
    const page = await newSpecPage({
      components: [MaterialFabMenu],
      html: `<material-fab-menu></material-fab-menu>`,
    });
    await page.waitForChanges();
    expect(page.root!.hasAttribute('near-end')).toBe(false);
  });
});
