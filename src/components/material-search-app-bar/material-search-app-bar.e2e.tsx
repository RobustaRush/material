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

// Real browser, not newSpecPage: material-search-app-bar is formAssociated
// and calls ElementInternals form methods in lifecycle.

describe('material-search-app-bar', () => {
  it('renders banner/search semantics with the built-in searchbox', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-search-app-bar aria-label="Global search" placeholder="Search records"></material-search-app-bar>`);
    const host = await page.find('material-search-app-bar');
    const input = await page.find('material-search-app-bar >>> input.search-input');
    expect(host.getAttribute('role')).toBe('banner');
    expect(host.getAttribute('aria-label')).toBe('Global search');
    expect(input.getAttribute('role')).toBe('searchbox');
    expect(input.getAttribute('placeholder')).toBe('Search records');
    expect(input.getAttribute('aria-label')).toBe('Global search');
  });

  it('typing emits materialSearchInput and updates form data', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <form id="f" onsubmit="event.preventDefault()">
        <material-search-app-bar name="q"></material-search-app-bar>
      </form>
    `);
    const inputSpy = await page.spyOnEvent('materialSearchInput');

    const input = await page.find('material-search-app-bar >>> input.search-input');
    await input.type('alpha');
    await page.waitForChanges();

    expect(inputSpy).toHaveReceivedEventDetail({ value: 'alpha' });
    expect(await page.evaluate(() =>
      new FormData(document.getElementById('f') as HTMLFormElement).get('q'),
    )).toBe('alpha');
  });

  it('Enter emits materialSearchSubmit with the current value', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <form id="f" onsubmit="event.preventDefault()">
        <material-search-app-bar name="q" value="alpha"></material-search-app-bar>
      </form>
    `);
    const submitSpy = await page.spyOnEvent('materialSearchSubmit');

    const input = await page.find('material-search-app-bar >>> input.search-input');
    await input.press('Enter');
    await page.waitForChanges();

    expect(submitSpy).toHaveReceivedEventDetail({ value: 'alpha' });
  });

  it('form reset restores the initial value', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <form id="f">
        <material-search-app-bar name="q" value="initial"></material-search-app-bar>
      </form>
    `);
    const el = await page.find('material-search-app-bar');
    await el.setProperty('value', 'changed');
    await page.waitForChanges();

    await page.evaluate(() => (document.getElementById('f') as HTMLFormElement).reset());
    await page.waitForChanges();

    expect(await el.getProperty('value')).toBe('initial');
    expect(await page.$eval(
      'material-search-app-bar',
      (host) => (host.shadowRoot!.querySelector('input') as HTMLInputElement).value,
    )).toBe('initial');
  });

  it('a custom search slot replaces the built-in input', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <material-search-app-bar>
        <div slot="search" id="custom">Custom search</div>
      </material-search-app-bar>
    `);
    await page.waitForChanges();

    expect(await page.find('material-search-app-bar >>> input.search-input')).toBeNull();
    expect(await page.find('#custom')).not.toBeNull();
  });

  it('scrollTarget drives the reflected scrolled state', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <div id="scroller" style="height: 40px; overflow: auto">
        <div style="height: 120px"></div>
      </div>
      <material-search-app-bar scroll-target="#scroller"></material-search-app-bar>
    `);
    const el = await page.find('material-search-app-bar');

    await page.evaluate(() => {
      const scroller = document.getElementById('scroller')!;
      scroller.scrollTop = 20;
      scroller.dispatchEvent(new Event('scroll'));
    });
    await page.waitForChanges();

    expect(el.getAttribute('scrolled')).not.toBeNull();
  });
});
