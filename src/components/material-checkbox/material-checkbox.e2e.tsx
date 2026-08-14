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

// Real browser, not newSpecPage: material-checkbox is formAssociated and
// calls this.internals.setFormValue() unconditionally from connectedCallback.
// Neither Stencil's mock-doc nor jsdom implement ElementInternals'
// form-association methods, so any render of a formAssociated component
// throws outside a real browser — see docs/agents/testing.md.

describe('material-checkbox', () => {
  it('renders unchecked by default with role=checkbox and a fallback aria-label', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-checkbox></material-checkbox>`);
    const button = await page.find('material-checkbox >>> button');
    expect(button.getAttribute('role')).toBe('checkbox');
    expect(button.getAttribute('aria-checked')).toBe('false');
    expect(button.getAttribute('aria-label')).toBe('checkbox');
  });

  it('checked reflects to aria-checked and the host attribute', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-checkbox checked></material-checkbox>`);
    const button = await page.find('material-checkbox >>> button');
    const el = await page.find('material-checkbox');
    expect(button.getAttribute('aria-checked')).toBe('true');
    expect(el.getAttribute('checked')).not.toBeNull();
  });

  it('indeterminate sets aria-checked=mixed', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-checkbox indeterminate></material-checkbox>`);
    const button = await page.find('material-checkbox >>> button');
    expect(button.getAttribute('aria-checked')).toBe('mixed');
  });

  it('disabled disables the inner button and blocks toggling', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-checkbox disabled></material-checkbox>`);
    const el = await page.find('material-checkbox');
    const button = await page.find('material-checkbox >>> button');
    const checkedChange = await page.spyOnEvent('checkedChange');
    expect(button.getAttribute('disabled')).not.toBeNull();

    await button.click();
    await page.waitForChanges();
    expect(await el.getProperty('checked')).toBe(false);
    expect(checkedChange).toHaveReceivedEventTimes(0);
  });

  it('required sets aria-required on the inner button', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-checkbox required></material-checkbox>`);
    const button = await page.find('material-checkbox >>> button');
    expect(button.getAttribute('aria-required')).toBe('true');
  });

  it('label renders the primary label and wires aria-labelledby (no default aria-label)', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-checkbox label="Accept terms"></material-checkbox>`);
    const button = await page.find('material-checkbox >>> button');
    const label = await page.find('material-checkbox >>> #label');
    expect(label).toEqualText('Accept terms');
    expect(button.getAttribute('aria-labelledby')).toBe('label');
    expect(button.getAttribute('aria-label')).toBeNull();
  });

  it('helpText renders as normal sub-text', async () => {
    const page = await newE2EPage();
    await page.setContent(
      `<material-checkbox label="Newsletter" help-text="You can unsubscribe any time"></material-checkbox>`,
    );
    const sub = await page.find('material-checkbox >>> #description');
    expect(sub).toEqualText('You can unsubscribe any time');
    expect(sub.getAttribute('class')).toContain('normal');
  });

  it('error + errorText renders error sub-text and aria-invalid, overriding helpText', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <material-checkbox label="Newsletter" help-text="help" error error-text="Please check this"></material-checkbox>
    `);
    const button = await page.find('material-checkbox >>> button');
    const sub = await page.find('material-checkbox >>> #description');
    expect(button.getAttribute('aria-invalid')).toBe('true');
    expect(sub).toEqualText('Please check this');
    expect(sub.getAttribute('class')).toContain('error');
  });

  it('checkedChange emits on click with the correct detail, toggling checked', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-checkbox></material-checkbox>`);
    const el = await page.find('material-checkbox');
    const button = await page.find('material-checkbox >>> button');
    const checkedChange = await page.spyOnEvent('checkedChange');

    await button.click();
    await page.waitForChanges();
    expect(await el.getProperty('checked')).toBe(true);
    expect(checkedChange).toHaveReceivedEventDetail({ checked: true, indeterminate: false });

    await button.click();
    await page.waitForChanges();
    expect(await el.getProperty('checked')).toBe(false);
    expect(checkedChange).toHaveReceivedEventTimes(2);
  });

  it('checkedChange emits on Space keyboard activation', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-checkbox></material-checkbox>`);
    const el = await page.find('material-checkbox');
    const button = await page.find('material-checkbox >>> button');
    const checkedChange = await page.spyOnEvent('checkedChange');

    await button.press(' ');
    await page.waitForChanges();
    expect(await el.getProperty('checked')).toBe(true);
    expect(checkedChange).toHaveReceivedEventDetail({ checked: true, indeterminate: false });
  });

  it('checkedChange emits on Enter keyboard activation', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-checkbox></material-checkbox>`);
    const el = await page.find('material-checkbox');
    const button = await page.find('material-checkbox >>> button');
    const checkedChange = await page.spyOnEvent('checkedChange');

    await button.press('Enter');
    await page.waitForChanges();
    expect(await el.getProperty('checked')).toBe(true);
    expect(checkedChange).toHaveReceivedEventDetail({ checked: true, indeterminate: false });
  });

  it('toggle() clears indeterminate first, emits checkedChange, and fires native input+change', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-checkbox indeterminate></material-checkbox>`);
    const el = await page.find('material-checkbox');
    const checkedChange = await page.spyOnEvent('checkedChange');
    const inputEvt = await page.spyOnEvent('input');
    const changeEvt = await page.spyOnEvent('change');

    await el.callMethod('toggle');
    await page.waitForChanges();

    expect(await el.getProperty('indeterminate')).toBe(false);
    expect(await el.getProperty('checked')).toBe(true);
    expect(checkedChange).toHaveReceivedEventDetail({ checked: true, indeterminate: false });
    expect(inputEvt).toHaveReceivedEventTimes(1);
    expect(changeEvt).toHaveReceivedEventTimes(1);
  });

  it('toggle() is a no-op while disabled', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-checkbox disabled></material-checkbox>`);
    const el = await page.find('material-checkbox');
    await el.callMethod('toggle');
    await page.waitForChanges();
    expect(await el.getProperty('checked')).toBe(false);
  });

  it('required + unchecked: checkValidity() is false and suppresses the inline error; reportValidity() paints it', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-checkbox required label="Accept terms"></material-checkbox>`);
    const el = await page.find('material-checkbox');

    expect(await el.callMethod('checkValidity')).toBe(false);
    await page.waitForChanges();
    // checkValidity() must not paint the inline error (suppressInvalid guard).
    expect((await page.find('material-checkbox >>> button')).getAttribute('aria-invalid')).toBeNull();

    expect(await el.callMethod('reportValidity')).toBe(false);
    await page.waitForChanges();
    const buttonAfter = await page.find('material-checkbox >>> button');
    expect(buttonAfter.getAttribute('aria-invalid')).toBe('true');
    const sub = await page.find('material-checkbox >>> #description');
    expect((await sub.getProperty('textContent'))?.length).toBeGreaterThan(0);
  });

  it('required + checked satisfies constraint validation', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-checkbox required checked></material-checkbox>`);
    const el = await page.find('material-checkbox');
    expect(await el.callMethod('checkValidity')).toBe(true);
  });

  it('a checked-but-indeterminate box does not satisfy a required constraint', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-checkbox required checked indeterminate></material-checkbox>`);
    const el = await page.find('material-checkbox');
    expect(await el.callMethod('checkValidity')).toBe(false);
  });

  it('setCustomValidity() sets a custom message that checkValidity() honors; clearing it restores validity', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-checkbox checked></material-checkbox>`);
    const el = await page.find('material-checkbox');

    await el.callMethod('setCustomValidity', 'Please agree first');
    await page.waitForChanges();
    expect(await el.callMethod('checkValidity')).toBe(false);
    expect(await el.getProperty('validationMessage')).toBe('Please agree first');

    await el.callMethod('setCustomValidity', '');
    await page.waitForChanges();
    expect(await el.callMethod('checkValidity')).toBe(true);
  });

  it('form participation: contributes name/value only while checked and not indeterminate', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <form id="f"><material-checkbox name="opt" value="yes"></material-checkbox></form>
    `);
    const el = await page.find('material-checkbox');
    const formValue = () =>
      page.evaluate(() => new FormData(document.getElementById('f') as HTMLFormElement).get('opt'));

    expect(await formValue()).toBeNull();

    await el.callMethod('toggle');
    await page.waitForChanges();
    expect(await formValue()).toBe('yes');

    await el.callMethod('toggle');
    await page.waitForChanges();
    expect(await formValue()).toBeNull();
  });

  it('a native form reset restores the default checked/indeterminate state', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <form id="f"><material-checkbox indeterminate name="opt" value="yes"></material-checkbox></form>
    `);
    const el = await page.find('material-checkbox');

    await el.callMethod('toggle');
    await page.waitForChanges();
    expect(await el.getProperty('checked')).toBe(true);
    expect(await el.getProperty('indeterminate')).toBe(false);

    await page.evaluate(() => (document.getElementById('f') as HTMLFormElement).reset());
    await page.waitForChanges();
    expect(await el.getProperty('checked')).toBe(false);
    expect(await el.getProperty('indeterminate')).toBe(true);
  });

  it('a fieldset disabling the form disables the checkbox (formDisabledCallback)', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <form><fieldset id="fs"><material-checkbox></material-checkbox></fieldset></form>
    `);
    const button = await page.find('material-checkbox >>> button');
    expect(button.getAttribute('disabled')).toBeNull();

    await page.evaluate(() => ((document.getElementById('fs') as HTMLFieldSetElement).disabled = true));
    await page.waitForChanges();
    const buttonAfter = await page.find('material-checkbox >>> button');
    expect(buttonAfter.getAttribute('disabled')).not.toBeNull();
  });
});
