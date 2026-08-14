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
import { MaterialPagination } from './material-pagination';

describe('material-pagination', () => {
  it('defaults to page 1 of 1, role=navigation with the default aria-label', async () => {
    const page = await newSpecPage({
      components: [MaterialPagination],
      html: `<material-pagination></material-pagination>`,
    });
    expect(page.root!.getAttribute('role')).toBe('navigation');
    expect(page.root!.getAttribute('aria-label')).toBe('Pagination');
    const current = page.root!.querySelector('.item.current')!;
    expect(current.textContent).toBe('1');
    expect(current.getAttribute('aria-current')).toBe('page');
  });

  it('a custom aria-label overrides the default', async () => {
    const page = await newSpecPage({
      components: [MaterialPagination],
      html: `<material-pagination aria-label="Search results"></material-pagination>`,
    });
    expect(page.root!.getAttribute('aria-label')).toBe('Search results');
  });

  it('renders a windowed set of page buttons with an ellipsis gap', async () => {
    const page = await newSpecPage({
      components: [MaterialPagination],
      html: `<material-pagination page="5" pages="10"></material-pagination>`,
    });
    const items = Array.from(page.root!.querySelectorAll('.item:not(.nav), .gap')).map((el) =>
      el.classList.contains('gap') ? '…' : el.textContent,
    );
    // siblings defaults to 1: 1, …, 4, 5, 6, …, 10.
    expect(items).toEqual(['1', '…', '4', '5', '6', '…', '10']);
  });

  it('siblings widens the window kept visible around the current page', async () => {
    const page = await newSpecPage({
      components: [MaterialPagination],
      html: `<material-pagination page="5" pages="10" siblings="2"></material-pagination>`,
    });
    const items = Array.from(page.root!.querySelectorAll('.item:not(.nav), .gap')).map((el) =>
      el.classList.contains('gap') ? '…' : el.textContent,
    );
    expect(items).toEqual(['1', '2', '3', '4', '5', '6', '7', '…', '10']);
  });

  it('collapses a one-page gap into the actual page number instead of an ellipsis', async () => {
    const page = await newSpecPage({
      components: [MaterialPagination],
      html: `<material-pagination page="3" pages="5"></material-pagination>`,
    });
    const items = Array.from(page.root!.querySelectorAll('.item:not(.nav), .gap')).map((el) =>
      el.classList.contains('gap') ? '…' : el.textContent,
    );
    // page 2's gap-to-1 is only one page wide, so it's shown, not elided.
    expect(items).toEqual(['1', '2', '3', '4', '5']);
  });

  it('the previous button is disabled on the first page, next disabled on the last', async () => {
    const page = await newSpecPage({
      components: [MaterialPagination],
      html: `<material-pagination page="1" pages="3"></material-pagination>`,
    });
    const navButtons = page.root!.querySelectorAll('.item.nav') as unknown as HTMLButtonElement[];
    expect(navButtons[0].hasAttribute('disabled')).toBe(true);
    expect(navButtons[1].hasAttribute('disabled')).toBe(false);
  });

  it('clicking a page button updates page and emits materialPageChange', async () => {
    const page = await newSpecPage({
      components: [MaterialPagination],
      html: `<material-pagination page="1" pages="3"></material-pagination>`,
    });
    const changeSpy = jest.fn();
    page.root!.addEventListener('materialPageChange', changeSpy);

    const buttons = Array.from(page.root!.querySelectorAll('.item')) as HTMLButtonElement[];
    const pageTwo = buttons.find((b) => b.textContent === '2')!;
    pageTwo.click();
    await page.waitForChanges();

    expect(changeSpy).toHaveBeenCalledTimes(1);
    expect(changeSpy.mock.calls[0][0].detail).toEqual({ page: 2 });
    expect(page.root!.getAttribute('page')).toBe('2');
  });

  it('the next chevron button advances the page on click', async () => {
    const page = await newSpecPage({
      components: [MaterialPagination],
      html: `<material-pagination page="1" pages="3"></material-pagination>`,
    });
    const changeSpy = jest.fn();
    page.root!.addEventListener('materialPageChange', changeSpy);

    const nextButton = page.root!.querySelectorAll('.item.nav')[1] as HTMLButtonElement;
    nextButton.click();
    await page.waitForChanges();

    expect(changeSpy.mock.calls[0][0].detail).toEqual({ page: 2 });
  });

  it('a disabled nav button click is a no-op (no event, no page change)', async () => {
    const page = await newSpecPage({
      components: [MaterialPagination],
      html: `<material-pagination page="1" pages="3"></material-pagination>`,
    });
    const changeSpy = jest.fn();
    page.root!.addEventListener('materialPageChange', changeSpy);

    const prevButton = page.root!.querySelectorAll('.item.nav')[0] as HTMLButtonElement;
    prevButton.click();
    await page.waitForChanges();

    expect(changeSpy).not.toHaveBeenCalled();
    expect(page.root!.getAttribute('page')).toBe('1');
  });

  it('href-template renders anchors instead of buttons, with up-target copied through', async () => {
    const page = await newSpecPage({
      components: [MaterialPagination],
      html: `<material-pagination page="2" pages="3" href-template="?page={page}" up-target="#list"></material-pagination>`,
    });
    expect(page.root!.querySelector('button.item')).toBeNull();
    const links = Array.from(page.root!.querySelectorAll('a.item')) as HTMLAnchorElement[];
    const pageOne = links.find((a) => a.textContent === '1')!;
    expect(pageOne.getAttribute('href')).toBe('?page=1');
    expect(pageOne.getAttribute('up-target')).toBe('#list');
    const current = page.root!.querySelector('a.item.current')!;
    expect(current.textContent).toBe('2');
    expect(current.getAttribute('aria-current')).toBe('page');
  });

  it('href-template omits the anchor for a disabled nav direction (first/last page)', async () => {
    const page = await newSpecPage({
      components: [MaterialPagination],
      html: `<material-pagination page="1" pages="3" href-template="?page={page}"></material-pagination>`,
    });
    const navs = page.root!.querySelectorAll('.item.nav');
    // Previous is disabled at page 1 → falls back to a (disabled) button.
    expect(navs[0].tagName.toLowerCase()).toBe('button');
    expect((navs[0] as HTMLButtonElement).hasAttribute('disabled')).toBe(true);
    // Next is still available → real anchor.
    expect(navs[1].tagName.toLowerCase()).toBe('a');
    expect(navs[1].getAttribute('href')).toBe('?page=2');
  });

  it('page and pages attributes clamp: page beyond pages still marks the last page current', async () => {
    const page = await newSpecPage({
      components: [MaterialPagination],
      html: `<material-pagination page="99" pages="3"></material-pagination>`,
    });
    const current = page.root!.querySelector('.item.current')!;
    expect(current.textContent).toBe('3');
  });
});
