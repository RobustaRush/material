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

import { newSpecPage } from '@stencil/core/testing';
import { MaterialBottomSheet } from './material-bottom-sheet';

// Render/prop/a11y-attribute coverage only. Both the modal and standard
// variants wrap a real <dialog> and drive it via showModal()/show()/close()
// from the open prop watcher — neither is implemented by Stencil's mock-doc
// (nor by jsdom), so toggling `open` (via prop, show()/close(), or any
// dismiss path that reaches the real dialog) throws outside a real browser.
// Covered instead in material-bottom-sheet.e2e.tsx — see docs/agents/testing.md.

describe('material-bottom-sheet', () => {
  it('renders modal by default, closed, with the drag handle', async () => {
    const page = await newSpecPage({
      components: [MaterialBottomSheet],
      html: `<material-bottom-sheet></material-bottom-sheet>`,
    });
    expect(page.root!.getAttribute('variant')).toBe('modal');
    expect(page.root!.hasAttribute('open')).toBe(false);
    const dialog = page.root!.shadowRoot!.querySelector('dialog')!;
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    const handle = page.root!.shadowRoot!.querySelector('.handle-area');
    expect(handle).not.toBeNull();
    expect(handle!.getAttribute('aria-label')).toBe('Drag handle');
    expect(handle!.getAttribute('aria-expanded')).toBe('false');
  });

  it('variant="standard": aria-modal is omitted from the dialog', async () => {
    const page = await newSpecPage({
      components: [MaterialBottomSheet],
      html: `<material-bottom-sheet variant="standard"></material-bottom-sheet>`,
    });
    const dialog = page.root!.shadowRoot!.querySelector('dialog')!;
    expect(dialog.hasAttribute('aria-modal')).toBe(false);
    expect(dialog.classList.contains('sheet--standard')).toBe(true);
  });

  it('drag-handle="false" omits the handle button entirely', async () => {
    const page = await newSpecPage({
      components: [MaterialBottomSheet],
      html: `<material-bottom-sheet drag-handle="false"></material-bottom-sheet>`,
    });
    expect(page.root!.shadowRoot!.querySelector('.handle-area')).toBeNull();
  });

  it('drag-handle-label overrides the default accessible name', async () => {
    const page = await newSpecPage({
      components: [MaterialBottomSheet],
      html: `<material-bottom-sheet drag-handle-label="Resize sheet"></material-bottom-sheet>`,
    });
    const handle = page.root!.shadowRoot!.querySelector('.handle-area')!;
    expect(handle.getAttribute('aria-label')).toBe('Resize sheet');
  });

  it('expanded prop reflects to the host and the handle button, and toggles the sheet--expanded class', async () => {
    const page = await newSpecPage({
      components: [MaterialBottomSheet],
      html: `<material-bottom-sheet expanded></material-bottom-sheet>`,
    });
    expect(page.root!.hasAttribute('expanded')).toBe(true);
    const dialog = page.root!.shadowRoot!.querySelector('dialog')!;
    expect(dialog.classList.contains('sheet--expanded')).toBe(true);
    const handle = page.root!.shadowRoot!.querySelector('.handle-area')!;
    expect(handle.getAttribute('aria-expanded')).toBe('true');
  });

  it('clicking the handle toggles expanded, without touching the underlying dialog', async () => {
    const page = await newSpecPage({
      components: [MaterialBottomSheet],
      html: `<material-bottom-sheet></material-bottom-sheet>`,
    });
    const handle = page.root!.shadowRoot!.querySelector('.handle-area')! as HTMLElement;
    handle.click();
    await page.waitForChanges();
    expect(page.rootInstance.expanded).toBe(true);

    handle.click();
    await page.waitForChanges();
    expect(page.rootInstance.expanded).toBe(false);
  });

  it('Enter/Space on the handle toggle expanded; ArrowUp forces expanded true', async () => {
    const page = await newSpecPage({
      components: [MaterialBottomSheet],
      html: `<material-bottom-sheet></material-bottom-sheet>`,
    });
    const handle = page.root!.shadowRoot!.querySelector('.handle-area')! as HTMLElement;

    handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    await page.waitForChanges();
    expect(page.rootInstance.expanded).toBe(true);

    handle.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
    await page.waitForChanges();
    expect(page.rootInstance.expanded).toBe(false);

    handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    await page.waitForChanges();
    expect(page.rootInstance.expanded).toBe(true);
  });

  it('ArrowDown while expanded collapses to peek without touching the dialog', async () => {
    const page = await newSpecPage({
      components: [MaterialBottomSheet],
      html: `<material-bottom-sheet expanded></material-bottom-sheet>`,
    });
    const handle = page.root!.shadowRoot!.querySelector('.handle-area')! as HTMLElement;
    handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    await page.waitForChanges();
    expect(page.rootInstance.expanded).toBe(false);
  });

  it('ArrowDown from peek fires the cancelable materialSheetCancel (dismiss request)', async () => {
    const page = await newSpecPage({
      components: [MaterialBottomSheet],
      html: `<material-bottom-sheet></material-bottom-sheet>`,
    });
    // Veto it: requestDismiss() would otherwise call the real dialog's
    // close(), which mock-doc doesn't implement (see file header).
    page.root!.addEventListener('materialSheetCancel', (ev) => ev.preventDefault());
    const handle = page.root!.shadowRoot!.querySelector('.handle-area')! as HTMLElement;
    const cancelSpy = jest.fn();
    page.root!.addEventListener('materialSheetCancel', cancelSpy);

    handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    await page.waitForChanges();

    expect(cancelSpy).toHaveBeenCalledTimes(1);
  });
});
