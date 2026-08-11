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

/**
 * Returns the page-level <material-snackbar-host>, creating and appending it
 * to <body> on first call. Use from any framework or plain HTML to enqueue
 * snackbars without manually placing the host element.
 *
 *   import { ensureSnackbarHost } from '.../utils/snackbar-host';
 *   ensureSnackbarHost().enqueue({ message: 'Saved.' });
 */

import type { SnackbarRequest } from '../components/material-snackbar-host/material-snackbar-host';
import type { MaterialSnackbarCloseReason } from '../components/material-snackbar/material-snackbar';

interface SnackbarHostElement extends HTMLElement {
  enqueue: (req: SnackbarRequest) => Promise<{ reason: MaterialSnackbarCloseReason }>;
  replace: (id: string, partial: Partial<SnackbarRequest>) => Promise<void>;
  clear: () => Promise<void>;
}

let cached: SnackbarHostElement | null = null;

export function ensureSnackbarHost(): SnackbarHostElement {
  if (typeof document === 'undefined') {
    throw new Error('ensureSnackbarHost called outside the browser');
  }
  if (cached && cached.isConnected) return cached;

  const existing = document.querySelector('material-snackbar-host') as
    | SnackbarHostElement
    | null;
  if (existing) {
    cached = existing;
    return existing;
  }

  const host = document.createElement('material-snackbar-host') as SnackbarHostElement;
  document.body.appendChild(host);
  cached = host;
  return host;
}
