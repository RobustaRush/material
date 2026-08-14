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

// Real browser, not newSpecPage: material-date-field's own logic (typed
// entry, formatting, hidden-input sync) is covered in material-date-field.
// spec.tsx. This file covers what mock-doc can't: the docked popover
// (`popover="manual"`/`:popover-open`, anchor tracking) and modal-dialog
// (real <dialog>) surfaces, real focus/keyboard, and native form
// participation of the hidden input. material-date-field itself has no
// @AttachInternals — its inner material-textfield does, which is exactly
// the kind of composition that needs a real browser (see docs/agents/testing.md).
//
// material-date-field renders shadow: false (light DOM), so most of its own
// template is reachable with a plain descendant selector; a single `>>>`
// is only needed to cross into a *child* component's own shadow root
// (material-textfield/material-calendar/material-dialog/material-icon-
// button/material-button all render `shadow: true`).

describe('material-date-field', () => {
  it('docked (default, wide viewport): clicking the trigger opens the calendar popup', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-date-field label="Due" format="%Y-%m-%d"></material-date-field>`);
    const popup = await page.find('material-date-field .date-popup');
    expect(await popup.isVisible()).toBe(false);

    const trigger = await page.find('material-date-field material-textfield material-icon-button >>> button');
    await trigger.click();
    await page.waitForChanges();

    expect(await popup.isVisible()).toBe(true);
  });

  it('docked: picking a day commits immediately, emits valueChange and closes the popup', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-date-field format="%Y-%m-%d" value="2024-03-10"></material-date-field>`);
    const el = await page.find('material-date-field');
    const changeSpy = await page.spyOnEvent('valueChange');

    const trigger = await page.find('material-date-field material-textfield material-icon-button >>> button');
    await trigger.click();
    await page.waitForChanges();

    const day = await page.find(
      'material-date-field .date-popup material-calendar >>> [data-iso="2024-03-15"]',
    );
    await day.click();
    await page.waitForChanges();

    expect(await el.getProperty('value')).toBe('2024-03-15');
    expect(changeSpy).toHaveReceivedEventDetail({ value: '2024-03-15' });

    const popup = await page.find('material-date-field .date-popup');
    expect(await popup.isVisible()).toBe(false);
  });

  it('docked: Escape closes the popup without committing a pending selection', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-date-field format="%Y-%m-%d" value="2024-03-10"></material-date-field>`);
    const el = await page.find('material-date-field');

    const trigger = await page.find('material-date-field material-textfield material-icon-button >>> button');
    await trigger.click();
    await page.waitForChanges();

    const popup = await page.find('material-date-field .date-popup');
    expect(await popup.isVisible()).toBe(true);

    await page.keyboard.press('Escape');
    await page.waitForChanges();

    expect(await popup.isVisible()).toBe(false);
    expect(await el.getProperty('value')).toBe('2024-03-10');
  });

  it('docked: a pointerdown outside the field closes the popup', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <div><material-date-field format="%Y-%m-%d"></material-date-field><button id="outside">outside</button></div>
    `);
    const trigger = await page.find('material-date-field material-textfield material-icon-button >>> button');
    await trigger.click();
    await page.waitForChanges();

    const popup = await page.find('material-date-field .date-popup');
    expect(await popup.isVisible()).toBe(true);

    await page.evaluate(() => {
      document.getElementById('outside')!.dispatchEvent(new PointerEvent('pointerdown', {
        bubbles: true,
        composed: true,
      }));
    });
    await page.waitForChanges();

    expect(await popup.isVisible()).toBe(false);
  });

  it('modal picker (picker="modal"): selecting a day only stages it; OK commits, Cancel discards', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-date-field picker="modal" format="%Y-%m-%d" value="2024-03-10"></material-date-field>`);
    const el = await page.find('material-date-field');
    const changeSpy = await page.spyOnEvent('valueChange');

    const trigger = await page.find('material-date-field material-textfield material-icon-button >>> button');
    await trigger.click();
    await page.waitForChanges();

    const day = await page.find(
      'material-date-field material-dialog material-calendar >>> [data-iso="2024-03-20"]',
    );
    await day.click();
    await page.waitForChanges();

    // Selecting inside the modal doesn't commit yet.
    expect(await el.getProperty('value')).toBe('2024-03-10');
    expect(changeSpy).toHaveReceivedEventTimes(0);

    const cancelBtn = await page.find(
      'material-date-field material-dialog [data-dialog-close]:not([data-dialog-close="ok"]) >>> button',
    );
    await cancelBtn.click();
    await page.waitForChanges();
    expect(await el.getProperty('value')).toBe('2024-03-10');

    // Reopen and commit via OK this time.
    await trigger.click();
    await page.waitForChanges();
    const day2 = await page.find(
      'material-date-field material-dialog material-calendar >>> [data-iso="2024-03-20"]',
    );
    await day2.click();
    await page.waitForChanges();
    const okBtn = await page.find(
      'material-date-field material-dialog [data-dialog-close="ok"] >>> button',
    );
    await okBtn.click();
    await page.waitForChanges();

    expect(await el.getProperty('value')).toBe('2024-03-20');
    expect(changeSpy).toHaveReceivedEventDetail({ value: '2024-03-20' });
  });

  it('disabled: the trigger button is a real disabled button', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-date-field disabled format="%Y-%m-%d"></material-date-field>`);
    const trigger = await page.find('material-date-field material-textfield material-icon-button >>> button');
    expect(trigger.getAttribute('disabled')).not.toBeNull();
  });

  it('typing a date directly into the text input formats, commits, and emits valueChange', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-date-field format="%Y-%m-%d"></material-date-field>`);
    const el = await page.find('material-date-field');
    const changeSpy = await page.spyOnEvent('valueChange');

    const input = await page.find('material-date-field material-textfield >>> input');
    await input.click();
    await input.type('2024-05-01');
    await input.press('Tab');
    await page.waitForChanges();

    expect(await el.getProperty('value')).toBe('2024-05-01');
    expect(changeSpy).toHaveReceivedEventDetail({ value: '2024-05-01' });
  });

  it('participates in a real form via its hidden input, and reflects a programmatic value update', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <form id="f"><material-date-field name="due" value="2024-01-01" format="%Y-%m-%d"></material-date-field></form>
    `);
    const formValue = () =>
      page.evaluate(() => new FormData(document.getElementById('f') as HTMLFormElement).get('due'));

    expect(await formValue()).toBe('2024-01-01');

    const el = await page.find('material-date-field');
    await el.setProperty('value', '2024-02-02');
    await page.waitForChanges();

    expect(await formValue()).toBe('2024-02-02');
  });
});
