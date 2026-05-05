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
