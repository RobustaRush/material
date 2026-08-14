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
import { MaterialMenuItem } from './material-menu-item';

describe('material-menu-item', () => {
  it('renders the label and default a11y attributes', async () => {
    const page = await newSpecPage({
      components: [MaterialMenuItem],
      html: `<material-menu-item label="Cut" leading-icon="content_cut"></material-menu-item>`,
    });
    expect(page.root!.getAttribute('role')).toBe('menuitem');
    expect(page.root!.getAttribute('tabindex')).toBe('0');
    expect(page.root!.getAttribute('aria-disabled')).toBeNull();
    expect(page.root!.getAttribute('aria-current')).toBeNull();
    const label = page.root!.shadowRoot!.querySelector('.label')!;
    expect(label.textContent).toBe('Cut');
    const icon = page.root!.shadowRoot!.querySelector('.leading .icon')!;
    expect(icon.textContent).toBe('content_cut');
  });

  it('disabled: reflects the attribute and sets aria-disabled/tabindex', async () => {
    const page = await newSpecPage({
      components: [MaterialMenuItem],
      html: `<material-menu-item label="Cut" disabled></material-menu-item>`,
    });
    expect(page.root!.getAttribute('aria-disabled')).toBe('true');
    expect(page.root!.getAttribute('tabindex')).toBe('-1');
  });

  it('selected: reflects the attribute and sets aria-current', async () => {
    const page = await newSpecPage({
      components: [MaterialMenuItem],
      html: `<material-menu-item label="Cut" selected></material-menu-item>`,
    });
    expect(page.root!.getAttribute('selected')).toBe('');
    expect(page.root!.getAttribute('aria-current')).toBe('true');
  });

  it('divider prop reflects to the host attribute', async () => {
    const page = await newSpecPage({
      components: [MaterialMenuItem],
      html: `<material-menu-item divider="top"></material-menu-item>`,
    });
    expect(page.root!.getAttribute('divider')).toBe('top');
  });

  // Click/keydown activation is covered in material-menu-item.e2e.tsx: activate()
  // unconditionally queries `:scope > [slot="leading"]`, a selector mock-doc's
  // querySelector doesn't implement (throws "unsupported pseudo: scope"), so
  // any click or Enter/Space keydown throws before emitting here.

  it('two-line: supporting-text renders a second line only when the prop is set', async () => {
    const page = await newSpecPage({
      components: [MaterialMenuItem],
      html: `<material-menu-item label="Cut" supporting-text="Removes selection"></material-menu-item>`,
    });
    const supporting = page.root!.shadowRoot!.querySelector('.supporting-text');
    expect(supporting).not.toBeNull();
    expect(supporting!.textContent).toBe('Removes selection');
    expect(page.root!.shadowRoot!.querySelector('.row')!.classList.contains('two-line')).toBe(true);
  });

  it('renders trailing icon/text via the trailing slot fallback', async () => {
    const page = await newSpecPage({
      components: [MaterialMenuItem],
      html: `<material-menu-item label="Cut" trailing-text="⌘X" trailing-icon="star"></material-menu-item>`,
    });
    const trailingText = page.root!.shadowRoot!.querySelector('.trailing-text')!;
    expect(trailingText.textContent).toBe('⌘X');
    const trailingIcon = page.root!.shadowRoot!.querySelector('.trailing .icon')!;
    expect(trailingIcon.textContent).toBe('star');
  });
});
