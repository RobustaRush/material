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

const tableMarkup = `
  <material-data-table>
    <table>
      <thead>
        <tr>
          <th class="cell-select"><input type="checkbox" data-select-all aria-label="Select all"></th>
          <th data-sort="number"><button type="button">Number</button></th>
          <th>Name</th>
        </tr>
      </thead>
      <tbody>
        <tr data-row-link>
          <td><input type="checkbox" data-row-select value="1"></td>
          <td><a href="/orders/1/">PO-001</a></td>
          <td><input class="cell-edit" name="name" value="Alpha"></td>
        </tr>
        <tr>
          <td><input type="checkbox" data-row-select value="2"></td>
          <td>PO-002</td>
          <td>Beta</td>
        </tr>
      </tbody>
    </table>
  </material-data-table>
`;

describe('material-data-table', () => {
  it('reflects loading/sticky-header state into public host attributes', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <material-data-table loading sticky-header>
        <table><thead><tr><th>Name</th></tr></thead><tbody><tr><td>A</td></tr></tbody></table>
      </material-data-table>
    `);
    const el = await page.find('material-data-table');
    expect(el.getAttribute('aria-busy')).toBe('true');
    expect(el.getAttribute('tabindex')).toBe('0');
  });

  it('row checkbox changes emit selected values/count and update select-all indeterminate state', async () => {
    const page = await newE2EPage();
    await page.setContent(tableMarkup);
    const selection = await page.spyOnEvent('materialSelectionChange');

    const rowOne = await page.find('tbody tr:first-child input[data-row-select]');
    await rowOne.click();
    await page.waitForChanges();

    expect(selection).toHaveReceivedEventDetail({
      values: ['1'],
      count: 1,
      allSelected: false,
    });
    expect(await page.$eval('[data-select-all]', (el) => (el as HTMLInputElement).indeterminate)).toBe(true);
  });

  it('select-all checks every enabled row and clearSelection() clears them again', async () => {
    const page = await newE2EPage();
    await page.setContent(tableMarkup);
    const el = await page.find('material-data-table');
    const selection = await page.spyOnEvent('materialSelectionChange');

    const all = await page.find('[data-select-all]');
    await all.click();
    await page.waitForChanges();

    expect(await el.callMethod('getSelected')).toEqual(['1', '2']);
    expect(selection).toHaveReceivedEventDetail({
      values: ['1', '2'],
      count: 2,
      allSelected: true,
    });

    await el.callMethod('clearSelection');
    await page.waitForChanges();
    expect(await el.callMethod('getSelected')).toEqual([]);
  });

  it('client sort headers emit materialSort while link headers remain browser-owned', async () => {
    const page = await newE2EPage();
    await page.setContent(tableMarkup);
    const sort = await page.spyOnEvent('materialSort');

    const sortButton = await page.find('th[data-sort="number"] button');
    await sortButton.click();
    await page.waitForChanges();

    expect(sort).toHaveReceivedEventDetail({ column: 'number', direction: 'ascending' });
  });

  it('cell-edit change events are relayed as materialCellEdit', async () => {
    const page = await newE2EPage();
    await page.setContent(tableMarkup);
    const edit = await page.spyOnEvent('materialCellEdit');

    await page.$eval('.cell-edit', (el) => {
      const input = el as HTMLInputElement;
      input.value = 'Changed';
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await page.waitForChanges();

    expect(edit).toHaveReceivedEventDetail({ name: 'name', value: 'Changed' });
  });

  it('group rows toggle following rows and emit materialGroupToggle', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <material-data-table>
        <table>
          <thead><tr><th>Name</th></tr></thead>
          <tbody>
            <tr class="row-group" data-group="open"><td>Open</td></tr>
            <tr><td>Child</td></tr>
          </tbody>
        </table>
      </material-data-table>
    `);
    const group = await page.spyOnEvent('materialGroupToggle');

    const groupRow = await page.find('tr.row-group');
    await groupRow.click();
    await page.waitForChanges();

    expect(group).toHaveReceivedEventDetail({ group: 'open', collapsed: true });
    expect(await page.$eval('tbody tr:nth-child(2)', (row) => (row as HTMLTableRowElement).hidden)).toBe(true);
  });
});
