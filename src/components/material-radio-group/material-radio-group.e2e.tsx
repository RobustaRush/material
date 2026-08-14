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

// Real browser, not newSpecPage: material-radio-group is formAssociated and
// calls this.internals.setFormValue() unconditionally from connectedCallback.
// Neither Stencil's mock-doc nor jsdom implement ElementInternals'
// form-association methods, so any render of a formAssociated component
// throws outside a real browser — see docs/agents/testing.md.
//
// aria-required / aria-invalid on the group are set via
// `internals.ariaRequired` / `internals.ariaInvalid` (ElementInternals'
// ARIAMixin), not plain host attributes — whether that reflects to a
// queryable `getAttribute` is version-dependent, so those specific bits are
// exercised through behavior (checkValidity/reportValidity, the group's own
// error prop) rather than by reading the attribute directly.

const THREE_RADIOS = `
  <material-radio-group id="group">
    <material-radio id="r1" value="a" label="A"></material-radio>
    <material-radio id="r2" value="b" label="B"></material-radio>
    <material-radio id="r3" value="c" label="C"></material-radio>
  </material-radio-group>
`;

describe('material-radio-group', () => {
  it('renders role=radiogroup with no value selected: first radio is the roving-tabindex target', async () => {
    const page = await newE2EPage();
    await page.setContent(THREE_RADIOS);
    const group = await page.find('material-radio-group');
    expect(group.getAttribute('role')).toBe('radiogroup');

    const r1 = await page.find('#r1 >>> button');
    const r2 = await page.find('#r2 >>> button');
    expect(r1.getAttribute('tabindex')).toBe('0');
    expect(r2.getAttribute('tabindex')).toBe('-1');
  });

  it('value selects the matching child radio and makes it the roving-tabindex target', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <material-radio-group id="group" value="b">
        <material-radio id="r1" value="a"></material-radio>
        <material-radio id="r2" value="b"></material-radio>
        <material-radio id="r3" value="c"></material-radio>
      </material-radio-group>
    `);
    const r1 = await page.find('#r1');
    const r2 = await page.find('#r2');
    const r1Button = await page.find('#r1 >>> button');
    const r2Button = await page.find('#r2 >>> button');
    expect(await r1.getProperty('checked')).toBe(false);
    expect(await r2.getProperty('checked')).toBe(true);
    expect(r1Button.getAttribute('tabindex')).toBe('-1');
    expect(r2Button.getAttribute('tabindex')).toBe('0');
  });

  it('disabled propagates group-disabled to every child radio', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <material-radio-group id="group" disabled>
        <material-radio id="r1" value="a"></material-radio>
        <material-radio id="r2" value="b"></material-radio>
      </material-radio-group>
    `);
    const r1Button = await page.find('#r1 >>> button');
    const r2Button = await page.find('#r2 >>> button');
    expect(r1Button.getAttribute('disabled')).not.toBeNull();
    expect(r2Button.getAttribute('disabled')).not.toBeNull();
  });

  it('label and helpText render; errorText replaces helpText when error is set', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <material-radio-group id="group" label="Pick one" help-text="Choose wisely" error error-text="You must pick one">
        <material-radio id="r1" value="a"></material-radio>
      </material-radio-group>
    `);
    const groupLabel = await page.find('material-radio-group >>> .group-label');
    expect(groupLabel).toEqualText('Pick one');
    const sub = await page.find('material-radio-group >>> #description');
    expect(sub).toEqualText('You must pick one');
  });

  it('selecting a radio updates the group value, emits valueChange, and fires native change', async () => {
    const page = await newE2EPage();
    await page.setContent(THREE_RADIOS);
    const group = await page.find('material-radio-group');
    const valueChange = await page.spyOnEvent('valueChange');
    const changeEvt = await page.spyOnEvent('change');
    const r2Button = await page.find('#r2 >>> button');

    await r2Button.click();
    await page.waitForChanges();

    expect(await group.getProperty('value')).toBe('b');
    expect(valueChange).toHaveReceivedEventDetail({ value: 'b' });
    expect(changeEvt).toHaveReceivedEventTimes(1);
  });

  it('selecting an already-selected radio does not re-emit valueChange (dedupe guard)', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <material-radio-group id="group" value="a">
        <material-radio id="r1" value="a"></material-radio>
        <material-radio id="r2" value="b"></material-radio>
      </material-radio-group>
    `);
    const valueChange = await page.spyOnEvent('valueChange');
    const r1Button = await page.find('#r1 >>> button');

    await r1Button.click();
    await page.waitForChanges();
    expect(valueChange).toHaveReceivedEventTimes(0);
  });

  it('selecting a radio deselects its siblings', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <material-radio-group id="group" value="a">
        <material-radio id="r1" value="a"></material-radio>
        <material-radio id="r2" value="b"></material-radio>
      </material-radio-group>
    `);
    const r2Button = await page.find('#r2 >>> button');
    await r2Button.click();
    await page.waitForChanges();

    const r1 = await page.find('#r1');
    const r2 = await page.find('#r2');
    expect(await r1.getProperty('checked')).toBe(false);
    expect(await r2.getProperty('checked')).toBe(true);
  });

  it('arrow keys move both focus and selection among child radios (roving tabindex), wrapping at the ends', async () => {
    const page = await newE2EPage();
    await page.setContent(THREE_RADIOS);
    const group = await page.find('material-radio-group');
    const r1Button = await page.find('#r1 >>> button');

    await r1Button.click(); // select + focus r1 first
    await page.waitForChanges();
    const valueChange = await page.spyOnEvent('valueChange');

    await page.keyboard.press('ArrowDown');
    await page.waitForChanges();
    expect(await group.getProperty('value')).toBe('b');
    expect((await page.find('#r2 >>> button')).getAttribute('tabindex')).toBe('0');
    expect((await page.find('#r1 >>> button')).getAttribute('tabindex')).toBe('-1');

    await page.keyboard.press('ArrowRight');
    await page.waitForChanges();
    expect(await group.getProperty('value')).toBe('c');

    // Wraps from the last radio back to the first.
    await page.keyboard.press('ArrowDown');
    await page.waitForChanges();
    expect(await group.getProperty('value')).toBe('a');

    await page.keyboard.press('ArrowUp');
    await page.waitForChanges();
    expect(await group.getProperty('value')).toBe('c');

    expect(valueChange).toHaveReceivedEventTimes(4);
  });

  it('Home/End jump to the first/last radio', async () => {
    const page = await newE2EPage();
    await page.setContent(THREE_RADIOS);
    const group = await page.find('material-radio-group');
    const r2Button = await page.find('#r2 >>> button');

    await r2Button.click();
    await page.waitForChanges();

    await page.keyboard.press('End');
    await page.waitForChanges();
    expect(await group.getProperty('value')).toBe('c');

    await page.keyboard.press('Home');
    await page.waitForChanges();
    expect(await group.getProperty('value')).toBe('a');
  });

  it('required + no value: checkValidity() is false and suppresses the inline error; reportValidity() paints it', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <material-radio-group id="group" required>
        <material-radio id="r1" value="a"></material-radio>
      </material-radio-group>
    `);
    const group = await page.find('material-radio-group');

    expect(await group.callMethod('checkValidity')).toBe(false);
    await page.waitForChanges();
    let sub = await page.find('material-radio-group >>> #description');
    expect(sub).toBeNull();

    expect(await group.callMethod('reportValidity')).toBe(false);
    await page.waitForChanges();
    sub = await page.find('material-radio-group >>> #description');
    expect((await sub.getProperty('textContent'))?.length).toBeGreaterThan(0);
  });

  it('selecting a radio satisfies a required group', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <material-radio-group id="group" required>
        <material-radio id="r1" value="a"></material-radio>
      </material-radio-group>
    `);
    const group = await page.find('material-radio-group');
    expect(await group.callMethod('checkValidity')).toBe(false);

    const r1Button = await page.find('#r1 >>> button');
    await r1Button.click();
    await page.waitForChanges();
    expect(await group.callMethod('checkValidity')).toBe(true);
  });

  it('error on the group propagates `error` to every child radio', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <material-radio-group id="group" error>
        <material-radio id="r1" value="a"></material-radio>
        <material-radio id="r2" value="b"></material-radio>
      </material-radio-group>
    `);
    const r1 = await page.find('#r1');
    const r2 = await page.find('#r2');
    expect(await r1.getProperty('error')).toBe(true);
    expect(await r2.getProperty('error')).toBe(true);
  });

  it('form participation: value posts to FormData under `name`', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <form id="f">
        <material-radio-group id="group" name="pick">
          <material-radio id="r1" value="a"></material-radio>
          <material-radio id="r2" value="b"></material-radio>
        </material-radio-group>
      </form>
    `);
    const formValue = () =>
      page.evaluate(() => new FormData(document.getElementById('f') as HTMLFormElement).get('pick'));
    expect(await formValue()).toBeNull();

    const r2Button = await page.find('#r2 >>> button');
    await r2Button.click();
    await page.waitForChanges();
    expect(await formValue()).toBe('b');
  });

  it('a native form reset restores the default value', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <form id="f">
        <material-radio-group id="group" name="pick" value="a">
          <material-radio id="r1" value="a"></material-radio>
          <material-radio id="r2" value="b"></material-radio>
        </material-radio-group>
      </form>
    `);
    const group = await page.find('material-radio-group');
    const r2Button = await page.find('#r2 >>> button');
    await r2Button.click();
    await page.waitForChanges();
    expect(await group.getProperty('value')).toBe('b');

    await page.evaluate(() => (document.getElementById('f') as HTMLFormElement).reset());
    await page.waitForChanges();
    expect(await group.getProperty('value')).toBe('a');
  });

  it('a fieldset disabling the form disables the group (formDisabledCallback)', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <form>
        <fieldset id="fs">
          <material-radio-group id="group">
            <material-radio id="r1" value="a"></material-radio>
          </material-radio-group>
        </fieldset>
      </form>
    `);
    let r1Button = await page.find('#r1 >>> button');
    expect(r1Button.getAttribute('disabled')).toBeNull();

    await page.evaluate(() => ((document.getElementById('fs') as HTMLFieldSetElement).disabled = true));
    await page.waitForChanges();
    r1Button = await page.find('#r1 >>> button');
    expect(r1Button.getAttribute('disabled')).not.toBeNull();
  });
});
