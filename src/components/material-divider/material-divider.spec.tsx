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
import { MaterialDivider } from './material-divider';

describe('material-divider', () => {
  it('renders a horizontal separator by default', async () => {
    const page = await newSpecPage({
      components: [MaterialDivider],
      html: `<material-divider></material-divider>`,
    });
    expect(page.root!.getAttribute('role')).toBe('separator');
    expect(page.root!.getAttribute('aria-orientation')).toBe('horizontal');
    expect(page.root!.getAttribute('inset')).toBe('none');
    expect(page.root!.getAttribute('orientation')).toBe('horizontal');
    const line = page.root!.shadowRoot!.querySelector('.line')!;
    expect(line.getAttribute('aria-hidden')).toBe('true');
  });

  it('reflects orientation="vertical" onto the host and aria-orientation', async () => {
    const page = await newSpecPage({
      components: [MaterialDivider],
      html: `<material-divider orientation="vertical"></material-divider>`,
    });
    expect(page.root!.getAttribute('orientation')).toBe('vertical');
    expect(page.root!.getAttribute('aria-orientation')).toBe('vertical');
  });

  it('reflects the inset prop onto the host', async () => {
    const page = await newSpecPage({
      components: [MaterialDivider],
      html: `<material-divider inset="middle"></material-divider>`,
    });
    expect(page.root!.getAttribute('inset')).toBe('middle');
  });

  it('is decorative (role="none", no aria-orientation) inside a material-list', async () => {
    const page = await newSpecPage({
      components: [MaterialDivider],
      html: `<material-list><material-divider></material-divider></material-list>`,
    });
    expect(page.root!.getAttribute('role')).toBe('none');
    expect(page.root!.getAttribute('aria-orientation')).toBeNull();
  });
});
