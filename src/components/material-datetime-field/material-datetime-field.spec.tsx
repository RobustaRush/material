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
import { MaterialDatetimeField } from './material-datetime-field';

describe('material-datetime-field', () => {
  it('renders a textfield, hidden input, calendar and time picker', async () => {
    const page = await newSpecPage({
      components: [MaterialDatetimeField],
      html: `<material-datetime-field name="starts_at" label="Starts" value="2024-03-15T14:30" format="%Y-%m-%d %H:%M" open-label="Choose date and time"></material-datetime-field>`,
    });
    const textfield = page.root!.querySelector('material-textfield')!;
    expect(textfield.getAttribute('label')).toBe('Starts');
    expect(textfield.getAttribute('value')).toBe('2024-03-15 14:30');
    expect(page.root!.querySelector('material-calendar')).not.toBeNull();
    expect(page.root!.querySelector('material-time-picker')).not.toBeNull();
    expect(page.root!.querySelector('material-icon-button[icon="event"]')!.getAttribute('aria-label')).toBe('Choose date and time');

    const hidden = page.root!.querySelector('input[type="hidden"]')! as HTMLInputElement;
    expect(hidden.getAttribute('name')).toBe('starts_at');
    expect(hidden.value).toBe('2024-03-15T14:30');
  });

  it('manual text entry commits an ISO datetime and emits valueChange', async () => {
    const page = await newSpecPage({
      components: [MaterialDatetimeField],
      html: `<material-datetime-field format="%Y-%m-%d %H:%M"></material-datetime-field>`,
    });
    page.rootInstance.inputFormats = ['%Y-%m-%d %H:%M'];
    const spy = jest.fn();
    page.root!.addEventListener('valueChange', spy);

    page.root!.querySelector('material-textfield')!.dispatchEvent(new CustomEvent('valueChange', {
      detail: { value: '2024-03-15 14:30' },
      bubbles: true,
      composed: true,
    }));
    await page.waitForChanges();

    expect(page.rootInstance.value).toBe('2024-03-15T14:30');
    expect(spy.mock.calls[0][0].detail).toEqual({ value: '2024-03-15T14:30' });
  });

  it('invalid manual text sets the invalidLabel and leaves valueChange silent', async () => {
    const page = await newSpecPage({
      components: [MaterialDatetimeField],
      html: `<material-datetime-field invalid-label="Bad datetime"></material-datetime-field>`,
    });
    const spy = jest.fn();
    page.root!.addEventListener('valueChange', spy);

    page.root!.querySelector('material-textfield')!.dispatchEvent(new CustomEvent('valueChange', {
      detail: { value: 'tomorrow-ish' },
      bubbles: true,
      composed: true,
    }));
    await page.waitForChanges();

    expect(page.rootInstance.error).toBe(true);
    expect(page.root!.querySelector('material-textfield')!.getAttribute('errortext')).toBe('Bad datetime');
    expect(spy).not.toHaveBeenCalled();
  });

  it('calendar/time picker changes are staged until OK commits both pieces', async () => {
    const page = await newSpecPage({
      components: [MaterialDatetimeField],
      html: `<material-datetime-field value="2024-03-15T09:00"></material-datetime-field>`,
    });
    const spy = jest.fn();
    page.root!.addEventListener('valueChange', spy);

    page.root!.querySelector('material-calendar')!.dispatchEvent(new CustomEvent('dateSelect', {
      detail: { value: '2024-03-20' },
      bubbles: true,
      composed: true,
    }));
    page.root!.querySelector('material-time-picker')!.dispatchEvent(new CustomEvent('valueChange', {
      detail: { value: '10:15' },
      bubbles: true,
      composed: true,
    }));
    await page.waitForChanges();

    expect(page.rootInstance.value).toBe('2024-03-15T09:00');
    expect(page.rootInstance.pendingDate).toBe('2024-03-20');
    expect(page.rootInstance.pendingTime).toBe('10:15');

    const ok = page.root!.querySelector('material-button[variant="filled"]') as HTMLElement;
    ok.click();
    await page.waitForChanges();

    expect(page.rootInstance.value).toBe('2024-03-20T10:15');
    expect(spy.mock.calls[0][0].detail).toEqual({ value: '2024-03-20T10:15' });
  });

  it('the footer toggle swaps the visible date/time picker views', async () => {
    const page = await newSpecPage({
      components: [MaterialDatetimeField],
      html: `<material-datetime-field></material-datetime-field>`,
    });
    expect(page.rootInstance.view).toBe('date');
    expect(page.root!.querySelector('material-calendar')!.hasAttribute('hidden')).toBe(false);
    expect(page.root!.querySelector('material-time-picker')!.hasAttribute('hidden')).toBe(true);

    const toggle = page.root!.querySelector('.dtf__actions material-icon-button') as HTMLElement;
    toggle.click();
    await page.waitForChanges();

    expect(page.rootInstance.view).toBe('time');
    expect(page.root!.querySelector('material-calendar')!.hasAttribute('hidden')).toBe(true);
    expect(page.root!.querySelector('material-time-picker')!.hasAttribute('hidden')).toBe(false);
  });
});
