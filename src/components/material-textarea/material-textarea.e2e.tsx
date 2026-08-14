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

// Real browser, not newSpecPage: material-textarea is formAssociated and
// calls this.internals.setFormValue() unconditionally from connectedCallback.
// Neither Stencil's mock-doc nor jsdom implement ElementInternals'
// form-association methods, so any render of a formAssociated component
// throws outside a real browser — see docs/agents/testing.md.

describe('material-textarea', () => {
  it('renders label/placeholder and reflects the value prop into the inner textarea', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <material-textarea label="Bio" placeholder="Tell us" value="Hi there"></material-textarea>
    `);
    const el = await page.find('material-textarea');
    const textarea = await page.find('material-textarea >>> textarea');
    expect(textarea.getAttribute('placeholder')).toBe('Tell us');
    expect(await el.getProperty('value')).toBe('Hi there');
    expect(await textarea.getProperty('value')).toBe('Hi there');
    const label = await page.find('material-textarea >>> label');
    expect(label).toEqualText('Bio');
  });

  it('disabled prop disables the inner textarea', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-textarea disabled></material-textarea>`);
    const textarea = await page.find('material-textarea >>> textarea');
    expect(textarea.getAttribute('disabled')).not.toBeNull();
  });

  it('required prop reflects onto the host and the inner textarea, and shows the "*" mark', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-textarea label="Bio" required></material-textarea>`);
    const el = await page.find('material-textarea');
    const textarea = await page.find('material-textarea >>> textarea');
    expect(el.getAttribute('required')).not.toBeNull();
    expect(textarea.getAttribute('required')).not.toBeNull();
    const label = await page.find('material-textarea >>> label');
    expect(label).toEqualText('Bio *');
  });

  it('rows prop reflects to the inner textarea', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-textarea rows="6"></material-textarea>`);
    const textarea = await page.find('material-textarea >>> textarea');
    expect(textarea.getAttribute('rows')).toBe('6');
  });

  it('helpText renders as supporting text wired to aria-describedby', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-textarea help-text="A hint"></material-textarea>`);
    const textarea = await page.find('material-textarea >>> textarea');
    expect(textarea.getAttribute('aria-describedby')).toBe('description');
    const description = await page.find('material-textarea >>> #description');
    expect(description).toEqualText('A hint');
  });

  it('error + errorText renders the inline error with aria-invalid and role=alert', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <material-textarea help-text="A hint" error error-text="Too long"></material-textarea>
    `);
    const textarea = await page.find('material-textarea >>> textarea');
    expect(textarea.getAttribute('aria-invalid')).toBe('true');
    const description = await page.find('material-textarea >>> #description');
    expect(description.getAttribute('role')).toBe('alert');
    expect(description).toEqualText('Too long');
  });

  it('maxLength renders a live character counter', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-textarea value="hi" max-length="10"></material-textarea>`);
    const counter = await page.find('material-textarea >>> .counter');
    expect(counter).toEqualText('2/10');
  });

  it('emits valueInput on every input event and valueChange (+ native change) on native change', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-textarea label="Bio"></material-textarea>`);
    const valueInput = await page.spyOnEvent('valueInput');
    const valueChange = await page.spyOnEvent('valueChange');
    const nativeChange = await page.spyOnEvent('change');
    const el = await page.find('material-textarea');
    await page.evaluate(() => {
      const textarea = document
        .querySelector('material-textarea')!
        .shadowRoot!
        .querySelector<HTMLTextAreaElement>('textarea')!;
      for (const char of ['H', 'i']) {
        textarea.value += char;
        textarea.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
      }
    });
    await page.waitForChanges();

    expect(valueInput).toHaveReceivedEventTimes(2);
    expect(valueInput).toHaveReceivedEventDetail({ value: 'Hi' });
    expect(await el.getProperty('value')).toBe('Hi');

    await page.evaluate(() => {
      const textarea = document
        .querySelector('material-textarea')!
        .shadowRoot!
        .querySelector<HTMLTextAreaElement>('textarea')!;
      textarea.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await page.waitForChanges();

    expect(valueChange).toHaveReceivedEventTimes(1);
    expect(valueChange).toHaveReceivedEventDetail({ value: 'Hi' });
    expect(nativeChange).toHaveReceivedEventTimes(1);
  });

  it('form participation: contributes name/value to FormData', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <form id="f"><material-textarea name="bio"></material-textarea></form>
    `);
    const textarea = await page.find('material-textarea >>> textarea');
    const formValue = () =>
      page.evaluate(() =>
        new FormData(document.getElementById('f') as HTMLFormElement).get('bio'));

    expect(await formValue()).toBe('');

    await textarea.click();
    await textarea.type('hello');
    await page.waitForChanges();
    expect(await formValue()).toBe('hello');
  });

  it('a native form reset restores the default value', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <form id="f"><material-textarea name="bio" value="hello"></material-textarea></form>
    `);
    const el = await page.find('material-textarea');
    const textarea = await page.find('material-textarea >>> textarea');

    await textarea.click();
    await textarea.type('!');
    await page.waitForChanges();
    expect(await el.getProperty('value')).toBe('hello!');

    await page.evaluate(() => (document.getElementById('f') as HTMLFormElement).reset());
    await page.waitForChanges();
    expect(await el.getProperty('value')).toBe('hello');
  });

  it('a fieldset disabling the form disables the textarea', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <form><fieldset id="fs"><material-textarea name="x"></material-textarea></fieldset></form>
    `);
    const textarea = await page.find('material-textarea >>> textarea');
    expect(textarea.getAttribute('disabled')).toBeNull();

    await page.evaluate(() => ((document.getElementById('fs') as HTMLFieldSetElement).disabled = true));
    await page.waitForChanges();
    const textareaAfter = await page.find('material-textarea >>> textarea');
    expect(textareaAfter.getAttribute('disabled')).not.toBeNull();
  });

  it('required + empty is invalid; reportValidity() paints the inline MD3 error', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-textarea label="Bio" required></material-textarea>`);
    const el = await page.find('material-textarea');

    expect(await el.callMethod('checkValidity')).toBe(false);

    const reported = await el.callMethod('reportValidity');
    expect(reported).toBe(false);
    await page.waitForChanges();

    const textarea = await page.find('material-textarea >>> textarea');
    expect(textarea.getAttribute('aria-invalid')).toBe('true');
    const description = await page.find('material-textarea >>> #description');
    expect(description.getAttribute('role')).toBe('alert');
  });

  it('setCustomValidity() forces invalid until cleared with an empty string', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-textarea value="x"></material-textarea>`);
    const el = await page.find('material-textarea');
    expect(await el.callMethod('checkValidity')).toBe(true);

    await el.callMethod('setCustomValidity', 'Nope');
    await page.waitForChanges();
    expect(await el.callMethod('checkValidity')).toBe(false);

    await el.callMethod('setCustomValidity', '');
    await page.waitForChanges();
    expect(await el.callMethod('checkValidity')).toBe(true);
  });
});
