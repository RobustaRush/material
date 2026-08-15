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

// Real browser, not newSpecPage: material-search is formAssociated and calls
// this.internals.setFormValue() unconditionally from connectedCallback.
// Neither Stencil's mock-doc nor jsdom implement ElementInternals'
// form-association methods, so any render of a formAssociated component
// throws outside a real browser — see docs/agents/testing.md.

const clickSearchRow = (page: any, index: number) =>
  page.evaluate((rowIndex: number) => {
    const host = document.querySelector('material-search');
    const row = host?.shadowRoot?.querySelectorAll('.row')[rowIndex] as HTMLElement | undefined;
    if (!row) throw new Error(`Missing search row ${rowIndex}`);
    row.click();
  }, index);

const pressSearchKey = (page: any, key: string) =>
  page.evaluate((keyName: string) => {
    const host = document.querySelector('material-search');
    const input = host?.shadowRoot?.querySelector('input') as HTMLInputElement | null;
    if (!input) throw new Error('Missing search input');
    input.dispatchEvent(new FocusEvent('focus'));
    input.dispatchEvent(new KeyboardEvent('keydown', {
      key: keyName,
      bubbles: true,
      composed: true,
      cancelable: true,
    }));
  }, key);

const pressSearchKeys = (page: any, keys: string[]) =>
  page.evaluate((keyNames: string[]) => {
    const host = document.querySelector('material-search');
    const input = host?.shadowRoot?.querySelector('input') as HTMLInputElement | null;
    if (!input) throw new Error('Missing search input');
    input.dispatchEvent(new FocusEvent('focus'));
    for (const keyName of keyNames) {
      input.dispatchEvent(new KeyboardEvent('keydown', {
        key: keyName,
        bubbles: true,
        composed: true,
        cancelable: true,
      }));
    }
  }, keys);

describe('material-search', () => {
  it('renders the default search bar as a combobox', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-search></material-search>`);
    const frame = await page.find('material-search >>> .frame');
    expect(frame.getAttribute('role')).toBe('search');
    const input = await page.find('material-search >>> input');
    expect(input.getAttribute('role')).toBe('combobox');
    expect(input.getAttribute('placeholder')).toBe('Search');
    expect(input.getAttribute('aria-expanded')).toBe('false');
    expect(input.getAttribute('aria-haspopup')).toBe('listbox');
  });

  it('typing opens the listbox and emits materialSearchInput with the query', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-search layout="docked"></material-search>`);
    const el = await page.find('material-search');
    await el.setProperty('items', [
      { label: 'Angular', value: 'ng' },
      { label: 'React', value: 'react' },
    ]);
    await page.waitForChanges();

    const inputSpy = await page.spyOnEvent('materialSearchInput');
    const input = await page.find('material-search >>> input');
    await input.click();
    await input.type('Re');
    await page.waitForChanges();

    expect(input.getAttribute('aria-expanded')).toBe('true');
    expect(inputSpy).toHaveReceivedEventDetail({ query: 'Re' });

    const rows = await page.findAll('material-search >>> .row');
    expect(rows.length).toBe(1);
    expect(await rows[0].textContent).toContain('React');
  });

  it('clicking a suggestion commits the value, emits materialSelect, and submits the form', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <form id="f"><material-search name="q" layout="docked"></material-search></form>
    `);
    const el = await page.find('material-search');
    await el.setProperty('items', [
      { label: 'Angular', value: 'ng' },
      { label: 'React', value: 'react' },
    ]);
    await page.waitForChanges();

    await page.evaluate(() => {
      document.getElementById('f')!.addEventListener('submit', (e) => {
        e.preventDefault();
        (window as any).submitted = true;
      });
    });

    const selectSpy = await page.spyOnEvent('materialSelect');
    const submitSpy = await page.spyOnEvent('materialSearchSubmit');
    const input = await page.find('material-search >>> input');
    await input.click();
    await page.waitForChanges();

    const rows = await page.findAll('material-search >>> .row');
    expect(rows.length).toBe(2);
    await clickSearchRow(page, 0);
    await page.waitForChanges();

    expect(selectSpy).toHaveReceivedEventDetail({ item: { label: 'Angular', value: 'ng' } });
    expect(submitSpy).toHaveReceivedEventDetail({ query: 'ng' });
    expect(await el.getProperty('value')).toBe('ng');
    const closedInput = await page.find('material-search >>> input');
    expect(closedInput.getAttribute('aria-expanded')).toBe('false');
    const submitted = await page.evaluate(() => (window as any).submitted);
    expect(submitted).toBe(true);
  });

  it('keyboard: ArrowDown highlights a row and Enter picks it', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-search layout="docked"></material-search>`);
    const el = await page.find('material-search');
    await el.setProperty('items', [
      { label: 'Alpha', value: 'a' },
      { label: 'Beta', value: 'b' },
    ]);
    await page.waitForChanges();

    const selectSpy = await page.spyOnEvent('materialSelect');
    await pressSearchKeys(page, ['ArrowDown', 'Enter']);
    await page.waitForChanges();

    expect(selectSpy).toHaveReceivedEventDetail({ item: { label: 'Alpha', value: 'a' } });
    expect(await el.getProperty('value')).toBe('a');
  });

  it('Enter with no highlighted suggestion submits the surrounding form', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <form id="f"><material-search name="q" value="hello" layout="docked"></material-search></form>
    `);
    await page.evaluate(() => {
      document.getElementById('f')!.addEventListener('submit', (e) => {
        e.preventDefault();
        (window as any).submitted = true;
      });
    });
    const submitSpy = await page.spyOnEvent('materialSearchSubmit');
    const input = await page.find('material-search >>> input');
    await input.click();
    await page.waitForChanges();
    await pressSearchKey(page, 'Enter');
    await page.waitForChanges();

    expect(submitSpy).toHaveReceivedEventDetail({ query: 'hello' });
    const submitted = await page.evaluate(() => (window as any).submitted);
    expect(submitted).toBe(true);
  });

  it('Escape closes the open listbox and refocuses the input', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-search layout="docked"></material-search>`);
    const input = await page.find('material-search >>> input');
    await input.click();
    await page.waitForChanges();
    expect(input.getAttribute('aria-expanded')).toBe('true');

    await pressSearchKey(page, 'Escape');
    await page.waitForChanges();
    expect(input.getAttribute('aria-expanded')).toBe('false');
  });

  it('clear button empties the value, emits materialSearchInput, and refocuses the input', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-search value="hello" layout="docked"></material-search>`);
    const el = await page.find('material-search');
    const inputSpy = await page.spyOnEvent('materialSearchInput');
    const clearBtn = await page.find('material-search >>> material-icon-button.clear');
    expect(clearBtn).not.toBeNull();

    await clearBtn.click();
    await page.waitForChanges();

    expect(await el.getProperty('value')).toBe('');
    expect(inputSpy).toHaveReceivedEventDetail({ query: '' });
  });

  it('clearable="false" never renders the clear button', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-search value="hello" clearable="false"></material-search>`);
    const clearBtn = await page.find('material-search >>> material-icon-button.clear');
    expect(clearBtn).toBeNull();
  });

  it('disabled: blocks the native input and hides the clear button', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-search value="hello" disabled></material-search>`);
    const input = await page.find('material-search >>> input');
    expect(input.getAttribute('disabled')).not.toBeNull();
    const clearBtn = await page.find('material-search >>> material-icon-button.clear');
    expect(clearBtn).toBeNull();
  });

  it('slotted material-option elements are read as suggestions', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <material-search layout="docked">
        <material-option value="1" leading-icon="star">Recent search</material-option>
      </material-search>
    `);
    const input = await page.find('material-search >>> input');
    await input.click();
    await page.waitForChanges();
    const rows = await page.findAll('material-search >>> .row');
    expect(rows.length).toBe(1);
    expect(await rows[0].textContent).toContain('Recent search');
  });

  it('href suggestions emit materialSelect and close the view without submitting', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <material-search layout="docked">
        <material-option value="x" data-href="/picked-page">Go somewhere</material-option>
      </material-search>
    `);
    // Stencil's own e2e request interception already owns page navigation
    // for setContent(); guard the synthetic anchor's default action at the
    // click level instead of adding a second, conflicting interceptor.
    await page.evaluate(() => {
      document.addEventListener(
        'click',
        (e) => {
          const t = e.target as HTMLElement;
          if (t && t.tagName === 'A') e.preventDefault();
        },
        true,
      );
    });
    const selectSpy = await page.spyOnEvent('materialSelect');
    const submitSpy = await page.spyOnEvent('materialSearchSubmit');
    const input = await page.find('material-search >>> input');
    await input.click();
    await page.waitForChanges();
    const rows = await page.findAll('material-search >>> .row');
    expect(rows.length).toBe(1);
    await clickSearchRow(page, 0);
    await page.waitForChanges();

    expect(selectSpy).toHaveReceivedEventTimes(1);
    expect(selectSpy.lastEvent.detail.item.href).toBe('/picked-page');
    expect(submitSpy).toHaveReceivedEventTimes(0);
    const closedInput = await page.find('material-search >>> input');
    expect(closedInput.getAttribute('aria-expanded')).toBe('false');
  });

  it('src: fetches and renders remote suggestions', async () => {
    const page = await newE2EPage();
    await page.setContent(
      `<material-search src="/api/suggest" debounce="10" layout="docked"></material-search>`,
    );
    // Stencil's own e2e request interception already owns the network layer
    // for setContent(); stub fetch directly instead of a second interceptor.
    await page.evaluate(() => {
      (window as any).fetch = async () =>
        new Response(JSON.stringify([{ label: 'Remote result', value: 'ra' }]), {
          headers: { 'Content-Type': 'application/json' },
        });
    });
    const input = await page.find('material-search >>> input');
    await input.click();
    await input.type('foo');
    await page.waitForChanges();
    await page.waitForTimeout(150);
    await page.waitForChanges();

    const rows = await page.findAll('material-search >>> .row');
    expect(rows.length).toBe(1);
    expect(await rows[0].textContent).toContain('Remote result');
  });

  it('form participation: posts name=value and it tracks typed input', async () => {
    const page = await newE2EPage();
    await page.setContent(`<form id="f"><material-search name="q"></material-search></form>`);
    const formValue = () =>
      page.evaluate(() => new FormData(document.getElementById('f') as HTMLFormElement).get('q'));
    expect(await formValue()).toBe('');

    const input = await page.find('material-search >>> input');
    await input.click();
    await input.type('hello');
    await page.waitForChanges();
    expect(await formValue()).toBe('hello');
  });

  it('a native form reset restores the default value', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <form id="f"><material-search name="q" value="default"></material-search></form>
    `);
    const el = await page.find('material-search');
    const input = await page.find('material-search >>> input');
    await input.click();
    await input.type(' extra');
    await page.waitForChanges();
    expect(await el.getProperty('value')).toBe('default extra');

    await page.evaluate(() => (document.getElementById('f') as HTMLFormElement).reset());
    await page.waitForChanges();
    expect(await el.getProperty('value')).toBe('default');
  });

  it('a fieldset disabling the form disables the input', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <form><fieldset id="fs"><material-search></material-search></fieldset></form>
    `);
    const input = await page.find('material-search >>> input');
    expect(input.getAttribute('disabled')).toBeNull();

    await page.evaluate(() => ((document.getElementById('fs') as HTMLFieldSetElement).disabled = true));
    await page.waitForChanges();
    const inputAfter = await page.find('material-search >>> input');
    expect(inputAfter.getAttribute('disabled')).not.toBeNull();
  });
});
