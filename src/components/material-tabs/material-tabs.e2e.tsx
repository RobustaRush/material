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

import { newE2EPage } from '@stencil/core/testing';

// Real browser: exercises the roving-tabindex keyboard navigation and
// active-descendant focus movement across <material-tab> shadow-DOM
// boundaries, which mock-doc can't meaningfully simulate (no real
// focus()/activeElement tracking across custom elements).

describe('material-tabs', () => {
  it('renders tabs with role=tab and aria-selected reflecting the selected one', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <material-tabs>
        <material-tab label="One" value="one"></material-tab>
        <material-tab label="Two" value="two"></material-tab>
      </material-tabs>
    `);
    const tabs = await page.findAll('material-tabs material-tab');
    // material-tab's Host is role="presentation"; the effective role="tab"
    // element is its own shadow button.
    const firstInner = await page.find('material-tabs material-tab:nth-child(1) >>> button');
    const secondInner = await page.find('material-tabs material-tab:nth-child(2) >>> button');
    expect(firstInner.getAttribute('role')).toBe('tab');
    expect(firstInner.getAttribute('aria-selected')).toBe('true');
    expect(secondInner.getAttribute('aria-selected')).toBe('false');
    expect(tabs.length).toBe(2);
  });

  it('clicking a tab selects it and emits materialTabSelect', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <material-tabs>
        <material-tab label="One" value="one"></material-tab>
        <material-tab label="Two" value="two"></material-tab>
      </material-tabs>
    `);
    const selectSpy = await page.spyOnEvent('materialTabSelect');
    const secondButton = await page.find('material-tabs material-tab:nth-child(2) >>> button');
    await secondButton.click();
    await page.waitForChanges();

    expect(selectSpy).toHaveReceivedEventDetail({ value: 'two' });
    const firstButton = await page.find('material-tabs material-tab:nth-child(1) >>> button');
    expect(firstButton.getAttribute('aria-selected')).toBe('false');
    expect(secondButton.getAttribute('aria-selected')).toBe('true');
  });

  it('ArrowRight/ArrowLeft move focus between tabs without changing selection', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <material-tabs>
        <material-tab label="One" value="one"></material-tab>
        <material-tab label="Two" value="two"></material-tab>
        <material-tab label="Three" value="three"></material-tab>
      </material-tabs>
    `);
    const selectSpy = await page.spyOnEvent('materialTabSelect');
    const firstButton = await page.find('material-tabs material-tab:nth-child(1) >>> button');
    await firstButton.focus();

    await page.keyboard.press('ArrowRight');
    await page.waitForChanges();
    const activeLabel = await page.evaluate(() => {
      const active = document.activeElement as HTMLElement;
      // Pierce through material-tabs -> material-tab -> shadow button.
      return active?.shadowRoot?.activeElement
        ? (active.shadowRoot.activeElement as HTMLElement).textContent
        : active?.tagName;
    });
    // Focus moved to the second tab's inner button; selection did not change
    // (Arrow keys move focus only — manual activation per ARIA tabs).
    expect(activeLabel).toContain('Two');
    expect(selectSpy).toHaveReceivedEventTimes(0);

    const firstButtonAfter = await page.find('material-tabs material-tab:nth-child(1) >>> button');
    expect(firstButtonAfter.getAttribute('aria-selected')).toBe('true');
  });

  it('Home/End jump focus to the first/last enabled tab', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <material-tabs>
        <material-tab label="One" value="one"></material-tab>
        <material-tab label="Two" value="two"></material-tab>
        <material-tab label="Three" value="three"></material-tab>
      </material-tabs>
    `);
    const firstButton = await page.find('material-tabs material-tab:nth-child(1) >>> button');
    await firstButton.focus();

    await page.keyboard.press('End');
    await page.waitForChanges();
    let activeLabel = await page.evaluate(() => {
      const active = document.activeElement as HTMLElement;
      return (active?.shadowRoot?.activeElement as HTMLElement)?.textContent ?? '';
    });
    expect(activeLabel).toContain('Three');

    await page.keyboard.press('Home');
    await page.waitForChanges();
    activeLabel = await page.evaluate(() => {
      const active = document.activeElement as HTMLElement;
      return (active?.shadowRoot?.activeElement as HTMLElement)?.textContent ?? '';
    });
    expect(activeLabel).toContain('One');
  });

  it('keyboard navigation skips a disabled tab', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <material-tabs>
        <material-tab label="One" value="one"></material-tab>
        <material-tab label="Two" value="two" disabled></material-tab>
        <material-tab label="Three" value="three"></material-tab>
      </material-tabs>
    `);
    const firstButton = await page.find('material-tabs material-tab:nth-child(1) >>> button');
    await firstButton.focus();

    await page.keyboard.press('ArrowRight');
    await page.waitForChanges();
    const activeLabel = await page.evaluate(() => {
      const active = document.activeElement as HTMLElement;
      return (active?.shadowRoot?.activeElement as HTMLElement)?.textContent ?? '';
    });
    // The disabled middle tab is skipped entirely.
    expect(activeLabel).toContain('Three');
  });

  it('Space/Enter activates the currently focused tab', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <material-tabs>
        <material-tab label="One" value="one"></material-tab>
        <material-tab label="Two" value="two"></material-tab>
      </material-tabs>
    `);
    const selectSpy = await page.spyOnEvent('materialTabSelect');
    const firstButton = await page.find('material-tabs material-tab:nth-child(1) >>> button');
    await firstButton.focus();
    await page.keyboard.press('ArrowRight');
    await page.waitForChanges();
    await page.keyboard.press('Enter');
    await page.waitForChanges();

    expect(selectSpy).toHaveReceivedEventDetail({ value: 'two' });
    const secondButton = await page.find('material-tabs material-tab:nth-child(2) >>> button');
    expect(secondButton.getAttribute('aria-selected')).toBe('true');
  });
});
