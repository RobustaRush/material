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
import { MaterialCircularProgress } from './material-circular-progress';

describe('material-circular-progress', () => {
  it('renders a progressbar with no aria-value* while indeterminate', async () => {
    const page = await newSpecPage({
      components: [MaterialCircularProgress],
      html: `<material-circular-progress></material-circular-progress>`,
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
      components: [MaterialCircularProgress],
      html: `<material-circular-progress value="50"></material-circular-progress>`,
    });
    expect(page.root!.getAttribute('aria-valuemin')).toBe('0');
    expect(page.root!.getAttribute('aria-valuemax')).toBe('100');
    expect(page.root!.getAttribute('aria-valuenow')).toBe('50');

    page.rootInstance.disconnectedCallback();
  });

  it('clamps out-of-range values to 0..100 for aria-valuenow', async () => {
    const over = await newSpecPage({
      components: [MaterialCircularProgress],
      html: `<material-circular-progress value="150"></material-circular-progress>`,
    });
    expect(over.root!.getAttribute('aria-valuenow')).toBe('100');
    over.rootInstance.disconnectedCallback();

    const under = await newSpecPage({
      components: [MaterialCircularProgress],
      html: `<material-circular-progress value="-20"></material-circular-progress>`,
    });
    expect(under.root!.getAttribute('aria-valuenow')).toBe('0');
    under.rootInstance.disconnectedCallback();
  });

  it('uses the label prop for aria-label instead of the default', async () => {
    const page = await newSpecPage({
      components: [MaterialCircularProgress],
      html: `<material-circular-progress label="Loading results"></material-circular-progress>`,
    });
    expect(page.root!.getAttribute('aria-label')).toBe('Loading results');

    page.rootInstance.disconnectedCallback();
  });

  it('paused reflects as a host attribute', async () => {
    const page = await newSpecPage({
      components: [MaterialCircularProgress],
      html: `<material-circular-progress paused></material-circular-progress>`,
    });
    expect(page.root!.getAttribute('paused')).toBe('');

    page.rootInstance.disconnectedCallback();
  });

  it('wavy reflects as a host attribute', async () => {
    const page = await newSpecPage({
      components: [MaterialCircularProgress],
      html: `<material-circular-progress wavy></material-circular-progress>`,
    });
    expect(page.root!.getAttribute('wavy')).toBe('');

    page.rootInstance.disconnectedCallback();
  });

  it('defaults to a 40dp box when flat and unsized', async () => {
    const page = await newSpecPage({
      components: [MaterialCircularProgress],
      html: `<material-circular-progress></material-circular-progress>`,
    });
    const host = page.root as HTMLElement;
    expect(host.style.width).toBe('40px');
    expect(host.style.height).toBe('40px');
    const svg = page.root!.shadowRoot!.querySelector('svg')!;
    expect(svg.getAttribute('viewBox')).toBe('0 0 40 40');

    page.rootInstance.disconnectedCallback();
  });

  it('defaults to a 48dp box when wavy and unsized', async () => {
    const page = await newSpecPage({
      components: [MaterialCircularProgress],
      html: `<material-circular-progress wavy></material-circular-progress>`,
    });
    const host = page.root as HTMLElement;
    expect(host.style.width).toBe('48px');
    expect(host.style.height).toBe('48px');

    page.rootInstance.disconnectedCallback();
  });

  it('an explicit size prop overrides the flat/wavy default box', async () => {
    const page = await newSpecPage({
      components: [MaterialCircularProgress],
      html: `<material-circular-progress size="96"></material-circular-progress>`,
    });
    const host = page.root as HTMLElement;
    expect(host.style.width).toBe('96px');
    expect(host.style.height).toBe('96px');
    const svg = page.root!.shadowRoot!.querySelector('svg')!;
    expect(svg.getAttribute('viewBox')).toBe('0 0 96 96');

    page.rootInstance.disconnectedCallback();
  });

  it('draws a determinate active arc with the given stroke thickness', async () => {
    const page = await newSpecPage({
      components: [MaterialCircularProgress],
      html: `<material-circular-progress value="50" thickness="8"></material-circular-progress>`,
    });
    const active = page.root!.shadowRoot!.querySelector('path.active')!;
    expect(active.getAttribute('stroke-width')).toBe('8');
    expect(active.getAttribute('d')!.startsWith('M')).toBe(true);
    expect(page.root!.shadowRoot!.querySelector('path.track')).not.toBeNull();

    page.rootInstance.disconnectedCallback();
  });

  it('draws an indeterminate active arc without aria-value*', async () => {
    const page = await newSpecPage({
      components: [MaterialCircularProgress],
      html: `<material-circular-progress></material-circular-progress>`,
    });
    const active = page.root!.shadowRoot!.querySelector('path.active')!;
    expect(active.getAttribute('d')).toBeTruthy();
    expect(active.getAttribute('d')!.startsWith('M')).toBe(true);

    page.rootInstance.disconnectedCallback();
  });
});
