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

// Real browser, not newSpecPage: material-button is formAssociated and calls
// this.internals.setFormValue() unconditionally from connectedCallback.
// Neither Stencil's mock-doc nor jsdom implement ElementInternals'
// form-association methods, so any render of a formAssociated component
// throws outside a real browser — see docs/agents/testing.md.

describe('material-button', () => {
  it('renders a submit button by default, with the label slotted', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-button label="Save"></material-button>`);
    const button = await page.find('material-button >>> button');
    expect(button.getAttribute('type')).toBe('submit');
    // Fallback slot content (this.label) renders in shadow DOM, not the host's
    // light-DOM textContent — toEqualText on the host would see "".
    expect(button).toEqualText('Save');
  });

  it('renders an anchor when href is set', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-button href="/docs" target="_blank"></material-button>`);
    const a = await page.find('material-button >>> a');
    expect(a.getAttribute('href')).toBe('/docs');
    expect(a.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('disabled: removes href from the rendered anchor and blocks activation', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-button href="/docs" disabled></material-button>`);
    const a = await page.find('material-button >>> a');
    expect(a.getAttribute('href')).toBeNull();
    expect(a.getAttribute('tabindex')).toBe('-1');
  });

  it('toggle: flips selected and emits selectedChange on click, without submitting', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-button toggle></material-button>`);
    const selectedChange = await page.spyOnEvent('selectedChange');
    const el = await page.find('material-button');
    const button = await page.find('material-button >>> button');

    await button.click();
    await page.waitForChanges();

    expect(await el.getProperty('selected')).toBe(true);
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(selectedChange).toHaveReceivedEventDetail({ selected: true });

    await button.click();
    await page.waitForChanges();
    expect(await el.getProperty('selected')).toBe(false);
    expect(selectedChange).toHaveReceivedEventTimes(2);
  });

  it('soft-disabled: is still focusable but the click handler blocks activation', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-button toggle soft-disabled></material-button>`);
    const el = await page.find('material-button');
    const button = await page.find('material-button >>> button');
    expect(button.getAttribute('aria-disabled')).toBe('true');

    await button.click();
    await page.waitForChanges();
    expect(await el.getProperty('selected')).toBe(false);
  });

  it('toggle form participation: contributes name/value only while selected', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <form id="f"><material-button toggle name="opt" value="yes"></material-button></form>
    `);
    const button = await page.find('material-button >>> button');

    const formValue = () =>
      page.evaluate(() => new FormData(document.getElementById('f') as HTMLFormElement).get('opt'));

    expect(await formValue()).toBeNull();

    await button.click();
    await page.waitForChanges();
    expect(await formValue()).toBe('yes');

    await button.click();
    await page.waitForChanges();
    expect(await formValue()).toBeNull();
  });

  it('a native form reset restores the default selected state of a toggle button', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <form id="f"><material-button toggle selected name="opt" value="yes"></material-button></form>
    `);
    const el = await page.find('material-button');
    const button = await page.find('material-button >>> button');

    await button.click();
    await page.waitForChanges();
    expect(await el.getProperty('selected')).toBe(false);

    await page.evaluate(() => (document.getElementById('f') as HTMLFormElement).reset());
    await page.waitForChanges();
    expect(await el.getProperty('selected')).toBe(true);
  });

  it('a fieldset disabling the form disables the button', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <form><fieldset id="fs"><material-button></material-button></fieldset></form>
    `);
    const button = await page.find('material-button >>> button');
    expect(button.getAttribute('disabled')).toBeNull();

    await page.evaluate(() => ((document.getElementById('fs') as HTMLFieldSetElement).disabled = true));
    await page.waitForChanges();
    const buttonAfter = await page.find('material-button >>> button');
    expect(buttonAfter.getAttribute('disabled')).not.toBeNull();
  });
});
