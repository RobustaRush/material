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

// Real browser, not newSpecPage: material-tree is formAssociated and its
// selectable mode composes with material-tree-item/material-checkbox.

const treeMarkup = `
  <form id="f">
    <material-tree selectable name="category" aria-label="Categories">
      <material-tree-item value="parent" label="Parent" expanded>
        <material-tree-item value="child-1" label="Child 1"></material-tree-item>
        <material-tree-item value="child-2" label="Child 2"></material-tree-item>
      </material-tree-item>
    </material-tree>
  </form>
`;

describe('material-tree', () => {
  it('renders tree semantics and pushes depth/selectable state to nested items', async () => {
    const page = await newE2EPage();
    await page.setContent(treeMarkup);
    const tree = await page.find('material-tree');
    const parent = await page.find('material-tree-item[value="parent"]');
    const child = await page.find('material-tree-item[value="child-1"]');
    expect(tree.getAttribute('role')).toBe('tree');
    expect(tree.getAttribute('aria-multiselectable')).toBe('true');
    expect(parent.getAttribute('aria-level')).toBe('1');
    expect(child.getAttribute('aria-level')).toBe('2');
    expect(await child.getProperty('selectable')).toBe(true);
  });

  it('selecting a parent cascades to descendants, emits materialSelectionChange and posts all checked values', async () => {
    const page = await newE2EPage();
    await page.setContent(treeMarkup);
    const tree = await page.find('material-tree');
    const selection = await page.spyOnEvent('materialSelectionChange');

    const parentRow = await page.find('material-tree-item[value="parent"] >>> [part="row"]');
    await parentRow.click();
    await page.waitForChanges();

    expect(await tree.callMethod('getSelected')).toEqual(['parent', 'child-1', 'child-2']);
    expect(selection).toHaveReceivedEventDetail({
      values: ['parent', 'child-1', 'child-2'],
      count: 3,
    });
    expect(await page.evaluate(() =>
      new FormData(document.getElementById('f') as HTMLFormElement).getAll('category'),
    )).toEqual(['parent', 'child-1', 'child-2']);
  });

  it('clearSelection clears checked state and form data', async () => {
    const page = await newE2EPage();
    await page.setContent(treeMarkup);
    const tree = await page.find('material-tree');
    await (await page.find('material-tree-item[value="parent"] >>> [part="row"]')).click();
    await page.waitForChanges();

    await tree.callMethod('clearSelection');
    await page.waitForChanges();

    expect(await tree.callMethod('getSelected')).toEqual([]);
    expect(await page.evaluate(() =>
      new FormData(document.getElementById('f') as HTMLFormElement).getAll('category'),
    )).toEqual([]);
  });

  it('collapseAll hides descendants and expandAll reveals them again', async () => {
    const page = await newE2EPage();
    await page.setContent(treeMarkup);
    const tree = await page.find('material-tree');
    const child = await page.find('material-tree-item[value="child-1"]');

    await tree.callMethod('collapseAll');
    await page.waitForChanges();
    expect(child.getAttribute('hidden')).not.toBeNull();

    await tree.callMethod('expandAll');
    await page.waitForChanges();
    expect(child.getAttribute('hidden')).toBeNull();
  });

  it('lazy expandable items without src emit materialTreeLoad when opened', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <material-tree>
        <material-tree-item value="lazy" label="Lazy" has-children></material-tree-item>
      </material-tree>
    `);
    const load = await page.spyOnEvent('materialTreeLoad');

    const chevron = await page.find('material-tree-item[value="lazy"] >>> .chevron');
    await chevron.click();
    await page.waitForChanges();

    expect(load).toHaveReceivedEventTimes(1);
    expect(load.events[0].detail.value).toBe('lazy');
  });
});
