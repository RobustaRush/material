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

// Real browser, not newSpecPage: material-textfield is formAssociated and
// calls this.internals.setFormValue() unconditionally from connectedCallback.
// Neither Stencil's mock-doc nor jsdom implement ElementInternals'
// form-association methods, so any render of a formAssociated component
// throws outside a real browser — see docs/agents/testing.md.

describe('material-textfield', () => {
  it('renders label/placeholder and reflects the value prop into the inner input', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <material-textfield label="Name" placeholder="Enter name" value="Ada"></material-textfield>
    `);
    const el = await page.find('material-textfield');
    const input = await page.find('material-textfield >>> input');
    expect(input.getAttribute('placeholder')).toBe('Enter name');
    expect(await el.getProperty('value')).toBe('Ada');
    expect(await input.getProperty('value')).toBe('Ada');
    const label = await page.find('material-textfield >>> label');
    expect(label).toEqualText('Name');
  });

  it('disabled prop disables the inner input', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-textfield disabled></material-textfield>`);
    const input = await page.find('material-textfield >>> input');
    expect(input.getAttribute('disabled')).not.toBeNull();
  });

  it('required prop reflects onto the host and the inner input, and shows the "*" mark', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-textfield label="Name" required></material-textfield>`);
    const el = await page.find('material-textfield');
    const input = await page.find('material-textfield >>> input');
    expect(el.getAttribute('required')).not.toBeNull();
    expect(input.getAttribute('required')).not.toBeNull();
    const label = await page.find('material-textfield >>> label');
    expect(label).toEqualText('Name *');
  });

  it('type=email reflects to the inner input', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-textfield type="email"></material-textfield>`);
    const input = await page.find('material-textfield >>> input');
    expect(input.getAttribute('type')).toBe('email');
  });

  it('helpText renders as supporting text wired to aria-describedby', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-textfield help-text="A hint"></material-textfield>`);
    const input = await page.find('material-textfield >>> input');
    expect(input.getAttribute('aria-describedby')).toBe('description');
    const description = await page.find('material-textfield >>> #description');
    expect(description).toEqualText('A hint');
  });

  it('error + errorText renders the inline error with aria-invalid and role=alert', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <material-textfield help-text="A hint" error error-text="Bad value"></material-textfield>
    `);
    const input = await page.find('material-textfield >>> input');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    const description = await page.find('material-textfield >>> #description');
    expect(description.getAttribute('role')).toBe('alert');
    // errorText wins over helpText while in error.
    expect(description).toEqualText('Bad value');
  });

  it('passwordToggle: type=password gets a visibility toggle that flips the input type', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <material-textfield type="password" password-toggle value="secret"></material-textfield>
    `);
    let input = await page.find('material-textfield >>> input');
    expect(input.getAttribute('type')).toBe('password');

    const toggleButton = await page.find('material-textfield >>> material-icon-button >>> button');
    await toggleButton.click();
    await page.waitForChanges();

    input = await page.find('material-textfield >>> input');
    expect(input.getAttribute('type')).toBe('text');
  });

  it('emits valueInput on every keystroke and valueChange (+ native change) when the input commits', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-textfield label="Name"></material-textfield>`);
    const valueInput = await page.spyOnEvent('valueInput');
    const valueChange = await page.spyOnEvent('valueChange');
    const nativeChange = await page.spyOnEvent('change');
    const el = await page.find('material-textfield');
    const input = await page.find('material-textfield >>> input');

    await input.click();
    await input.type('Hi');
    await page.waitForChanges();

    expect(valueInput).toHaveReceivedEventTimes(2);
    expect(valueInput).toHaveReceivedEventDetail({ value: 'Hi' });
    expect(await el.getProperty('value')).toBe('Hi');

    await page.keyboard.press('Tab');
    await page.waitForChanges();

    expect(valueChange).toHaveReceivedEventTimes(1);
    expect(valueChange).toHaveReceivedEventDetail({ value: 'Hi' });
    expect(nativeChange).toHaveReceivedEventTimes(1);
  });

  it('focusInput() focuses the inner input, not a slotted trailing control', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-textfield label="Name"></material-textfield>`);
    const el = await page.find('material-textfield');
    await el.callMethod('focusInput');
    await page.waitForChanges();
    const activeId = await page.evaluate(() =>
      document.querySelector('material-textfield')?.shadowRoot?.activeElement?.id,
    );
    expect(activeId).toBe('input');
  });

  it('select() selects all the text in the input', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-textfield value="abc"></material-textfield>`);
    const el = await page.find('material-textfield');
    await el.callMethod('select');
    await page.waitForChanges();
    const range = await el.callMethod('getSelectionRange');
    expect(range.start).toBe(0);
    expect(range.end).toBe(3);
  });

  it('setSelectionRange()/getSelectionRange() round-trip, and setRangeText() edits value', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-textfield value="Hello world"></material-textfield>`);
    const el = await page.find('material-textfield');

    await el.callMethod('setSelectionRange', 0, 5, 'forward');
    await page.waitForChanges();
    const range = await el.callMethod('getSelectionRange');
    expect(range).toEqual({ start: 0, end: 5, direction: 'forward' });

    await el.callMethod('setRangeText', 'Hi', 0, 5, 'end');
    await page.waitForChanges();
    expect(await el.getProperty('value')).toBe('Hi world');
  });

  it('form participation: contributes name/value to FormData', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <form id="f"><material-textfield name="email"></material-textfield></form>
    `);
    const input = await page.find('material-textfield >>> input');
    const formValue = () =>
      page.evaluate(() =>
        new FormData(document.getElementById('f') as HTMLFormElement).get('email'));

    expect(await formValue()).toBe('');

    await input.click();
    await input.type('a@b.com');
    await page.waitForChanges();
    expect(await formValue()).toBe('a@b.com');
  });

  it('a native form reset restores the default value', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <form id="f"><material-textfield name="email" value="a@b.com"></material-textfield></form>
    `);
    const el = await page.find('material-textfield');
    const input = await page.find('material-textfield >>> input');

    await input.click();
    await input.type('x');
    await page.waitForChanges();
    expect(await el.getProperty('value')).toBe('a@b.comx');

    await page.evaluate(() => (document.getElementById('f') as HTMLFormElement).reset());
    await page.waitForChanges();
    expect(await el.getProperty('value')).toBe('a@b.com');
  });

  it('a fieldset disabling the form disables the textfield', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <form><fieldset id="fs"><material-textfield name="x"></material-textfield></fieldset></form>
    `);
    const input = await page.find('material-textfield >>> input');
    expect(input.getAttribute('disabled')).toBeNull();

    await page.evaluate(() => ((document.getElementById('fs') as HTMLFieldSetElement).disabled = true));
    await page.waitForChanges();
    const inputAfter = await page.find('material-textfield >>> input');
    expect(inputAfter.getAttribute('disabled')).not.toBeNull();
  });

  it('required + empty is invalid; reportValidity() paints the inline MD3 error', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-textfield label="Name" required></material-textfield>`);
    const el = await page.find('material-textfield');

    expect(await el.callMethod('checkValidity')).toBe(false);

    const reported = await el.callMethod('reportValidity');
    expect(reported).toBe(false);
    await page.waitForChanges();

    const input = await page.find('material-textfield >>> input');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    const description = await page.find('material-textfield >>> #description');
    expect(description.getAttribute('role')).toBe('alert');
  });

  it('setCustomValidity() forces invalid until cleared with an empty string', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-textfield value="x"></material-textfield>`);
    const el = await page.find('material-textfield');
    expect(await el.callMethod('checkValidity')).toBe(true);

    await el.callMethod('setCustomValidity', 'Nope');
    await page.waitForChanges();
    expect(await el.callMethod('checkValidity')).toBe(false);

    await el.callMethod('setCustomValidity', '');
    await page.waitForChanges();
    expect(await el.callMethod('checkValidity')).toBe(true);
  });

  it('Enter submits the form when a submit button is present', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <form id="f">
        <material-textfield name="q"></material-textfield>
        <button type="submit">Go</button>
      </form>
    `);
    await page.evaluate(() => {
      (document.getElementById('f') as HTMLFormElement).addEventListener('submit', (e) =>
        e.preventDefault(),
      );
    });
    const submitSpy = await page.spyOnEvent('submit');
    const input = await page.find('material-textfield >>> input');
    await input.click();
    await input.press('Enter');
    await page.waitForChanges();
    expect(submitSpy).toHaveReceivedEventTimes(1);
  });
});
