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
import { MaterialTooltip } from './material-tooltip';

// Hover/focus-driven show/hide, the popover-backed surface, and outside-click/
// Escape dismissal are covered in material-tooltip.e2e.tsx: they depend on
// real pointerenter/focus events and (for hover-mode) the native Popover API,
// neither of which mock-doc implements — see docs/agents/testing.md. This
// file covers the static render contract and the parts of the open/close
// wiring that don't require a real trigger element or a real popover.

describe('material-tooltip', () => {
  it('renders a tooltip role, hidden and inert by default', async () => {
    const page = await newSpecPage({
      components: [MaterialTooltip],
      html: `<material-tooltip text="Save"><button>Save</button></material-tooltip>`,
    });
    const surface = page.root!.shadowRoot!.querySelector('[part="surface"]')!;
    expect(surface.getAttribute('role')).toBe('tooltip');
    expect(surface.getAttribute('aria-hidden')).toBe('true');
    expect(surface.hasAttribute('inert')).toBe(true);
    expect(surface.textContent).toBe('Save');
  });

  it('sets aria-describedby on the trigger, pointing at the host id', async () => {
    const page = await newSpecPage({
      components: [MaterialTooltip],
      html: `<material-tooltip text="Save"><button id="btn">Save</button></material-tooltip>`,
    });
    await page.waitForChanges();
    const button = page.root!.querySelector('button')!;
    expect(button.getAttribute('aria-describedby')).toBe(page.root!.id);
  });

  it('variant="rich" uses aria-details instead of aria-describedby', async () => {
    const page = await newSpecPage({
      components: [MaterialTooltip],
      html: `<material-tooltip variant="rich" text="Details"><button>btn</button></material-tooltip>`,
    });
    await page.waitForChanges();
    const button = page.root!.querySelector('button')!;
    expect(button.getAttribute('aria-details')).toBe(page.root!.id);
    expect(button.hasAttribute('aria-describedby')).toBe(false);
  });

  it('variant reflects to the host attribute, defaulting to plain', async () => {
    const page = await newSpecPage({
      components: [MaterialTooltip],
      html: `<material-tooltip></material-tooltip>`,
    });
    expect(page.root!.getAttribute('variant')).toBe('plain');
  });

  it('persistent and placement props reflect to host attributes', async () => {
    const page = await newSpecPage({
      components: [MaterialTooltip],
      html: `<material-tooltip persistent placement="bottom"></material-tooltip>`,
    });
    expect(page.root!.hasAttribute('persistent')).toBe(true);
    expect(page.root!.getAttribute('placement')).toBe('bottom');
  });

  it('removes a native title attribute from the trigger and restores it on disconnect', async () => {
    const page = await newSpecPage({
      components: [MaterialTooltip],
      html: `<material-tooltip text="Save"><button title="Save button">Save</button></material-tooltip>`,
    });
    await page.waitForChanges();
    const button = page.root!.querySelector('button')!;
    expect(button.hasAttribute('title')).toBe(false);

    page.rootInstance.disconnectedCallback();
    expect(button.getAttribute('title')).toBe('Save button');
  });

  it('open prop reflects to the host attribute and toggling it emits tooltipShow/tooltipHide', async () => {
    const page = await newSpecPage({
      components: [MaterialTooltip],
      html: `<material-tooltip text="Save"><button>Save</button></material-tooltip>`,
    });
    const showSpy = jest.fn();
    const hideSpy = jest.fn();
    page.root!.addEventListener('tooltipShow', showSpy);
    page.root!.addEventListener('tooltipHide', hideSpy);

    page.rootInstance.open = true;
    await page.waitForChanges();
    expect(page.root!.hasAttribute('open')).toBe(true);
    expect(showSpy).toHaveBeenCalledTimes(1);

    page.rootInstance.open = false;
    await page.waitForChanges();
    expect(page.root!.hasAttribute('open')).toBe(false);
    expect(hideSpy).toHaveBeenCalledTimes(1);
  });

  it('rich variant renders subhead/body/actions parts, hiding subhead/actions when unslotted', async () => {
    const page = await newSpecPage({
      components: [MaterialTooltip],
      html: `<material-tooltip variant="rich" text="Body copy"><button>btn</button></material-tooltip>`,
    });
    const subhead = page.root!.shadowRoot!.querySelector('[part="subhead"]')!;
    const body = page.root!.shadowRoot!.querySelector('[part="body"]')!;
    const actions = page.root!.shadowRoot!.querySelector('[part="actions"]')!;
    expect(subhead.hasAttribute('hidden')).toBe(true);
    expect(body.textContent).toBe('Body copy');
    expect(actions.hasAttribute('hidden')).toBe(true);
  });
});
