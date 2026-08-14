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
import { MaterialCard } from './material-card';

describe('material-card', () => {
  it('renders a plain surface div by default', async () => {
    const page = await newSpecPage({
      components: [MaterialCard],
      html: `<material-card></material-card>`,
    });
    expect(page.root!.getAttribute('variant')).toBe('elevated');
    const surface = page.root!.shadowRoot!.querySelector('[part="surface"]')!;
    expect(surface.tagName).toBe('DIV');
  });

  it('reflects the variant prop as an attribute', async () => {
    const page = await newSpecPage({
      components: [MaterialCard],
      html: `<material-card variant="outlined"></material-card>`,
    });
    expect(page.root!.getAttribute('variant')).toBe('outlined');
  });

  it('sets aria-label on the surface element from the ariaLabel prop', async () => {
    const page = await newSpecPage({
      components: [MaterialCard],
      html: `<material-card aria-label="A card"></material-card>`,
    });
    const surface = page.root!.shadowRoot!.querySelector('[part="surface"]')!;
    expect(surface.getAttribute('aria-label')).toBe('A card');
  });

  it('clickable without href renders a type=button surface', async () => {
    const page = await newSpecPage({
      components: [MaterialCard],
      html: `<material-card clickable></material-card>`,
    });
    expect(page.root!.getAttribute('clickable')).toBe('');
    const button = page.root!.shadowRoot!.querySelector('[part="surface"]')!;
    expect(button.tagName).toBe('BUTTON');
    expect(button.getAttribute('type')).toBe('button');
    expect(button.hasAttribute('disabled')).toBe(false);
  });

  it('clickable + disabled disables the button surface', async () => {
    const page = await newSpecPage({
      components: [MaterialCard],
      html: `<material-card clickable disabled></material-card>`,
    });
    const button = page.root!.shadowRoot!.querySelector('[part="surface"]')!;
    expect(button.hasAttribute('disabled')).toBe(true);
  });

  it('href renders an anchor surface, href taking priority over clickable', async () => {
    const page = await newSpecPage({
      components: [MaterialCard],
      html: `<material-card href="/docs" clickable target="_blank"></material-card>`,
    });
    const a = page.root!.shadowRoot!.querySelector('[part="surface"]')!;
    expect(a.tagName).toBe('A');
    expect(a.getAttribute('href')).toBe('/docs');
    expect(a.getAttribute('target')).toBe('_blank');
    // rel defaults to noopener noreferrer when target=_blank and rel is unset.
    expect(a.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('an explicit rel prop overrides the target=_blank default', async () => {
    const page = await newSpecPage({
      components: [MaterialCard],
      html: `<material-card href="/docs" target="_blank" rel="external"></material-card>`,
    });
    const a = page.root!.shadowRoot!.querySelector('a')!;
    expect(a.getAttribute('rel')).toBe('external');
  });

  it('passes the download prop through to the anchor', async () => {
    const page = await newSpecPage({
      components: [MaterialCard],
      html: `<material-card href="/file.pdf" download="report.pdf"></material-card>`,
    });
    const a = page.root!.shadowRoot!.querySelector('a')!;
    expect(a.getAttribute('download')).toBe('report.pdf');
  });

  it('disabled + href strips href, marks aria-disabled/tabindex, and blocks the click', async () => {
    const page = await newSpecPage({
      components: [MaterialCard],
      html: `<material-card href="/docs" disabled></material-card>`,
    });
    const a = page.root!.shadowRoot!.querySelector('a')!;
    expect(a.getAttribute('href')).toBeNull();
    expect(a.getAttribute('aria-disabled')).toBe('true');
    expect(a.getAttribute('tabindex')).toBe('-1');

    const evt = new Event('click', { cancelable: true, bubbles: true });
    a.dispatchEvent(evt);
    expect(evt.defaultPrevented).toBe(true);
  });

  it('hides the actions part until the actions slot receives content', async () => {
    const page = await newSpecPage({
      components: [MaterialCard],
      html: `<material-card></material-card>`,
    });
    const actions = page.root!.shadowRoot!.querySelector('[part="actions"]')!;
    expect(actions.hasAttribute('hidden')).toBe(true);
  });

  it('reveals the actions part once the actions slot is assigned content', async () => {
    const page = await newSpecPage({
      components: [MaterialCard],
      html: `<material-card><button slot="actions">OK</button></material-card>`,
    });
    const slot = page.root!.shadowRoot!.querySelector('slot[name="actions"]') as HTMLSlotElement;
    slot.dispatchEvent(new Event('slotchange'));
    await page.waitForChanges();

    const actions = page.root!.shadowRoot!.querySelector('[part="actions"]')!;
    expect(actions.hasAttribute('hidden')).toBe(false);
  });
});
