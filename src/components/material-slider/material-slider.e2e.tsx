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

// Real browser, not newSpecPage: material-slider is formAssociated and calls
// this.internals.setFormValue() unconditionally from connectedCallback.
// Neither Stencil's mock-doc nor jsdom implement ElementInternals'
// form-association methods, so any render of a formAssociated component
// throws outside a real browser — see docs/agents/testing.md.
//
// material-slider has no @Method()s (no checkValidity/reportValidity/
// setCustomValidity, unlike material-textfield/-textarea/-select) — its
// readme has no Methods section — so there's nothing to cover there.

describe('material-slider', () => {
  it('renders a single thumb with min/max/now/valuetext driven by value/min/max', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-slider min="0" max="200" value="50"></material-slider>`);
    const thumb = await page.find('material-slider >>> [role="slider"]');
    expect(thumb.getAttribute('aria-valuemin')).toBe('0');
    expect(thumb.getAttribute('aria-valuemax')).toBe('200');
    expect(thumb.getAttribute('aria-valuenow')).toBe('50');
    expect(thumb.getAttribute('aria-valuetext')).toBe('50');
  });

  it('step snaps an out-of-grid initial value to the nearest step', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-slider min="0" max="100" step="10" value="23"></material-slider>`);
    const el = await page.find('material-slider');
    expect(await el.getProperty('value')).toBe(20);
  });

  it('an out-of-range initial value is clamped to [min, max]', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-slider min="0" max="10" value="999"></material-slider>`);
    const el = await page.find('material-slider');
    expect(await el.getProperty('value')).toBe(10);
  });

  it('label renders with a required mark, and helpText/errorText render as subtext', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-slider label="Volume" required help-text="0-100"></material-slider>`);
    const label = await page.find('material-slider >>> .label');
    expect(label).toEqualText('Volume*');

    const page2 = await newE2EPage();
    await page2.setContent(`
      <material-slider label="Volume" error error-text="Out of range"></material-slider>
    `);
    const subtext = await page2.find('material-slider >>> .subtext');
    expect(subtext).toEqualText('Out of range');
  });

  it('discrete renders intermediate stops', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-slider discrete step="25" min="0" max="100" value="50"></material-slider>`);
    const stops = await page.findAll('material-slider >>> .stop');
    // count-1 interior stops for a 0/25/50/75/100 grid (endpoints excluded).
    expect(stops.length).toBe(3);
  });

  it('valueLow/valueHigh renders a two-thumb range slider', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-slider value-low="20" value-high="80"></material-slider>`);
    const low = await page.find('material-slider >>> [part~="thumb-low"]');
    const high = await page.find('material-slider >>> [part~="thumb-high"]');
    expect(low.getAttribute('aria-valuenow')).toBe('20');
    expect(high.getAttribute('aria-valuenow')).toBe('80');
  });

  it('ArrowRight on the thumb emits valueChange then valueCommit with the new value', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-slider aria-label="Vol" value="50" step="5"></material-slider>`);
    const valueChange = await page.spyOnEvent('valueChange');
    const valueCommit = await page.spyOnEvent('valueCommit');
    const el = await page.find('material-slider');
    const thumb = await page.find('material-slider >>> [role="slider"]');

    await thumb.focus();
    await thumb.press('ArrowRight');
    await page.waitForChanges();

    expect(valueChange).toHaveReceivedEventDetail({ value: 55 });
    expect(valueCommit).toHaveReceivedEventDetail({ value: 55 });
    expect(await el.getProperty('value')).toBe(55);
  });

  it('a keyboard move held at the max boundary does not emit a spurious change', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-slider aria-label="Vol" value="100" max="100"></material-slider>`);
    const valueChange = await page.spyOnEvent('valueChange');
    const thumb = await page.find('material-slider >>> [role="slider"]');
    await thumb.focus();
    await thumb.press('ArrowRight');
    await page.waitForChanges();
    expect(valueChange).toHaveReceivedEventTimes(0);
  });

  it('dragging the track updates the value live and commits once on release', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-slider aria-label="Vol" value="0" min="0" max="100"></material-slider>`);
    const valueChange = await page.spyOnEvent('valueChange');
    const valueCommit = await page.spyOnEvent('valueCommit');
    const el = await page.find('material-slider');

    const rect = await page.evaluate(() => {
      const container = document
        .querySelector('material-slider')!
        .shadowRoot!.querySelector('[part="container"]')!;
      const r = container.getBoundingClientRect();
      return { left: r.left, top: r.top, width: r.width, height: r.height };
    });
    const midY = rect.top + rect.height / 2;

    await page.mouse.move(rect.left + rect.width * 0.1, midY);
    await page.mouse.down();
    await page.mouse.move(rect.left + rect.width * 0.75, midY);
    await page.mouse.up();
    await page.waitForChanges();

    expect(valueChange).toHaveReceivedEvent();
    expect(valueCommit).toHaveReceivedEventTimes(1);
    expect(await el.getProperty('value')).toBeGreaterThan(0);
  });

  it('disabled/readonly block pointer and keyboard interaction', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-slider aria-label="Vol" value="50" disabled></material-slider>`);
    const valueChange = await page.spyOnEvent('valueChange');
    const el = await page.find('material-slider');
    const thumb = await page.find('material-slider >>> [role="slider"]');
    expect(thumb.getAttribute('tabindex')).toBe('-1');
    expect(thumb.getAttribute('aria-disabled')).toBe('true');

    const rect = await page.evaluate(() => {
      const container = document
        .querySelector('material-slider')!
        .shadowRoot!.querySelector('[part="container"]')!;
      const r = container.getBoundingClientRect();
      return { left: r.left, top: r.top, width: r.width, height: r.height };
    });
    await page.mouse.click(rect.left + rect.width * 0.9, rect.top + rect.height / 2);
    await page.waitForChanges();

    expect(valueChange).toHaveReceivedEventTimes(0);
    expect(await el.getProperty('value')).toBe(50);
  });

  it('form participation: contributes name/value to FormData, single mode', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <form id="f"><material-slider name="vol" value="42"></material-slider></form>
    `);
    const formValue = () =>
      page.evaluate(() =>
        new FormData(document.getElementById('f') as HTMLFormElement).get('vol'));
    expect(await formValue()).toBe('42');
  });

  it('form participation: range mode posts two entries for the same name', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <form id="f"><material-slider name="range" value-low="20" value-high="80"></material-slider></form>
    `);
    const formValues = () =>
      page.evaluate(() =>
        new FormData(document.getElementById('f') as HTMLFormElement).getAll('range'));
    expect(await formValues()).toEqual(['20', '80']);
  });

  it('a native form reset restores the default value', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <form id="f"><material-slider name="vol" value="30"></material-slider></form>
    `);
    const el = await page.find('material-slider');
    await el.setProperty('value', 90);
    await page.waitForChanges();
    expect(await el.getProperty('value')).toBe(90);

    await page.evaluate(() => (document.getElementById('f') as HTMLFormElement).reset());
    await page.waitForChanges();
    expect(await el.getProperty('value')).toBe(30);
  });

  it('a fieldset disabling the form disables the slider', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <form><fieldset id="fs"><material-slider name="vol"></material-slider></fieldset></form>
    `);
    const el = await page.find('material-slider');
    expect(await el.getProperty('disabled')).toBe(false);

    await page.evaluate(() => ((document.getElementById('fs') as HTMLFieldSetElement).disabled = true));
    await page.waitForChanges();
    expect(await el.getProperty('disabled')).toBe(true);
    expect(el.getAttribute('disabled')).not.toBeNull();
  });

  it('the error prop drives a custom-error validity the form can see', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <form id="f"><material-slider name="vol" error error-text="Bad"></material-slider></form>
    `);
    const formValid = () =>
      page.evaluate(() => (document.getElementById('f') as HTMLFormElement).checkValidity());
    expect(await formValid()).toBe(false);

    const el = await page.find('material-slider');
    await el.setProperty('error', false);
    await page.waitForChanges();
    expect(await formValid()).toBe(true);
  });

  it('a11y: aria-required/aria-readonly/aria-invalid/aria-describedby on the thumb', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <material-slider required readonly error error-text="Bad" help-text="ignored while in error"></material-slider>
    `);
    const thumb = await page.find('material-slider >>> [role="slider"]');
    expect(thumb.getAttribute('aria-required')).toBe('true');
    expect(thumb.getAttribute('aria-readonly')).toBe('true');
    expect(thumb.getAttribute('aria-invalid')).toBe('true');
    expect(thumb.getAttribute('aria-describedby')).toBe('sub');
  });
});
