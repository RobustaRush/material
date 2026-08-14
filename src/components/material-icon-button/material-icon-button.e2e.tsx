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

// Real browser, not newSpecPage: material-icon-button is formAssociated and
// calls this.internals.setFormValue() unconditionally from connectedCallback.
// Neither Stencil's mock-doc nor jsdom implement ElementInternals'
// form-association methods, so any render of a formAssociated component
// throws outside a real browser — see docs/agents/testing.md.

describe('material-icon-button', () => {
  it('renders the icon by default as a plain (non-toggle, non-submit) button', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-icon-button icon="favorite"></material-icon-button>`);
    const button = await page.find('material-icon-button >>> button');
    expect(button.getAttribute('type')).toBe('button');
    expect(button.getAttribute('aria-pressed')).toBeNull();
    const icon = await page.find('material-icon-button >>> .icon');
    expect(icon).toEqualText('favorite');
  });

  it('reflects variant/size/shape/width props as host attributes', async () => {
    const page = await newE2EPage();
    await page.setContent(
      `<material-icon-button icon="star" variant="outlined" size="l" shape="square" width="wide"></material-icon-button>`,
    );
    const el = await page.find('material-icon-button');
    expect(el.getAttribute('variant')).toBe('outlined');
    expect(el.getAttribute('size')).toBe('l');
    expect(el.getAttribute('shape')).toBe('square');
    expect(el.getAttribute('width')).toBe('wide');
  });

  it('renders an anchor when href is set, with target=_blank rel parity', async () => {
    const page = await newE2EPage();
    await page.setContent(
      `<material-icon-button icon="open_in_new" href="/docs" target="_blank"></material-icon-button>`,
    );
    const a = await page.find('material-icon-button >>> a');
    expect(a.getAttribute('href')).toBe('/docs');
    expect(a.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('disabled anchor: drops href, gets role=link and tabindex=-1, aria-disabled=true', async () => {
    const page = await newE2EPage();
    await page.setContent(
      `<material-icon-button icon="open_in_new" href="/docs" disabled></material-icon-button>`,
    );
    const a = await page.find('material-icon-button >>> a');
    expect(a.getAttribute('href')).toBeNull();
    expect(a.getAttribute('role')).toBe('link');
    expect(a.getAttribute('tabindex')).toBe('-1');
    expect(a.getAttribute('aria-disabled')).toBe('true');
  });

  it('aria-label prop reflects onto the rendered button', async () => {
    const page = await newE2EPage();
    await page.setContent(
      `<material-icon-button icon="close" aria-label="Close"></material-icon-button>`,
    );
    const button = await page.find('material-icon-button >>> button');
    expect(button.getAttribute('aria-label')).toBe('Close');
  });

  it('toggle: click flips selected, swaps to selected-icon, emits selectedChange, sets aria-pressed', async () => {
    const page = await newE2EPage();
    await page.setContent(
      `<material-icon-button toggle icon="favorite_border" selected-icon="favorite"></material-icon-button>`,
    );
    const selectedChange = await page.spyOnEvent('selectedChange');
    const el = await page.find('material-icon-button');
    const button = await page.find('material-icon-button >>> button');

    await button.click();
    await page.waitForChanges();

    expect(await el.getProperty('selected')).toBe(true);
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(selectedChange).toHaveReceivedEventDetail({ selected: true });
    const iconAfterOn = await page.find('material-icon-button >>> .icon');
    expect(iconAfterOn).toEqualText('favorite');

    await button.click();
    await page.waitForChanges();

    expect(await el.getProperty('selected')).toBe(false);
    expect(button.getAttribute('aria-pressed')).toBe('false');
    expect(selectedChange).toHaveReceivedEventTimes(2);
    const iconAfterOff = await page.find('material-icon-button >>> .icon');
    expect(iconAfterOff).toEqualText('favorite_border');
  });

  it('toggle: Space and Enter keyboard activation flip selected same as a click', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-icon-button toggle icon="favorite"></material-icon-button>`);
    const selectedChange = await page.spyOnEvent('selectedChange');
    const el = await page.find('material-icon-button');
    const button = await page.find('material-icon-button >>> button');

    await button.focus();
    await button.press('Space');
    await page.waitForChanges();
    expect(await el.getProperty('selected')).toBe(true);
    expect(selectedChange).toHaveReceivedEventDetail({ selected: true });

    await button.press('Enter');
    await page.waitForChanges();
    expect(await el.getProperty('selected')).toBe(false);
    expect(selectedChange).toHaveReceivedEventTimes(2);
  });

  it('soft-disabled: stays focusable, sets aria-disabled, but blocks click and keyboard activation', async () => {
    const page = await newE2EPage();
    await page.setContent(
      `<material-icon-button toggle icon="favorite" soft-disabled></material-icon-button>`,
    );
    const selectedChange = await page.spyOnEvent('selectedChange');
    const el = await page.find('material-icon-button');
    const button = await page.find('material-icon-button >>> button');
    expect(button.getAttribute('disabled')).toBeNull();
    expect(button.getAttribute('aria-disabled')).toBe('true');

    await button.click();
    await page.waitForChanges();
    expect(await el.getProperty('selected')).toBe(false);

    await button.focus();
    await button.press('Space');
    await page.waitForChanges();
    expect(await el.getProperty('selected')).toBe(false);
    expect(selectedChange).toHaveReceivedEventTimes(0);
  });

  it('disabled: native <button disabled> blocks activation, selectedChange never emitted', async () => {
    const page = await newE2EPage();
    await page.setContent(
      `<material-icon-button toggle icon="favorite" disabled></material-icon-button>`,
    );
    const selectedChange = await page.spyOnEvent('selectedChange');
    const el = await page.find('material-icon-button');
    const button = await page.find('material-icon-button >>> button');
    expect(button.getAttribute('disabled')).not.toBeNull();
    expect(button.getAttribute('aria-disabled')).toBeNull();

    await button.click();
    await page.waitForChanges();
    expect(await el.getProperty('selected')).toBe(false);
    expect(selectedChange).toHaveReceivedEventTimes(0);
  });

  it('toggle form participation: contributes name/value to FormData only while selected', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <form id="f"><material-icon-button toggle icon="favorite" name="opt" value="yes"></material-icon-button></form>
    `);
    const button = await page.find('material-icon-button >>> button');

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

  it('a native form reset restores the default selected state of a toggle icon-button', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <form id="f"><material-icon-button toggle selected icon="favorite" name="opt" value="yes"></material-icon-button></form>
    `);
    const el = await page.find('material-icon-button');
    const button = await page.find('material-icon-button >>> button');

    await button.click();
    await page.waitForChanges();
    expect(await el.getProperty('selected')).toBe(false);

    await page.evaluate(() => (document.getElementById('f') as HTMLFormElement).reset());
    await page.waitForChanges();
    expect(await el.getProperty('selected')).toBe(true);
  });

  it('a fieldset disabling the form disables the icon-button', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <form><fieldset id="fs"><material-icon-button icon="favorite"></material-icon-button></fieldset></form>
    `);
    const button = await page.find('material-icon-button >>> button');
    expect(button.getAttribute('disabled')).toBeNull();

    await page.evaluate(
      () => ((document.getElementById('fs') as HTMLFieldSetElement).disabled = true),
    );
    await page.waitForChanges();
    const buttonAfter = await page.find('material-icon-button >>> button');
    expect(buttonAfter.getAttribute('disabled')).not.toBeNull();
  });
});
