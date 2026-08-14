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

// Real browser coverage for activation/selectable-list behavior: activation
// inspects direct slotted children with :scope, which mock-doc cannot parse.

describe('material-list-item', () => {
  it('click and Enter emit materialListItemActivate with the item value', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-list-item value="orders" label="Orders"></material-list-item>`);
    const activate = await page.spyOnEvent('materialListItemActivate');

    const item = await page.find('material-list-item');
    await item.click();
    await page.waitForChanges();
    await page.evaluate(() => {
      document.querySelector('material-list-item')!.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
      }));
    });
    await page.waitForChanges();

    expect(activate).toHaveReceivedEventTimes(2);
    expect(activate.events[0].detail).toEqual({ value: 'orders' });
    expect(activate.events[1].detail).toEqual({ value: 'orders' });
  });

  it('href item emits activation while preserving the anchor href', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-list-item href="/orders/" value="orders" label="Orders"></material-list-item>`);
    const activate = await page.spyOnEvent('materialListItemActivate');

    const anchor = await page.find('material-list-item >>> a.link');
    expect(anchor.getAttribute('href')).toBe('/orders/');
    await (await page.find('material-list-item')).click();
    await page.waitForChanges();

    expect(activate).toHaveReceivedEventDetail({ value: 'orders' });
  });

  it('inside a selectable material-list it exposes option semantics', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <material-list selection="multi">
        <material-list-item selected value="orders" label="Orders"></material-list-item>
      </material-list>
    `);
    const item = await page.find('material-list-item');
    expect(item.getAttribute('role')).toBe('option');
    expect(item.getAttribute('aria-selected')).toBe('true');
  });
});
