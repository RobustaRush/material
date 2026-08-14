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
import { MaterialBadge } from './material-badge';

describe('material-badge', () => {
  it('renders the small dot by default, with error as the default color', async () => {
    const page = await newSpecPage({
      components: [MaterialBadge],
      html: `<material-badge></material-badge>`,
    });
    const dot = page.root!.shadowRoot!.querySelector('.dot')!;
    expect(dot).not.toBeNull();
    expect(dot.getAttribute('aria-hidden')).toBe('true');
    expect(page.root!.shadowRoot!.querySelector('.pill')).toBeNull();
    expect(page.root!.getAttribute('color')).toBe('error');
  });

  it('renders the large pill with the value text when value is set', async () => {
    const page = await newSpecPage({
      components: [MaterialBadge],
      html: `<material-badge value="3"></material-badge>`,
    });
    const pill = page.root!.shadowRoot!.querySelector('.pill')!;
    expect(pill).not.toBeNull();
    expect(pill.textContent).toBe('3');
    expect(page.root!.shadowRoot!.querySelector('.dot')).toBeNull();
  });

  it('treats an empty string value the same as no value', async () => {
    const page = await newSpecPage({
      components: [MaterialBadge],
      html: `<material-badge value=""></material-badge>`,
    });
    expect(page.root!.shadowRoot!.querySelector('.dot')).not.toBeNull();
    expect(page.root!.shadowRoot!.querySelector('.pill')).toBeNull();
  });

  it('reflects the color prop as a host attribute', async () => {
    const page = await newSpecPage({
      components: [MaterialBadge],
      html: `<material-badge color="tertiary" value="9"></material-badge>`,
    });
    expect(page.root!.getAttribute('color')).toBe('tertiary');
  });
});
