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

// Real browser, not newSpecPage: the bar's arrow-key navigation reads
// document.activeElement and calls Element.focus()/scrollIntoView() on the
// target item — mock-doc doesn't implement real focus management (calling
// .focus() never updates document.activeElement), so this can only be
// exercised against a real Chromium instance. See docs/agents/testing.md.

describe('material-navigation-bar keyboard navigation', () => {
  const setup = async (attrs = '') => {
    const page = await newE2EPage();
    await page.setContent(`
      <material-navigation-bar ${attrs}>
        <material-navigation-item id="a" label="A" value="a"></material-navigation-item>
        <material-navigation-item id="b" label="B" value="b"></material-navigation-item>
        <material-navigation-item id="c" label="C" value="c" disabled></material-navigation-item>
        <material-navigation-item id="d" label="D" value="d"></material-navigation-item>
      </material-navigation-bar>
    `);
    return page;
  };

  const activeId = (page: any) =>
    page.evaluate(() => (document.activeElement as HTMLElement | null)?.id ?? null);

  it('ArrowRight moves focus to the next item, skipping disabled ones', async () => {
    const page = await setup();
    const a = await page.find('material-navigation-bar >>> nav'); // ensure shadow root exists
    void a;
    const first = await page.find('#a >>> button');
    await first.focus();
    await page.waitForChanges();
    expect(await activeId(page)).toBe('a');

    await page.keyboard.press('ArrowRight');
    await page.waitForChanges();
    expect(await activeId(page)).toBe('b');

    // c is disabled — ArrowRight from b skips straight to d.
    await page.keyboard.press('ArrowRight');
    await page.waitForChanges();
    expect(await activeId(page)).toBe('d');
  });

  it('ArrowRight wraps from the last enabled item back to the first', async () => {
    const page = await setup();
    const dButton = await page.find('#d >>> button');
    await dButton.focus();
    await page.waitForChanges();

    await page.keyboard.press('ArrowRight');
    await page.waitForChanges();
    expect(await activeId(page)).toBe('a');
  });

  it('ArrowLeft moves focus to the previous enabled item', async () => {
    const page = await setup();
    const bButton = await page.find('#b >>> button');
    await bButton.focus();
    await page.waitForChanges();

    await page.keyboard.press('ArrowLeft');
    await page.waitForChanges();
    expect(await activeId(page)).toBe('a');
  });

  it('Home / End jump to the first / last enabled item', async () => {
    const page = await setup();
    const bButton = await page.find('#b >>> button');
    await bButton.focus();
    await page.waitForChanges();

    await page.keyboard.press('End');
    await page.waitForChanges();
    expect(await activeId(page)).toBe('d');

    await page.keyboard.press('Home');
    await page.waitForChanges();
    expect(await activeId(page)).toBe('a');
  });

  it('in an RTL context ArrowRight moves backward and ArrowLeft moves forward', async () => {
    const page = await setup('dir="rtl"');
    const bButton = await page.find('#b >>> button');
    await bButton.focus();
    await page.waitForChanges();

    await page.keyboard.press('ArrowRight');
    await page.waitForChanges();
    expect(await activeId(page)).toBe('a');

    await page.keyboard.press('ArrowLeft');
    await page.waitForChanges();
    expect(await activeId(page)).toBe('b');
  });

  it('clicking an item selects it as the single active item (activation="auto")', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <material-navigation-bar>
        <material-navigation-item id="a" label="A" value="a" active></material-navigation-item>
        <material-navigation-item id="b" label="B" value="b"></material-navigation-item>
      </material-navigation-bar>
    `);
    const a = await page.find('material-navigation-bar #a');
    const b = await page.find('material-navigation-bar #b');
    const bButton = await page.find('#b >>> button');

    await bButton.click();
    await page.waitForChanges();
    expect(await a.getProperty('active')).toBe(false);
    expect(await b.getProperty('active')).toBe(true);
  });
});
