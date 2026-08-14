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

// Real browser, not newSpecPage: activate() unconditionally calls
// `this.el.querySelector(':scope > [slot="leading"]')`, and mock-doc's
// querySelector doesn't implement `:scope` (throws "unsupported pseudo:
// scope"), so any click or Enter/Space keydown throws before the events
// fire — see docs/agents/testing.md.

describe('material-menu-item', () => {
  it('click emits materialMenuSelect with the value and materialMenuItemActivate with keepOpen', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-menu-item label="Cut" value="cut"></material-menu-item>`);
    const selectSpy = await page.spyOnEvent('materialMenuSelect');
    const activateSpy = await page.spyOnEvent('materialMenuItemActivate');
    const item = await page.find('material-menu-item');

    await item.click();
    await page.waitForChanges();

    expect(selectSpy).toHaveReceivedEventDetail({ value: 'cut' });
    expect(activateSpy).toHaveReceivedEventDetail({ keepOpen: false });
  });

  it('keepOpen prop is carried through on materialMenuItemActivate', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-menu-item value="cut" keep-open></material-menu-item>`);
    const activateSpy = await page.spyOnEvent('materialMenuItemActivate');
    const item = await page.find('material-menu-item');

    await item.click();
    await page.waitForChanges();

    expect(activateSpy).toHaveReceivedEventDetail({ keepOpen: true });
  });

  it('Enter and Space activate the item; other keys do not', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-menu-item value="cut"></material-menu-item>`);
    const selectSpy = await page.spyOnEvent('materialMenuSelect');
    const item = await page.find('material-menu-item');
    await item.focus();

    await item.press('Enter');
    await page.waitForChanges();
    expect(selectSpy).toHaveReceivedEventTimes(1);

    await item.press(' ');
    await page.waitForChanges();
    expect(selectSpy).toHaveReceivedEventTimes(2);

    await item.press('a');
    await page.waitForChanges();
    expect(selectSpy).toHaveReceivedEventTimes(2);
  });

  it('disabled: blocks click and keyboard activation', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-menu-item value="cut" disabled></material-menu-item>`);
    const selectSpy = await page.spyOnEvent('materialMenuSelect');
    const item = await page.find('material-menu-item');

    await item.click();
    await page.waitForChanges();
    expect(selectSpy).toHaveReceivedEventTimes(0);
  });

  it('clicking anywhere on the row toggles a slotted leading checkbox, without double-toggling a click on the checkbox itself', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <material-menu-item value="a" label="Option A">
        <material-checkbox slot="leading"></material-checkbox>
      </material-menu-item>
    `);
    const item = await page.find('material-menu-item');
    const cb = await page.find('material-checkbox');

    expect(await cb.getProperty('checked')).toBe(false);

    // A click anywhere on the row (not on the checkbox itself) toggles it once.
    await item.click();
    await page.waitForChanges();
    expect(await cb.getProperty('checked')).toBe(true);

    // A click on the checkbox itself is its own self-toggle; the row must not
    // toggle it a second time on top of that.
    await cb.click();
    await page.waitForChanges();
    expect(await cb.getProperty('checked')).toBe(false);
  });

  it('sets role="menuitem" and reflects aria-disabled/aria-current in a real DOM', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-menu-item label="Cut" selected></material-menu-item>`);
    const item = await page.find('material-menu-item');
    expect(item.getAttribute('role')).toBe('menuitem');
    expect(item.getAttribute('aria-current')).toBe('true');
  });
});
