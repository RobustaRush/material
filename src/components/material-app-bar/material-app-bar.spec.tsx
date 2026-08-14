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
import { MaterialAppBar } from './material-app-bar';

describe('material-app-bar', () => {
  it('renders a banner with default small/leading layout', async () => {
    const page = await newSpecPage({
      components: [MaterialAppBar],
      html: `<material-app-bar></material-app-bar>`,
    });
    expect(page.root!.getAttribute('role')).toBe('banner');
    const bar = page.root!.shadowRoot!.querySelector('.bar')!;
    expect(bar.getAttribute('data-variant')).toBe('small');
    expect(bar.getAttribute('data-align')).toBe('leading');
  });

  it('sets aria-label on the host from the ariaLabel prop', async () => {
    const page = await newSpecPage({
      components: [MaterialAppBar],
      html: `<material-app-bar aria-label="Main"></material-app-bar>`,
    });
    expect(page.root!.getAttribute('aria-label')).toBe('Main');
  });

  it('reflects variant and align as data attributes', async () => {
    const page = await newSpecPage({
      components: [MaterialAppBar],
      html: `<material-app-bar variant="medium" align="centered"></material-app-bar>`,
    });
    expect(page.root!.getAttribute('variant')).toBe('medium');
    expect(page.root!.getAttribute('align')).toBe('centered');
    const bar = page.root!.shadowRoot!.querySelector('.bar')!;
    expect(bar.getAttribute('data-variant')).toBe('medium');
    expect(bar.getAttribute('data-align')).toBe('centered');
  });

  it('collapses medium/large bars once scrolled, with collapseOnScroll on by default', async () => {
    const page = await newSpecPage({
      components: [MaterialAppBar],
      html: `<material-app-bar variant="medium"></material-app-bar>`,
    });
    page.rootInstance.scrolled = true;
    await page.waitForChanges();

    expect(page.root!.getAttribute('scrolled')).toBe('');
    const bar = page.root!.shadowRoot!.querySelector('.bar')!;
    expect(bar.getAttribute('data-collapsed')).toBe('');
  });

  it('never collapses the small variant even when scrolled', async () => {
    const page = await newSpecPage({
      components: [MaterialAppBar],
      html: `<material-app-bar variant="small"></material-app-bar>`,
    });
    page.rootInstance.scrolled = true;
    await page.waitForChanges();

    const bar = page.root!.shadowRoot!.querySelector('.bar')!;
    expect(bar.getAttribute('data-collapsed')).toBeNull();
  });

  it('does not collapse when collapseOnScroll is false', async () => {
    const page = await newSpecPage({
      components: [MaterialAppBar],
      html: `<material-app-bar variant="large" collapse-on-scroll="false"></material-app-bar>`,
    });
    page.rootInstance.scrolled = true;
    await page.waitForChanges();

    const bar = page.root!.shadowRoot!.querySelector('.bar')!;
    expect(bar.getAttribute('data-collapsed')).toBeNull();
  });

  it('has no has-content class on the subtitle wrapper until the subtitle slot is assigned content', async () => {
    const page = await newSpecPage({
      components: [MaterialAppBar],
      html: `<material-app-bar></material-app-bar>`,
    });
    const subtitle = page.root!.shadowRoot!.querySelector('.subtitle')!;
    expect(subtitle.classList.contains('has-content')).toBe(false);
  });

  it('adds has-content once the subtitle slot receives content', async () => {
    const page = await newSpecPage({
      components: [MaterialAppBar],
      html: `<material-app-bar><span slot="subtitle">Subtitle text</span></material-app-bar>`,
    });
    const slot = page.root!.shadowRoot!.querySelector(
      'slot[name="subtitle"]',
    ) as HTMLSlotElement;
    slot.dispatchEvent(new Event('slotchange'));
    await page.waitForChanges();

    const subtitle = page.root!.shadowRoot!.querySelector('.subtitle')!;
    expect(subtitle.classList.contains('has-content')).toBe(true);
  });

  it('slots leading, headline and trailing content', async () => {
    const page = await newSpecPage({
      components: [MaterialAppBar],
      html: `
        <material-app-bar>
          <button slot="leading">Menu</button>
          <span slot="headline">Title</span>
          <button slot="trailing">More</button>
        </material-app-bar>
      `,
    });
    expect(page.root!.shadowRoot!.querySelector('slot[name="leading"]')).not.toBeNull();
    expect(page.root!.shadowRoot!.querySelector('slot[name="headline"]')).not.toBeNull();
    expect(page.root!.shadowRoot!.querySelector('slot[name="trailing"]')).not.toBeNull();
  });
});
