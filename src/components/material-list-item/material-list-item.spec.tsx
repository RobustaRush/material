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
import { MaterialListItem } from './material-list-item';

describe('material-list-item', () => {
  it('renders a one-line listitem with label, icons, trailing text and roving tabindex', async () => {
    const page = await newSpecPage({
      components: [MaterialListItem],
      html: `<material-list-item label="Inbox" leading-icon="inbox" trailing-text="12" tabbable></material-list-item>`,
    });
    const root = page.root!;
    expect(root.getAttribute('role')).toBe('listitem');
    expect(root.getAttribute('tabindex')).toBe('0');
    expect(root.shadowRoot!.querySelector('.label')!.textContent).toBe('Inbox');
    expect(root.shadowRoot!.querySelector('.leading .icon')!.textContent).toBe('inbox');
    expect(root.shadowRoot!.querySelector('.trailing-text')!.textContent).toBe('12');
    expect(root.shadowRoot!.querySelector('.row')!.classList.contains('one-line')).toBe(true);
  });

  it('supporting text and overline switch the row to the three-line layout', async () => {
    const page = await newSpecPage({
      components: [MaterialListItem],
      html: `<material-list-item overline="Today" label="Invoice" supporting-text="Awaiting approval"></material-list-item>`,
    });
    const row = page.root!.shadowRoot!.querySelector('.row')!;
    expect(row.classList.contains('three-line')).toBe(true);
    expect(page.root!.shadowRoot!.querySelector('.overline')!.textContent).toBe('Today');
    expect(page.root!.shadowRoot!.querySelector('.supporting-text')!.textContent).toBe('Awaiting approval');
  });

  it('default light DOM content suppresses the label fallback', async () => {
    const page = await newSpecPage({
      components: [MaterialListItem],
      html: `<material-list-item label="Fallback"><strong>Projected</strong></material-list-item>`,
    });
    const label = page.root!.shadowRoot!.querySelector('.label')!;
    expect(label.textContent).not.toContain('Fallback');
    expect(page.root!.textContent).toContain('Projected');
  });

  it('disabled reflects a11y state, removes the tab stop and blocks activation', async () => {
    const page = await newSpecPage({
      components: [MaterialListItem],
      html: `<material-list-item disabled value="archive" label="Archive"></material-list-item>`,
    });
    const spy = jest.fn();
    page.root!.addEventListener('materialListItemActivate', spy);

    page.root!.click();
    await page.waitForChanges();

    expect(page.root!.getAttribute('aria-disabled')).toBe('true');
    expect(page.root!.getAttribute('tabindex')).toBe('-1');
    expect(spy).not.toHaveBeenCalled();
  });

  it('href renders an anchor and still emits the row activation event', async () => {
    const page = await newSpecPage({
      components: [MaterialListItem],
      html: `<material-list-item href="/orders/" value="orders" label="Orders"></material-list-item>`,
    });
    const anchor = page.root!.shadowRoot!.querySelector('a.link')!;
    expect(anchor.getAttribute('href')).toBe('/orders/');
  });
});
