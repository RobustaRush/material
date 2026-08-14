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

// Real browser, not newSpecPage: both the modal and standard variants wrap a
// real <dialog> and drive showModal()/show()/close() from the open prop
// watcher. Neither Stencil's mock-doc nor jsdom implement those
// HTMLDialogElement methods, so any open/close path throws outside a real
// browser — see docs/agents/testing.md. Render/prop/a11y markup, and the
// handle's click/keyboard toggling (which never touches the dialog), are
// covered in material-bottom-sheet.spec.tsx. Pointer-drag physics
// (dragStartY/velocity/snap thresholds) are not covered here — simulating a
// realistic drag gesture through Puppeteer is layout-timing-dependent and
// flaky; the drop-through logic it feeds (expand/collapse/dismiss) is
// already exercised via the equivalent keyboard paths below.

describe('material-bottom-sheet', () => {
  it('show()/close(): opens and closes the modal sheet and emits open/close events', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-bottom-sheet></material-bottom-sheet>`);
    const el = await page.find('material-bottom-sheet');
    const dialog = await page.find('material-bottom-sheet >>> dialog');
    const openSpy = await page.spyOnEvent('materialSheetOpen');
    const closeSpy = await page.spyOnEvent('materialSheetClose');

    await el.callMethod('show');
    await page.waitForChanges();
    expect(await el.getProperty('open')).toBe(true);
    expect(dialog.getAttribute('open')).not.toBeNull();
    expect(openSpy).toHaveReceivedEventTimes(1);

    await el.callMethod('close', 'dismissed');
    await page.waitForChanges();
    expect(await el.getProperty('open')).toBe(false);
    expect(closeSpy).toHaveReceivedEventDetail({ returnValue: 'dismissed' });
  });

  it('variant="standard": open uses dialog.show(), not showModal() — no top-layer/backdrop', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-bottom-sheet variant="standard"></material-bottom-sheet>`);
    const el = await page.find('material-bottom-sheet');
    const dialog = await page.find('material-bottom-sheet >>> dialog');

    await el.callMethod('show');
    await page.waitForChanges();
    expect(await el.getProperty('open')).toBe(true);
    expect(dialog.getAttribute('open')).not.toBeNull();

    await el.callMethod('close');
    await page.waitForChanges();
    expect(dialog.getAttribute('open')).toBeNull();
  });

  it('Escape dismisses the modal sheet, firing the cancelable materialSheetCancel first', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-bottom-sheet></material-bottom-sheet>`);
    const el = await page.find('material-bottom-sheet');
    const cancelSpy = await page.spyOnEvent('materialSheetCancel');

    await el.callMethod('show');
    await page.waitForChanges();
    await page.keyboard.press('Escape');
    await page.waitForChanges();

    expect(cancelSpy).toHaveReceivedEventTimes(1);
    expect(await el.getProperty('open')).toBe(false);
  });

  it('dismissible=false blocks Escape from closing the modal sheet', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-bottom-sheet dismissible="false"></material-bottom-sheet>`);
    const el = await page.find('material-bottom-sheet');

    await el.callMethod('show');
    await page.waitForChanges();
    await page.keyboard.press('Escape');
    await page.waitForChanges();

    expect(await el.getProperty('open')).toBe(true);
  });

  it('clicking the scrim dismisses the modal sheet; clicking inside it does not', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-bottom-sheet>Body</material-bottom-sheet>`);
    const el = await page.find('material-bottom-sheet');
    const cancelSpy = await page.spyOnEvent('materialSheetCancel');
    await el.callMethod('show');
    await page.waitForChanges();

    const dialog = await page.find('material-bottom-sheet >>> dialog');
    await dialog.click();
    await page.waitForChanges();
    expect(await el.getProperty('open')).toBe(true);

    // The sheet is bottom-anchored; the top-left corner of the viewport is
    // always outside its content box regardless of viewport size.
    await page.mouse.click(2, 2);
    await page.waitForChanges();
    expect(cancelSpy).toHaveReceivedEventTimes(1);
    expect(await el.getProperty('open')).toBe(false);
  });

  it('clicking the handle toggles expanded on a live, open sheet', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-bottom-sheet></material-bottom-sheet>`);
    const el = await page.find('material-bottom-sheet');
    await el.callMethod('show');
    await page.waitForChanges();

    const handle = await page.find('material-bottom-sheet >>> .handle-area');
    await handle.click();
    await page.waitForChanges();
    expect(await el.getProperty('expanded')).toBe(true);

    await handle.click();
    await page.waitForChanges();
    expect(await el.getProperty('expanded')).toBe(false);
  });

  it('opening always resets expanded to false, even if it was left expanded before closing', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-bottom-sheet expanded></material-bottom-sheet>`);
    const el = await page.find('material-bottom-sheet');
    await el.callMethod('show');
    await page.waitForChanges();
    expect(await el.getProperty('expanded')).toBe(false);
  });
});
