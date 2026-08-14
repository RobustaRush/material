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
import { MaterialMaskedField } from './material-masked-field';

describe('material-masked-field', () => {
  it('renders a textfield and hidden input, normalizing the initial value through the mask', async () => {
    const page = await newSpecPage({
      components: [MaterialMaskedField],
      html: `<material-masked-field name="phone" label="Phone" mask="+7 (###) ###-##-##" value="9161234567"></material-masked-field>`,
    });
    const textfield = page.root!.querySelector('material-textfield')!;
    expect(textfield.getAttribute('label')).toBe('Phone');
    expect(textfield.getAttribute('value')).toBe('+7 (916) 123-45-67');
    expect(textfield.getAttribute('placeholder')).toBe('+7 (___) ___-__-__');

    const hidden = page.root!.querySelector('input[type="hidden"]')! as HTMLInputElement;
    expect(hidden.getAttribute('name')).toBe('phone');
    expect(hidden.value).toBe('+7 (916) 123-45-67');
  });

  it('unmask posts the raw token characters while the displayed value stays formatted', async () => {
    const page = await newSpecPage({
      components: [MaterialMaskedField],
      html: `<material-masked-field name="phone" mask="+7 (###) ###-##-##" value="9161234567" unmask></material-masked-field>`,
    });
    const hidden = page.root!.querySelector('input[type="hidden"]')! as HTMLInputElement;
    expect(page.rootInstance.value).toBe('+7 (916) 123-45-67');
    expect(hidden.value).toBe('9161234567');
  });

  it('typing formats accepted token characters and emits valueChange with formatted/raw/complete detail', async () => {
    const page = await newSpecPage({
      components: [MaterialMaskedField],
      html: `<material-masked-field mask="AA-###"></material-masked-field>`,
    });
    const spy = jest.fn();
    page.root!.addEventListener('valueChange', spy);

    const textfield = page.root!.querySelector('material-textfield')!;
    textfield.dispatchEvent(new CustomEvent('valueInput', {
      detail: { value: 'ab123' },
      bubbles: true,
      composed: true,
    }));
    await page.waitForChanges();

    expect(page.rootInstance.value).toBe('ab-123');
    expect(spy.mock.calls[0][0].detail).toEqual({
      value: 'ab-123',
      raw: 'ab123',
      complete: true,
    });
  });

  it('drops characters that do not fit the next mask token', async () => {
    const page = await newSpecPage({
      components: [MaterialMaskedField],
      html: `<material-masked-field mask="###"></material-masked-field>`,
    });
    const textfield = page.root!.querySelector('material-textfield')!;

    textfield.dispatchEvent(new CustomEvent('valueInput', {
      detail: { value: 'a1b2c3' },
      bubbles: true,
      composed: true,
    }));
    await page.waitForChanges();

    expect(page.rootInstance.value).toBe('123');
  });

  it('blur with an incomplete value sets an error and uses the custom incompleteLabel', async () => {
    const page = await newSpecPage({
      components: [MaterialMaskedField],
      html: `<material-masked-field mask="###-###" incomplete-label="Finish the code"></material-masked-field>`,
    });
    const textfield = page.root!.querySelector('material-textfield')!;

    textfield.dispatchEvent(new CustomEvent('valueInput', {
      detail: { value: '123' },
      bubbles: true,
      composed: true,
    }));
    await page.waitForChanges();
    textfield.dispatchEvent(new CustomEvent('valueChange', {
      detail: { value: '123' },
      bubbles: true,
      composed: true,
    }));
    await page.waitForChanges();

    expect(page.rootInstance.error).toBe(true);
    expect(page.root!.querySelector('material-textfield')!.getAttribute('errortext')).toBe('Finish the code');
  });

  it('forwards disabled/required/readOnly/helpText/errorText to the inner textfield', async () => {
    const page = await newSpecPage({
      components: [MaterialMaskedField],
      html: `<material-masked-field mask="###" disabled required readonly help-text="Help" error error-text="Bad"></material-masked-field>`,
    });
    const textfield = page.root!.querySelector('material-textfield')!;
    expect(textfield.getAttribute('disabled')).not.toBeNull();
    expect(textfield.getAttribute('required')).not.toBeNull();
    expect(textfield.getAttribute('readonly')).not.toBeNull();
    expect(textfield.getAttribute('error')).not.toBeNull();
    expect(textfield.getAttribute('errortext')).toBe('Bad');
  });
});
