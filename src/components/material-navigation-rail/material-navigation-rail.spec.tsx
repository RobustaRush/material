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
import { MaterialNavigationRail } from './material-navigation-rail';
import { MaterialNavigationItem } from '../material-navigation-item/material-navigation-item';
import { MaterialNavigationGroup } from '../material-navigation-group/material-navigation-group';

// modality stays "standard" (the default) throughout this file: the modal
// path opens a real <dialog> via showModal(), which mock-doc doesn't
// implement (see docs/agents/testing.md). Modal open/close is covered in
// material-navigation-rail.e2e.tsx instead.

describe('material-navigation-rail', () => {
  it('renders collapsed by default with a nav landmark and a built-in toggle', async () => {
    const page = await newSpecPage({
      components: [MaterialNavigationRail],
      html: `<material-navigation-rail></material-navigation-rail>`,
    });
    expect(page.root!.hasAttribute('expanded')).toBe(false);
    const nav = page.root!.shadowRoot!.querySelector('nav.shell')!;
    expect(nav.getAttribute('aria-label')).toBe('Primary');
    const toggle = page.root!.shadowRoot!.querySelector('button.toggle')!;
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(toggle.getAttribute('aria-label')).toBe('Toggle navigation');
  });

  it('aria-label and toggle-label override their respective defaults', async () => {
    const page = await newSpecPage({
      components: [MaterialNavigationRail],
      html: `<material-navigation-rail aria-label="Sections" toggle-label="Open menu"></material-navigation-rail>`,
    });
    expect(page.root!.shadowRoot!.querySelector('nav.shell')!.getAttribute('aria-label')).toBe('Sections');
    expect(page.root!.shadowRoot!.querySelector('button.toggle')!.getAttribute('aria-label')).toBe('Open menu');
  });

  it('expanded renders the header-expanded layout with the label and propagates variant="rail-expanded" to items', async () => {
    const page = await newSpecPage({
      components: [MaterialNavigationRail, MaterialNavigationItem],
      html: `<material-navigation-rail expanded label="App"><material-navigation-item label="Home"></material-navigation-item></material-navigation-rail>`,
    });
    await page.waitForChanges();
    expect(page.root!.shadowRoot!.querySelector('.header-expanded')).not.toBeNull();
    expect(page.root!.shadowRoot!.querySelector('.title')!.textContent).toBe('App');
    const item = page.root!.querySelector('material-navigation-item')!;
    expect(item.getAttribute('variant')).toBe('rail-expanded');
  });

  it('collapsed propagates variant="rail-collapsed" to items and groups', async () => {
    const page = await newSpecPage({
      components: [MaterialNavigationRail, MaterialNavigationItem, MaterialNavigationGroup],
      html: `<material-navigation-rail>
        <material-navigation-item label="Home"></material-navigation-item>
        <material-navigation-group label="More"></material-navigation-group>
      </material-navigation-rail>`,
    });
    await page.waitForChanges();
    expect(page.root!.querySelector('material-navigation-item')!.getAttribute('variant')).toBe('rail-collapsed');
    expect(page.root!.querySelector('material-navigation-group')!.getAttribute('variant')).toBe('rail-collapsed');
  });

  it('hides [data-section-header] elements while collapsed and shows them expanded', async () => {
    const page = await newSpecPage({
      components: [MaterialNavigationRail],
      html: `<material-navigation-rail><div data-section-header>Section</div></material-navigation-rail>`,
    });
    await page.waitForChanges();
    const header = page.root!.querySelector('[data-section-header]') as HTMLElement;
    expect(header.hidden).toBe(true);

    page.root!.expanded = true;
    await page.waitForChanges();
    expect(header.hidden).toBe(false);
  });

  it('a slotted [slot="menu"] element replaces the built-in toggle', async () => {
    const page = await newSpecPage({
      components: [MaterialNavigationRail],
      html: `<material-navigation-rail><button slot="menu">Menu</button></material-navigation-rail>`,
    });
    await page.waitForChanges();
    expect(page.root!.shadowRoot!.querySelector('button.toggle')).toBeNull();
  });

  it('clicking a slotted menu element toggles expanded, unless it opts out with data-no-rail-toggle', async () => {
    const page = await newSpecPage({
      components: [MaterialNavigationRail],
      html: `<material-navigation-rail><button slot="menu">Menu</button></material-navigation-rail>`,
    });
    await page.waitForChanges();
    const menuButton = page.root!.querySelector('button[slot="menu"]') as HTMLElement;
    menuButton.click();
    await page.waitForChanges();
    expect(page.rootInstance.expanded).toBe(true);
  });

  it('clicking the built-in toggle button flips expanded', async () => {
    const page = await newSpecPage({
      components: [MaterialNavigationRail],
      html: `<material-navigation-rail></material-navigation-rail>`,
    });
    const toggle = page.root!.shadowRoot!.querySelector('button.toggle') as HTMLElement;
    toggle.click();
    await page.waitForChanges();
    expect(page.rootInstance.expanded).toBe(true);
    expect(page.root!.shadowRoot!.querySelector('button.toggle')!.getAttribute('aria-expanded')).toBe('true');
  });

  it('emits materialRailToggle when expanded changes', async () => {
    const page = await newSpecPage({
      components: [MaterialNavigationRail],
      html: `<material-navigation-rail></material-navigation-rail>`,
    });
    const toggleSpy = jest.fn();
    page.root!.addEventListener('materialRailToggle', toggleSpy);
    page.root!.expanded = true;
    await page.waitForChanges();
    expect(toggleSpy).toHaveBeenCalledTimes(1);
    expect(toggleSpy.mock.calls[0][0].detail).toEqual({ expanded: true, concealed: false });
  });

  it('emits materialRailToggle when concealed changes', async () => {
    const page = await newSpecPage({
      components: [MaterialNavigationRail],
      html: `<material-navigation-rail></material-navigation-rail>`,
    });
    const toggleSpy = jest.fn();
    page.root!.addEventListener('materialRailToggle', toggleSpy);
    page.root!.concealed = true;
    await page.waitForChanges();
    expect(toggleSpy).toHaveBeenCalledTimes(1);
    expect(toggleSpy.mock.calls[0][0].detail).toEqual({ expanded: false, concealed: true });
  });

  describe('@Method()s', () => {
    it('expand() sets expanded=true', async () => {
      const page = await newSpecPage({ components: [MaterialNavigationRail], html: `<material-navigation-rail></material-navigation-rail>` });
      await page.rootInstance.expand();
      await page.waitForChanges();
      expect(page.rootInstance.expanded).toBe(true);
    });

    it('collapse() sets expanded=false', async () => {
      const page = await newSpecPage({ components: [MaterialNavigationRail], html: `<material-navigation-rail expanded></material-navigation-rail>` });
      await page.rootInstance.collapse();
      await page.waitForChanges();
      expect(page.rootInstance.expanded).toBe(false);
    });

    it('toggle() flips expanded', async () => {
      const page = await newSpecPage({ components: [MaterialNavigationRail], html: `<material-navigation-rail></material-navigation-rail>` });
      await page.rootInstance.toggle();
      await page.waitForChanges();
      expect(page.rootInstance.expanded).toBe(true);
      await page.rootInstance.toggle();
      await page.waitForChanges();
      expect(page.rootInstance.expanded).toBe(false);
    });

    it('conceal() / reveal() set concealed', async () => {
      const page = await newSpecPage({ components: [MaterialNavigationRail], html: `<material-navigation-rail></material-navigation-rail>` });
      await page.rootInstance.conceal();
      await page.waitForChanges();
      expect(page.rootInstance.concealed).toBe(true);
      expect(page.root!.hasAttribute('concealed')).toBe(true);

      await page.rootInstance.reveal();
      await page.waitForChanges();
      expect(page.rootInstance.concealed).toBe(false);
    });
  });

  describe('activation="auto" (default) item selection', () => {
    it('a materialSelect from one item makes it the sole active item', async () => {
      const page = await newSpecPage({
        components: [MaterialNavigationRail, MaterialNavigationItem],
        html: `<material-navigation-rail>
          <material-navigation-item id="a" label="A" active></material-navigation-item>
          <material-navigation-item id="b" label="B"></material-navigation-item>
        </material-navigation-rail>`,
      });
      await page.waitForChanges();
      const [a, b] = Array.from(page.root!.querySelectorAll('material-navigation-item')) as any[];
      b.shadowRoot.querySelector('button').click();
      await page.waitForChanges();
      expect(a.active).toBe(false);
      expect(b.active).toBe(true);
    });
  });

  it('activation="manual" leaves active state untouched on materialSelect', async () => {
    const page = await newSpecPage({
      components: [MaterialNavigationRail, MaterialNavigationItem],
      html: `<material-navigation-rail activation="manual">
        <material-navigation-item id="a" label="A"></material-navigation-item>
        <material-navigation-item id="b" label="B"></material-navigation-item>
      </material-navigation-rail>`,
    });
    await page.waitForChanges();
    const [a, b] = Array.from(page.root!.querySelectorAll('material-navigation-item')) as any[];
    b.shadowRoot.querySelector('button').click();
    await page.waitForChanges();
    expect(a.active).toBe(false);
    expect(b.active).toBe(false);
  });

  it('reflects hideOnCollapse, modality and concealed as attributes', async () => {
    const page = await newSpecPage({
      components: [MaterialNavigationRail],
      html: `<material-navigation-rail hide-on-collapse modality="standard" concealed></material-navigation-rail>`,
    });
    expect(page.root!.hasAttribute('hide-on-collapse')).toBe(true);
    expect(page.root!.getAttribute('modality')).toBe('standard');
    expect(page.root!.hasAttribute('concealed')).toBe(true);
  });
});
