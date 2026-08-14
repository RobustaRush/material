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
import { MaterialToolbar } from './material-toolbar';

describe('material-toolbar', () => {
  it('renders the toolbar role with default docked/standard/horizontal attributes', async () => {
    const page = await newSpecPage({
      components: [MaterialToolbar],
      html: `<material-toolbar></material-toolbar>`,
    });
    expect(page.root!.getAttribute('role')).toBe('toolbar');
    expect(page.root!.getAttribute('aria-orientation')).toBe('horizontal');
    expect(page.root!.getAttribute('variant')).toBe('docked');
    expect(page.root!.getAttribute('color')).toBe('standard');
    expect(page.root!.getAttribute('orientation')).toBe('horizontal');
    expect(page.root!.shadowRoot!.querySelector('[part="container"]')).not.toBeNull();
  });

  it('reflects variant, color and orientation prop changes as attributes', async () => {
    const page = await newSpecPage({
      components: [MaterialToolbar],
      html: `<material-toolbar variant="floating" color="vibrant" orientation="vertical"></material-toolbar>`,
    });
    expect(page.root!.getAttribute('variant')).toBe('floating');
    expect(page.root!.getAttribute('color')).toBe('vibrant');
    expect(page.root!.getAttribute('orientation')).toBe('vertical');
  });

  it('sets aria-orientation to match the orientation prop', async () => {
    const page = await newSpecPage({
      components: [MaterialToolbar],
      html: `<material-toolbar orientation="vertical"></material-toolbar>`,
    });
    expect(page.root!.getAttribute('aria-orientation')).toBe('vertical');
  });

  it('slots child controls into the container', async () => {
    const page = await newSpecPage({
      components: [MaterialToolbar],
      html: `<material-toolbar><button>A</button><button>B</button></material-toolbar>`,
    });
    expect(page.root!.shadowRoot!.querySelector('[part="container"] slot')).not.toBeNull();
    expect(page.root!.querySelectorAll('button').length).toBe(2);
  });
});
