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
import { MaterialOption } from '../material-option/material-option';
import { MaterialCommandPalette } from './material-command-palette';

const stubDialog = (root: HTMLElement) => {
  const dialog = root.shadowRoot!.querySelector('dialog') as HTMLDialogElement & {
    showModal: jest.Mock;
    close: jest.Mock;
  };
  dialog.showModal = jest.fn(() => {
    Object.defineProperty(dialog, 'open', { value: true, configurable: true });
  });
  dialog.close = jest.fn(() => {
    Object.defineProperty(dialog, 'open', { value: false, configurable: true });
    dialog.dispatchEvent(new Event('close'));
  });
  return dialog;
};

describe('material-command-palette', () => {
  it('renders a closed dialog with combobox/listbox semantics', async () => {
    const page = await newSpecPage({
      components: [MaterialCommandPalette],
      html: `<material-command-palette placeholder="Jump to..."></material-command-palette>`,
    });
    const input = page.root!.shadowRoot!.querySelector('input.search')!;
    expect(page.root!.shadowRoot!.querySelector('dialog')!.getAttribute('aria-label')).toBe('Command palette');
    expect(input.getAttribute('role')).toBe('combobox');
    expect(input.getAttribute('aria-haspopup')).toBe('listbox');
    expect(input.getAttribute('placeholder')).toBe('Jump to...');
    expect(page.root!.shadowRoot!.querySelector('#commands')!.getAttribute('role')).toBe('listbox');
  });

  it('show() and hide() update open state and emit openChange', async () => {
    const page = await newSpecPage({
      components: [MaterialCommandPalette],
      html: `<material-command-palette></material-command-palette>`,
    });
    stubDialog(page.root!);
    const spy = jest.fn();
    page.root!.addEventListener('openChange', spy);

    await page.rootInstance.show();
    await page.waitForChanges();
    await page.rootInstance.hide();
    await page.waitForChanges();

    expect(page.rootInstance.open).toBe(false);
    expect(spy.mock.calls.map((call) => call[0].detail)).toEqual([
      { open: true },
      { open: false },
    ]);
  });

  it('global mod+k toggles the palette when the hotkey is enabled', async () => {
    const page = await newSpecPage({
      components: [MaterialCommandPalette],
      html: `<material-command-palette></material-command-palette>`,
    });
    stubDialog(page.root!);

    document.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'k',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    }));
    await page.waitForChanges();

    expect(page.rootInstance.open).toBe(true);
  });

  it('renders commands from the commands property and filters by label/keywords', async () => {
    const page = await newSpecPage({
      components: [MaterialCommandPalette],
      html: `<material-command-palette empty-label="Nothing found"></material-command-palette>`,
    });
    page.root!.commands = [
      { id: 'new-order', label: 'New order', keywords: 'purchase create', section: 'Actions' },
      { id: 'vendors', label: 'Vendors', keywords: 'suppliers', section: 'Go to' },
    ];
    await page.waitForChanges();

    let rows = Array.from(page.root!.shadowRoot!.querySelectorAll('.row-label')).map((el) => el.textContent);
    expect(rows).toEqual(['New order', 'Vendors']);
    expect(page.root!.shadowRoot!.querySelector('.section')!.textContent).toBe('Actions');

    const input = page.root!.shadowRoot!.querySelector('input.search') as HTMLInputElement;
    input.value = 'supplier';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await page.waitForChanges();

    rows = Array.from(page.root!.shadowRoot!.querySelectorAll('.row-label')).map((el) => el.textContent);
    expect(rows).toEqual(['Vendors']);
  });

  it('uses slotted material-options as command sources, ignoring disabled options', async () => {
    const page = await newSpecPage({
      components: [MaterialCommandPalette, MaterialOption],
      html: `
        <material-command-palette>
          <material-option value="new">New order</material-option>
          <material-option value="disabled" disabled>Disabled</material-option>
        </material-command-palette>
      `,
    });

    const rows = Array.from(page.root!.shadowRoot!.querySelectorAll('.row-label')).map((el) => el.textContent);
    expect(rows).toEqual(['New order']);
  });

  it('clicking a command emits materialCommand detail and closes the palette', async () => {
    const page = await newSpecPage({
      components: [MaterialCommandPalette],
      html: `<material-command-palette></material-command-palette>`,
    });
    stubDialog(page.root!);
    page.root!.commands = [{ id: 'new-order', label: 'New order' }];
    await page.rootInstance.show();
    await page.waitForChanges();

    const spy = jest.fn();
    page.root!.addEventListener('materialCommand', spy);
    const row = page.root!.shadowRoot!.querySelector('.row') as HTMLElement;
    row.click();
    await page.waitForChanges();

    expect(spy.mock.calls[0][0].detail).toEqual({
      id: 'new-order',
      item: { id: 'new-order', label: 'New order' },
    });
    expect(page.rootInstance.open).toBe(false);
  });
});
