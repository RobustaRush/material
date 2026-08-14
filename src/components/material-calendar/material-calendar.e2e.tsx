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

// Real browser, not newSpecPage: the day-grid keyboard nav
// (@Listen('keydown') + moveFocusTo) drives real focus across shadow-DOM
// buttons and schedules a requestAnimationFrame follow-up focus() call —
// mock-doc doesn't move real focus or run a real rAF loop, so arrow-key/
// Home/End/PageUp/PageDown navigation can only be exercised in a real
// browser. See docs/agents/testing.md.

describe('material-calendar', () => {
  it('ArrowRight/ArrowLeft/ArrowUp/ArrowDown move focus by day/week within the grid', async () => {
    const page = await newE2EPage();
    await page.setContent(
      `<material-calendar locale="en-US" first-day-of-week="0" display-month="2024-06" value="2024-06-15"></material-calendar>`,
    );
    const day15 = await page.find('material-calendar >>> button[data-iso="2024-06-15"]');
    await day15.focus();

    await page.keyboard.press('ArrowRight');
    await page.waitForChanges();
    let active = await page.evaluate(() =>
      (document.querySelector('material-calendar')!.shadowRoot!.activeElement as HTMLElement)
        ?.dataset.iso);
    expect(active).toBe('2024-06-16');

    await page.keyboard.press('ArrowDown');
    await page.waitForChanges();
    active = await page.evaluate(() =>
      (document.querySelector('material-calendar')!.shadowRoot!.activeElement as HTMLElement)
        ?.dataset.iso);
    expect(active).toBe('2024-06-23');

    await page.keyboard.press('ArrowLeft');
    await page.waitForChanges();
    active = await page.evaluate(() =>
      (document.querySelector('material-calendar')!.shadowRoot!.activeElement as HTMLElement)
        ?.dataset.iso);
    expect(active).toBe('2024-06-22');

    await page.keyboard.press('ArrowUp');
    await page.waitForChanges();
    active = await page.evaluate(() =>
      (document.querySelector('material-calendar')!.shadowRoot!.activeElement as HTMLElement)
        ?.dataset.iso);
    expect(active).toBe('2024-06-15');
  });

  it('Home/End move focus to the start/end of the visible week', async () => {
    const page = await newE2EPage();
    await page.setContent(
      `<material-calendar locale="en-US" first-day-of-week="0" display-month="2024-06" value="2024-06-19"></material-calendar>`,
    );
    // 2024-06-19 is a Wednesday; the Sunday-first week runs 06-16..06-22.
    const day = await page.find('material-calendar >>> button[data-iso="2024-06-19"]');
    await day.focus();

    await page.keyboard.press('End');
    await page.waitForChanges();
    let active = await page.evaluate(() =>
      (document.querySelector('material-calendar')!.shadowRoot!.activeElement as HTMLElement)
        ?.dataset.iso);
    expect(active).toBe('2024-06-22');

    await page.keyboard.press('Home');
    await page.waitForChanges();
    active = await page.evaluate(() =>
      (document.querySelector('material-calendar')!.shadowRoot!.activeElement as HTMLElement)
        ?.dataset.iso);
    expect(active).toBe('2024-06-16');
  });

  it('PageUp/PageDown step the focused date by a month; Enter selects it and emits dateSelect', async () => {
    const page = await newE2EPage();
    await page.setContent(
      `<material-calendar locale="en-US" first-day-of-week="0" display-month="2024-06" value="2024-06-15"></material-calendar>`,
    );
    const dateSelect = await page.spyOnEvent('dateSelect');
    const day = await page.find('material-calendar >>> button[data-iso="2024-06-15"]');
    await day.focus();

    await page.keyboard.press('PageDown');
    await page.waitForChanges();
    let active = await page.evaluate(() =>
      (document.querySelector('material-calendar')!.shadowRoot!.activeElement as HTMLElement)
        ?.dataset.iso);
    expect(active).toBe('2024-07-15');

    await page.keyboard.press('Enter');
    await page.waitForChanges();
    expect(dateSelect).toHaveReceivedEventDetail({ value: '2024-07-15' });

    const el = await page.find('material-calendar');
    expect(await el.getProperty('value')).toBe('2024-07-15');
  });

  it('click-driven range selection: two clicks open then close the range, with rangeSelect on each pick', async () => {
    const page = await newE2EPage();
    await page.setContent(
      `<material-calendar locale="en-US" first-day-of-week="0" display-month="2024-06" range></material-calendar>`,
    );
    const rangeSelect = await page.spyOnEvent('rangeSelect');

    const day10 = await page.find('material-calendar >>> button[data-iso="2024-06-10"]');
    await day10.click();
    await page.waitForChanges();
    expect(rangeSelect).toHaveReceivedEventDetail({ start: '2024-06-10', end: '' });

    const day20 = await page.find('material-calendar >>> button[data-iso="2024-06-20"]');
    await day20.click();
    await page.waitForChanges();
    expect(rangeSelect).toHaveReceivedEventDetail({ start: '2024-06-10', end: '2024-06-20' });
    expect(rangeSelect).toHaveReceivedEventTimes(2);

    const el = await page.find('material-calendar');
    expect(await el.getProperty('startValue')).toBe('2024-06-10');
    expect(await el.getProperty('endValue')).toBe('2024-06-20');
  });

  it('months/years pickers: arrow-key nav moves the roving tabindex and Enter picks the focused item', async () => {
    const page = await newE2EPage();
    await page.setContent(
      `<material-calendar locale="en-US" display-month="2024-06"></material-calendar>`,
    );
    const monthTitle = await page.find('material-calendar >>> .cal__title-btn');
    await monthTitle.click();
    await page.waitForChanges();

    // June (index 5, 0-based) starts as the roving tabindex=0 item.
    const june = await page.find('material-calendar >>> .cal__list-item.is-selected');
    await june.focus();
    await page.keyboard.press('ArrowDown');
    await page.waitForChanges();

    const active = await page.evaluate(() =>
      (document.querySelector('material-calendar')!.shadowRoot!.activeElement as HTMLElement)
        ?.textContent);
    expect(active).toBe('July');

    await page.keyboard.press('Enter');
    await page.waitForChanges();

    const el = await page.find('material-calendar');
    expect(await el.getProperty('displayMonth')).toBe('2024-07');
    // Picking from the list returns to the day grid.
    expect(await page.find('material-calendar >>> .cal__grid')).not.toBeNull();
    expect(await page.find('material-calendar >>> .cal__list')).toBeNull();
  });
});
