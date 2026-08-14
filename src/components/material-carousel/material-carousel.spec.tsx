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
import { MaterialCarousel } from './material-carousel';
import { MaterialCarouselItem } from '../material-carousel-item/material-carousel-item';

// mock-doc doesn't implement ResizeObserver; componentDidLoad constructs one
// unconditionally, so any render throws without this stub (a real browser,
// which e2e drives, always has it). Real keyboard-driven focus/scroll and the
// live parallax geometry aren't reproducible in mock-doc either — that
// behavior is covered by material-carousel.e2e.tsx instead.
class FakeResizeObserver {
  observe() {}
  disconnect() {}
  unobserve() {}
}
(globalThis as any).ResizeObserver = FakeResizeObserver;

// componentDidLoad defers aria-label assignment/parallax measurement to a
// requestAnimationFrame callback; flush it before asserting on that state.
async function settle(page: { waitForChanges: () => Promise<void> }) {
  await page.waitForChanges();
  await new Promise((r) => setTimeout(r, 20));
  await page.waitForChanges();
}

describe('material-carousel', () => {
  it('renders group/carousel semantics and the default layout/snap', async () => {
    const page = await newSpecPage({
      components: [MaterialCarousel],
      html: `<material-carousel></material-carousel>`,
    });
    expect(page.root!.getAttribute('role')).toBe('group');
    expect(page.root!.getAttribute('aria-roledescription')).toBe('carousel');
    expect(page.root!.getAttribute('layout')).toBe('uncontained');
    expect(page.root!.getAttribute('snap')).toBe('proximity');
    const scroller = page.root!.shadowRoot!.querySelector('[part="scroller"]')!;
    expect(scroller).not.toBeNull();
    expect(scroller.querySelector('slot')).not.toBeNull();
  });

  it('reflects the layout and snap props to host attributes', async () => {
    const page = await newSpecPage({
      components: [MaterialCarousel],
      html: `<material-carousel layout="uncontained-multi-aspect" snap="mandatory"></material-carousel>`,
    });
    expect(page.root!.getAttribute('layout')).toBe('uncontained-multi-aspect');
    expect(page.root!.getAttribute('snap')).toBe('mandatory');
  });

  it('sets the aria-label prop on the host', async () => {
    const page = await newSpecPage({
      components: [MaterialCarousel],
      html: `<material-carousel aria-label="Featured products"></material-carousel>`,
    });
    expect(page.root!.getAttribute('aria-label')).toBe('Featured products');
  });

  it('sets --carousel-large-width from largeWidth, default and overridden', async () => {
    const defaultPage = await newSpecPage({
      components: [MaterialCarousel],
      html: `<material-carousel></material-carousel>`,
    });
    expect(defaultPage.root!.style.getPropertyValue('--carousel-large-width')).toBe('300px');

    const customPage = await newSpecPage({
      components: [MaterialCarousel],
      html: `<material-carousel large-width="480"></material-carousel>`,
    });
    expect(customPage.root!.style.getPropertyValue('--carousel-large-width')).toBe('480px');
  });

  it('auto-assigns "Item N of M" aria-labels to slotted items lacking one', async () => {
    const page = await newSpecPage({
      components: [MaterialCarousel, MaterialCarouselItem],
      html: `<material-carousel>
        <material-carousel-item>One</material-carousel-item>
        <material-carousel-item aria-label="Custom label">Two</material-carousel-item>
        <material-carousel-item>Three</material-carousel-item>
      </material-carousel>`,
    });
    await settle(page);
    const items = page.root!.querySelectorAll('material-carousel-item');
    expect(items[0].getAttribute('aria-label')).toBe('Item 1 of 3');
    // Already-labeled items are left alone.
    expect(items[1].getAttribute('aria-label')).toBe('Custom label');
    expect(items[2].getAttribute('aria-label')).toBe('Item 3 of 3');
  });

  it('parallax prop: sets a --parallax custom property on items when true, removes it when false', async () => {
    const onPage = await newSpecPage({
      components: [MaterialCarousel, MaterialCarouselItem],
      html: `<material-carousel><material-carousel-item>One</material-carousel-item></material-carousel>`,
    });
    await settle(onPage);
    const onItem = onPage.root!.querySelector('material-carousel-item') as HTMLElement;
    expect(onItem.style.getPropertyValue('--parallax')).toContain('px');

    const offPage = await newSpecPage({
      components: [MaterialCarousel, MaterialCarouselItem],
      html: `<material-carousel parallax="false"><material-carousel-item>One</material-carousel-item></material-carousel>`,
    });
    await settle(offPage);
    const offItem = offPage.root!.querySelector('material-carousel-item') as HTMLElement;
    expect(offItem.style.getPropertyValue('--parallax')).toBe('');
  });
});
