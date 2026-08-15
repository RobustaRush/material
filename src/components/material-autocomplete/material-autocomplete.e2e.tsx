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

// Real browser, not newSpecPage: material-autocomplete is formAssociated and
// calls this.internals.setFormValue() unconditionally from connectedCallback.
// Neither Stencil's mock-doc nor jsdom implement ElementInternals'
// form-association methods, so any render of a formAssociated component
// throws outside a real browser — see docs/agents/testing.md.

// A short real-time wait for the 0ms debounce timer materialSearch schedules
// from handleInput (no `src` set in these tests, so scheduleSearch() uses a
// 0ms setTimeout) — page.waitForChanges() alone only flushes Stencil's own
// render queue, not the component's independent window.setTimeout.
const settle = (page: any, ms = 60) => page.evaluate((t: number) => new Promise((r) => setTimeout(r, t)), ms);

const clickAutocompleteInput = (page: any) =>
  page.evaluate(() => {
    const host = document.querySelector('material-autocomplete');
    const input = host?.shadowRoot?.querySelector('input.query') as HTMLInputElement | null;
    const surface = host?.shadowRoot?.querySelector('.surface') as HTMLElement | null;
    if (!input) throw new Error('Missing autocomplete input');
    if (!surface) throw new Error('Missing autocomplete surface');
    input.focus();
    surface.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true, cancelable: true }));
  });

const clickAutocompleteRow = (page: any, index: number) =>
  page.evaluate((rowIndex: number) => {
    const host = document.querySelector('material-autocomplete');
    const row = host?.shadowRoot?.querySelectorAll('.row')[rowIndex] as HTMLElement | undefined;
    if (!row) throw new Error(`Missing autocomplete row ${rowIndex}`);
    row.click();
  }, index);

const pressAutocompleteKey = (page: any, key: string) =>
  page.evaluate((keyName: string) => {
    const host = document.querySelector('material-autocomplete');
    const input = host?.shadowRoot?.querySelector('input.query') as HTMLInputElement | null;
    if (!input) throw new Error('Missing autocomplete input');
    input.focus();
    input.dispatchEvent(new KeyboardEvent('keydown', {
      key: keyName,
      bubbles: true,
      composed: true,
      cancelable: true,
    }));
  }, key);

const pressAutocompleteKeys = (page: any, keys: string[]) =>
  page.evaluate((keyNames: string[]) => {
    const host = document.querySelector('material-autocomplete') as any;
    const input = host?.shadowRoot?.querySelector('input.query') as HTMLInputElement | null;
    if (!host || !input) throw new Error('Missing autocomplete input');
    for (const keyName of keyNames) {
      input.dispatchEvent(new KeyboardEvent('keydown', {
        key: keyName,
        bubbles: true,
        composed: true,
        cancelable: true,
      }));
    }
    return { value: host.value, inputValue: input.value };
  }, keys);

const setAutocompleteQuery = (page: any, value: string) =>
  page.evaluate((text: string) => {
    const host = document.querySelector('material-autocomplete');
    const input = host?.shadowRoot?.querySelector('input.query') as HTMLInputElement | null;
    if (!input) throw new Error('Missing autocomplete input');
    input.focus();
    input.value = text;
    input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  }, value);

const openAndPressAutocompleteKey = (page: any, key: string) =>
  page.evaluate((keyName: string) => {
    const host = document.querySelector('material-autocomplete') as any;
    const input = host?.shadowRoot?.querySelector('input.query') as HTMLInputElement | null;
    const surface = host?.shadowRoot?.querySelector('.surface') as HTMLElement | null;
    if (!host || !input) throw new Error('Missing autocomplete input');
    if (!surface) throw new Error('Missing autocomplete surface');
    input.focus();
    surface.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true, cancelable: true }));
    input.dispatchEvent(new KeyboardEvent('keydown', {
      key: keyName,
      bubbles: true,
      composed: true,
      cancelable: true,
    }));
    return { open: host.open, value: host.value, values: [...host.values] };
  }, key);

const openAndClickAutocompleteRow = (page: any, index: number) =>
  page.evaluate((rowIndex: number) => {
    const host = document.querySelector('material-autocomplete') as any;
    const input = host?.shadowRoot?.querySelector('input.query') as HTMLInputElement | null;
    const surface = host?.shadowRoot?.querySelector('.surface') as HTMLElement | null;
    if (!host || !input) throw new Error('Missing autocomplete input');
    if (!surface) throw new Error('Missing autocomplete surface');
    input.focus();
    surface.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true, cancelable: true }));
    const row = host.shadowRoot?.querySelectorAll('.row')[rowIndex] as HTMLElement | undefined;
    if (!row) throw new Error(`Missing autocomplete row ${rowIndex}`);
    row.click();
    return { open: host.open, value: host.value, values: [...host.values] };
  }, index);

const setAutocompleteQueryAndPressKey = (page: any, value: string, key: string) =>
  page.evaluate(({ text, keyName }: { text: string; keyName: string }) => {
    const host = document.querySelector('material-autocomplete') as any;
    const input = host?.shadowRoot?.querySelector('input.query') as HTMLInputElement | null;
    const surface = host?.shadowRoot?.querySelector('.surface') as HTMLElement | null;
    if (!host || !input) throw new Error('Missing autocomplete input');
    if (!surface) throw new Error('Missing autocomplete surface');
    input.focus();
    surface.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true, cancelable: true }));
    input.value = text;
    input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    const beforeKeyValue = input.value;
    input.dispatchEvent(new KeyboardEvent('keydown', {
      key: keyName,
      bubbles: true,
      composed: true,
      cancelable: true,
    }));
    return { beforeKeyValue, afterKeyValue: input.value, value: host.value };
  }, { text: value, keyName: key });

describe('material-autocomplete', () => {
  it('renders closed with combobox a11y wiring, and seeds value/label from a slotted selected option', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <material-autocomplete label="Vendor">
        <material-option value="1" selected>Acme Corp</material-option>
        <material-option value="2">Globex Ltd</material-option>
      </material-autocomplete>
    `);
    const el = await page.find('material-autocomplete');
    let input = await page.find('material-autocomplete >>> input.query');

    expect(input.getAttribute('role')).toBe('combobox');
    expect(input.getAttribute('aria-haspopup')).toBe('listbox');
    expect(input.getAttribute('aria-controls')).toBe('listbox');
    expect(input.getAttribute('aria-expanded')).toBe('false');
    expect(input.getAttribute('aria-activedescendant')).toBeNull();

    // Seeded from the slotted `selected` marker, before any interaction.
    expect(await el.getProperty('value')).toBe('1');
    expect(await input.getProperty('value')).toBe('Acme Corp');
  });

  it('opens the listbox on click, lists slotted options with the selected row highlighted, and emits openChange', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <material-autocomplete label="Vendor" value="2">
        <material-option value="1">Acme Corp</material-option>
        <material-option value="2">Globex Ltd</material-option>
      </material-autocomplete>
    `);
    const openChangeSpy = await page.spyOnEvent('openChange');
    let input = await page.find('material-autocomplete >>> input.query');

    await clickAutocompleteInput(page);
    await page.waitForChanges();

    const filteredInput = await page.find('material-autocomplete >>> input.query');
    expect(filteredInput.getAttribute('aria-expanded')).toBe('true');
    expect(openChangeSpy).toHaveReceivedEventDetail({ open: true });

    const popup = await page.find('material-autocomplete >>> .popup');
    expect(popup.getAttribute('role')).toBe('listbox');
    const rows = await page.findAll('material-autocomplete >>> .row');
    expect(rows.length).toBe(2);
    expect(rows[1].textContent).toContain('Globex Ltd');
    // value="2" (Globex) is the current selection, so its row starts highlighted.
    expect(rows[1].className).toContain('highlighted');
    expect(rows[1].className).toContain('selected');
    expect(rows[1].getAttribute('aria-selected')).toBe('true');
    expect(input.getAttribute('aria-activedescendant')).toBe('opt-1');

    await pressAutocompleteKey(page, 'Escape');
    await page.waitForChanges();
    expect(input.getAttribute('aria-expanded')).toBe('false');
    expect(openChangeSpy).toHaveReceivedEventDetail({ open: false });
  });

  it('typing filters the option list client-side, re-highlights the first match, and emits materialSearch with the query', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <material-autocomplete label="Vendor">
        <material-option value="1">Acme Corp</material-option>
        <material-option value="2">Globex Ltd</material-option>
      </material-autocomplete>
    `);
    const searchSpy = await page.spyOnEvent('materialSearch');

    await clickAutocompleteInput(page);
    await page.waitForChanges();
    await setAutocompleteQuery(page, 'gl');
    await settle(page);
    await page.waitForChanges();

    const filteredInput = await page.find('material-autocomplete >>> input.query');
    expect(filteredInput.getAttribute('aria-expanded')).toBe('true');
    const rows = await page.findAll('material-autocomplete >>> .row');
    expect(rows.length).toBe(1);
    expect(rows[0].textContent).toContain('Globex Ltd');
    expect(filteredInput.getAttribute('aria-activedescendant')).toBe('opt-0');
    expect(searchSpy).toHaveReceivedEventDetail({ query: 'gl' });
  });

  it('ArrowDown/ArrowUp move the highlighted option and wrap at the ends; Enter commits it', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <material-autocomplete label="Vendor">
        <material-option value="1">Acme Corp</material-option>
        <material-option value="2">Globex Ltd</material-option>
        <material-option value="3">Wayne Enterprises</material-option>
      </material-autocomplete>
    `);
    const valueChangeSpy = await page.spyOnEvent('valueChange');
    const el = await page.find('material-autocomplete');

    // From closed: ArrowDown opens at row 0, then the sequence walks 1 -> 2,
    // wraps 2 -> 0, wraps back 0 -> 2, and Enter commits row 2.
    const keyState = await pressAutocompleteKeys(page, [
      'ArrowDown',
      'ArrowDown',
      'ArrowDown',
      'ArrowDown',
      'ArrowUp',
      'Enter',
    ]);
    await page.waitForChanges();

    const input = await page.find('material-autocomplete >>> input.query');
    expect(input.getAttribute('aria-expanded')).toBe('false');
    expect(keyState.value).toBe('3');
    expect(keyState.inputValue).toBe('Wayne Enterprises');
    expect(await el.getProperty('value')).toBe('3');
    expect(await input.getProperty('value')).toBe('Wayne Enterprises');
    expect(valueChangeSpy).toHaveReceivedEventDetail({ value: '3', values: ['3'] });
  });

  it('clicking an option row commits it directly', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <material-autocomplete label="Vendor">
        <material-option value="1">Acme Corp</material-option>
        <material-option value="2">Globex Ltd</material-option>
      </material-autocomplete>
    `);
    const valueChangeSpy = await page.spyOnEvent('valueChange');
    const el = await page.find('material-autocomplete');
    const input = await page.find('material-autocomplete >>> input.query');

    await clickAutocompleteInput(page);
    await page.waitForChanges();
    await settle(page);
    const rows = await page.findAll('material-autocomplete >>> .row');
    expect(rows.length).toBe(2);
    await clickAutocompleteRow(page, 1);
    await page.waitForChanges();

    expect(await el.getProperty('value')).toBe('2');
    expect(await input.getProperty('value')).toBe('Globex Ltd');
    expect(input.getAttribute('aria-expanded')).toBe('false');
    expect(valueChangeSpy).toHaveReceivedEventDetail({ value: '2', values: ['2'] });
  });

  it('Escape closes the popup and reverts uncommitted typed text to the last committed label', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <material-autocomplete label="Vendor" value="1">
        <material-option value="1">Acme Corp</material-option>
        <material-option value="2">Globex Ltd</material-option>
      </material-autocomplete>
    `);
    // Uncommitted filter text should not overwrite the committed value.
    const escapeState = await setAutocompleteQueryAndPressKey(page, 'zzz', 'Escape');
    await page.waitForChanges();
    expect(escapeState.beforeKeyValue).toBe('zzz');
    expect(escapeState.afterKeyValue).toBe('Acme Corp');

    const input = await page.find('material-autocomplete >>> input.query');
    expect(input.getAttribute('aria-expanded')).toBe('false');
    expect(await input.getProperty('value')).toBe('Acme Corp');
    const el = await page.find('material-autocomplete');
    expect(await el.getProperty('value')).toBe('1'); // uncommitted text never wrote through
  });

  it('multiple: Enter and click toggle chips; Backspace on an empty input removes the last chip', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <material-autocomplete label="Assignees" multiple>
        <material-option value="1">Ada Lovelace</material-option>
        <material-option value="2">Grace Hopper</material-option>
      </material-autocomplete>
    `);
    const valueChangeSpy = await page.spyOnEvent('valueChange');
    const el = await page.find('material-autocomplete');
    const firstPickState = await openAndPressAutocompleteKey(page, 'Enter'); // toggles Ada in
    await page.waitForChanges();

    expect(firstPickState.values).toEqual(['1']);
    expect(await el.getProperty('values')).toEqual(['1']);
    expect(valueChangeSpy).toHaveReceivedEventDetail({ value: '1', values: ['1'] });
    let chips = await page.findAll('material-autocomplete >>> .chip-label');
    expect(chips.length).toBe(1);
    expect(chips[0].textContent).toBe('Ada Lovelace');

    await settle(page);
    const rows = await page.findAll('material-autocomplete >>> .row');
    expect(rows.length).toBe(2);
    const secondPickState = await openAndClickAutocompleteRow(page, 1); // toggles Grace in
    await page.waitForChanges();
    expect(secondPickState.values).toEqual(['1', '2']);
    expect(await el.getProperty('values')).toEqual(['1', '2']);
    chips = await page.findAll('material-autocomplete >>> .chip-label');
    expect(chips.length).toBe(2);

    // The multi query input is only ever the filter text — empty after a pick.
    const currentInput = await page.find('material-autocomplete >>> input.query');
    expect(await currentInput.getProperty('value')).toBe('');
    await pressAutocompleteKey(page, 'Backspace');
    await page.waitForChanges();

    expect(await el.getProperty('values')).toEqual(['1']);
    chips = await page.findAll('material-autocomplete >>> .chip-label');
    expect(chips.length).toBe(1);
    expect(chips[0].textContent).toBe('Ada Lovelace');
  });

  it('the `options` property supplies rows instead of slotted material-option elements', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-autocomplete label="Pick"></material-autocomplete>`);
    const el = await page.find('material-autocomplete');

    el.setProperty('options', [
      { value: 'a', label: 'Alpha' },
      { value: 'b', label: 'Beta' },
    ]);
    await page.waitForChanges();

    await clickAutocompleteInput(page);
    await page.waitForChanges();
    await settle(page);

    const rows = await page.findAll('material-autocomplete >>> .row');
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('Alpha');
    expect(rows[1].textContent).toContain('Beta');
  });

  it('form participation (single): the committed value is submitted under `name`', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <form id="f">
        <material-autocomplete name="vendor">
          <material-option value="1">Acme Corp</material-option>
          <material-option value="2">Globex Ltd</material-option>
        </material-autocomplete>
      </form>
    `);
    const el = await page.find('material-autocomplete');
    const formValue = () =>
      page.evaluate(() => new FormData(document.getElementById('f') as HTMLFormElement).get('vendor'));

    // No option picked yet: an unselected combobox still submits its
    // (empty-string) value, same as a plain <input> — it never opts out via
    // setFormValue(null), only `disabled` does that.
    expect(await formValue()).toBe('');

    await el.setProperty('value', '1');
    await page.waitForChanges();

    expect(await formValue()).toBe('1');
  });

  it('form participation (multiple): one FormData entry per selected value', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <form id="f">
        <material-autocomplete name="assignee" multiple>
          <material-option value="1">Ada Lovelace</material-option>
          <material-option value="2">Grace Hopper</material-option>
        </material-autocomplete>
      </form>
    `);
    const el = await page.find('material-autocomplete');
    const formValues = () =>
      page.evaluate(() => new FormData(document.getElementById('f') as HTMLFormElement).getAll('assignee'));

    expect(await formValues()).toEqual([]);

    await el.setProperty('values', ['1', '2']);
    await page.waitForChanges();

    expect(await formValues()).toEqual(['1', '2']);
  });

  it('a native form reset restores the default value and its label', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <form id="f">
        <material-autocomplete name="vendor" value="1">
          <material-option value="1">Acme Corp</material-option>
          <material-option value="2">Globex Ltd</material-option>
        </material-autocomplete>
      </form>
    `);
    const el = await page.find('material-autocomplete');

    await el.setProperty('value', '2'); // switch to Globex
    await page.waitForChanges();
    expect(await el.getProperty('value')).toBe('2');

    await page.evaluate(() => (document.getElementById('f') as HTMLFormElement).reset());
    await page.waitForChanges();

    const resetEl = await page.find('material-autocomplete');
    const resetInput = await page.find('material-autocomplete >>> input.query');
    expect(await resetEl.getProperty('value')).toBe('1');
    expect(await resetInput.getProperty('value')).toBe('Acme Corp');
  });

  it('a fieldset disabling the form disables the input and blocks the shell from opening', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <form><fieldset id="fs">
        <material-autocomplete name="vendor" label="Vendor">
          <material-option value="1">Acme Corp</material-option>
        </material-autocomplete>
      </fieldset></form>
    `);
    let input = await page.find('material-autocomplete >>> input.query');
    expect(input.getAttribute('disabled')).toBeNull();

    await page.evaluate(() => ((document.getElementById('fs') as HTMLFieldSetElement).disabled = true));
    await page.waitForChanges();

    input = await page.find('material-autocomplete >>> input.query');
    expect(input.getAttribute('disabled')).not.toBeNull();

    // handleShellClick's own disabled guard, independent of the browser
    // suppressing click events on a disabled native <input>.
    const surface = await page.find('material-autocomplete >>> .surface');
    await surface.click();
    await page.waitForChanges();
    input = await page.find('material-autocomplete >>> input.query');
    expect(input.getAttribute('aria-expanded')).toBe('false');
  });

  it('required + empty value fails checkValidity; picking an option makes it valid', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <form id="f">
        <material-autocomplete name="vendor" label="Vendor" required>
          <material-option value="1">Acme Corp</material-option>
        </material-autocomplete>
      </form>
    `);
    let input = await page.find('material-autocomplete >>> input.query');
    expect(input.getAttribute('aria-required')).toBe('true');

    // material-autocomplete doesn't expose its own checkValidity()/
    // reportValidity() @Method() (no Methods table in the readme) — it only
    // calls internals.setValidity(). A form-associated element's validity
    // still folds into the enclosing <form>'s aggregate checkValidity(),
    // which is the contract this component actually implements.
    const formIsValid = () =>
      page.evaluate(() => (document.getElementById('f') as HTMLFormElement).checkValidity());

    expect(await formIsValid()).toBe(false);

    input = await page.find('material-autocomplete >>> input.query');
    await clickAutocompleteInput(page);
    await page.waitForChanges();
    await settle(page);
    await clickAutocompleteRow(page, 0);
    await page.waitForChanges();

    expect(await formIsValid()).toBe(true);
  });
});
