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

// Real browser, not newSpecPage: material-switch is formAssociated and
// calls this.internals.setFormValue() unconditionally from connectedCallback.
// Neither Stencil's mock-doc nor jsdom implement ElementInternals'
// form-association methods, so any render of a formAssociated component
// throws outside a real browser — see docs/agents/testing.md.

describe('material-switch', () => {
  it('renders off by default with role=switch and a fallback aria-label', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-switch></material-switch>`);
    const button = await page.find('material-switch >>> button');
    expect(button.getAttribute('role')).toBe('switch');
    expect(button.getAttribute('aria-checked')).toBe('false');
    expect(button.getAttribute('aria-label')).toBe('switch');
  });

  it('checked reflects to aria-checked and the host attribute', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-switch checked></material-switch>`);
    const button = await page.find('material-switch >>> button');
    const el = await page.find('material-switch');
    expect(button.getAttribute('aria-checked')).toBe('true');
    expect(el.getAttribute('checked')).not.toBeNull();
  });

  it('disabled disables the inner button and blocks toggling', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-switch disabled></material-switch>`);
    const el = await page.find('material-switch');
    const button = await page.find('material-switch >>> button');
    const checkedChange = await page.spyOnEvent('checkedChange');
    expect(button.getAttribute('disabled')).not.toBeNull();

    await button.click();
    await page.waitForChanges();
    expect(await el.getProperty('checked')).toBe(false);
    expect(checkedChange).toHaveReceivedEventTimes(0);
  });

  it('readonly blocks toggling but leaves the button enabled', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-switch readonly></material-switch>`);
    const el = await page.find('material-switch');
    const button = await page.find('material-switch >>> button');
    expect(button.getAttribute('disabled')).toBeNull();
    expect(button.getAttribute('aria-readonly')).toBe('true');

    await button.click();
    await page.waitForChanges();
    expect(await el.getProperty('checked')).toBe(false);
  });

  it('required sets aria-required on the inner button', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-switch required></material-switch>`);
    const button = await page.find('material-switch >>> button');
    expect(button.getAttribute('aria-required')).toBe('true');
  });

  it('value is the form-value contributed while checked', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <form id="f"><material-switch name="opt" value="enabled"></material-switch></form>
    `);
    const button = await page.find('material-switch >>> button');
    const formValue = () =>
      page.evaluate(() => new FormData(document.getElementById('f') as HTMLFormElement).get('opt'));

    expect(await formValue()).toBeNull();
    await button.click();
    await page.waitForChanges();
    expect(await formValue()).toBe('enabled');
  });

  it('name participates in FormData under the given key', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <form id="f"><material-switch checked name="feature-flag"></material-switch></form>
    `);
    const value = await page.evaluate(
      () => new FormData(document.getElementById('f') as HTMLFormElement).get('feature-flag'),
    );
    expect(value).toBe('on');
  });

  it('label renders and wires aria-labelledby (no default aria-label)', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-switch label="Dark mode"></material-switch>`);
    const button = await page.find('material-switch >>> button');
    const label = await page.find('material-switch >>> #label');
    expect(label).toEqualText('Dark mode');
    expect(button.getAttribute('aria-labelledby')).toBe('label');
    expect(button.getAttribute('aria-label')).toBeNull();
  });

  it('helpText renders as subtext; errorText replaces it when error is set', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <material-switch label="Wifi" help-text="Uses more battery" error error-text="Turn it back on"></material-switch>
    `);
    const button = await page.find('material-switch >>> button');
    const sub = await page.find('material-switch >>> #sub');
    expect(sub).toEqualText('Turn it back on');
    expect(button.getAttribute('aria-invalid')).toBe('true');
  });

  it('checkedChange emits on click with the correct detail, toggling checked', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-switch></material-switch>`);
    const el = await page.find('material-switch');
    const button = await page.find('material-switch >>> button');
    const checkedChange = await page.spyOnEvent('checkedChange');

    await button.click();
    await page.waitForChanges();
    expect(await el.getProperty('checked')).toBe(true);
    expect(checkedChange).toHaveReceivedEventDetail({ checked: true });

    await button.click();
    await page.waitForChanges();
    expect(await el.getProperty('checked')).toBe(false);
    expect(checkedChange).toHaveReceivedEventTimes(2);
  });

  it('checkedChange emits on Space keyboard activation', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-switch></material-switch>`);
    const el = await page.find('material-switch');
    const button = await page.find('material-switch >>> button');
    const checkedChange = await page.spyOnEvent('checkedChange');

    await button.press(' ');
    await page.waitForChanges();
    expect(await el.getProperty('checked')).toBe(true);
    expect(checkedChange).toHaveReceivedEventDetail({ checked: true });
  });

  it('checkedChange emits on Enter keyboard activation and fires native input+change', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-switch></material-switch>`);
    const el = await page.find('material-switch');
    const button = await page.find('material-switch >>> button');
    const checkedChange = await page.spyOnEvent('checkedChange');
    const inputEvt = await page.spyOnEvent('input');
    const changeEvt = await page.spyOnEvent('change');

    await button.press('Enter');
    await page.waitForChanges();
    expect(await el.getProperty('checked')).toBe(true);
    expect(checkedChange).toHaveReceivedEventDetail({ checked: true });
    expect(inputEvt).toHaveReceivedEventTimes(1);
    expect(changeEvt).toHaveReceivedEventTimes(1);
  });

  it('a native form reset restores the default checked state', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <form id="f"><material-switch checked name="opt" value="yes"></material-switch></form>
    `);
    const el = await page.find('material-switch');
    const button = await page.find('material-switch >>> button');

    await button.click();
    await page.waitForChanges();
    expect(await el.getProperty('checked')).toBe(false);

    await page.evaluate(() => (document.getElementById('f') as HTMLFormElement).reset());
    await page.waitForChanges();
    expect(await el.getProperty('checked')).toBe(true);
  });

  it('a fieldset disabling the form disables the switch (formDisabledCallback)', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <form><fieldset id="fs"><material-switch></material-switch></fieldset></form>
    `);
    const button = await page.find('material-switch >>> button');
    expect(button.getAttribute('disabled')).toBeNull();

    await page.evaluate(() => ((document.getElementById('fs') as HTMLFieldSetElement).disabled = true));
    await page.waitForChanges();
    const buttonAfter = await page.find('material-switch >>> button');
    expect(buttonAfter.getAttribute('disabled')).not.toBeNull();
  });

  it('required + unchecked fails the form-level constraint; checking it satisfies it', async () => {
    // material-switch exposes no checkValidity/reportValidity/setCustomValidity
    // @Method (unlike material-checkbox/-radio-group) — its internals.setValidity
    // contribution is only observable through the owning <form>'s own validity.
    const page = await newE2EPage();
    await page.setContent(`
      <form id="f"><material-switch required name="opt"></material-switch></form>
    `);
    const el = await page.find('material-switch');
    const button = await page.find('material-switch >>> button');
    const formValid = () => page.evaluate(() => (document.getElementById('f') as HTMLFormElement).checkValidity());

    expect(await formValid()).toBe(false);

    await button.click();
    await page.waitForChanges();
    expect(await el.getProperty('checked')).toBe(true);
    expect(await formValid()).toBe(true);
  });
});
