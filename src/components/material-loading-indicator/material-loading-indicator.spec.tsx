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
import { MaterialLoadingIndicator } from './material-loading-indicator';

// componentDidLoad starts a requestAnimationFrame loop and a matchMedia
// listener; each test calls disconnectedCallback() directly (cancels the
// rAF loop, removes the listener) so nothing leaks into the next test.

describe('material-loading-indicator', () => {
  it('renders a progressbar, busy by default, sized to the size prop', async () => {
    const page = await newSpecPage({
      components: [MaterialLoadingIndicator],
      html: `<material-loading-indicator></material-loading-indicator>`,
    });
    expect(page.root!.getAttribute('role')).toBe('progressbar');
    expect(page.root!.getAttribute('aria-label')).toBe('Loading');
    expect(page.root!.getAttribute('aria-busy')).toBe('true');
    expect(page.root!.getAttribute('variant')).toBe('default');
    expect((page.root as HTMLElement).style.width).toBe('48px');
    expect((page.root as HTMLElement).style.height).toBe('48px');

    page.rootInstance.disconnectedCallback();
  });

  it('uses the label prop for aria-label instead of the default', async () => {
    const page = await newSpecPage({
      components: [MaterialLoadingIndicator],
      html: `<material-loading-indicator label="Refreshing"></material-loading-indicator>`,
    });
    expect(page.root!.getAttribute('aria-label')).toBe('Refreshing');

    page.rootInstance.disconnectedCallback();
  });

  it('paused reflects as an attribute and flips aria-busy to false', async () => {
    const page = await newSpecPage({
      components: [MaterialLoadingIndicator],
      html: `<material-loading-indicator paused></material-loading-indicator>`,
    });
    expect(page.root!.getAttribute('paused')).toBe('');
    expect(page.root!.getAttribute('aria-busy')).toBe('false');

    page.rootInstance.disconnectedCallback();
  });

  it('resizes the host box when the size prop changes', async () => {
    const page = await newSpecPage({
      components: [MaterialLoadingIndicator],
      html: `<material-loading-indicator size="96"></material-loading-indicator>`,
    });
    expect((page.root as HTMLElement).style.width).toBe('96px');
    expect((page.root as HTMLElement).style.height).toBe('96px');

    page.rootInstance.disconnectedCallback();
  });

  it('reflects the contained variant as an attribute', async () => {
    const page = await newSpecPage({
      components: [MaterialLoadingIndicator],
      html: `<material-loading-indicator variant="contained"></material-loading-indicator>`,
    });
    expect(page.root!.getAttribute('variant')).toBe('contained');

    page.rootInstance.disconnectedCallback();
  });

  it('renders the morphing shape as an SVG path with a filled d attribute', async () => {
    const page = await newSpecPage({
      components: [MaterialLoadingIndicator],
      html: `<material-loading-indicator></material-loading-indicator>`,
    });
    const path = page.root!.shadowRoot!.querySelector('path.shape')!;
    const d = path.getAttribute('d');
    expect(d).toBeTruthy();
    expect(d!.startsWith('M')).toBe(true);
    expect(d!.endsWith('Z')).toBe(true);

    page.rootInstance.disconnectedCallback();
  });
});
