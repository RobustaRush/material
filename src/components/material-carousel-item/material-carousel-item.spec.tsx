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
import { MaterialCarouselItem } from './material-carousel-item';

describe('material-carousel-item', () => {
  it('renders the plain slide variant with group/slide semantics', async () => {
    const page = await newSpecPage({
      components: [MaterialCarouselItem],
      html: `<material-carousel-item aria-label="Photo of a mountain">Content</material-carousel-item>`,
    });
    expect(page.root!.getAttribute('tabindex')).toBe('0');
    const surface = page.root!.shadowRoot!.querySelector('[part="surface"]')!;
    expect(surface.tagName).toBe('DIV');
    expect(surface.getAttribute('role')).toBe('group');
    expect(surface.getAttribute('aria-roledescription')).toBe('slide');
    expect(surface.getAttribute('aria-label')).toBe('Photo of a mountain');
    const stateLayer = page.root!.shadowRoot!.querySelector('[part="state-layer"]')!;
    expect(stateLayer.getAttribute('aria-hidden')).toBe('true');
  });

  it('reflects the aspect prop to the host attribute', async () => {
    const page = await newSpecPage({
      components: [MaterialCarouselItem],
      html: `<material-carousel-item aspect="16:9"></material-carousel-item>`,
    });
    expect(page.root!.getAttribute('aspect')).toBe('16:9');
  });

  it('disabled plain variant is removed from the tab order', async () => {
    const page = await newSpecPage({
      components: [MaterialCarouselItem],
      html: `<material-carousel-item disabled></material-carousel-item>`,
    });
    expect(page.root!.getAttribute('tabindex')).toBe('-1');
    expect(page.root!.getAttribute('disabled')).toBe('');
  });

  it('clickable without href renders a button surface', async () => {
    const page = await newSpecPage({
      components: [MaterialCarouselItem],
      html: `<material-carousel-item clickable aria-label="Pick me"></material-carousel-item>`,
    });
    const button = page.root!.shadowRoot!.querySelector('button[part="surface"]')!;
    expect(button).not.toBeNull();
    expect(button.getAttribute('type')).toBe('button');
    expect(button.getAttribute('aria-label')).toBe('Pick me');
    expect(button.hasAttribute('disabled')).toBe(false);
  });

  it('clickable + disabled renders a disabled button', async () => {
    const page = await newSpecPage({
      components: [MaterialCarouselItem],
      html: `<material-carousel-item clickable disabled></material-carousel-item>`,
    });
    const button = page.root!.shadowRoot!.querySelector('button[part="surface"]') as HTMLButtonElement;
    expect(button.hasAttribute('disabled')).toBe(true);
  });

  it('href renders an anchor surface with target/rel', async () => {
    const page = await newSpecPage({
      components: [MaterialCarouselItem],
      html: `<material-carousel-item href="/gallery/1" target="_blank"></material-carousel-item>`,
    });
    const a = page.root!.shadowRoot!.querySelector('a[part="surface"]')!;
    expect(a.getAttribute('href')).toBe('/gallery/1');
    expect(a.getAttribute('target')).toBe('_blank');
    // Default rel is derived from target=_blank when the caller doesn't set one.
    expect(a.getAttribute('rel')).toBe('noopener noreferrer');
    expect(a.getAttribute('tabindex')).toBe('0');
  });

  it('an explicit rel overrides the target=_blank default', async () => {
    const page = await newSpecPage({
      components: [MaterialCarouselItem],
      html: `<material-carousel-item href="/x" target="_blank" rel="bookmark"></material-carousel-item>`,
    });
    const a = page.root!.shadowRoot!.querySelector('a[part="surface"]')!;
    expect(a.getAttribute('rel')).toBe('bookmark');
  });

  it('disabled href variant strips the href and blocks the click without navigating', async () => {
    const page = await newSpecPage({
      components: [MaterialCarouselItem],
      html: `<material-carousel-item href="/gallery/1" disabled></material-carousel-item>`,
    });
    const a = page.root!.shadowRoot!.querySelector('a[part="surface"]')!;
    expect(a.getAttribute('href')).toBeNull();
    expect(a.getAttribute('role')).toBe('link');
    expect(a.getAttribute('aria-disabled')).toBe('true');
    expect(a.getAttribute('tabindex')).toBe('-1');

    // onBlockedClick stops the event from reaching the host.
    const hostSpy = jest.fn();
    page.root!.addEventListener('click', hostSpy);
    a.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    await page.waitForChanges();
    expect(hostSpy).not.toHaveBeenCalled();
  });

  it('shows the text block only once headline/supporting content is slotted', async () => {
    const emptyPage = await newSpecPage({
      components: [MaterialCarouselItem],
      html: `<material-carousel-item></material-carousel-item>`,
    });
    const textBlock = emptyPage.root!.shadowRoot!.querySelector('[part="text"]')!;
    expect(textBlock.hasAttribute('hidden')).toBe(true);

    const page = await newSpecPage({
      components: [MaterialCarouselItem],
      html: `<material-carousel-item><span slot="headline">Mountain view</span></material-carousel-item>`,
    });
    expect(page.root!.shadowRoot!.querySelector('[part="text"]')!.hasAttribute('hidden')).toBe(false);
  });
});
