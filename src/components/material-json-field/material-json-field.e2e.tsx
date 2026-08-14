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

// Real browser, not newSpecPage: material-json-field is formAssociated and
// calls ElementInternals form/validity methods during lifecycle.

describe('material-json-field', () => {
  it('renders parsed JSON, exposes getJson(), and posts one JSON field with the form', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <form id="f">
        <material-json-field name="meta" label="Metadata" value='{"name":"Alice"}'></material-json-field>
      </form>
    `);
    const el = await page.find('material-json-field');
    expect(await page.find('material-json-field >>> #label')).toEqualText('Metadata');
    expect(await el.callMethod('getJson')).toEqual({ name: 'Alice' });
    expect(await page.evaluate(() =>
      new FormData(document.getElementById('f') as HTMLFormElement).get('meta'),
    )).toBe('{"name":"Alice"}');
  });

  it('editing a primitive leaf updates value, emits valueChange, and refreshes form data', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <form id="f">
        <material-json-field name="meta" value='{"name":"Alice"}'></material-json-field>
      </form>
    `);
    const el = await page.find('material-json-field');
    const change = await page.spyOnEvent('valueChange');

    await page.evaluate(() => {
      const field = document.querySelector('material-json-field')!;
      const input = field.shadowRoot!.querySelector('input.v') as HTMLInputElement;
      input.value = 'Bob';
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await page.waitForChanges();

    expect(await el.getProperty('value')).toBe('{"name":"Bob"}');
    expect(change).toHaveReceivedEventDetail({ value: '{"name":"Bob"}' });
    expect(await page.evaluate(() =>
      new FormData(document.getElementById('f') as HTMLFormElement).get('meta'),
    )).toBe('{"name":"Bob"}');
  });

  it('invalid serialized input renders a parse error and posts the original invalid text', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <form id="f">
        <material-json-field name="meta" value="{bad"></material-json-field>
      </form>
    `);
    expect(await page.find('material-json-field >>> .parse-error')).toEqualText('Invalid JSON');
    expect(await page.evaluate(() =>
      new FormData(document.getElementById('f') as HTMLFormElement).get('meta'),
    )).toBe('{bad');
  });

  it('form reset restores the initial serialized value', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <form id="f">
        <material-json-field name="meta" value='{"name":"Alice"}'></material-json-field>
      </form>
    `);
    const el = await page.find('material-json-field');
    await el.setProperty('value', '{"name":"Bob"}');
    await page.waitForChanges();

    await page.evaluate(() => (document.getElementById('f') as HTMLFormElement).reset());
    await page.waitForChanges();

    expect(await el.getProperty('value')).toBe('{"name":"Alice"}');
    expect(await el.callMethod('getJson')).toEqual({ name: 'Alice' });
  });

  it('fieldset disabled excludes the value from form data', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <form id="f">
        <fieldset disabled>
          <material-json-field name="meta" value='{"name":"Alice"}'></material-json-field>
        </fieldset>
      </form>
    `);
    expect(await page.evaluate(() =>
      new FormData(document.getElementById('f') as HTMLFormElement).has('meta'),
    )).toBe(false);
  });
});
