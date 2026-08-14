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
import { MaterialNavigationBar } from './material-navigation-bar';
import { MaterialNavigationItem } from '../material-navigation-item/material-navigation-item';

describe('material-navigation-bar', () => {
  it('renders a nav landmark with the default aria-label and vertical orientation', async () => {
    const page = await newSpecPage({
      components: [MaterialNavigationBar],
      html: `<material-navigation-bar></material-navigation-bar>`,
    });
    const nav = page.root!.shadowRoot!.querySelector('nav')!;
    expect(nav.getAttribute('aria-label')).toBe('Primary');
    expect(page.root!.getAttribute('data-orientation')).toBe('vertical');
    expect(nav.classList.contains('horizontal')).toBe(false);
  });

  it('aria-label overrides the nav landmark label', async () => {
    const page = await newSpecPage({
      components: [MaterialNavigationBar],
      html: `<material-navigation-bar aria-label="Sections"></material-navigation-bar>`,
    });
    expect(page.root!.shadowRoot!.querySelector('nav')!.getAttribute('aria-label')).toBe('Sections');
  });

  it('orientation="horizontal" adds the horizontal class and data-orientation, and propagates variant="bar-horizontal" to items', async () => {
    const page = await newSpecPage({
      components: [MaterialNavigationBar, MaterialNavigationItem],
      html: `<material-navigation-bar orientation="horizontal"><material-navigation-item label="Home"></material-navigation-item></material-navigation-bar>`,
    });
    await page.waitForChanges();
    const nav = page.root!.shadowRoot!.querySelector('nav')!;
    expect(nav.classList.contains('horizontal')).toBe(true);
    expect(page.root!.getAttribute('data-orientation')).toBe('horizontal');
    const item = page.root!.querySelector('material-navigation-item')!;
    expect(item.getAttribute('variant')).toBe('bar-horizontal');
  });

  it('orientation="vertical" (default) propagates variant="bar" to slotted items', async () => {
    const page = await newSpecPage({
      components: [MaterialNavigationBar, MaterialNavigationItem],
      html: `<material-navigation-bar><material-navigation-item label="Home"></material-navigation-item></material-navigation-bar>`,
    });
    await page.waitForChanges();
    const item = page.root!.querySelector('material-navigation-item')!;
    expect(item.getAttribute('variant')).toBe('bar');
  });

  it('orientation="auto" falls back to vertical items when the breakpoint media query does not match', async () => {
    const page = await newSpecPage({
      components: [MaterialNavigationBar, MaterialNavigationItem],
      html: `<material-navigation-bar orientation="auto"><material-navigation-item label="Home"></material-navigation-item></material-navigation-bar>`,
    });
    await page.waitForChanges();
    expect(page.root!.getAttribute('data-orientation')).toBe('vertical');
    const item = page.root!.querySelector('material-navigation-item')!;
    expect(item.getAttribute('variant')).toBe('bar');
  });

  describe('activation="auto" (default)', () => {
    it('a materialSelect from one item makes it the sole active item', async () => {
      const page = await newSpecPage({
        components: [MaterialNavigationBar, MaterialNavigationItem],
        html: `<material-navigation-bar>
          <material-navigation-item id="a" label="A" active></material-navigation-item>
          <material-navigation-item id="b" label="B"></material-navigation-item>
        </material-navigation-bar>`,
      });
      await page.waitForChanges();
      const [a, b] = Array.from(page.root!.querySelectorAll('material-navigation-item')) as any[];
      expect(a.active).toBe(true);

      b.shadowRoot.querySelector('button').click();
      await page.waitForChanges();
      expect(a.active).toBe(false);
      expect(b.active).toBe(true);
    });
  });

  it('activation="manual" leaves active state untouched on materialSelect', async () => {
    const page = await newSpecPage({
      components: [MaterialNavigationBar, MaterialNavigationItem],
      html: `<material-navigation-bar activation="manual">
        <material-navigation-item id="a" label="A"></material-navigation-item>
        <material-navigation-item id="b" label="B"></material-navigation-item>
      </material-navigation-bar>`,
    });
    await page.waitForChanges();
    const [a, b] = Array.from(page.root!.querySelectorAll('material-navigation-item')) as any[];
    b.shadowRoot.querySelector('button').click();
    await page.waitForChanges();
    expect(a.active).toBe(false);
    expect(b.active).toBe(false);
  });

  it('ignores materialSelect events not targeting a material-navigation-item', async () => {
    const page = await newSpecPage({
      components: [MaterialNavigationBar, MaterialNavigationItem],
      html: `<material-navigation-bar>
        <material-navigation-item id="a" label="A" active></material-navigation-item>
      </material-navigation-bar>`,
    });
    await page.waitForChanges();
    const bogus = page.doc.createElement('div');
    page.root!.appendChild(bogus);
    bogus.dispatchEvent(new page.win.CustomEvent('materialSelect', { bubbles: true, composed: true }));
    await page.waitForChanges();
    const a = page.root!.querySelector('material-navigation-item') as any;
    expect(a.active).toBe(true);
  });
});
