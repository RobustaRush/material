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
import { MaterialTabs } from './material-tabs';
import { MaterialTab } from './material-tab';

// mock-doc's window exposes MockResizeObserver but jsdom-under-jest doesn't
// wire it up as a global — material-tabs unconditionally constructs a real
// `ResizeObserver` in connectedCallback, so stub the bare minimum it uses.
class StubResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as any).ResizeObserver = StubResizeObserver;

describe('material-tabs', () => {
  it('renders role=tablist and defaults variant to primary, scrollable false', async () => {
    const page = await newSpecPage({
      components: [MaterialTabs, MaterialTab],
      html: `
        <material-tabs>
          <material-tab label="One" value="one"></material-tab>
          <material-tab label="Two" value="two"></material-tab>
        </material-tabs>
      `,
    });
    expect(page.root!.getAttribute('variant')).toBe('primary');
    expect(page.root!.hasAttribute('scrollable')).toBe(false);
    const tablist = page.root!.shadowRoot!.querySelector('[role="tablist"]')!;
    expect(tablist).not.toBeNull();
    expect(tablist.getAttribute('aria-orientation')).toBe('horizontal');
  });

  it('auto-selects the first enabled tab when none is selected declaratively', async () => {
    const page = await newSpecPage({
      components: [MaterialTabs, MaterialTab],
      html: `
        <material-tabs>
          <material-tab label="One" value="one" disabled></material-tab>
          <material-tab label="Two" value="two"></material-tab>
        </material-tabs>
      `,
    });
    const tabs = page.root!.querySelectorAll('material-tab');
    expect((tabs[0] as any).selected).toBe(false);
    expect((tabs[1] as any).selected).toBe(true);
    // Roving tabindex follows the selected (enabled) tab.
    expect((tabs[1] as any).tabbable).toBe(true);
    expect((tabs[0] as any).tabbable).toBe(false);
  });

  it('respects a declaratively selected tab and skips auto-select', async () => {
    const page = await newSpecPage({
      components: [MaterialTabs, MaterialTab],
      html: `
        <material-tabs>
          <material-tab label="One" value="one"></material-tab>
          <material-tab label="Two" value="two" selected></material-tab>
        </material-tabs>
      `,
    });
    const tabs = page.root!.querySelectorAll('material-tab');
    expect((tabs[0] as any).selected).toBe(false);
    expect((tabs[1] as any).selected).toBe(true);
  });

  it('propagates the variant prop down to child tabs on change', async () => {
    const page = await newSpecPage({
      components: [MaterialTabs, MaterialTab],
      html: `
        <material-tabs variant="secondary">
          <material-tab label="One" value="one"></material-tab>
        </material-tabs>
      `,
    });
    const tab = page.root!.querySelector('material-tab') as any;
    expect(tab.variant).toBe('secondary');

    page.root!.setAttribute('variant', 'primary');
    await page.waitForChanges();
    expect(tab.variant).toBe('primary');
  });

  it('marks child tabs scrollable-host when scrollable is true', async () => {
    const page = await newSpecPage({
      components: [MaterialTabs, MaterialTab],
      html: `
        <material-tabs scrollable>
          <material-tab label="One" value="one"></material-tab>
        </material-tabs>
      `,
    });
    const tab = page.root!.querySelector('material-tab')!;
    expect(tab.hasAttribute('scrollable-host')).toBe(true);
  });

  it('emits materialTabSelect with the activated tab value and moves selection', async () => {
    const page = await newSpecPage({
      components: [MaterialTabs, MaterialTab],
      html: `
        <material-tabs>
          <material-tab label="One" value="one" selected></material-tab>
          <material-tab label="Two" value="two"></material-tab>
        </material-tabs>
      `,
    });
    const selectSpy = jest.fn();
    page.root!.addEventListener('materialTabSelect', selectSpy);

    const tabs = page.root!.querySelectorAll('material-tab');
    tabs[1].dispatchEvent(
      new CustomEvent('materialTabActivate', { bubbles: true, composed: true, detail: { value: 'two' } }),
    );
    await page.waitForChanges();

    expect(selectSpy).toHaveBeenCalledTimes(1);
    expect(selectSpy.mock.calls[0][0].detail).toEqual({ value: 'two' });
    expect((tabs[0] as any).selected).toBe(false);
    expect((tabs[1] as any).selected).toBe(true);
  });

  it('ignores materialTabActivate from a disabled tab', async () => {
    const page = await newSpecPage({
      components: [MaterialTabs, MaterialTab],
      html: `
        <material-tabs>
          <material-tab label="One" value="one" selected></material-tab>
          <material-tab label="Two" value="two" disabled></material-tab>
        </material-tabs>
      `,
    });
    const selectSpy = jest.fn();
    page.root!.addEventListener('materialTabSelect', selectSpy);

    const tabs = page.root!.querySelectorAll('material-tab');
    tabs[1].dispatchEvent(
      new CustomEvent('materialTabActivate', { bubbles: true, composed: true, detail: { value: 'two' } }),
    );
    await page.waitForChanges();

    expect(selectSpy).not.toHaveBeenCalled();
    expect((tabs[0] as any).selected).toBe(true);
  });

  it('restores the previous selection when materialTabSelect is canceled', async () => {
    const page = await newSpecPage({
      components: [MaterialTabs, MaterialTab],
      html: `
        <material-tabs>
          <material-tab label="One" value="one" selected></material-tab>
          <material-tab label="Two" value="two"></material-tab>
        </material-tabs>
      `,
    });
    page.root!.addEventListener('materialTabSelect', (e) => e.preventDefault());

    const tabs = page.root!.querySelectorAll('material-tab');
    tabs[1].dispatchEvent(
      new CustomEvent('materialTabActivate', { bubbles: true, composed: true, detail: { value: 'two' } }),
    );
    await page.waitForChanges();

    expect((tabs[0] as any).selected).toBe(true);
    expect((tabs[1] as any).selected).toBe(false);
  });
});
