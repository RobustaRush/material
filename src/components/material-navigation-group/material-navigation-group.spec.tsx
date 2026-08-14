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
import { MaterialNavigationGroup } from './material-navigation-group';

describe('material-navigation-group', () => {
  it('renders expanded by default: aria-expanded="false" and a chevron', async () => {
    const page = await newSpecPage({
      components: [MaterialNavigationGroup],
      html: `<material-navigation-group label="Section" icon="folder"></material-navigation-group>`,
    });
    const button = page.root!.shadowRoot!.querySelector('button')!;
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(button.getAttribute('aria-label')).toBe('Section');
    expect(button.getAttribute('aria-controls')).toBe('group-items');
    expect(page.root!.shadowRoot!.querySelector('.chevron')).not.toBeNull();
    expect(page.root!.shadowRoot!.querySelector('.icon')!.textContent).toBe('folder');
  });

  it('ariaLabel overrides the label fallback for the header button', async () => {
    const page = await newSpecPage({
      components: [MaterialNavigationGroup],
      html: `<material-navigation-group label="Section" aria-label="Section nav"></material-navigation-group>`,
    });
    const button = page.root!.shadowRoot!.querySelector('button')!;
    expect(button.getAttribute('aria-label')).toBe('Section nav');
  });

  it('open reflects as an attribute and flips aria-expanded / the items grid-template-rows', async () => {
    const page = await newSpecPage({
      components: [MaterialNavigationGroup],
      html: `<material-navigation-group label="Section" open></material-navigation-group>`,
    });
    expect(page.root!.hasAttribute('open')).toBe(true);
    const button = page.root!.shadowRoot!.querySelector('button')!;
    expect(button.getAttribute('aria-expanded')).toBe('true');
    const items = page.root!.shadowRoot!.querySelector('#group-items') as HTMLElement;
    expect(items.style.gridTemplateRows).toBe('1fr');
    expect(items.hasAttribute('aria-hidden')).toBe(false);
  });

  it('clicking the header toggles open and emits materialGroupToggle with the new state', async () => {
    const page = await newSpecPage({
      components: [MaterialNavigationGroup],
      html: `<material-navigation-group label="Section"></material-navigation-group>`,
    });
    const toggleSpy = jest.fn();
    page.root!.addEventListener('materialGroupToggle', toggleSpy);
    const button = page.root!.shadowRoot!.querySelector('button')!;

    button.click();
    await page.waitForChanges();
    expect(page.rootInstance.open).toBe(true);
    expect(toggleSpy).toHaveBeenCalledTimes(1);
    expect(toggleSpy.mock.calls[0][0].detail).toEqual({ open: true });

    button.click();
    await page.waitForChanges();
    expect(page.rootInstance.open).toBe(false);
    expect(toggleSpy).toHaveBeenCalledTimes(2);
    expect(toggleSpy.mock.calls[1][0].detail).toEqual({ open: false });
  });

  it('variant="rail-collapsed" renders the collapsed anatomy without a chevron, aria-expanded stays false', async () => {
    const page = await newSpecPage({
      components: [MaterialNavigationGroup],
      html: `<material-navigation-group label="Section" variant="rail-collapsed"></material-navigation-group>`,
    });
    expect(page.root!.shadowRoot!.querySelector('.item-collapsed')).not.toBeNull();
    expect(page.root!.shadowRoot!.querySelector('.chevron')).toBeNull();
    const button = page.root!.shadowRoot!.querySelector('button')!;
    expect(button.getAttribute('aria-expanded')).toBe('false');
  });

  it('clicking a collapsed group sets open=true (expanding the parent rail is the caller\'s job via closest())', async () => {
    const page = await newSpecPage({
      components: [MaterialNavigationGroup],
      html: `<material-navigation-group label="Section" variant="rail-collapsed"></material-navigation-group>`,
    });
    const button = page.root!.shadowRoot!.querySelector('button')!;
    button.click();
    await page.waitForChanges();
    expect(page.rootInstance.open).toBe(true);
  });

  it('restores its open state from localStorage under the storage-key on load', async () => {
    // newSpecPage installs its own mock window/localStorage as part of setup,
    // so the item has to be seeded on page.win.localStorage *after* the page
    // exists but *before* the component upgrades — build the element by hand
    // instead of via the `html` shorthand (which upgrades synchronously).
    const page = await newSpecPage({ components: [MaterialNavigationGroup], html: `<div></div>` });
    page.win.localStorage.setItem('material-nav-group:sec1', '1');
    const el = page.doc.createElement('material-navigation-group') as HTMLElement & { open: boolean };
    el.setAttribute('label', 'Section');
    el.setAttribute('storage-key', 'sec1');
    page.root!.appendChild(el);
    await page.waitForChanges();
    expect(el.open).toBe(true);
  });

  it('persists open state to localStorage under the storage-key when it changes', async () => {
    const page = await newSpecPage({
      components: [MaterialNavigationGroup],
      html: `<material-navigation-group label="Section" storage-key="sec1" open></material-navigation-group>`,
    });
    page.rootInstance.open = false;
    await page.waitForChanges();
    expect(page.win.localStorage.getItem('material-nav-group:sec1')).toBe('0');
  });

  it('setFocus() resolves without throwing', async () => {
    const page = await newSpecPage({
      components: [MaterialNavigationGroup],
      html: `<material-navigation-group label="Section"></material-navigation-group>`,
    });
    await expect(page.rootInstance.setFocus()).resolves.toBeUndefined();
  });

  it('slots child items into the group-children container when expanded', async () => {
    const page = await newSpecPage({
      components: [MaterialNavigationGroup],
      html: `<material-navigation-group label="Section" open><material-navigation-item label="Sub"></material-navigation-item></material-navigation-group>`,
    });
    expect(page.root!.shadowRoot!.querySelector('.group-children slot')).not.toBeNull();
    expect(page.root!.querySelector('material-navigation-item')).not.toBeNull();
  });
});
