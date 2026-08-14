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

// Real browser, not newSpecPage: material-radio is formAssociated (solely so
// it's "labelable" via internals.labels — see the comment in
// material-radio.tsx) and Stencil attaches @AttachInternals() unconditionally
// from connectedCallback. Neither Stencil's mock-doc nor jsdom implement
// ElementInternals, so any render of a formAssociated component throws
// outside a real browser — see docs/agents/testing.md.
//
// material-radio does not own form value, name, or constraint validation —
// <material-radio-group> does (see its own e2e suite). It also has no `name`
// property of its own (skipped here: not part of its documented contract).

describe('material-radio', () => {
  it('renders unchecked by default with role=radio, aria-checked=false, and a fallback aria-label', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-radio value="a"></material-radio>`);
    const button = await page.find('material-radio >>> button');
    expect(button.getAttribute('role')).toBe('radio');
    expect(button.getAttribute('aria-checked')).toBe('false');
    expect(button.getAttribute('aria-label')).toBe('radio');
    expect(button.getAttribute('tabindex')).toBe('0');
  });

  it('checked reflects to aria-checked and the host attribute', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-radio value="a" checked></material-radio>`);
    const button = await page.find('material-radio >>> button');
    const el = await page.find('material-radio');
    expect(button.getAttribute('aria-checked')).toBe('true');
    expect(el.getAttribute('checked')).not.toBeNull();
  });

  it('disabled disables the inner button and blocks selection', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-radio value="a" disabled></material-radio>`);
    const button = await page.find('material-radio >>> button');
    const radioSelect = await page.spyOnEvent('radioSelect');
    expect(button.getAttribute('disabled')).not.toBeNull();

    await button.click();
    await page.waitForChanges();
    expect(radioSelect).toHaveReceivedEventTimes(0);
  });

  it('groupDisabled (driven by the owning group) also disables the button and blocks selection', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-radio value="a" group-disabled></material-radio>`);
    const button = await page.find('material-radio >>> button');
    const radioSelect = await page.spyOnEvent('radioSelect');
    expect(button.getAttribute('disabled')).not.toBeNull();

    await button.click();
    await page.waitForChanges();
    expect(radioSelect).toHaveReceivedEventTimes(0);
  });

  it('focusable=false takes the inner button out of the tab order', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-radio value="a" focusable="false"></material-radio>`);
    const button = await page.find('material-radio >>> button');
    expect(button.getAttribute('tabindex')).toBe('-1');
  });

  it('label renders trailing by default and reverses with label-position="leading"', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-radio value="a" label="Option A"></material-radio>`);
    const label = await page.find('material-radio >>> .label');
    expect(label).toEqualText('Option A');
    const row = await page.find('material-radio >>> label');
    expect(row.getAttribute('class')).not.toContain('reverse');

    const page2 = await newE2EPage();
    await page2.setContent(
      `<material-radio value="a" label="Option A" label-position="leading"></material-radio>`,
    );
    const row2 = await page2.find('material-radio >>> label');
    expect(row2.getAttribute('class')).toContain('reverse');
  });

  it('error reflects to the host attribute (styling hook; selection state is owned by the group)', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-radio value="a" error></material-radio>`);
    const el = await page.find('material-radio');
    expect(el.getAttribute('error')).not.toBeNull();
  });

  it('radioSelect emits {value} on click when unchecked, and does not re-emit when already checked', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-radio value="a"></material-radio>`);
    const button = await page.find('material-radio >>> button');
    const radioSelect = await page.spyOnEvent('radioSelect');

    await button.click();
    await page.waitForChanges();
    expect(radioSelect).toHaveReceivedEventDetail({ value: 'a' });
    expect(radioSelect).toHaveReceivedEventTimes(1);

    // Nothing in material-radio itself flips `checked` (the group does) —
    // simulate the group's response by setting the property directly, then
    // confirm a further click on an already-checked radio is a no-op.
    const el = await page.find('material-radio');
    await el.setProperty('checked', true);
    await page.waitForChanges();
    const buttonAfter = await page.find('material-radio >>> button');
    await buttonAfter.click();
    await page.waitForChanges();
    expect(radioSelect).toHaveReceivedEventTimes(1);
  });

  it('radioSelect emits on Space keyboard activation (radio does not wire Enter — arrow-key nav belongs to the group)', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-radio value="a"></material-radio>`);
    const button = await page.find('material-radio >>> button');
    const radioSelect = await page.spyOnEvent('radioSelect');

    await button.press(' ');
    await page.waitForChanges();
    expect(radioSelect).toHaveReceivedEventDetail({ value: 'a' });
  });

  it('an external <label for> click selects and focuses the radio (internals.labels)', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <label for="r1">Pick me</label>
      <material-radio id="r1" value="a"></material-radio>
    `);
    const radioSelect = await page.spyOnEvent('radioSelect');
    const label = await page.find('label');

    await label.click();
    await page.waitForChanges();
    expect(radioSelect).toHaveReceivedEventDetail({ value: 'a' });
  });
});
