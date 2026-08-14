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
import { MaterialLinearProgress } from './material-linear-progress';

// jsdom (the mock-doc test environment) has no ResizeObserver; componentDidLoad
// constructs one unconditionally, so every render needs this stub in place first.
class StubResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(global as any).ResizeObserver = StubResizeObserver;

// The mock-doc host element never gets real layout, so el.clientWidth stays 0
// and recomputePaths() bails out before drawing anything. Force a width and
// re-run the same private measure() componentDidLoad uses, so the geometry
// (and the props that drive it) are actually exercised.
function forceWidth(page: Awaited<ReturnType<typeof newSpecPage>>, width: number) {
  Object.defineProperty(page.root, 'clientWidth', { value: width, configurable: true });
  page.rootInstance.measure();
}

describe('material-linear-progress', () => {
  it('renders a progressbar with no aria-value* while indeterminate', async () => {
    const page = await newSpecPage({
      components: [MaterialLinearProgress],
      html: `<material-linear-progress></material-linear-progress>`,
    });
    expect(page.root!.getAttribute('role')).toBe('progressbar');
    expect(page.root!.getAttribute('aria-label')).toBe('Loading');
    expect(page.root!.getAttribute('aria-valuemin')).toBeNull();
    expect(page.root!.getAttribute('aria-valuemax')).toBeNull();
    expect(page.root!.getAttribute('aria-valuenow')).toBeNull();

    page.rootInstance.disconnectedCallback();
  });

  it('exposes aria-valuemin/max/now once a determinate value is set', async () => {
    const page = await newSpecPage({
      components: [MaterialLinearProgress],
      html: `<material-linear-progress value="50"></material-linear-progress>`,
    });
    expect(page.root!.getAttribute('aria-valuemin')).toBe('0');
    expect(page.root!.getAttribute('aria-valuemax')).toBe('100');
    expect(page.root!.getAttribute('aria-valuenow')).toBe('50');

    page.rootInstance.disconnectedCallback();
  });

  it('clamps out-of-range values to 0..100 for aria-valuenow', async () => {
    const over = await newSpecPage({
      components: [MaterialLinearProgress],
      html: `<material-linear-progress value="150"></material-linear-progress>`,
    });
    expect(over.root!.getAttribute('aria-valuenow')).toBe('100');
    over.rootInstance.disconnectedCallback();

    const under = await newSpecPage({
      components: [MaterialLinearProgress],
      html: `<material-linear-progress value="-20"></material-linear-progress>`,
    });
    expect(under.root!.getAttribute('aria-valuenow')).toBe('0');
    under.rootInstance.disconnectedCallback();
  });

  it('uses the label prop for aria-label instead of the default', async () => {
    const page = await newSpecPage({
      components: [MaterialLinearProgress],
      html: `<material-linear-progress label="Uploading"></material-linear-progress>`,
    });
    expect(page.root!.getAttribute('aria-label')).toBe('Uploading');

    page.rootInstance.disconnectedCallback();
  });

  it('paused reflects as a host attribute', async () => {
    const page = await newSpecPage({
      components: [MaterialLinearProgress],
      html: `<material-linear-progress paused></material-linear-progress>`,
    });
    expect(page.root!.getAttribute('paused')).toBe('');

    page.rootInstance.disconnectedCallback();
  });

  it('wavy reflects as a host attribute', async () => {
    const page = await newSpecPage({
      components: [MaterialLinearProgress],
      html: `<material-linear-progress wavy></material-linear-progress>`,
    });
    expect(page.root!.getAttribute('wavy')).toBe('');

    page.rootInstance.disconnectedCallback();
  });

  it('draws an active bar sized to value and a stop indicator by default when determinate', async () => {
    const page = await newSpecPage({
      components: [MaterialLinearProgress],
      html: `<material-linear-progress value="50"></material-linear-progress>`,
    });
    forceWidth(page, 200);
    await page.waitForChanges();

    const svg = page.root!.shadowRoot!.querySelector('svg')!;
    expect(svg.querySelectorAll('path.active').length).toBe(1);
    expect(svg.querySelectorAll('path.track').length).toBe(1);
    expect(svg.querySelector('ellipse.stop')).not.toBeNull();

    page.rootInstance.disconnectedCallback();
  });

  it('stop-indicator="never" hides the stop indicator even when determinate', async () => {
    const page = await newSpecPage({
      components: [MaterialLinearProgress],
      html: `<material-linear-progress value="50" stop-indicator="never"></material-linear-progress>`,
    });
    forceWidth(page, 200);
    await page.waitForChanges();

    expect(page.root!.shadowRoot!.querySelector('ellipse.stop')).toBeNull();

    page.rootInstance.disconnectedCallback();
  });

  it('stop-indicator="always" shows the stop indicator even while indeterminate', async () => {
    const page = await newSpecPage({
      components: [MaterialLinearProgress],
      html: `<material-linear-progress stop-indicator="always"></material-linear-progress>`,
    });
    forceWidth(page, 200);
    await page.waitForChanges();

    expect(page.root!.shadowRoot!.querySelector('ellipse.stop')).not.toBeNull();

    page.rootInstance.disconnectedCallback();
  });

  it('renders no stop indicator while indeterminate under the default "auto" mode', async () => {
    const page = await newSpecPage({
      components: [MaterialLinearProgress],
      html: `<material-linear-progress></material-linear-progress>`,
    });
    forceWidth(page, 200);
    await page.waitForChanges();

    expect(page.root!.shadowRoot!.querySelector('ellipse.stop')).toBeNull();

    page.rootInstance.disconnectedCallback();
  });

  it('draws the active bar with the given stroke thickness', async () => {
    const page = await newSpecPage({
      components: [MaterialLinearProgress],
      html: `<material-linear-progress value="50" thickness="8"></material-linear-progress>`,
    });
    forceWidth(page, 200);
    await page.waitForChanges();

    const active = page.root!.shadowRoot!.querySelector('path.active')!;
    expect(active.getAttribute('stroke-width')).toBe('8');

    page.rootInstance.disconnectedCallback();
  });
});
