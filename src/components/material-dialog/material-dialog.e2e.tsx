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

// Real browser, not newSpecPage: material-dialog wraps a real <dialog> and
// drives showModal()/close() from show()/close()/the open prop watcher.
// Neither Stencil's mock-doc nor jsdom implement those HTMLDialogElement
// methods, so any open/close path throws outside a real browser — see
// docs/agents/testing.md. This suite covers open/close, Escape/backdrop
// dismissal, focus management, and form participation; render/prop/a11y
// markup is covered in material-dialog.spec.tsx.

describe('material-dialog', () => {
  it('show()/close(): opens and closes the native dialog and emits open/close events', async () => {
    const page = await newE2EPage();
    // quick: skips the WAAPI exit choreography so close() resolves synchronously
    // with the real dialog.close() call instead of after a 150ms animation.
    await page.setContent(`<material-dialog quick headline="Hi"></material-dialog>`);
    const el = await page.find('material-dialog');
    const dialog = await page.find('material-dialog >>> dialog');
    const openSpy = await page.spyOnEvent('materialDialogOpen');
    const closeSpy = await page.spyOnEvent('materialDialogClose');

    await el.callMethod('show');
    await page.waitForChanges();
    expect(await el.getProperty('open')).toBe(true);
    expect(dialog.getAttribute('open')).not.toBeNull();
    expect(openSpy).toHaveReceivedEventTimes(1);

    await el.callMethod('close', 'done');
    await page.waitForChanges();
    expect(await el.getProperty('open')).toBe(false);
    expect(closeSpy).toHaveReceivedEventDetail({ returnValue: 'done' });
    expect(await el.getProperty('returnValue')).toBe('done');
  });

  it('the open prop toggling drives the same showModal()/close() path as show()/close()', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-dialog quick></material-dialog>`);
    const el = await page.find('material-dialog');
    const dialog = await page.find('material-dialog >>> dialog');

    await el.setProperty('open', true);
    await page.waitForChanges();
    expect(dialog.getAttribute('open')).not.toBeNull();

    await el.setProperty('open', false);
    await page.waitForChanges();
    expect(dialog.getAttribute('open')).toBeNull();
  });

  it('Escape dismisses the dialog and fires the cancelable materialDialogCancel before close', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-dialog quick></material-dialog>`);
    const el = await page.find('material-dialog');
    const cancelSpy = await page.spyOnEvent('materialDialogCancel');
    const closeSpy = await page.spyOnEvent('materialDialogClose');

    await el.callMethod('show');
    await page.waitForChanges();
    await page.keyboard.press('Escape');
    await page.waitForChanges();

    expect(cancelSpy).toHaveReceivedEventTimes(1);
    expect(closeSpy).toHaveReceivedEventTimes(1);
    expect(await el.getProperty('open')).toBe(false);
  });

  it('dismissible=false blocks Escape from closing the dialog', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-dialog quick dismissible="false"></material-dialog>`);
    const el = await page.find('material-dialog');

    await el.callMethod('show');
    await page.waitForChanges();
    await page.keyboard.press('Escape');
    await page.waitForChanges();

    expect(await el.getProperty('open')).toBe(true);
  });

  it('a listener that preventDefaults materialDialogCancel vetoes the Escape dismissal', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-dialog quick></material-dialog>`);
    const el = await page.find('material-dialog');
    await page.$eval('material-dialog', (node) => {
      node.addEventListener('materialDialogCancel', (ev: Event) => ev.preventDefault());
    });

    await el.callMethod('show');
    await page.waitForChanges();
    await page.keyboard.press('Escape');
    await page.waitForChanges();

    expect(await el.getProperty('open')).toBe(true);
  });

  it('clicking the backdrop dismisses the dialog; clicking inside the surface does not', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <material-dialog quick headline="Hi">Body content</material-dialog>
    `);
    const el = await page.find('material-dialog');
    const cancelSpy = await page.spyOnEvent('materialDialogCancel');
    await el.callMethod('show');
    await page.waitForChanges();

    // Click inside the surface (the shadow <dialog>'s own content box) — no dismiss.
    const dialog = await page.find('material-dialog >>> dialog');
    await dialog.click();
    await page.waitForChanges();
    expect(await el.getProperty('open')).toBe(true);
    expect(cancelSpy).toHaveReceivedEventTimes(0);

    // Click outside the content box (top-left corner of the viewport, on the backdrop).
    await page.mouse.click(2, 2);
    await page.waitForChanges();
    expect(cancelSpy).toHaveReceivedEventTimes(1);
    expect(await el.getProperty('open')).toBe(false);
  });

  it('dismissible=false blocks backdrop-click dismissal too', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-dialog quick dismissible="false"></material-dialog>`);
    const el = await page.find('material-dialog');
    await el.callMethod('show');
    await page.waitForChanges();

    await page.mouse.click(2, 2);
    await page.waitForChanges();
    expect(await el.getProperty('open')).toBe(true);
  });

  it('alert prop renders role=alertdialog on the live element', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-dialog alert></material-dialog>`);
    const dialog = await page.find('material-dialog >>> dialog');
    expect(dialog.getAttribute('role')).toBe('alertdialog');
  });

  it('a <button data-dialog-close="value"> inside the dialog closes it with that returnValue', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <material-dialog quick id="d1">
        <button data-dialog-close="confirmed">Confirm</button>
      </material-dialog>
    `);
    const el = await page.find('material-dialog');
    await el.callMethod('show');
    await page.waitForChanges();

    const confirmButton = await page.find('material-dialog button');
    await confirmButton.click();
    await page.waitForChanges();

    expect(await el.getProperty('open')).toBe(false);
    expect(await el.getProperty('returnValue')).toBe('confirmed');
  });

  it('a <button data-dialog-target="id"> opens the referenced dialog', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <button data-dialog-target="d2">Open</button>
      <material-dialog quick id="d2"></material-dialog>
    `);
    const opener = await page.find('button');
    const el = await page.find('material-dialog');
    await opener.click();
    await page.waitForChanges();
    expect(await el.getProperty('open')).toBe(true);
  });

  it('a <form method="dialog"> submit closes with the submitter\'s value as returnValue', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <material-dialog quick id="d3">
        <form method="dialog">
          <button type="submit" value="saved">Save</button>
        </form>
      </material-dialog>
    `);
    const el = await page.find('material-dialog');
    await el.callMethod('show');
    await page.waitForChanges();

    const submitButton = await page.find('material-dialog button');
    await submitButton.click();
    await page.waitForChanges();

    expect(await el.getProperty('open')).toBe(false);
    expect(await el.getProperty('returnValue')).toBe('saved');
  });

  it('closing returns focus to the element that had focus before the dialog opened', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <button id="opener">Open</button>
      <material-dialog quick id="d4"></material-dialog>
    `);
    const el = await page.find('material-dialog');
    await page.focus('#opener');
    await el.callMethod('show');
    await page.waitForChanges();

    await el.callMethod('close');
    await page.waitForChanges();

    const activeId = await page.evaluate(() => document.activeElement?.id);
    expect(activeId).toBe('opener');
  });
});
