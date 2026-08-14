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
import { MaterialDateRangeField } from './material-date-range-field';

describe('material-date-range-field', () => {
  it('renders a read-only textfield and two hidden ISO inputs', async () => {
    const page = await newSpecPage({
      components: [MaterialDateRangeField],
      html: `<material-date-range-field label="Period" start-name="from" end-name="to" start-value="2024-03-01" end-value="2024-03-31" format="%Y-%m-%d"></material-date-range-field>`,
    });
    const textfield = page.root!.querySelector('material-textfield')!;
    expect(textfield.getAttribute('label')).toBe('Period');
    expect(textfield.getAttribute('readonly')).not.toBeNull();
    expect(textfield.getAttribute('value')).toBe('2024-03-01 – 2024-03-31');

    const inputs = Array.from(page.root!.querySelectorAll('input[type="hidden"]')) as HTMLInputElement[];
    expect(inputs.map((input) => [input.name, input.value])).toEqual([
      ['from', '2024-03-01'],
      ['to', '2024-03-31'],
    ]);
  });

  it('partial ranges render ellipsis placeholders', async () => {
    const page = await newSpecPage({
      components: [MaterialDateRangeField],
      html: `<material-date-range-field start-value="2024-03-01" format="%Y-%m-%d"></material-date-range-field>`,
    });
    expect(page.root!.querySelector('material-textfield')!.getAttribute('value')).toBe('2024-03-01 – …');
  });

  it('calendar rangeSelect stages pending values; OK commits and emits valueChange', async () => {
    const page = await newSpecPage({
      components: [MaterialDateRangeField],
      html: `<material-date-range-field format="%Y-%m-%d"></material-date-range-field>`,
    });
    const spy = jest.fn();
    page.root!.addEventListener('valueChange', spy);

    const calendar = page.root!.querySelector('material-calendar')!;
    calendar.dispatchEvent(new CustomEvent('rangeSelect', {
      detail: { start: '2024-04-01', end: '2024-04-07' },
      bubbles: true,
      composed: true,
    }));
    await page.waitForChanges();

    expect(page.rootInstance.startValue).toBe('');
    expect(page.rootInstance.pendingStart).toBe('2024-04-01');

    const ok = page.root!.querySelector('material-button[variant="filled"]') as HTMLElement;
    ok.click();
    await page.waitForChanges();

    expect(page.rootInstance.startValue).toBe('2024-04-01');
    expect(page.rootInstance.endValue).toBe('2024-04-07');
    expect(spy.mock.calls[0][0].detail).toEqual({ start: '2024-04-01', end: '2024-04-07' });
  });

  it('OK is disabled until both pending dates are present and does not commit partial ranges', async () => {
    const page = await newSpecPage({
      components: [MaterialDateRangeField],
      html: `<material-date-range-field></material-date-range-field>`,
    });
    const ok = page.root!.querySelector('material-button[variant="filled"]')!;
    expect(ok.getAttribute('disabled')).not.toBeNull();

    page.root!.querySelector('material-calendar')!.dispatchEvent(new CustomEvent('rangeSelect', {
      detail: { start: '2024-04-01', end: '' },
      bubbles: true,
      composed: true,
    }));
    await page.waitForChanges();

    expect(page.rootInstance.startValue).toBe('');
  });

  it('clearable renders a clear button that clears both values and emits', async () => {
    const page = await newSpecPage({
      components: [MaterialDateRangeField],
      html: `<material-date-range-field clearable start-value="2024-03-01" end-value="2024-03-31"></material-date-range-field>`,
    });
    const spy = jest.fn();
    page.root!.addEventListener('valueChange', spy);

    const clear = page.root!.querySelector('material-icon-button[icon="close"]') as HTMLElement;
    expect(clear).not.toBeNull();
    clear.click();
    await page.waitForChanges();

    expect(page.rootInstance.startValue).toBe('');
    expect(page.rootInstance.endValue).toBe('');
    expect(spy.mock.calls[0][0].detail).toEqual({ start: '', end: '' });
  });
});
