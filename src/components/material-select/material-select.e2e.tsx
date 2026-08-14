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

// Real browser, not newSpecPage: material-select is formAssociated and calls
// this.internals.setFormValue() unconditionally from connectedCallback.
// Neither Stencil's mock-doc nor jsdom implement ElementInternals'
// form-association methods, so any render of a formAssociated component
// throws outside a real browser — see docs/agents/testing.md.
//
// The menu popup uses the native Popover API — `[popover]` content is
// `display: none` (and un-clickable) until shown, so tests open the menu
// (click the trigger, or an open key) before interacting with an option.

const nextFrame = (page: any) =>
  page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => resolve(null))));

const SINGLE = `
  <material-select label="Country" name="country">
    <material-option value="us">United States</material-option>
    <material-option value="ca">Canada</material-option>
    <material-option value="br" disabled>Brazil</material-option>
  </material-select>
`;

const MULTI = `
  <material-select label="Toppings" name="toppings" multiple>
    <material-option value="cheese">Cheese</material-option>
    <material-option value="olives">Olives</material-option>
    <material-option value="onion">Onion</material-option>
  </material-select>
`;

describe('material-select (single)', () => {
  it('renders the label/placeholder through the nested textfield, with a combobox role', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <material-select label="Country" placeholder="Pick one" name="country">
        <material-option value="us">United States</material-option>
      </material-select>
    `);
    const label = await page.find('material-select >>> material-textfield >>> label');
    expect(label).toEqualText('Country');
    const input = await page.find('material-select >>> material-textfield >>> input');
    expect(input.getAttribute('placeholder')).toBe('Pick one');
    expect(input.getAttribute('role')).toBe('combobox');
    expect(input.getAttribute('aria-haspopup')).toBe('listbox');
    expect(input.getAttribute('aria-expanded')).toBe('false');
  });

  it('value prop pre-selects the matching option and shows its label in the trigger', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <material-select label="Country" value="ca">
        <material-option value="us">United States</material-option>
        <material-option value="ca">Canada</material-option>
      </material-select>
    `);
    const input = await page.find('material-select >>> material-textfield >>> input');
    expect(await input.getProperty('value')).toBe('Canada');
    const option = await page.find('material-select material-option[value="ca"]');
    expect(await option.getProperty('selected')).toBe(true);
  });

  it('disabled prop disables the trigger', async () => {
    const page = await newE2EPage();
    await page.setContent(SINGLE.replace('<material-select label', '<material-select disabled label'));
    const input = await page.find('material-select >>> material-textfield >>> input');
    expect(input.getAttribute('disabled')).not.toBeNull();
  });

  it('required prop shows the "*" mark on the nested label', async () => {
    const page = await newE2EPage();
    await page.setContent(SINGLE.replace('<material-select label', '<material-select required label'));
    const label = await page.find('material-select >>> material-textfield >>> label');
    expect(label).toEqualText('Country *');
  });

  it('helpText/errorText delegate to the nested textfield', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <material-select label="Country" help-text="pick your country" error error-text="Required">
        <material-option value="us">United States</material-option>
      </material-select>
    `);
    const description = await page.find('material-select >>> material-textfield >>> #description');
    expect(description).toEqualText('Required');
    const input = await page.find('material-select >>> material-textfield >>> input');
    expect(input.getAttribute('aria-invalid')).toBe('true');
  });

  it('clicking the trigger opens the menu; clicking an option commits the value and closes it', async () => {
    const page = await newE2EPage();
    await page.setContent(SINGLE);
    const valueChange = await page.spyOnEvent('valueChange');
    const openChange = await page.spyOnEvent('openChange');
    const shellRow = await page.find('material-select >>> material-textfield');
    const input = await page.find('material-select >>> material-textfield >>> input');

    await shellRow.click();
    await page.waitForChanges();
    expect(input.getAttribute('aria-expanded')).toBe('true');
    expect(openChange).toHaveReceivedEventDetail({ open: true });

    const option = await page.find('material-select material-option[value="ca"]');
    await option.click();
    await page.waitForChanges();

    expect(valueChange).toHaveReceivedEventDetail({ value: 'ca', values: ['ca'] });
    const el = await page.find('material-select');
    expect(await el.getProperty('value')).toBe('ca');
    expect(input.getAttribute('aria-expanded')).toBe('false');
  });

  it('a disabled option cannot be selected by click', async () => {
    const page = await newE2EPage();
    await page.setContent(SINGLE);
    const valueChange = await page.spyOnEvent('valueChange');
    const shellRow = await page.find('material-select >>> material-textfield');
    await shellRow.click();
    await page.waitForChanges();

    const disabledOption = await page.find('material-select material-option[value="br"]');
    expect(disabledOption.getAttribute('aria-disabled')).toBe('true');
    // A disabled option's row ignores the click entirely (no-op in
    // material-option's own `activate()`), so no value/menu-state change.
    await disabledOption.click();
    await page.waitForChanges();
    expect(valueChange).toHaveReceivedEventTimes(0);
  });

  it('ArrowDown on the closed trigger opens the menu and focuses the first option', async () => {
    const page = await newE2EPage();
    await page.setContent(SINGLE);
    const input = await page.find('material-select >>> material-textfield >>> input');

    await input.focus();
    await input.press('ArrowDown');
    await page.waitForChanges();
    expect(input.getAttribute('aria-expanded')).toBe('true');
    await nextFrame(page);

    const activeValue = await page.evaluate(() =>
      (document.activeElement as HTMLElement | null)?.getAttribute('value'),
    );
    expect(activeValue).toBe('us');
  });

  it('form participation: contributes the selected option value to FormData', async () => {
    const page = await newE2EPage();
    await page.setContent(`<form id="f">${SINGLE}</form>`);
    const formValue = () =>
      page.evaluate(() =>
        new FormData(document.getElementById('f') as HTMLFormElement).get('country'));
    expect(await formValue()).toBe('');

    const shellRow = await page.find('material-select >>> material-textfield');
    await shellRow.click();
    await page.waitForChanges();
    const option = await page.find('material-select material-option[value="us"]');
    await option.click();
    await page.waitForChanges();

    expect(await formValue()).toBe('us');
  });

  it('a native form reset restores the default value', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <form id="f">
        <material-select label="Country" name="country" value="us">
          <material-option value="us">United States</material-option>
          <material-option value="ca">Canada</material-option>
        </material-select>
      </form>
    `);
    const el = await page.find('material-select');
    const shellRow = await page.find('material-select >>> material-textfield');
    await shellRow.click();
    await page.waitForChanges();
    const option = await page.find('material-select material-option[value="ca"]');
    await option.click();
    await page.waitForChanges();
    expect(await el.getProperty('value')).toBe('ca');

    await page.evaluate(() => (document.getElementById('f') as HTMLFormElement).reset());
    await page.waitForChanges();
    expect(await el.getProperty('value')).toBe('us');
  });

  it('a fieldset disabling the form disables the select', async () => {
    const page = await newE2EPage();
    await page.setContent(`<form><fieldset id="fs">${SINGLE}</fieldset></form>`);
    const input = await page.find('material-select >>> material-textfield >>> input');
    expect(input.getAttribute('disabled')).toBeNull();

    await page.evaluate(() => ((document.getElementById('fs') as HTMLFieldSetElement).disabled = true));
    await page.waitForChanges();
    const inputAfter = await page.find('material-select >>> material-textfield >>> input');
    expect(inputAfter.getAttribute('disabled')).not.toBeNull();
  });

  it('required + no selection is invalid; reportValidity() paints the inline MD3 error', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <material-select label="Country" required>
        <material-option value="us">United States</material-option>
      </material-select>
    `);
    const el = await page.find('material-select');
    expect(await el.callMethod('checkValidity')).toBe(false);

    const reported = await el.callMethod('reportValidity');
    expect(reported).toBe(false);
    await page.waitForChanges();

    const input = await page.find('material-select >>> material-textfield >>> input');
    expect(input.getAttribute('aria-invalid')).toBe('true');
  });

  it('setCustomValidity() forces invalid until cleared with an empty string', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <material-select label="Country" value="us">
        <material-option value="us">United States</material-option>
      </material-select>
    `);
    const el = await page.find('material-select');
    expect(await el.callMethod('checkValidity')).toBe(true);

    await el.callMethod('setCustomValidity', 'Nope');
    await page.waitForChanges();
    expect(await el.callMethod('checkValidity')).toBe(false);

    await el.callMethod('setCustomValidity', '');
    await page.waitForChanges();
    expect(await el.callMethod('checkValidity')).toBe(true);
  });
});

describe('material-select (multiple)', () => {
  it('multiple renders a chip shell with role=combobox and no nested textfield', async () => {
    const page = await newE2EPage();
    await page.setContent(MULTI);
    const shell = await page.find('material-select >>> [role="combobox"]');
    expect(shell.getAttribute('aria-haspopup')).toBe('listbox');
    const textfield = await page.find('material-select >>> material-textfield');
    expect(textfield).toBeNull();
  });

  it('values prop pre-selects options and renders a chip per selection', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <material-select label="Toppings" multiple>
        <material-option value="cheese">Cheese</material-option>
        <material-option value="olives">Olives</material-option>
      </material-select>
    `);
    const el = await page.find('material-select');
    await el.setProperty('values', ['cheese']);
    await page.waitForChanges();
    const chips = await page.findAll('material-select >>> .chip');
    expect(chips.length).toBe(1);
    const label = await page.find('material-select >>> .chip-label');
    expect(label).toEqualText('Cheese');
  });

  it('clicking two options toggles them into `values`/`value` and keeps the menu open', async () => {
    const page = await newE2EPage();
    await page.setContent(MULTI);
    const valueChange = await page.spyOnEvent('valueChange');
    const shell = await page.find('material-select >>> [role="combobox"]');

    await shell.click();
    await page.waitForChanges();
    expect(shell.getAttribute('aria-expanded')).toBe('true');

    const cheese = await page.find('material-select material-option[value="cheese"]');
    await cheese.click();
    await page.waitForChanges();
    const onion = await page.find('material-select material-option[value="onion"]');
    await onion.click();
    await page.waitForChanges();

    // Menu stays open across toggles in multi mode.
    expect(shell.getAttribute('aria-expanded')).toBe('true');
    const el = await page.find('material-select');
    expect(await el.getProperty('values')).toEqual(['cheese', 'onion']);
    expect(valueChange).toHaveReceivedEventTimes(2);
    expect(valueChange).toHaveReceivedEventDetail({ value: 'cheese\x1fonion', values: ['cheese', 'onion'] });
  });

  it('removing a chip deselects the option', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <material-select label="Toppings" multiple>
        <material-option value="cheese">Cheese</material-option>
        <material-option value="olives">Olives</material-option>
      </material-select>
    `);
    const el = await page.find('material-select');
    await el.setProperty('values', ['cheese', 'olives']);
    await page.waitForChanges();

    const removeButtons = await page.findAll('material-select >>> .chip-remove');
    expect(removeButtons.length).toBe(2);
    await removeButtons[0].click();
    await page.waitForChanges();

    expect(await el.getProperty('values')).toEqual(['olives']);
  });

  it('form participation: posts one FormData entry per selection under the same name', async () => {
    const page = await newE2EPage();
    await page.setContent(`<form id="f">${MULTI}</form>`);
    const el = await page.find('material-select');
    await el.setProperty('values', ['cheese', 'onion']);
    await page.waitForChanges();

    const formValues = () =>
      page.evaluate(() =>
        new FormData(document.getElementById('f') as HTMLFormElement).getAll('toppings'));
    expect(await formValues()).toEqual(['cheese', 'onion']);
  });

  it('required + empty selection is invalid in multi mode', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <material-select label="Toppings" multiple required>
        <material-option value="cheese">Cheese</material-option>
      </material-select>
    `);
    const el = await page.find('material-select');
    expect(await el.callMethod('checkValidity')).toBe(false);

    await el.setProperty('values', ['cheese']);
    await page.waitForChanges();
    expect(await el.callMethod('checkValidity')).toBe(true);
  });

  it('a native form reset restores the default selections', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <form id="f">
        <material-select label="Toppings" name="toppings" multiple>
          <material-option value="cheese" selected>Cheese</material-option>
          <material-option value="olives">Olives</material-option>
        </material-select>
      </form>
    `);
    const el = await page.find('material-select');
    await page.waitForChanges();
    expect(await el.getProperty('values')).toEqual(['cheese']);

    await el.setProperty('values', ['olives']);
    await page.waitForChanges();
    expect(await el.getProperty('values')).toEqual(['olives']);

    await page.evaluate(() => (document.getElementById('f') as HTMLFormElement).reset());
    await page.waitForChanges();
    expect(await el.getProperty('values')).toEqual(['cheese']);
  });
});
