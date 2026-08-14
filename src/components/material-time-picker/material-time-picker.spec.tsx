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
import { MaterialTimePicker } from './material-time-picker';

describe('material-time-picker', () => {
  it('renders the dial view with selected hour/minute tiles and a default headline', async () => {
    const page = await newSpecPage({
      components: [MaterialTimePicker],
      html: `<material-time-picker value="08:30" mode="24"></material-time-picker>`,
    });
    expect(page.root!.getAttribute('value')).toBe('08:30');
    expect(page.root!.getAttribute('view')).toBe('dial');
    expect(page.root!.shadowRoot!.querySelector('.tp__headline')!.textContent).toBe('Select time');
    expect(page.root!.shadowRoot!.querySelector('.tp__tile[aria-label="Hour"]')!.textContent).toBe('08');
    expect(page.root!.shadowRoot!.querySelector('.tp__tile[aria-label="Minute"]')!.textContent).toBe('30');
  });

  it('clicking an hour cell changes the hour, emits valueChange and advances to minute editing', async () => {
    const page = await newSpecPage({
      components: [MaterialTimePicker],
      html: `<material-time-picker value="08:30" mode="24"></material-time-picker>`,
    });
    const spy = jest.fn();
    page.root!.addEventListener('valueChange', spy);

    const hourNine = Array.from(page.root!.shadowRoot!.querySelectorAll('.tp__dial-cell'))
      .find((el) => el.textContent === '9') as HTMLElement;
    hourNine.click();
    await page.waitForChanges();

    expect(page.rootInstance.value).toBe('09:30');
    expect(page.rootInstance.editing).toBe('minute');
    expect(spy.mock.calls[0][0].detail).toEqual({ value: '09:30' });
  });

  it('minute dial respects precision steps', async () => {
    const page = await newSpecPage({
      components: [MaterialTimePicker],
      html: `<material-time-picker value="08:00" mode="24" precision="00:15"></material-time-picker>`,
    });
    page.rootInstance.editing = 'minute';
    await page.waitForChanges();

    const minuteButtons = Array.from(page.root!.shadowRoot!.querySelectorAll('.tp__dial-cell')) as HTMLButtonElement[];
    expect(minuteButtons.find((button) => button.textContent === '15')!.hasAttribute('disabled')).toBe(false);
    const spy = jest.fn();
    page.root!.addEventListener('valueChange', spy);

    minuteButtons.find((button) => button.textContent === '15')!.click();
    await page.waitForChanges();

    expect(page.rootInstance.value).toBe('08:15');
    expect(spy.mock.calls[0][0].detail).toEqual({ value: '08:15' });
  });

  it('12-hour mode renders period buttons and toggling PM updates the canonical value', async () => {
    const page = await newSpecPage({
      components: [MaterialTimePicker],
      html: `<material-time-picker value="08:30" mode="12"></material-time-picker>`,
    });
    const pm = Array.from(page.root!.shadowRoot!.querySelectorAll('.tp__period-btn'))
      .find((button) => button.textContent === 'PM') as HTMLElement;

    pm.click();
    await page.waitForChanges();

    expect(page.rootInstance.value).toBe('20:30');
  });

  it('input view edits hour and minute fields through public input controls', async () => {
    const page = await newSpecPage({
      components: [MaterialTimePicker],
      html: `<material-time-picker value="08:30" mode="24" view="input"></material-time-picker>`,
    });
    const [hour, minute] = Array.from(page.root!.shadowRoot!.querySelectorAll('input.tp__input')) as HTMLInputElement[];

    hour.value = '9';
    hour.dispatchEvent(new Event('input', { bubbles: true }));
    await page.waitForChanges();
    minute.value = '45';
    minute.dispatchEvent(new Event('input', { bubbles: true }));
    await page.waitForChanges();

    expect(page.rootInstance.value).toBe('09:45');
  });

  it('footer view toggle emits viewChange and hide-actions removes OK/Cancel buttons', async () => {
    const page = await newSpecPage({
      components: [MaterialTimePicker],
      html: `<material-time-picker value="08:30" hide-actions></material-time-picker>`,
    });
    const viewSpy = jest.fn();
    page.root!.addEventListener('viewChange', viewSpy);

    const toggle = page.root!.shadowRoot!.querySelector('material-icon-button') as HTMLElement;
    toggle.click();
    await page.waitForChanges();

    expect(page.rootInstance.view).toBe('input');
    expect(viewSpy.mock.calls[0][0].detail).toEqual({ view: 'input' });
    expect(page.root!.shadowRoot!.querySelectorAll('material-button').length).toBe(0);
  });

  it('footer buttons emit pickerCancel and pickerOk with the current value', async () => {
    const page = await newSpecPage({
      components: [MaterialTimePicker],
      html: `<material-time-picker value="08:30"></material-time-picker>`,
    });
    const cancelSpy = jest.fn();
    const okSpy = jest.fn();
    page.root!.addEventListener('pickerCancel', cancelSpy);
    page.root!.addEventListener('pickerOk', okSpy);

    const [cancel, ok] = Array.from(page.root!.shadowRoot!.querySelectorAll('material-button')) as HTMLElement[];
    cancel.click();
    ok.click();
    await page.waitForChanges();

    expect(cancelSpy).toHaveBeenCalledTimes(1);
    expect(okSpy.mock.calls[0][0].detail).toEqual({ value: '08:30' });
  });
});
