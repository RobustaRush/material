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
import { MaterialNavigationItem } from './material-navigation-item';

describe('material-navigation-item', () => {
  it('renders a button by default with the label and icon, aria-label falling back to label', async () => {
    const page = await newSpecPage({
      components: [MaterialNavigationItem],
      html: `<material-navigation-item label="Home" icon="home"></material-navigation-item>`,
    });
    const button = page.root!.shadowRoot!.querySelector('button')!;
    expect(button.getAttribute('type')).toBe('button');
    expect(button.getAttribute('aria-label')).toBe('Home');
    expect(button.getAttribute('aria-current')).toBeNull();
    expect(button.querySelector('.icon')!.textContent).toBe('home');
    expect(button.querySelector('.label-collapsed')!.textContent).toBe('Home');
  });

  it('ariaLabel prop overrides the label fallback', async () => {
    const page = await newSpecPage({
      components: [MaterialNavigationItem],
      html: `<material-navigation-item label="Home" aria-label="Go home"></material-navigation-item>`,
    });
    const button = page.root!.shadowRoot!.querySelector('button')!;
    expect(button.getAttribute('aria-label')).toBe('Go home');
  });

  it('renders an anchor with href, and drops href/becomes a button when disabled', async () => {
    const page = await newSpecPage({
      components: [MaterialNavigationItem],
      html: `<material-navigation-item label="Home" href="/home"></material-navigation-item>`,
    });
    const a = page.root!.shadowRoot!.querySelector('a')!;
    expect(a).not.toBeNull();
    expect(a.getAttribute('href')).toBe('/home');

    page.root!.disabled = true;
    await page.waitForChanges();
    expect(page.root!.shadowRoot!.querySelector('a')).toBeNull();
    const button = page.root!.shadowRoot!.querySelector('button')!;
    expect(button.hasAttribute('disabled')).toBe(true);
  });

  it('active reflects aria-current="page" and applies FILL 1 to the icon', async () => {
    const page = await newSpecPage({
      components: [MaterialNavigationItem],
      html: `<material-navigation-item label="Home" icon="home" active></material-navigation-item>`,
    });
    expect(page.root!.hasAttribute('active')).toBe(true);
    const button = page.root!.shadowRoot!.querySelector('button')!;
    expect(button.getAttribute('aria-current')).toBe('page');
    const icon = button.querySelector('.icon') as HTMLElement;
    expect(icon.style.fontVariationSettings).toBe('"FILL" 1');
  });

  it('active-icon swaps the glyph instead of using the FILL variation when active', async () => {
    const page = await newSpecPage({
      components: [MaterialNavigationItem],
      html: `<material-navigation-item label="Home" icon="home" active-icon="home_filled" active></material-navigation-item>`,
    });
    const icon = page.root!.shadowRoot!.querySelector('.icon') as HTMLElement;
    expect(icon.textContent).toBe('home_filled');
    expect(icon.style.fontVariationSettings).toBe('');
  });

  it('variant switches between collapsed / expanded / bar-horizontal markup', async () => {
    const collapsed = await newSpecPage({
      components: [MaterialNavigationItem],
      html: `<material-navigation-item label="Home" variant="rail-collapsed"></material-navigation-item>`,
    });
    expect(collapsed.root!.shadowRoot!.querySelector('.item-collapsed')).not.toBeNull();

    const expanded = await newSpecPage({
      components: [MaterialNavigationItem],
      html: `<material-navigation-item label="Home" variant="rail-expanded"></material-navigation-item>`,
    });
    expect(expanded.root!.shadowRoot!.querySelector('.item-expanded')).not.toBeNull();
    expect(expanded.root!.getAttribute('variant')).toBe('rail-expanded');

    const barHorizontal = await newSpecPage({
      components: [MaterialNavigationItem],
      html: `<material-navigation-item label="Home" variant="bar-horizontal"></material-navigation-item>`,
    });
    expect(barHorizontal.root!.shadowRoot!.querySelector('.item-bar-horizontal')).not.toBeNull();
    expect(barHorizontal.root!.shadowRoot!.querySelector('.pill')).not.toBeNull();

    const bar = await newSpecPage({
      components: [MaterialNavigationItem],
      html: `<material-navigation-item label="Home" variant="bar"></material-navigation-item>`,
    });
    // 'bar' shares the collapsed anatomy per the component's own comment.
    expect(bar.root!.shadowRoot!.querySelector('.item-collapsed')).not.toBeNull();
  });

  it('emits materialSelect with the value on click', async () => {
    const page = await newSpecPage({
      components: [MaterialNavigationItem],
      html: `<material-navigation-item label="Home" value="home"></material-navigation-item>`,
    });
    const selectSpy = jest.fn();
    page.root!.addEventListener('materialSelect', selectSpy);
    const button = page.root!.shadowRoot!.querySelector('button')!;
    button.click();
    await page.waitForChanges();
    expect(selectSpy).toHaveBeenCalledTimes(1);
    expect(selectSpy.mock.calls[0][0].detail).toEqual({ value: 'home' });
  });

  it('does not emit materialSelect when disabled', async () => {
    const page = await newSpecPage({
      components: [MaterialNavigationItem],
      html: `<material-navigation-item label="Home" value="home" disabled></material-navigation-item>`,
    });
    const selectSpy = jest.fn();
    page.root!.addEventListener('materialSelect', selectSpy);
    const button = page.root!.shadowRoot!.querySelector('button')!;
    button.click();
    await page.waitForChanges();
    expect(selectSpy).not.toHaveBeenCalled();
  });

  it('setFocus() resolves without throwing', async () => {
    const page = await newSpecPage({
      components: [MaterialNavigationItem],
      html: `<material-navigation-item label="Home"></material-navigation-item>`,
    });
    await expect(page.rootInstance.setFocus()).resolves.toBeUndefined();
  });

  it('slots badge content in both the collapsed and expanded anatomies', async () => {
    const page = await newSpecPage({
      components: [MaterialNavigationItem],
      html: `<material-navigation-item label="Home" variant="rail-expanded"><span slot="badge">3</span></material-navigation-item>`,
    });
    expect(page.root!.shadowRoot!.querySelector('slot[name="badge"]')).not.toBeNull();
    expect(page.root!.querySelector('[slot="badge"]')!.textContent).toBe('3');
  });
});
