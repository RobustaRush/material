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
import { MaterialSkeleton } from './material-skeleton';

describe('material-skeleton', () => {
  it('renders a single text line by default, and is aria-hidden', async () => {
    const page = await newSpecPage({
      components: [MaterialSkeleton],
      html: `<material-skeleton></material-skeleton>`,
    });
    expect(page.root!.getAttribute('aria-hidden')).toBe('true');
    expect(page.root!.getAttribute('variant')).toBe('text');
    const bones = page.root!.shadowRoot!.querySelectorAll('.bone');
    expect(bones.length).toBe(1);
    expect(bones[0].classList.contains('short')).toBe(false);
  });

  it('renders `lines` stacked bones for the text variant, shortening only the last', async () => {
    const page = await newSpecPage({
      components: [MaterialSkeleton],
      html: `<material-skeleton lines="4"></material-skeleton>`,
    });
    const bones = page.root!.shadowRoot!.querySelectorAll('.bone');
    expect(bones.length).toBe(4);
    bones.forEach((bone, i) => {
      expect(bone.classList.contains('short')).toBe(i === bones.length - 1);
    });
  });

  it('ignores lines for the circular variant and renders a single bone', async () => {
    const page = await newSpecPage({
      components: [MaterialSkeleton],
      html: `<material-skeleton variant="circular" lines="5"></material-skeleton>`,
    });
    expect(page.root!.getAttribute('variant')).toBe('circular');
    const bones = page.root!.shadowRoot!.querySelectorAll('.bone');
    expect(bones.length).toBe(1);
    expect(bones[0].classList.contains('short')).toBe(false);
  });

  it('ignores lines for the rectangular variant and renders a single bone', async () => {
    const page = await newSpecPage({
      components: [MaterialSkeleton],
      html: `<material-skeleton variant="rectangular" lines="3"></material-skeleton>`,
    });
    expect(page.root!.getAttribute('variant')).toBe('rectangular');
    expect(page.root!.shadowRoot!.querySelectorAll('.bone').length).toBe(1);
  });

  it('clamps lines below 1 up to a single bone', async () => {
    const page = await newSpecPage({
      components: [MaterialSkeleton],
      html: `<material-skeleton lines="0"></material-skeleton>`,
    });
    expect(page.root!.shadowRoot!.querySelectorAll('.bone').length).toBe(1);
  });
});
