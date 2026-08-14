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
import { MaterialDialog } from './material-dialog';

// Render/prop/a11y-attribute coverage only. Real open()/close() (and thus
// materialDialogOpen/materialDialogClose/materialDialogCancel, and the
// show()/close() methods) drive the wrapped native <dialog>'s
// showModal()/close() — neither is implemented by Stencil's mock-doc (nor by
// jsdom), so any prop/method path that reaches them throws
// "dlg.showModal is not a function" outside a real browser. Covered instead
// in material-dialog.e2e.tsx — see docs/agents/testing.md.

describe('material-dialog', () => {
  it('renders the basic variant closed by default, with role=dialog and aria-modal', async () => {
    const page = await newSpecPage({
      components: [MaterialDialog],
      html: `<material-dialog></material-dialog>`,
    });
    const dialog = page.root!.shadowRoot!.querySelector('dialog')!;
    expect(dialog.getAttribute('role')).toBe('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('part')).toBe('dialog');
    expect(dialog.classList.contains('dlg--basic')).toBe(true);
    expect(page.root!.getAttribute('data-effective-variant')).toBe('basic');
    expect(page.root!.getAttribute('position')).toBe('center');
    expect(page.root!.hasAttribute('open')).toBe(false);
  });

  it('alert: uses role=alertdialog instead of dialog', async () => {
    const page = await newSpecPage({
      components: [MaterialDialog],
      html: `<material-dialog alert></material-dialog>`,
    });
    const dialog = page.root!.shadowRoot!.querySelector('dialog')!;
    expect(dialog.getAttribute('role')).toBe('alertdialog');
  });

  it('headline prop: shown in the h2 and wired to aria-labelledby', async () => {
    const page = await newSpecPage({
      components: [MaterialDialog],
      html: `<material-dialog headline="Delete item?"></material-dialog>`,
    });
    const dialog = page.root!.shadowRoot!.querySelector('dialog')!;
    const headline = page.root!.shadowRoot!.querySelector('.dlg__headline')!;
    expect(headline.getAttribute('hidden')).toBeNull();
    expect(headline.textContent).toContain('Delete item?');
    expect(headline.id).toBe('dlg-headline');
    expect(dialog.getAttribute('aria-labelledby')).toBe('dlg-headline');
  });

  it('no headline (prop or slot): hides the heading and omits aria-labelledby', async () => {
    const page = await newSpecPage({
      components: [MaterialDialog],
      html: `<material-dialog></material-dialog>`,
    });
    const dialog = page.root!.shadowRoot!.querySelector('dialog')!;
    const headline = page.root!.shadowRoot!.querySelector('.dlg__headline')!;
    expect(headline.hasAttribute('hidden')).toBe(true);
    expect(dialog.getAttribute('aria-labelledby')).toBeNull();
  });

  it('icon prop: renders the glyph, hidden with aria-hidden', async () => {
    const page = await newSpecPage({
      components: [MaterialDialog],
      html: `<material-dialog icon="warning"></material-dialog>`,
    });
    const iconWrap = page.root!.shadowRoot!.querySelector('.dlg__icon')!;
    const glyph = iconWrap.querySelector('.dlg__icon-glyph')!;
    expect(iconWrap.hasAttribute('hidden')).toBe(false);
    expect(glyph.textContent).toBe('warning');
    expect(glyph.getAttribute('aria-hidden')).toBe('true');
  });

  it('no icon: the icon wrapper is hidden', async () => {
    const page = await newSpecPage({
      components: [MaterialDialog],
      html: `<material-dialog></material-dialog>`,
    });
    const iconWrap = page.root!.shadowRoot!.querySelector('.dlg__icon')!;
    expect(iconWrap.hasAttribute('hidden')).toBe(true);
  });

  it('position prop reflects to the host attribute', async () => {
    const page = await newSpecPage({
      components: [MaterialDialog],
      html: `<material-dialog position="top-start"></material-dialog>`,
    });
    expect(page.root!.getAttribute('position')).toBe('top-start');
  });

  it('quick prop reflects to the host attribute', async () => {
    const page = await newSpecPage({
      components: [MaterialDialog],
      html: `<material-dialog quick></material-dialog>`,
    });
    expect(page.root!.hasAttribute('quick')).toBe(true);
  });

  it('variant="full-screen": renders the header/leading/actions layout with a default close button', async () => {
    const page = await newSpecPage({
      components: [MaterialDialog],
      html: `<material-dialog variant="full-screen" headline="Edit"></material-dialog>`,
    });
    const dialog = page.root!.shadowRoot!.querySelector('dialog')!;
    expect(dialog.classList.contains('dlg--full-screen')).toBe(true);
    expect(page.root!.getAttribute('data-effective-variant')).toBe('full-screen');
    const header = page.root!.shadowRoot!.querySelector('.dlg__header');
    expect(header).not.toBeNull();
    const closeButton = header!.querySelector('material-icon-button');
    expect(closeButton).not.toBeNull();
    expect(closeButton!.getAttribute('icon')).toBe('close');
  });

  it('variant="adaptive": resolves to basic when the compact media query does not match', async () => {
    const page = await newSpecPage({
      components: [MaterialDialog],
      html: `<material-dialog variant="adaptive"></material-dialog>`,
    });
    // mock-doc's MediaQueryList never matches, so adaptive always resolves to
    // "basic" under newSpecPage — the compact ("full-screen") branch of
    // adaptive is exercised in the e2e suite via a real viewport.
    expect(page.root!.getAttribute('data-effective-variant')).toBe('basic');
  });

  // Note: mock-doc doesn't fire `slotchange` for content already present at
  // parse time (only Stencil's own reactive re-renders trigger it), so
  // `hasHeadlineSlot`/`hasLeadingSlot` never flip true from initial markup
  // under newSpecPage — only the headline *prop* path is exercisable here.
  // Both are covered live in the e2e suite.

  it('renders a named headline slot alongside the prop fallback content', async () => {
    const page = await newSpecPage({
      components: [MaterialDialog],
      html: `<material-dialog><span slot="headline">Custom title</span></material-dialog>`,
    });
    const slot = page.root!.shadowRoot!.querySelector('slot[name="headline"]')!;
    expect(slot).not.toBeNull();
    expect(page.root!.querySelector('[slot="headline"]')!.textContent).toBe('Custom title');
  });

  it('renders a named leading slot in the full-screen header', async () => {
    const page = await newSpecPage({
      components: [MaterialDialog],
      html: `<material-dialog variant="full-screen"><button slot="leading">Back</button></material-dialog>`,
    });
    const header = page.root!.shadowRoot!.querySelector('.dlg__header')!;
    expect(header.querySelector('slot[name="leading"]')).not.toBeNull();
    expect(page.root!.querySelector('[slot="leading"]')!.textContent).toBe('Back');
  });
});
