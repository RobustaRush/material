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

import type { SnackbarRequest } from '../components/material-snackbar-host/material-snackbar-host';
import type { MaterialSnackbarCloseReason } from '../components/material-snackbar/material-snackbar';

const TAG = 'material-snackbar-host';

type SnackbarHostElement = HTMLElement & {
  enqueue: (req: SnackbarRequest) => Promise<{ reason: MaterialSnackbarCloseReason }>;
};

let created: SnackbarHostElement | undefined;

/**
 * The page's snackbar host: whichever one the page already has, else one
 * created on `document.body`.
 *
 * Body, specifically. A snackbar placed inside application markup inherits its
 * clipping and stacking: an ancestor with `transform`, `filter` or `contain`
 * becomes the containing block for fixed positioning, so the snackbar lands
 * inside that box instead of at the viewport edge — a card, or a dialog, is
 * enough to do it.
 */
function resolveHost(): SnackbarHostElement {
  if (created?.isConnected) return created;

  const existing = document.querySelector<SnackbarHostElement>(TAG);
  if (existing) return existing;

  created = document.createElement(TAG) as SnackbarHostElement;
  document.body.appendChild(created);
  return created;
}

/**
 * Show a snackbar without wiring a host into your markup.
 *
 *     import { snackbar } from 'advanced-material-web';
 *
 *     await deleteTodo(id);
 *     snackbar({ message: 'Task deleted', actionLabel: 'Undo',
 *                onAction: () => restoreTodo(todo) });
 *
 * Resolves with the close reason, like `enqueue()` — which is what this calls,
 * so queueing, placement and the `id` replacement behaviour are the host's as
 * usual. Put a `<material-snackbar-host>` in the page yourself when you want to
 * set `placement` or `live`; this finds it and uses it.
 *
 * The element has to be registered for the call to do anything. Loading the
 * library through the CDN bundle or `defineCustomElements()` registers
 * everything; with the framework wrappers, import the host component once
 * (anywhere) so its module is in the bundle.
 */
export function snackbar(req: SnackbarRequest): Promise<{ reason: MaterialSnackbarCloseReason }> {
  if (typeof document === 'undefined') {
    return Promise.reject(new Error('snackbar() needs a document — call it from the browser.'));
  }

  const host = resolveHost();

  if (customElements.get(TAG)) return host.enqueue(req);

  // Not registered: say so rather than hanging silently on whenDefined(), then
  // still honour the call if the element turns up later.
  console.warn(
    `[advanced-material-web] snackbar(): <${TAG}> is not registered, so the ` +
      'message is queued until it is. Import the component once — ' +
      "`import 'advanced-material-web/dist/components/material-snackbar-host.js'` — " +
      'or load the library through defineCustomElements().',
  );
  return customElements.whenDefined(TAG).then(() => host.enqueue(req));
}
