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
import { MaterialBreadcrumbs } from './material-breadcrumbs';

describe('material-breadcrumbs', () => {
  it('renders nav semantics with a default aria-label and marks the last crumb current', async () => {
    const page = await newSpecPage({
      components: [MaterialBreadcrumbs],
      html: `
        <material-breadcrumbs>
          <a href="/">Home</a>
          <a href="/purchasing/">Purchasing</a>
          <span>PO-2026-0142</span>
        </material-breadcrumbs>
      `,
    });
    expect(page.root!.getAttribute('role')).toBe('navigation');
    expect(page.root!.getAttribute('aria-label')).toBe('Breadcrumbs');

    const items = Array.from(page.root!.children);
    expect(items[items.length - 1].getAttribute('aria-current')).toBe('page');
    expect(items[0].hasAttribute('aria-current')).toBe(false);
    expect(items[1].hasAttribute('aria-current')).toBe(false);
  });

  it('uses the aria-label prop over the default translation', async () => {
    const page = await newSpecPage({
      components: [MaterialBreadcrumbs],
      html: `
        <material-breadcrumbs aria-label="Order path">
          <a href="/">Home</a>
          <span>Order</span>
        </material-breadcrumbs>
      `,
    });
    expect(page.root!.getAttribute('aria-label')).toBe('Order path');
  });

  it('does not move aria-current when the server already marked a crumb', async () => {
    const page = await newSpecPage({
      components: [MaterialBreadcrumbs],
      html: `
        <material-breadcrumbs>
          <a href="/">Home</a>
          <span aria-current="page">Purchasing</span>
          <span>PO-2026-0142</span>
        </material-breadcrumbs>
      `,
    });
    const items = Array.from(page.root!.children);
    expect(items[1].getAttribute('aria-current')).toBe('page');
    expect(items[items.length - 1].hasAttribute('aria-current')).toBe(false);
  });

  it('re-marks the last crumb after the light DOM is swapped and slotchange fires', async () => {
    const page = await newSpecPage({
      components: [MaterialBreadcrumbs],
      html: `
        <material-breadcrumbs>
          <a href="/">Home</a>
          <span>Old</span>
        </material-breadcrumbs>
      `,
    });
    expect(Array.from(page.root!.children).pop()!.getAttribute('aria-current')).toBe('page');

    while (page.root!.firstElementChild) {
      page.root!.removeChild(page.root!.firstElementChild);
    }
    page.root!.innerHTML = `
      <a href="/">Home</a>
      <a href="/mid/">Mid</a>
      <span>New</span>
    `;
    page.root!.shadowRoot!.querySelector('slot')!.dispatchEvent(new Event('slotchange'));
    await page.waitForChanges();

    const items = Array.from(page.root!.children);
    expect(items[items.length - 1].getAttribute('aria-current')).toBe('page');
    expect(items[items.length - 1].textContent).toBe('New');
  });

  it('renders an empty crumb list without throwing', async () => {
    const page = await newSpecPage({
      components: [MaterialBreadcrumbs],
      html: `<material-breadcrumbs></material-breadcrumbs>`,
    });
    expect(page.root!.children.length).toBe(0);
  });
});
