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
import { MaterialSnackbar } from '../material-snackbar/material-snackbar';
import { MaterialSnackbarHost } from './material-snackbar-host';

const twoFrames = async () => {
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
};

describe('material-snackbar-host', () => {
  it('renders the configured placement and live-region politeness', async () => {
    const page = await newSpecPage({
      components: [MaterialSnackbarHost, MaterialSnackbar],
      html: `<material-snackbar-host placement="bottom-end" live="assertive"></material-snackbar-host>`,
    });
    expect(page.root!.getAttribute('placement')).toBe('bottom-end');
    const live = page.root!.shadowRoot!.querySelector('.live')!;
    expect(live.getAttribute('role')).toBe('status');
    expect(live.getAttribute('aria-live')).toBe('assertive');
  });

  it('enqueue shows a snackbar, announces it, and resolves when it closes', async () => {
    const page = await newSpecPage({
      components: [MaterialSnackbarHost, MaterialSnackbar],
      html: `<material-snackbar-host></material-snackbar-host>`,
    });

    const result = page.rootInstance.enqueue({ message: 'Saved', duration: 0 });
    await page.waitForChanges();
    await twoFrames();
    await page.waitForChanges();

    const snackbar = page.root!.shadowRoot!.querySelector('material-snackbar')!;
    expect((snackbar as unknown as { message: string }).message).toBe('Saved');
    expect(page.root!.shadowRoot!.querySelector('.live')!.textContent).toBe('Saved');

    snackbar.dispatchEvent(new CustomEvent('materialSnackbarClose', {
      detail: { reason: 'timeout' },
      bubbles: true,
      composed: true,
    }));
    await expect(result).resolves.toEqual({ reason: 'timeout' });
  });

  it('same-id enqueue replaces the visible snackbar and resolves the old request as replaced', async () => {
    const page = await newSpecPage({
      components: [MaterialSnackbarHost, MaterialSnackbar],
      html: `<material-snackbar-host></material-snackbar-host>`,
    });
    const first = page.rootInstance.enqueue({ id: 'save', message: 'Saving', duration: 0 });
    await page.waitForChanges();
    await twoFrames();
    await page.waitForChanges();

    const second = page.rootInstance.enqueue({ id: 'save', message: 'Saved', duration: 0 });
    await page.waitForChanges();

    expect((page.root!.shadowRoot!.querySelector('material-snackbar') as unknown as { message: string }).message).toBe('Saved');
    await expect(first).resolves.toEqual({ reason: 'replaced' });

    page.root!.shadowRoot!.querySelector('material-snackbar')!.dispatchEvent(new CustomEvent('materialSnackbarClose', {
      detail: { reason: 'timeout' },
      bubbles: true,
      composed: true,
    }));
    await expect(second).resolves.toEqual({ reason: 'timeout' });
  });

  it('action handlers can veto the snackbar close by returning false', async () => {
    const page = await newSpecPage({
      components: [MaterialSnackbarHost, MaterialSnackbar],
      html: `<material-snackbar-host></material-snackbar-host>`,
    });
    const onAction = jest.fn(() => false);
    page.rootInstance.enqueue({ message: 'Retry?', actionLabel: 'Retry', onAction, duration: 0 });
    await page.waitForChanges();
    await twoFrames();
    await page.waitForChanges();

    const event = new CustomEvent('materialSnackbarAction', {
      bubbles: true,
      composed: true,
      cancelable: true,
    });
    page.root!.shadowRoot!.querySelector('material-snackbar')!.dispatchEvent(event);

    expect(onAction).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
  });

  it('same-id enqueue replaces a queued snackbar before it becomes current', async () => {
    const page = await newSpecPage({
      components: [MaterialSnackbarHost, MaterialSnackbar],
      html: `<material-snackbar-host></material-snackbar-host>`,
    });
    page.rootInstance.enqueue({ id: 'first', message: 'First', duration: 0 });
    const second = page.rootInstance.enqueue({ id: 'second', message: 'Queued', duration: 0 });
    await page.waitForChanges();
    await twoFrames();
    await page.waitForChanges();

    const replacement = page.rootInstance.enqueue({ id: 'second', message: 'Updated queued', duration: 0 });
    await page.waitForChanges();

    expect((page.root!.shadowRoot!.querySelector('material-snackbar') as unknown as { message: string }).message).toBe('First');
    await expect(second).resolves.toEqual({ reason: 'replaced' });

    await page.rootInstance.clear();
    await expect(replacement).resolves.toEqual({ reason: 'programmatic' });
  });
});
