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

// Real browser only — no material-side-sheet.spec.tsx exists for this
// component. Two independent reasons, either one alone would force it:
//
// 1. The modal (and, below the 840px breakpoint, adaptive) surface wraps a
//    real <dialog> driven by showModal()/close(); neither is implemented by
//    Stencil's mock-doc nor jsdom (see docs/agents/testing.md).
// 2. render() unconditionally calls hasActions(), which queries
//    `this.el.querySelector(':scope > [slot="actions"]')` — mock-doc's
//    selector engine (sizzle-based) doesn't support `:scope` at all and
//    throws "unsupported pseudo: scope" on *every* render, including the
//    standard variant's plain <aside> and even the fully-default, no-slots
//    case. So unlike material-dialog/material-bottom-sheet (where at least
//    render/prop/a11y markup is spec-testable), nothing about this
//    component renders under newSpecPage.

describe('material-side-sheet', () => {
  it('renders modal by default, closed, with role/aria wiring and the default close button', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-side-sheet headline="Filters"></material-side-sheet>`);
    const el = await page.find('material-side-sheet');
    expect(await el.getProperty('variant')).toBe('modal');
    const dialog = await page.find('material-side-sheet >>> dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).toBe('sheet-headline');
    const headline = await page.find('material-side-sheet >>> .headline');
    expect(headline).toEqualText('Filters');
    const close = await page.find('material-side-sheet >>> .close');
    expect(close.getAttribute('aria-label')).toBe('Close');
  });

  it('show-close="false" omits the close button; close-label overrides its accessible name', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-side-sheet show-close="false"></material-side-sheet>`);
    expect(await page.find('material-side-sheet >>> .close')).toBeNull();

    const labeledPage = await newE2EPage();
    await labeledPage.setContent(`<material-side-sheet close-label="Dismiss panel"></material-side-sheet>`);
    const close = await labeledPage.find('material-side-sheet >>> .close');
    expect(close.getAttribute('aria-label')).toBe('Dismiss panel');
  });

  it('show()/close(): opens and closes the modal sheet and emits open/close events', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-side-sheet></material-side-sheet>`);
    const el = await page.find('material-side-sheet');
    const dialog = await page.find('material-side-sheet >>> dialog');
    const openSpy = await page.spyOnEvent('materialSheetOpen');
    const closeSpy = await page.spyOnEvent('materialSheetClose');

    await el.callMethod('show');
    await page.waitForChanges();
    expect(await el.getProperty('open')).toBe(true);
    expect(dialog.getAttribute('open')).not.toBeNull();
    expect(openSpy).toHaveReceivedEventTimes(1);

    await el.callMethod('close', 'done');
    await page.waitForChanges();
    expect(await el.getProperty('open')).toBe(false);
    expect(closeSpy).toHaveReceivedEventDetail({ returnValue: 'done' });
  });

  it('clicking the close button closes the modal sheet', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-side-sheet></material-side-sheet>`);
    const el = await page.find('material-side-sheet');
    await el.callMethod('show');
    await page.waitForChanges();

    const close = await page.find('material-side-sheet >>> .close');
    await close.click();
    await page.waitForChanges();
    expect(await el.getProperty('open')).toBe(false);
  });

  it('Escape dismisses the modal sheet, firing the cancelable materialSheetCancel first', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-side-sheet></material-side-sheet>`);
    const el = await page.find('material-side-sheet');
    const cancelSpy = await page.spyOnEvent('materialSheetCancel');

    await el.callMethod('show');
    await page.waitForChanges();
    await page.keyboard.press('Escape');
    await page.waitForChanges();

    expect(cancelSpy).toHaveReceivedEventTimes(1);
    expect(await el.getProperty('open')).toBe(false);
  });

  it('dismissible=false blocks both Escape and scrim-click dismissal', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-side-sheet dismissible="false"></material-side-sheet>`);
    const el = await page.find('material-side-sheet');
    await el.callMethod('show');
    await page.waitForChanges();

    await page.keyboard.press('Escape');
    await page.waitForChanges();
    expect(await el.getProperty('open')).toBe(true);

    await page.mouse.click(2, 2);
    await page.waitForChanges();
    expect(await el.getProperty('open')).toBe(true);
  });

  it('clicking the scrim dismisses the modal sheet; clicking inside it does not', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-side-sheet>Body</material-side-sheet>`);
    const el = await page.find('material-side-sheet');
    const cancelSpy = await page.spyOnEvent('materialSheetCancel');
    await el.callMethod('show');
    await page.waitForChanges();

    const dialog = await page.find('material-side-sheet >>> dialog');
    await dialog.click();
    await page.waitForChanges();
    expect(await el.getProperty('open')).toBe(true);
    expect(cancelSpy).toHaveReceivedEventTimes(0);

    await page.mouse.click(2, 2);
    await page.waitForChanges();
    expect(cancelSpy).toHaveReceivedEventTimes(1);
    expect(await el.getProperty('open')).toBe(false);
  });

  it('closing returns focus to the element that had focus before the sheet opened', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <button id="opener">Open</button>
      <material-side-sheet></material-side-sheet>
    `);
    const el = await page.find('material-side-sheet');
    await page.focus('#opener');
    await el.callMethod('show');
    await page.waitForChanges();
    await el.callMethod('close');
    await page.waitForChanges();

    const activeId = await page.evaluate(() => document.activeElement?.id);
    expect(activeId).toBe('opener');
  });

  it('variant="standard": a plain <aside> — open()/close() toggle aria-hidden/inert and emit events, no dialog involved', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-side-sheet variant="standard"></material-side-sheet>`);
    const el = await page.find('material-side-sheet');
    expect(await page.find('material-side-sheet >>> dialog')).toBeNull();
    const aside = await page.find('material-side-sheet >>> aside');
    expect(aside.getAttribute('aria-hidden')).toBe('true');

    const openSpy = await page.spyOnEvent('materialSheetOpen');
    await el.callMethod('show');
    await page.waitForChanges();
    expect(openSpy).toHaveReceivedEventTimes(1);
    expect(aside.getAttribute('aria-hidden')).toBeNull();
    expect(aside.getAttribute('class')).toContain('sheet--open');

    const closeSpy = await page.spyOnEvent('materialSheetClose');
    await el.callMethod('close', 'done');
    await page.waitForChanges();
    expect(closeSpy).toHaveReceivedEventDetail({ returnValue: 'done' });
    expect(aside.getAttribute('aria-hidden')).toBe('true');
  });

  it('variant="standard": the actions slot toggles the has-actions class', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-side-sheet variant="standard"></material-side-sheet>`);
    let actions = await page.find('material-side-sheet >>> .actions');
    expect(actions.getAttribute('class')).not.toContain('has-actions');

    const actionsPage = await newE2EPage();
    await actionsPage.setContent(`
      <material-side-sheet variant="standard">
        <button slot="actions">Save</button>
      </material-side-sheet>
    `);
    actions = await actionsPage.find('material-side-sheet >>> .actions');
    expect(actions.getAttribute('class')).toContain('has-actions');
  });

  it('variant="adaptive": standard (in-flow) above the 840px breakpoint, modal below it', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-side-sheet variant="adaptive"></material-side-sheet>`);
    const el = await page.find('material-side-sheet');

    await page.setViewport({ width: 500, height: 800 });
    await page.waitForChanges();
    expect(await el.getAttribute('data-effective-variant')).toBe('modal');

    await page.setViewport({ width: 1024, height: 800 });
    await page.waitForChanges();
    expect(await el.getAttribute('data-effective-variant')).toBe('standard');

    // Open still works on the now-standard surface.
    await el.callMethod('show');
    await page.waitForChanges();
    expect(await el.getProperty('open')).toBe(true);
  });
});
