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
import { MaterialAvatar } from './material-avatar';

describe('material-avatar', () => {
  it('renders an unlabeled icon fallback by default', async () => {
    const page = await newSpecPage({
      components: [MaterialAvatar],
      html: `<material-avatar></material-avatar>`,
    });
    expect(page.root!.getAttribute('role')).toBe('img');
    expect(page.root!.getAttribute('aria-label')).toBeNull();
    expect(page.root!.getAttribute('aria-hidden')).toBe('true');
    // No name/initials to hash -> falls back to 'surface'.
    expect(page.root!.getAttribute('data-color')).toBe('surface');
    const icon = page.root!.shadowRoot!.querySelector('.icon')!;
    expect(icon.textContent).toBe('person');
    expect(icon.getAttribute('aria-hidden')).toBe('true');
  });

  it('derives initials and an aria-label from name, and hashes an auto color', async () => {
    const page = await newSpecPage({
      components: [MaterialAvatar],
      html: `<material-avatar name="Grace Hopper"></material-avatar>`,
    });
    expect(page.root!.getAttribute('aria-label')).toBe('Grace Hopper');
    expect(page.root!.getAttribute('aria-hidden')).toBeNull();
    expect(page.root!.getAttribute('data-color')).toBe('tertiary-container');
    const initials = page.root!.shadowRoot!.querySelector('.initials')!;
    expect(initials.textContent).toBe('GH');
  });

  it('lets initials override the derived value while name still drives the label', async () => {
    const page = await newSpecPage({
      components: [MaterialAvatar],
      html: `<material-avatar name="Grace Hopper" initials="XY"></material-avatar>`,
    });
    expect(page.root!.shadowRoot!.querySelector('.initials')!.textContent).toBe('XY');
    expect(page.root!.getAttribute('aria-label')).toBe('Grace Hopper');
  });

  it('uses initials alone for the label when there is no name', async () => {
    const page = await newSpecPage({
      components: [MaterialAvatar],
      html: `<material-avatar initials="ZZ"></material-avatar>`,
    });
    expect(page.root!.getAttribute('aria-label')).toBe('ZZ');
    expect(page.root!.getAttribute('aria-hidden')).toBeNull();
  });

  it('renders a custom icon glyph when there is no name, initials or image', async () => {
    const page = await newSpecPage({
      components: [MaterialAvatar],
      html: `<material-avatar icon="support_agent"></material-avatar>`,
    });
    expect(page.root!.shadowRoot!.querySelector('.icon')!.textContent).toBe('support_agent');
  });

  it('prefers an image over initials while src is set and has not failed', async () => {
    const page = await newSpecPage({
      components: [MaterialAvatar],
      html: `<material-avatar name="Grace Hopper" src="/u/7.jpg"></material-avatar>`,
    });
    const img = page.root!.shadowRoot!.querySelector('img')!;
    expect(img).not.toBeNull();
    expect(img.getAttribute('src')).toBe('/u/7.jpg');
    expect(img.getAttribute('alt')).toBe('');
    expect(page.root!.shadowRoot!.querySelector('.initials')).toBeNull();
  });

  it('falls back to initials when the image fails to load', async () => {
    const page = await newSpecPage({
      components: [MaterialAvatar],
      html: `<material-avatar name="Grace Hopper" src="/broken.jpg"></material-avatar>`,
    });
    const img = page.root!.shadowRoot!.querySelector('img')!;
    img.dispatchEvent(new Event('error'));
    await page.waitForChanges();

    expect(page.root!.shadowRoot!.querySelector('img')).toBeNull();
    expect(page.root!.shadowRoot!.querySelector('.initials')!.textContent).toBe('GH');
  });

  it('resets the failed state when src changes', async () => {
    const page = await newSpecPage({
      components: [MaterialAvatar],
      html: `<material-avatar name="Grace Hopper" src="/broken.jpg"></material-avatar>`,
    });
    const img = page.root!.shadowRoot!.querySelector('img')!;
    img.dispatchEvent(new Event('error'));
    await page.waitForChanges();
    expect(page.root!.shadowRoot!.querySelector('img')).toBeNull();

    page.root!.setAttribute('src', '/u/7.jpg');
    await page.waitForChanges();
    expect(page.root!.shadowRoot!.querySelector('img')).not.toBeNull();
  });

  it('reflects the size prop as a host attribute', async () => {
    const page = await newSpecPage({
      components: [MaterialAvatar],
      html: `<material-avatar size="l"></material-avatar>`,
    });
    expect(page.root!.getAttribute('size')).toBe('l');
  });

  it('an explicit color prop wins over the auto hash and reflects to the host', async () => {
    const page = await newSpecPage({
      components: [MaterialAvatar],
      html: `<material-avatar name="Grace Hopper" color="primary"></material-avatar>`,
    });
    expect(page.root!.getAttribute('color')).toBe('primary');
    expect(page.root!.getAttribute('data-color')).toBe('primary');
  });
});
