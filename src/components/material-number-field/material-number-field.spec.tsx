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
import { MaterialNumberField } from './material-number-field';

describe('material-number-field', () => {
  it('renders a formatted visible value and a canonical hidden input', async () => {
    const page = await newSpecPage({
      components: [MaterialNumberField],
      html: `<material-number-field name="amount" label="Amount" value="12.5" step="0.01" prefix-text="$" suffix="USD"></material-number-field>`,
    });
    const textfield = page.root!.querySelector('material-textfield')!;
    expect(textfield.getAttribute('label')).toBe('Amount');
    expect(textfield.getAttribute('value')).toBe('12.50');
    expect(textfield.getAttribute('leadingtext')).toBe('$');
    expect(textfield.getAttribute('trailingtext')).toBe('USD');

    const hidden = page.root!.querySelector('input[type="hidden"]')! as HTMLInputElement;
    expect(hidden.getAttribute('name')).toBe('amount');
    expect(hidden.value).toBe('12.5');
  });

  it('typing a valid number commits the canonical value and emits valueChange', async () => {
    const page = await newSpecPage({
      components: [MaterialNumberField],
      html: `<material-number-field step="0.01"></material-number-field>`,
    });
    const spy = jest.fn();
    page.root!.addEventListener('valueChange', spy);

    const textfield = page.root!.querySelector('material-textfield')!;
    textfield.dispatchEvent(new CustomEvent('valueChange', {
      detail: { value: '98.765' },
      bubbles: true,
      composed: true,
    }));
    await page.waitForChanges();

    expect(page.rootInstance.value).toBe('98.77');
    expect(page.rootInstance.error).toBe(false);
    expect(spy.mock.calls[0][0].detail).toEqual({ value: '98.77', number: 98.765 });
  });

  it('empty text clears the value and emits null number detail', async () => {
    const page = await newSpecPage({
      components: [MaterialNumberField],
      html: `<material-number-field value="10"></material-number-field>`,
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
    expect(spy.mock.calls[0][0].detail).toEqual({ value: '', number: null });
  });

  it('unparseable text sets an invalid number error without emitting valueChange', async () => {
    const page = await newSpecPage({
      components: [MaterialNumberField],
      html: `<material-number-field invalid-label="Use digits"></material-number-field>`,
    });
    const spy = jest.fn();
    page.root!.addEventListener('valueChange', spy);

    page.root!.querySelector('material-textfield')!.dispatchEvent(new CustomEvent('valueChange', {
      detail: { value: 'abc' },
      bubbles: true,
      composed: true,
    }));
    await page.waitForChanges();

    expect(page.rootInstance.error).toBe(true);
    expect(page.root!.querySelector('material-textfield')!.getAttribute('errortext')).toBe('Use digits');
    expect(spy).not.toHaveBeenCalled();
  });

  it('out-of-range text sets an error and leaves the canonical value untouched', async () => {
    const page = await newSpecPage({
      components: [MaterialNumberField],
      html: `<material-number-field value="5" min="0" max="10"></material-number-field>`,
    });
    const spy = jest.fn();
    page.root!.addEventListener('valueChange', spy);

    page.root!.querySelector('material-textfield')!.dispatchEvent(new CustomEvent('valueChange', {
      detail: { value: '11' },
      bubbles: true,
      composed: true,
    }));
    await page.waitForChanges();

    expect(page.rootInstance.value).toBe('5');
    expect(page.rootInstance.error).toBe(true);
    expect(spy).not.toHaveBeenCalled();
  });

  it('stepper and ArrowUp/ArrowDown nudge within min/max bounds', async () => {
    const page = await newSpecPage({
      components: [MaterialNumberField],
      html: `<material-number-field value="1" min="0" max="2" step="0.5"></material-number-field>`,
    });
    const add = page.root!.querySelector('material-icon-button[icon="add"]') as HTMLElement;
    const remove = page.root!.querySelector('material-icon-button[icon="remove"]') as HTMLElement;

    add.click();
    await page.waitForChanges();
    expect(page.rootInstance.value).toBe('1.5');

    page.root!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    await page.waitForChanges();
    expect(page.rootInstance.value).toBe('2');

    remove.click();
    await page.waitForChanges();
    expect(page.rootInstance.value).toBe('1.5');

    page.root!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await page.waitForChanges();
    expect(page.rootInstance.value).toBe('1');
  });
});
