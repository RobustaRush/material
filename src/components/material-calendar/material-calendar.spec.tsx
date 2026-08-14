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
import { MaterialCalendar } from './material-calendar';

// Fixed locale + first-day-of-week on every render below so weekday-name
// ordering and month/year labels don't depend on the host machine's ICU
// data or its default Intl locale.

function daysGrid(root: HTMLElement): HTMLElement {
  return root.shadowRoot!.querySelector('.cal__grid')!;
}

describe('material-calendar', () => {
  it('renders the day grid for displayMonth with grid/row/gridcell roles', async () => {
    const page = await newSpecPage({
      components: [MaterialCalendar],
      html: `<material-calendar locale="en-US" first-day-of-week="0" display-month="2024-06"></material-calendar>`,
    });
    const grid = daysGrid(page.root!);
    expect(grid.getAttribute('role')).toBe('grid');
    expect(grid.querySelectorAll('[role="row"]').length).toBeGreaterThan(0);
    expect(grid.querySelectorAll('[role="gridcell"]').length).toBeGreaterThan(0);
    const headerText = page.root!.shadowRoot!.querySelector('.cal__title-text-label')!.textContent;
    expect(headerText).toBe('June');
    const yearText = page.root!.shadowRoot!.querySelectorAll('.cal__title-btn')[1].textContent;
    expect(yearText).toContain('2024');
  });

  it('value marks the matching day with aria-selected on the gridcell', async () => {
    const page = await newSpecPage({
      components: [MaterialCalendar],
      html: `<material-calendar locale="en-US" first-day-of-week="0" display-month="2024-06" value="2024-06-15"></material-calendar>`,
    });
    const btn = page.root!.shadowRoot!.querySelector('button[data-iso="2024-06-15"]')!;
    const cell = btn.closest('[role="gridcell"]')!;
    expect(cell.getAttribute('aria-selected')).toBe('true');
    expect(btn.classList.contains('is-selected')).toBe(true);
  });

  it('componentWillLoad derives displayMonth from value when not given explicitly', async () => {
    const page = await newSpecPage({
      components: [MaterialCalendar],
      html: `<material-calendar locale="en-US" value="2024-03-09"></material-calendar>`,
    });
    expect(page.root!.getAttribute('display-month')).toBe('2024-03');
  });

  it('min/max disable out-of-range days and the corresponding nav arrow', async () => {
    const page = await newSpecPage({
      components: [MaterialCalendar],
      html: `<material-calendar locale="en-US" first-day-of-week="0" display-month="2024-06" min="2024-06-10" max="2024-06-20"></material-calendar>`,
    });
    const sr = page.root!.shadowRoot!;
    expect(sr.querySelector('button[data-iso="2024-06-05"]')!.hasAttribute('disabled')).toBe(true);
    expect(sr.querySelector('button[data-iso="2024-06-15"]')!.hasAttribute('disabled')).toBe(false);
    expect(sr.querySelector('button[data-iso="2024-06-25"]')!.hasAttribute('disabled')).toBe(true);

    const [prevBtn, nextBtn] = Array.from(sr.querySelectorAll('material-icon-button'));
    expect(prevBtn.getAttribute('disabled')).not.toBeNull();
    expect(nextBtn.getAttribute('disabled')).not.toBeNull();
  });

  it('range mode renders the in-between band and marks both ends selected', async () => {
    const page = await newSpecPage({
      components: [MaterialCalendar],
      html: `<material-calendar locale="en-US" first-day-of-week="0" display-month="2024-06" range start-value="2024-06-05" end-value="2024-06-10"></material-calendar>`,
    });
    const sr = page.root!.shadowRoot!;
    const midCell = sr.querySelector('button[data-iso="2024-06-07"]')!.closest('.cal__cell')!;
    expect(midCell.classList.contains('range-mid')).toBe(true);

    const startCell = sr.querySelector('button[data-iso="2024-06-05"]')!.closest('.cal__cell')!;
    const endCell = sr.querySelector('button[data-iso="2024-06-10"]')!.closest('.cal__cell')!;
    expect(startCell.classList.contains('range-cap-start')).toBe(true);
    expect(endCell.classList.contains('range-cap-end')).toBe(true);

    expect(sr.querySelector('button[data-iso="2024-06-05"]')!.closest('[role="gridcell"]')!.getAttribute('aria-selected')).toBe('true');
    expect(sr.querySelector('button[data-iso="2024-06-10"]')!.closest('[role="gridcell"]')!.getAttribute('aria-selected')).toBe('true');
  });

  it('firstDayOfWeek reorders the weekday header row', async () => {
    const page = await newSpecPage({
      components: [MaterialCalendar],
      html: `<material-calendar locale="en-US" first-day-of-week="0" display-month="2024-06"></material-calendar>`,
    });
    const weekdayNames = () => Array.from(page.root!.shadowRoot!.querySelectorAll('.cal__weekday'))
      .map((n) => n.textContent);
    const sunNames = weekdayNames();

    page.rootInstance.firstDayOfWeek = 1;
    await page.waitForChanges();
    const monNames = weekdayNames();

    expect(sunNames).not.toEqual(monNames);
    // Rotating the Sunday-first list by one lands on the Monday-first list.
    expect([...sunNames.slice(1), sunNames[0]]).toEqual(monNames);
  });

  it('dense reflects to a host attribute', async () => {
    const page = await newSpecPage({
      components: [MaterialCalendar],
      html: `<material-calendar dense></material-calendar>`,
    });
    expect(page.root!.hasAttribute('dense')).toBe(true);
  });

  it('clicking a day emits dateSelect with the ISO value and updates value', async () => {
    const page = await newSpecPage({
      components: [MaterialCalendar],
      html: `<material-calendar locale="en-US" first-day-of-week="0" display-month="2024-06"></material-calendar>`,
    });
    const dateSelect = jest.fn();
    page.root!.addEventListener('dateSelect', (e: CustomEvent) => dateSelect(e.detail));
    const btn = page.root!.shadowRoot!.querySelector('button[data-iso="2024-06-15"]') as HTMLButtonElement;
    btn.click();
    await page.waitForChanges();
    expect(dateSelect).toHaveBeenCalledWith({ value: '2024-06-15' });
    expect(page.rootInstance.value).toBe('2024-06-15');
  });

  it('a disabled (out-of-range) day cannot be selected', async () => {
    const page = await newSpecPage({
      components: [MaterialCalendar],
      html: `<material-calendar locale="en-US" first-day-of-week="0" display-month="2024-06" min="2024-06-10"></material-calendar>`,
    });
    const dateSelect = jest.fn();
    page.root!.addEventListener('dateSelect', (e: CustomEvent) => dateSelect(e.detail));
    const btn = page.root!.shadowRoot!.querySelector('button[data-iso="2024-06-05"]') as HTMLButtonElement;
    expect(btn.hasAttribute('disabled')).toBe(true);
    page.rootInstance.selectDate?.('2024-06-05');
    await page.waitForChanges();
    expect(dateSelect).not.toHaveBeenCalled();
  });

  it('range mode: first pick opens the range, second pick closes it in either order, emitting rangeSelect', async () => {
    const page = await newSpecPage({
      components: [MaterialCalendar],
      html: `<material-calendar locale="en-US" first-day-of-week="0" display-month="2024-06" range></material-calendar>`,
    });
    const rangeSelect = jest.fn();
    page.root!.addEventListener('rangeSelect', (e: CustomEvent) => rangeSelect(e.detail));

    const click = (iso: string) => {
      (page.root!.shadowRoot!.querySelector(`button[data-iso="${iso}"]`) as HTMLButtonElement).click();
    };

    click('2024-06-15');
    await page.waitForChanges();
    expect(rangeSelect).toHaveBeenLastCalledWith({ start: '2024-06-15', end: '' });
    expect(page.rootInstance.startValue).toBe('2024-06-15');
    expect(page.rootInstance.endValue).toBe('');

    // Closing the range backwards from the start orders start/end rather
    // than discarding the pick.
    click('2024-06-10');
    await page.waitForChanges();
    expect(rangeSelect).toHaveBeenLastCalledWith({ start: '2024-06-10', end: '2024-06-15' });
  });

  it('clicking the month title toggles the months listbox and back', async () => {
    const page = await newSpecPage({
      components: [MaterialCalendar],
      html: `<material-calendar locale="en-US" display-month="2024-06"></material-calendar>`,
    });
    const sr = page.root!.shadowRoot!;
    const monthBtn = sr.querySelectorAll('.cal__title-btn')[0] as HTMLButtonElement;
    monthBtn.click();
    await page.waitForChanges();
    expect(sr.querySelector('[role="listbox"][aria-label="Select month"]')).not.toBeNull();
    expect(monthBtn.getAttribute('aria-pressed')).toBe('true');

    monthBtn.click();
    await page.waitForChanges();
    expect(sr.querySelector('[role="listbox"][aria-label="Select month"]')).toBeNull();
  });

  it('picking a month sets displayMonth, returns to days, and emits displayMonthChange', async () => {
    const page = await newSpecPage({
      components: [MaterialCalendar],
      html: `<material-calendar locale="en-US" display-month="2024-06"></material-calendar>`,
    });
    const displayMonthChange = jest.fn();
    page.root!.addEventListener('displayMonthChange', (e: CustomEvent) => displayMonthChange(e.detail));
    const sr = page.root!.shadowRoot!;
    (sr.querySelectorAll('.cal__title-btn')[0] as HTMLButtonElement).click();
    await page.waitForChanges();

    const septemberOption = Array.from(sr.querySelectorAll('.cal__list-item'))
      .find((el) => el.textContent === 'September') as HTMLButtonElement;
    septemberOption.click();
    await page.waitForChanges();

    expect(page.rootInstance.displayMonth).toBe('2024-09');
    expect(page.rootInstance.mode).toBe('days');
    expect(displayMonthChange).toHaveBeenCalledWith({ value: '2024-09' });
  });

  it('picking a year sets displayMonth\'s year and returns to days', async () => {
    const page = await newSpecPage({
      components: [MaterialCalendar],
      html: `<material-calendar locale="en-US" display-month="2024-06" min-year="2020" max-year="2026"></material-calendar>`,
    });
    const sr = page.root!.shadowRoot!;
    (sr.querySelectorAll('.cal__title-btn')[1] as HTMLButtonElement).click();
    await page.waitForChanges();
    expect(sr.querySelector('[role="listbox"][aria-label="Select year"]')).not.toBeNull();

    const year2022 = Array.from(sr.querySelectorAll('.cal__year'))
      .find((el) => el.textContent === '2022') as HTMLButtonElement;
    year2022.click();
    await page.waitForChanges();

    expect(page.rootInstance.displayMonth).toBe('2022-06');
    expect(page.rootInstance.mode).toBe('days');
  });

  it('next/prev month nav buttons change displayMonth and emit displayMonthChange', async () => {
    const page = await newSpecPage({
      components: [MaterialCalendar],
      html: `<material-calendar locale="en-US" display-month="2024-06"></material-calendar>`,
    });
    const displayMonthChange = jest.fn();
    page.root!.addEventListener('displayMonthChange', (e: CustomEvent) => displayMonthChange(e.detail));
    const sr = page.root!.shadowRoot!;
    const [prevBtn, nextBtn] = Array.from(sr.querySelectorAll('material-icon-button'));

    (nextBtn as unknown as HTMLElement).click();
    await page.waitForChanges();
    expect(page.rootInstance.displayMonth).toBe('2024-07');
    expect(displayMonthChange).toHaveBeenLastCalledWith({ value: '2024-07' });

    (prevBtn as unknown as HTMLElement).click();
    (prevBtn as unknown as HTMLElement).click();
    await page.waitForChanges();
    expect(page.rootInstance.displayMonth).toBe('2024-05');
  });
});
