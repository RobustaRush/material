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
import { MaterialTimeField } from './material-time-field';

describe('material-time-field', () => {
  it('renders a textfield, hidden input, picker dialog and accessible trigger', async () => {
    const page = await newSpecPage({
      components: [MaterialTimeField],
      html: `<material-time-field name="starts_at" label="Starts" value="13:45" format="%H:%M" open-label="Choose time"></material-time-field>`,
    });
    const textfield = page.root!.querySelector('material-textfield')!;
    expect(textfield.getAttribute('label')).toBe('Starts');
    expect(textfield.getAttribute('value')).toBe('13:45');
    expect(page.root!.querySelector('material-dialog')).not.toBeNull();
    expect(page.root!.querySelector('material-time-picker')).not.toBeNull();
    expect(page.root!.querySelector('material-icon-button[icon="schedule"]')!.getAttribute('aria-label')).toBe('Choose time');

    const hidden = page.root!.querySelector('input[type="hidden"]')! as HTMLInputElement;
    expect(hidden.getAttribute('name')).toBe('starts_at');
    expect(hidden.value).toBe('13:45');
  });

  it('manual text entry commits an ISO HH:MM value and emits valueChange', async () => {
    const page = await newSpecPage({
      components: [MaterialTimeField],
      html: `<material-time-field format="%H:%M"></material-time-field>`,
    });
    const spy = jest.fn();
    page.root!.addEventListener('valueChange', spy);

    page.root!.querySelector('material-textfield')!.dispatchEvent(new CustomEvent('valueChange', {
      detail: { value: '09:30' },
      bubbles: true,
      composed: true,
    }));
    await page.waitForChanges();

    expect(page.rootInstance.value).toBe('09:30');
    expect(spy.mock.calls[0][0].detail).toEqual({ value: '09:30' });
  });

  it('empty manual text clears the value', async () => {
    const page = await newSpecPage({
      components: [MaterialTimeField],
      html: `<material-time-field value="09:30"></material-time-field>`,
    });
    const spy = jest.fn();
    page.root!.addEventListener('valueChange', spy);

    page.root!.querySelector('material-textfield')!.dispatchEvent(new CustomEvent('valueChange', {
      detail: { value: '' },
      bubbles: true,
      composed: true,
    }));
    await page.waitForChanges();

    expect(page.rootInstance.value).toBe('');
    expect(spy.mock.calls[0][0].detail).toEqual({ value: '' });
  });

  it('rejects manual text outside min/max or precision without emitting valueChange', async () => {
    const page = await newSpecPage({
      components: [MaterialTimeField],
      html: `<material-time-field minimum="09:00" maximum="17:00" precision="00:15" invalid-label="Invalid slot"></material-time-field>`,
    });
    const spy = jest.fn();
    page.root!.addEventListener('valueChange', spy);
    const textfield = page.root!.querySelector('material-textfield')!;

    textfield.dispatchEvent(new CustomEvent('valueChange', {
      detail: { value: '08:30' },
      bubbles: true,
      composed: true,
    }));
    await page.waitForChanges();

    expect(page.rootInstance.error).toBe(true);
    expect(page.root!.querySelector('material-textfield')!.getAttribute('errortext')).toBe('Invalid slot');
    expect(spy).not.toHaveBeenCalled();
  });

  it('picker valueChange only stages pending value until OK commits it', async () => {
    const page = await newSpecPage({
      components: [MaterialTimeField],
      html: `<material-time-field value="09:00"></material-time-field>`,
    });
    const spy = jest.fn();
    page.root!.addEventListener('valueChange', spy);

    const picker = page.root!.querySelector('material-time-picker')!;
    picker.dispatchEvent(new CustomEvent('valueChange', {
      detail: { value: '10:15' },
      bubbles: true,
      composed: true,
    }));
    await page.waitForChanges();

    expect(page.rootInstance.value).toBe('09:00');
    expect(page.rootInstance.pending).toBe('10:15');
    expect(spy).not.toHaveBeenCalled();

    const ok = page.root!.querySelector('material-button[variant="filled"]') as HTMLElement;
    ok.click();
    await page.waitForChanges();

    expect(page.rootInstance.value).toBe('10:15');
    expect(spy.mock.calls[0][0].detail).toEqual({ value: '10:15' });
  });
});
