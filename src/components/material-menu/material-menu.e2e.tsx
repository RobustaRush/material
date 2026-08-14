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

// Real browser, not newSpecPage: material-menu drives the native Popover API
// (popover="auto", showPopover/hidePopover, :popover-open, the browser's own
// light-dismiss and ToggleEvent) for open/close, plus real keyboard focus
// across material-menu-item children. Mock-doc implements none of this — see
// docs/agents/testing.md.

describe('material-menu', () => {
  const menuHtml = `
    <button id="trigger">Open</button>
    <material-menu id="m" anchor="trigger">
      <material-menu-item label="One" value="one"></material-menu-item>
      <material-menu-item label="Two" value="two"></material-menu-item>
      <material-menu-item label="Three" value="three" disabled></material-menu-item>
      <material-menu-item label="Four" value="four"></material-menu-item>
    </material-menu>
  `;

  it('show(): opens the popover, focuses the first item, and emits materialMenuOpen', async () => {
    const page = await newE2EPage();
    await page.setContent(menuHtml);
    const openSpy = await page.spyOnEvent('materialMenuOpen');
    const menu = await page.find('material-menu');

    await menu.callMethod('show');
    await page.waitForChanges();

    expect(await menu.getProperty('open')).toBe(true);
    expect(await page.evaluate(() => document.getElementById('m')!.matches(':popover-open'))).toBe(
      true,
    );
    expect(openSpy).toHaveReceivedEventTimes(1);
    expect(
      await page.evaluate(() => (document.activeElement as HTMLElement)?.getAttribute('value')),
    ).toBe('one');
  });

  it('hide(): closes the popover and emits materialMenuClose', async () => {
    const page = await newE2EPage();
    await page.setContent(menuHtml);
    const closeSpy = await page.spyOnEvent('materialMenuClose');
    const menu = await page.find('material-menu');

    await menu.callMethod('show');
    await page.waitForChanges();
    await menu.callMethod('hide');
    await page.waitForChanges();

    expect(await menu.getProperty('open')).toBe(false);
    expect(await page.evaluate(() => document.getElementById('m')!.matches(':popover-open'))).toBe(
      false,
    );
    expect(closeSpy).toHaveReceivedEventTimes(1);
  });

  it('ArrowDown/ArrowUp move focus among items, skip the disabled item, and wrap around', async () => {
    const page = await newE2EPage();
    await page.setContent(menuHtml);
    const menu = await page.find('material-menu');
    await menu.callMethod('show');
    await page.waitForChanges();

    const activeValue = () =>
      page.evaluate(() => (document.activeElement as HTMLElement)?.getAttribute('value'));

    expect(await activeValue()).toBe('one');
    await page.keyboard.press('ArrowDown');
    await page.waitForChanges();
    expect(await activeValue()).toBe('two');

    // "three" is disabled and excluded from getItems(), so ArrowDown skips
    // straight to "four".
    await page.keyboard.press('ArrowDown');
    await page.waitForChanges();
    expect(await activeValue()).toBe('four');

    // Wraps back around to the first item.
    await page.keyboard.press('ArrowDown');
    await page.waitForChanges();
    expect(await activeValue()).toBe('one');

    // ArrowUp from the first item wraps to the last (non-disabled) item.
    await page.keyboard.press('ArrowUp');
    await page.waitForChanges();
    expect(await activeValue()).toBe('four');
  });

  it('Home/End jump to the first/last item', async () => {
    const page = await newE2EPage();
    await page.setContent(menuHtml);
    const menu = await page.find('material-menu');
    await menu.callMethod('show');
    await page.waitForChanges();

    const activeValue = () =>
      page.evaluate(() => (document.activeElement as HTMLElement)?.getAttribute('value'));

    await page.keyboard.press('End');
    await page.waitForChanges();
    expect(await activeValue()).toBe('four');

    await page.keyboard.press('Home');
    await page.waitForChanges();
    expect(await activeValue()).toBe('one');
  });

  it('Enter/Space on a focused item selects it and closes the menu, returning focus to the invoker', async () => {
    const page = await newE2EPage();
    await page.setContent(menuHtml);
    const selectSpy = await page.spyOnEvent('materialMenuSelect');
    const closeSpy = await page.spyOnEvent('materialMenuClose');
    const menu = await page.find('material-menu');
    const trigger = await page.find('#trigger');
    await trigger.focus();

    await menu.callMethod('show');
    await page.waitForChanges();

    await page.keyboard.press('Enter');
    await page.waitForChanges();

    expect(selectSpy).toHaveReceivedEventDetail({ value: 'one' });
    expect(closeSpy).toHaveReceivedEventTimes(1);
    expect(await menu.getProperty('open')).toBe(false);
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('trigger');
  });

  it('an item with keepOpen does not close the menu on activation', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <button id="trigger">Open</button>
      <material-menu id="m" anchor="trigger">
        <material-menu-item label="Bold" value="bold" keep-open></material-menu-item>
      </material-menu>
    `);
    const closeSpy = await page.spyOnEvent('materialMenuClose');
    const menu = await page.find('material-menu');
    await menu.callMethod('show');
    await page.waitForChanges();

    await page.keyboard.press('Enter');
    await page.waitForChanges();

    expect(closeSpy).toHaveReceivedEventTimes(0);
    expect(await menu.getProperty('open')).toBe(true);
  });

  it('Escape closes the menu and returns focus to the invoker', async () => {
    const page = await newE2EPage();
    await page.setContent(menuHtml);
    const closeSpy = await page.spyOnEvent('materialMenuClose');
    const menu = await page.find('material-menu');
    const trigger = await page.find('#trigger');
    await trigger.focus();

    await menu.callMethod('show');
    await page.waitForChanges();

    await page.keyboard.press('Escape');
    await page.waitForChanges();

    expect(closeSpy).toHaveReceivedEventTimes(1);
    expect(await menu.getProperty('open')).toBe(false);
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('trigger');
  });

  it('Tab closes the menu, per the WAI-ARIA menu pattern, without trapping focus inside it', async () => {
    // Tab intentionally does NOT preventDefault (see the handler's comment),
    // so the browser's native Tab still runs afterward — the assertion here
    // is that the menu is gone and focus lands past it, not pinned back on
    // the trigger.
    const page = await newE2EPage();
    await page.setContent(menuHtml + '<button id="after">after</button>');
    const closeSpy = await page.spyOnEvent('materialMenuClose');
    const menu = await page.find('material-menu');
    const trigger = await page.find('#trigger');
    await trigger.focus();

    await menu.callMethod('show');
    await page.waitForChanges();

    await page.keyboard.press('Tab');
    await page.waitForChanges();

    expect(closeSpy).toHaveReceivedEventTimes(1);
    expect(await menu.getProperty('open')).toBe(false);
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('after');
  });

  it('clicking outside light-dismisses the menu without forcing focus back to the invoker', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <button id="trigger">Open</button>
      <div id="outside" style="position:fixed;top:300px;left:300px;width:20px;height:20px;">x</div>
      <material-menu id="m" anchor="trigger">
        <material-menu-item label="One" value="one"></material-menu-item>
      </material-menu>
    `);
    const closeSpy = await page.spyOnEvent('materialMenuClose');
    const menu = await page.find('material-menu');
    const trigger = await page.find('#trigger');
    await trigger.focus();

    await menu.callMethod('show');
    await page.waitForChanges();
    expect(await menu.getProperty('open')).toBe(true);

    const outside = await page.find('#outside');
    await outside.click();
    await page.waitForChanges();

    expect(closeSpy).toHaveReceivedEventTimes(1);
    expect(await menu.getProperty('open')).toBe(false);
    // Light-dismiss must not yank focus back to the trigger.
    expect(await page.evaluate(() => document.activeElement?.id)).not.toBe('trigger');
  });

  it('opening via a real popovertarget invoker resolves it as the anchor', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <button id="trigger" popovertarget="m">Open</button>
      <material-menu id="m">
        <material-menu-item label="One" value="one"></material-menu-item>
      </material-menu>
    `);
    const openSpy = await page.spyOnEvent('materialMenuOpen');
    const menu = await page.find('material-menu');
    const trigger = await page.find('#trigger');

    await trigger.click();
    await page.waitForChanges();

    expect(openSpy).toHaveReceivedEventTimes(1);
    expect(await menu.getProperty('open')).toBe(true);
  });

  it('menuRole="listbox" sets role=listbox on the host in a real DOM', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-menu menu-role="listbox"></material-menu>`);
    const menu = await page.find('material-menu');
    expect(menu.getAttribute('role')).toBe('listbox');
  });
});
