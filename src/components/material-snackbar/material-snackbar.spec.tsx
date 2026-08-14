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
import { MaterialSnackbar } from './material-snackbar';

describe('material-snackbar', () => {
  it('renders message text, standalone live region and container part', async () => {
    const page = await newSpecPage({
      components: [MaterialSnackbar],
      html: `<material-snackbar message="Saved" open duration="0"></material-snackbar>`,
    });
    const live = page.root!.shadowRoot!.querySelector('.sb-live')!;
    expect(live.getAttribute('role')).toBe('status');
    expect(live.textContent).toBe('Saved');
    expect(page.root!.shadowRoot!.querySelector('[part="container"]')).not.toBeNull();
  });

  it('hosted snackbars skip their own live region', async () => {
    const page = await newSpecPage({
      components: [MaterialSnackbar],
      html: `<material-snackbar hosted message="Saved"></material-snackbar>`,
    });
    expect(page.root!.shadowRoot!.querySelector('.sb-live')).toBeNull();
  });

  it('action button emits materialSnackbarAction and closes with reason=action by default', async () => {
    const page = await newSpecPage({
      components: [MaterialSnackbar],
      html: `<material-snackbar message="Undoable" action-label="Undo" open duration="0"></material-snackbar>`,
    });
    const actionSpy = jest.fn();
    const closeSpy = jest.fn();
    page.root!.addEventListener('materialSnackbarAction', actionSpy);
    page.root!.addEventListener('materialSnackbarClose', closeSpy);

    const action = page.root!.shadowRoot!.querySelector('[part="action"]') as HTMLElement;
    action.click();
    await page.waitForChanges();

    expect(actionSpy).toHaveBeenCalledTimes(1);
    expect(page.rootInstance.open).toBe(false);
    expect(closeSpy.mock.calls[0][0].detail).toEqual({ reason: 'action' });
  });

  it('preventing materialSnackbarAction keeps the snackbar open', async () => {
    const page = await newSpecPage({
      components: [MaterialSnackbar],
      html: `<material-snackbar message="Retry?" action-label="Retry" open duration="0"></material-snackbar>`,
    });
    page.root!.addEventListener('materialSnackbarAction', (ev) => ev.preventDefault());

    const action = page.root!.shadowRoot!.querySelector('[part="action"]') as HTMLElement;
    action.click();
    await page.waitForChanges();

    expect(page.rootInstance.open).toBe(true);
  });

  it('close button closes with reason=close', async () => {
    const page = await newSpecPage({
      components: [MaterialSnackbar],
      html: `<material-snackbar message="Saved" closable open duration="0"></material-snackbar>`,
    });
    const closeSpy = jest.fn();
    page.root!.addEventListener('materialSnackbarClose', closeSpy);

    const close = page.root!.shadowRoot!.querySelector('[part="close"]') as HTMLElement;
    close.click();
    await page.waitForChanges();

    expect(page.rootInstance.open).toBe(false);
    expect(closeSpy.mock.calls[0][0].detail).toEqual({ reason: 'close' });
  });

  it('show() and close() drive open state and emit lifecycle events', async () => {
    const page = await newSpecPage({
      components: [MaterialSnackbar],
      html: `<material-snackbar message="Saved" duration="0"></material-snackbar>`,
    });
    const openSpy = jest.fn();
    const closeSpy = jest.fn();
    page.root!.addEventListener('materialSnackbarOpen', openSpy);
    page.root!.addEventListener('materialSnackbarClose', closeSpy);

    await page.rootInstance.show();
    await page.waitForChanges();
    await page.rootInstance.close('programmatic');
    await page.waitForChanges();

    expect(openSpy).toHaveBeenCalledTimes(1);
    expect(closeSpy.mock.calls[0][0].detail).toEqual({ reason: 'programmatic' });
  });

  it('Escape closes a standalone open snackbar', async () => {
    const page = await newSpecPage({
      components: [MaterialSnackbar],
      html: `<material-snackbar message="Saved" duration="0"></material-snackbar>`,
    });
    await page.rootInstance.show();
    await page.waitForChanges();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await page.waitForChanges();

    expect(page.rootInstance.open).toBe(false);
  });
});
