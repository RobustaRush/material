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
import { MaterialList } from './material-list';

describe('material-list', () => {
  it('renders a plain list by default', async () => {
    const page = await newSpecPage({
      components: [MaterialList],
      html: `<material-list></material-list>`,
    });
    expect(page.root!.getAttribute('role')).toBe('list');
    expect(page.root!.getAttribute('selection')).toBe('none');
    expect(page.root!.getAttribute('variant')).toBe('baseline');
  });

  it('selection="multi" renders listbox semantics with aria-multiselectable', async () => {
    const page = await newSpecPage({
      components: [MaterialList],
      html: `<material-list selection="multi" dense variant="expressive"></material-list>`,
    });
    expect(page.root!.getAttribute('role')).toBe('listbox');
    expect(page.root!.getAttribute('aria-multiselectable')).toBe('true');
    expect(page.root!.getAttribute('dense')).toBe('');
    expect(page.root!.getAttribute('variant')).toBe('expressive');
  });

  it('roving tabindex prefers the selected enabled item', async () => {
    const page = await newSpecPage({
      components: [MaterialList],
      html: `
        <material-list>
          <material-list-item value="a"></material-list-item>
          <material-list-item value="b" selected></material-list-item>
          <material-list-item value="c" disabled></material-list-item>
        </material-list>
      `,
    });
    const [a, b, c] = Array.from(page.root!.querySelectorAll('material-list-item')) as Array<
      HTMLElement & { tabbable: boolean }
    >;
    expect(a.tabbable).toBe(false);
    expect(b.tabbable).toBe(true);
    expect(c.tabbable).toBe(false);
  });

  it('single selection selects the activated item, clears siblings and emits checked=true', async () => {
    const page = await newSpecPage({
      components: [MaterialList],
      html: `
        <material-list selection="single">
          <material-list-item value="a" selected></material-list-item>
          <material-list-item value="b"></material-list-item>
        </material-list>
      `,
    });
    const [a, b] = Array.from(page.root!.querySelectorAll('material-list-item')) as Array<
      HTMLElement & { selected: boolean }
    >;
    const spy = jest.fn();
    page.root!.addEventListener('materialListSelect', spy);

    b.dispatchEvent(new CustomEvent('materialListItemActivate', {
      detail: { value: 'b' },
      bubbles: true,
      composed: true,
    }));
    await page.waitForChanges();

    expect(a.selected).toBe(false);
    expect(b.selected).toBe(true);
    expect(spy.mock.calls[0][0].detail).toEqual({ value: 'b', checked: true });
  });

  it('multi selection toggles the activated item and emits its checked state', async () => {
    const page = await newSpecPage({
      components: [MaterialList],
      html: `
        <material-list selection="multi">
          <material-list-item value="a"></material-list-item>
        </material-list>
      `,
    });
    const item = page.root!.querySelector('material-list-item') as HTMLElement & { selected: boolean };
    const spy = jest.fn();
    page.root!.addEventListener('materialListSelect', spy);

    item.dispatchEvent(new CustomEvent('materialListItemActivate', {
      detail: { value: 'a' },
      bubbles: true,
      composed: true,
    }));
    await page.waitForChanges();

    expect(item.selected).toBe(true);
    expect(spy.mock.calls[0][0].detail).toEqual({ value: 'a', checked: true });
  });

  it('selection-trigger="control" emits activation without changing selection ownership', async () => {
    const page = await newSpecPage({
      components: [MaterialList],
      html: `
        <material-list selection="multi" selection-trigger="control" activation="auto">
          <material-list-item value="a"></material-list-item>
          <material-list-item value="b"></material-list-item>
        </material-list>
      `,
    });
    const [a, b] = Array.from(page.root!.querySelectorAll('material-list-item')) as Array<
      HTMLElement & { selected: boolean; active: boolean }
    >;
    const spy = jest.fn();
    page.root!.addEventListener('materialListSelect', spy);

    b.dispatchEvent(new CustomEvent('materialListItemActivate', {
      detail: { value: 'b' },
      bubbles: true,
      composed: true,
    }));
    await page.waitForChanges();

    expect(a.active).toBe(false);
    expect(b.active).toBe(true);
    expect(b.selected).toBeFalsy();
    expect(spy.mock.calls[0][0].detail).toEqual({ value: 'b', checked: undefined });
  });
});
