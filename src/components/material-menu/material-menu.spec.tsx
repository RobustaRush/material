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
import { MaterialMenu } from './material-menu';

// Open/close, keyboard nav, dismissal, and the show()/hide() methods are
// covered in material-menu.e2e.tsx: they drive the native Popover API
// (showPopover/hidePopover, :popover-open), which mock-doc doesn't implement
// — see docs/agents/testing.md. This file only covers the static render
// contract: default markup, prop-driven attributes, and a11y roles that
// don't require the popover to actually open.

describe('material-menu', () => {
  it('renders a menu role with vertical orientation and a popover attribute, by default', async () => {
    const page = await newSpecPage({
      components: [MaterialMenu],
      html: `<material-menu></material-menu>`,
    });
    expect(page.root!.getAttribute('role')).toBe('menu');
    expect(page.root!.getAttribute('aria-orientation')).toBe('vertical');
    expect(page.root!.getAttribute('popover')).toBe('auto');
  });

  it('leaves an author-supplied popover attribute alone', async () => {
    const page = await newSpecPage({
      components: [MaterialMenu],
      html: `<material-menu popover="manual"></material-menu>`,
    });
    expect(page.root!.getAttribute('popover')).toBe('manual');
  });

  it('menuRole="listbox" switches the host role', async () => {
    const page = await newSpecPage({
      components: [MaterialMenu],
      html: `<material-menu menu-role="listbox"></material-menu>`,
    });
    expect(page.root!.getAttribute('role')).toBe('listbox');
  });

  it('placement reflects to the host attribute, defaulting to bottom-start', async () => {
    const page = await newSpecPage({
      components: [MaterialMenu],
      html: `<material-menu></material-menu>`,
    });
    expect(page.root!.getAttribute('placement')).toBe('bottom-start');
  });

  it('placement prop reflects a non-default value', async () => {
    const page = await newSpecPage({
      components: [MaterialMenu],
      html: `<material-menu placement="top-end"></material-menu>`,
    });
    expect(page.root!.getAttribute('placement')).toBe('top-end');
  });

  it('open prop reflects to the host attribute', async () => {
    const page = await newSpecPage({
      components: [MaterialMenu],
      html: `<material-menu open></material-menu>`,
    });
    expect(page.root!.hasAttribute('open')).toBe(true);
  });

  it('slots material-menu-item children into the shadow root', async () => {
    const page = await newSpecPage({
      components: [MaterialMenu],
      html: `<material-menu><material-menu-item label="Cut"></material-menu-item></material-menu>`,
    });
    expect(page.root!.shadowRoot!.querySelector('slot')).not.toBeNull();
    expect(page.root!.querySelector('material-menu-item')).not.toBeNull();
  });

  it('anchor and offset/maxHeight props are accepted without affecting the static render', async () => {
    const page = await newSpecPage({
      components: [MaterialMenu],
      html: `<material-menu anchor="trigger" offset="8" max-height="320"></material-menu>`,
    });
    expect(page.rootInstance.anchor).toBe('trigger');
    expect(page.rootInstance.offset).toBe(8);
    expect(page.rootInstance.maxHeight).toBe(320);
  });
});
