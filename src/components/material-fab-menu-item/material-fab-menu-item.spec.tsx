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
import { MaterialFabMenuItem } from './material-fab-menu-item';

describe('material-fab-menu-item', () => {
  it('renders a button item by default with menuitem semantics', async () => {
    const page = await newSpecPage({
      components: [MaterialFabMenuItem],
      html: `<material-fab-menu-item icon="add" label="New order"></material-fab-menu-item>`,
    });
    expect(page.root!.getAttribute('role')).toBe('menuitem');
    const button = page.root!.shadowRoot!.querySelector('button[part="item"]')!;
    expect(button).not.toBeNull();
    expect(button.getAttribute('type')).toBe('button');
    expect(button.querySelector('.icon')!.textContent).toBe('add');
    expect(button.querySelector('.label')!.textContent).toBe('New order');
  });

  it('an explicit aria-label overrides the visible label for assistive tech', async () => {
    const page = await newSpecPage({
      components: [MaterialFabMenuItem],
      html: `<material-fab-menu-item icon="add" label="New order" aria-label="Create a new order"></material-fab-menu-item>`,
    });
    const button = page.root!.shadowRoot!.querySelector('button[part="item"]')!;
    expect(button.getAttribute('aria-label')).toBe('Create a new order');
  });

  it('disabled reflects to the host and blocks click activation', async () => {
    const page = await newSpecPage({
      components: [MaterialFabMenuItem],
      html: `<material-fab-menu-item icon="add" label="New" disabled></material-fab-menu-item>`,
    });
    expect(page.root!.getAttribute('disabled')).toBe('');
    const button = page.root!.shadowRoot!.querySelector('button') as HTMLButtonElement;
    expect(button.hasAttribute('disabled')).toBe(true);

    const spy = jest.fn();
    page.root!.addEventListener('materialFabMenuItemActivate', spy);
    button.click();
    await page.waitForChanges();
    expect(spy).not.toHaveBeenCalled();
  });

  it('click emits materialFabMenuItemActivate with the value', async () => {
    const page = await newSpecPage({
      components: [MaterialFabMenuItem],
      html: `<material-fab-menu-item icon="add" label="New" value="new-order"></material-fab-menu-item>`,
    });
    const spy = jest.fn();
    page.root!.addEventListener('materialFabMenuItemActivate', spy);
    const button = page.root!.shadowRoot!.querySelector('button')!;
    button.click();
    await page.waitForChanges();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0].detail).toEqual({ value: 'new-order' });
  });

  it('Enter and Space both activate a button item; other keys do not', async () => {
    const page = await newSpecPage({
      components: [MaterialFabMenuItem],
      html: `<material-fab-menu-item icon="add" label="New" value="v"></material-fab-menu-item>`,
    });
    const spy = jest.fn();
    page.root!.addEventListener('materialFabMenuItemActivate', spy);
    const button = page.root!.shadowRoot!.querySelector('button')!;

    button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await page.waitForChanges();
    expect(spy).toHaveBeenCalledTimes(1);

    button.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    await page.waitForChanges();
    expect(spy).toHaveBeenCalledTimes(2);

    button.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
    await page.waitForChanges();
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('href renders an anchor item with target/rel/download and no button semantics', async () => {
    const page = await newSpecPage({
      components: [MaterialFabMenuItem],
      html: `<material-fab-menu-item icon="download" label="Export" href="/export.csv" target="_blank" download="report.csv"></material-fab-menu-item>`,
    });
    const a = page.root!.shadowRoot!.querySelector('a[part="item"]')!;
    expect(a).not.toBeNull();
    expect(a.getAttribute('href')).toBe('/export.csv');
    expect(a.getAttribute('target')).toBe('_blank');
    expect(a.getAttribute('rel')).toBe('noopener noreferrer');
    expect(a.getAttribute('download')).toBe('report.csv');
    expect(page.root!.shadowRoot!.querySelector('button')).toBeNull();
  });

  it('an explicit rel overrides the target=_blank default on link items', async () => {
    const page = await newSpecPage({
      components: [MaterialFabMenuItem],
      html: `<material-fab-menu-item icon="link" label="Open" href="/x" target="_blank" rel="external"></material-fab-menu-item>`,
    });
    const a = page.root!.shadowRoot!.querySelector('a')!;
    expect(a.getAttribute('rel')).toBe('external');
  });

  it('link items still activate materialFabMenuItemActivate on click', async () => {
    const page = await newSpecPage({
      components: [MaterialFabMenuItem],
      html: `<material-fab-menu-item icon="link" label="Open" value="link-1" href="/x"></material-fab-menu-item>`,
    });
    const spy = jest.fn();
    page.root!.addEventListener('materialFabMenuItemActivate', spy);
    page.root!.shadowRoot!.querySelector('a')!.click();
    await page.waitForChanges();
    expect(spy.mock.calls[0][0].detail).toEqual({ value: 'link-1' });
  });

  it('disabled with an href falls back to a disabled button, not a dead link', async () => {
    const page = await newSpecPage({
      components: [MaterialFabMenuItem],
      html: `<material-fab-menu-item icon="link" label="Open" href="/x" disabled></material-fab-menu-item>`,
    });
    expect(page.root!.shadowRoot!.querySelector('a')).toBeNull();
    const button = page.root!.shadowRoot!.querySelector('button') as HTMLButtonElement;
    expect(button.hasAttribute('disabled')).toBe(true);
  });
});
