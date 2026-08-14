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

// Real browser, not newSpecPage: material-transfer is formAssociated and
// posts repeated name/value pairs via ElementInternals.

const transferMarkup = `
  <form id="f">
    <material-transfer name="members" available-label="Available users" chosen-label="Team" size="4">
      <material-option value="1" label="Anna"></material-option>
      <material-option value="2" label="Robert" selected></material-option>
      <material-option value="3" label="Disabled" disabled></material-option>
    </material-transfer>
  </form>
`;

describe('material-transfer', () => {
  it('seeds chosen values from selected slotted options and posts repeated form entries', async () => {
    const page = await newE2EPage();
    await page.setContent(transferMarkup);
    const el = await page.find('material-transfer');

    expect(await el.callMethod('getValues')).toEqual(['2']);
    expect(await page.evaluate(() =>
      new FormData(document.getElementById('f') as HTMLFormElement).getAll('members'),
    )).toEqual(['2']);
    expect(await page.find('material-transfer >>> .listbox[aria-label="Available users"]')).not.toBeNull();
    expect(await page.find('material-transfer >>> .listbox[aria-label="Team"]')).not.toBeNull();
  });

  it('highlighting an available row and pressing choose-selected moves it and emits valueChange', async () => {
    const page = await newE2EPage();
    await page.setContent(transferMarkup);
    const el = await page.find('material-transfer');
    const change = await page.spyOnEvent('valueChange');

    const anna = await page.find('material-transfer >>> .listbox[aria-label="Available users"] .row');
    await anna.click();
    await page.waitForChanges();
    const choose = await page.find('material-transfer >>> .controls material-icon-button:nth-child(2) >>> button');
    await choose.click();
    await page.waitForChanges();

    expect(await el.callMethod('getValues')).toEqual(['1', '2']);
    expect(change).toHaveReceivedEventDetail({ values: ['1', '2'] });
    expect(await page.evaluate(() =>
      new FormData(document.getElementById('f') as HTMLFormElement).getAll('members'),
    )).toEqual(['1', '2']);
  });

  it('double-clicking a chosen row moves it back to available', async () => {
    const page = await newE2EPage();
    await page.setContent(transferMarkup);
    const el = await page.find('material-transfer');

    const chosen = await page.find('material-transfer >>> .listbox[aria-label="Team"] .row');
    await chosen.click({ clickCount: 2 });
    await page.waitForChanges();

    expect(await el.callMethod('getValues')).toEqual([]);
  });

  it('filter limits the visible side and move-all respects the active filter', async () => {
    const page = await newE2EPage();
    await page.setContent(transferMarkup);
    const el = await page.find('material-transfer');

    const availableFilter = await page.find('material-transfer >>> .panel:first-child input.search-input');
    await availableFilter.type('Anna');
    await page.waitForChanges();

    const chooseAll = await page.find('material-transfer >>> .controls material-icon-button:nth-child(1) >>> button');
    await chooseAll.click();
    await page.waitForChanges();

    expect(await el.callMethod('getValues')).toEqual(['1', '2']);
  });

  it('required empty transfer is invalid and becomes valid once a value is chosen', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <form id="f">
        <material-transfer name="members" required>
          <material-option value="1" label="Anna"></material-option>
        </material-transfer>
      </form>
    `);
    expect(await page.evaluate(() =>
      (document.getElementById('f') as HTMLFormElement).checkValidity(),
    )).toBe(false);

    const row = await page.find('material-transfer >>> .listbox[aria-label="Available"] .row');
    await row.click();
    await page.waitForChanges();
    const choose = await page.find('material-transfer >>> .controls material-icon-button:nth-child(2) >>> button');
    await choose.click();
    await page.waitForChanges();

    expect(await page.evaluate(() =>
      (document.getElementById('f') as HTMLFormElement).checkValidity(),
    )).toBe(true);
  });
});
