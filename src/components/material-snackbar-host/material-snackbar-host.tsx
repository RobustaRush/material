/*
 * @viewflow/material — Material 3 web components
 * Copyright (c) 2017-2026 Mikhail Podgurskiy
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * AGPLv3 with the Viewflow Library Exception — see LICENSE_EXCEPTION.
 *
 * The copyright holder regards code produced from this file with an LLM's
 * help as a derived work: placing it in a model's context is copying it.
 * A commercial licence without copyleft: https://viewflow.io/pro.html
 */

import {
  Component,
  Host,
  Method,
  Prop,
  State,
  h,
} from '@stencil/core';
import type { MaterialSnackbarCloseReason } from '../material-snackbar/material-snackbar';

export type SnackbarPlacement = 'bottom' | 'bottom-start' | 'bottom-end';
export type SnackbarLive = 'polite' | 'assertive';

export interface SnackbarRequest {
  /** Required text label. */
  message: string;
  /** Optional trailing action button. Pair with `onAction` to handle clicks. */
  actionLabel?: string;
  /**
   * Action handler. If it returns the literal `false`, the host keeps the
   * snackbar visible (the caller will call `close()` itself); otherwise the
   * snackbar closes immediately after the handler runs.
   */
  onAction?: () => unknown;
  /** Show a trailing close icon button. */
  closable?: boolean;
  /** Auto-dismiss in ms; `0` disables (sticky). Defaults to 5000. */
  duration?: number;
  /** Raise live-region politeness for this message only (e.g. errors). */
  assertive?: boolean;
  /**
   * Stable id. While the same id is currently visible or already queued,
   * `enqueue` updates the existing entry in place instead of stacking.
   */
  id?: string;
}

interface QueuedItem extends SnackbarRequest {
  resolve: (r: { reason: MaterialSnackbarCloseReason }) => void;
}

const REPLACE_GAP_MS = 150;

// Page-level singleton that owns the queue, viewport positioning, and the
// ARIA live region. Renders one <material-snackbar> at a time.
@Component({
  tag: 'material-snackbar-host',
  styleUrl: 'material-snackbar-host.css',
  shadow: true,
})
export class MaterialSnackbarHost {
  /** Where the snackbar sits along the bottom edge. */
  @Prop({ reflect: true }) placement: SnackbarPlacement = 'bottom';

  /** Default ARIA live region politeness; `assertive: true` per request can
   *  raise it for a single message. */
  @Prop() live: SnackbarLive = 'polite';

  @State() private current?: QueuedItem;
  @State() private liveText = '';
  @State() private liveAssertive = false;

  private queue: QueuedItem[] = [];
  private snackbarEl?: HTMLElement & {
    show: () => Promise<void>;
    close: (reason?: MaterialSnackbarCloseReason) => Promise<void>;
    resetAutoDismiss: () => Promise<void>;
    duration: number;
  };
  private advancing = false;

  /**
   * Enqueue a snackbar. Resolves with the close reason when the message is
   * eventually dismissed (timeout, action, close button, replaced by a
   * same-id update, or programmatic).
   */
  @Method()
  async enqueue(req: SnackbarRequest): Promise<{ reason: MaterialSnackbarCloseReason }> {
    return new Promise((resolve) => {
      const item: QueuedItem = { ...req, resolve };

      // Same-id replacement for the visible snackbar.
      if (req.id && this.current && this.current.id === req.id) {
        const old = this.current;
        this.current = item;
        // Reflect new content immediately; reset the timer.
        this.applyToSnackbar(item);
        old.resolve({ reason: 'replaced' });
        return;
      }

      // Same-id merge for an already-queued item.
      if (req.id) {
        const idx = this.queue.findIndex((q) => q.id === req.id);
        if (idx !== -1) {
          const old = this.queue[idx];
          this.queue[idx] = item;
          old.resolve({ reason: 'replaced' });
          return;
        }
      }

      this.queue.push(item);
      if (!this.current) this.advance();
    });
  }

  /** Update fields of a visible or queued snackbar by id. No-op if not found. */
  @Method()
  async replace(id: string, partial: Partial<SnackbarRequest>): Promise<void> {
    if (this.current && this.current.id === id) {
      Object.assign(this.current, partial);
      this.applyToSnackbar(this.current);
      return;
    }
    const q = this.queue.find((it) => it.id === id);
    if (q) Object.assign(q, partial);
  }

  /** Dismiss the current snackbar and drop everything queued. */
  @Method()
  async clear(): Promise<void> {
    const dropped = this.queue.splice(0);
    for (const d of dropped) d.resolve({ reason: 'programmatic' });
    if (this.snackbarEl) await this.snackbarEl.close('programmatic');
  }

  private advance() {
    if (this.advancing) return;
    const next = this.queue.shift();
    if (!next) {
      this.current = undefined;
      this.liveText = '';
      return;
    }
    this.advancing = true;
    this.current = next;
    this.liveAssertive = !!next.assertive;
    // Force a re-announcement even if text is identical to a previous message.
    this.liveText = '';
    requestAnimationFrame(() => {
      this.liveText = next.message;
      requestAnimationFrame(() => {
        this.snackbarEl?.show();
        this.advancing = false;
      });
    });
  }

  private applyToSnackbar(item: QueuedItem) {
    // Stencil re-renders via `current` state; just refresh live text and reset
    // the timer by forcing duration setter on the snackbar element.
    this.liveAssertive = !!item.assertive;
    this.liveText = item.message;
    if (this.snackbarEl) {
      // Re-trigger auto-dismiss after an in-place update. Setting `duration`
      // only restarts the timer when the value actually changes (Stencil skips
      // same-value @Watch), so also call resetAutoDismiss() unconditionally.
      this.snackbarEl.duration = item.duration ?? 5000;
      this.snackbarEl.resetAutoDismiss();
    }
  }

  private handleAction = (ev: CustomEvent<void>) => {
    const item = this.current;
    if (!item) return;
    const result = item.onAction?.();
    if (result === false) {
      // Honor the documented contract: keep the snackbar open and let the
      // caller close it. Veto the snackbar's own auto-close.
      ev.preventDefault();
      return;
    }
    this.snackbarEl?.close('action');
  };

  private handleClosed = (ev: CustomEvent<{ reason: MaterialSnackbarCloseReason }>) => {
    const item = this.current;
    if (!item) return;
    // 'replaced' is resolved at the point of replacement; ignore here.
    if (ev.detail.reason === 'replaced') return;
    item.resolve({ reason: ev.detail.reason });

    // The snackbar removed its own `[open]` attribute, which starts the CSS
    // exit transition. Keep it mounted until that transition finishes so the
    // animation actually plays; fall back to a timer for reduced-motion (no
    // transitionend fires) or if the element is already gone.
    const el = this.snackbarEl;
    let finalized = false;
    const finalize = () => {
      if (finalized) return;
      finalized = true;
      el?.removeEventListener('transitionend', finalize);
      this.current = undefined;
      setTimeout(() => this.advance(), REPLACE_GAP_MS);
    };
    if (el) {
      el.addEventListener('transitionend', finalize);
      // Fallback slightly beyond the 150ms exit duration.
      setTimeout(finalize, 200);
    } else {
      finalize();
    }
  };

  private setSnackbarRef = (el?: HTMLElement) => {
    if (!el) return;
    this.snackbarEl = el as typeof this.snackbarEl;
  };

  render() {
    const item = this.current;
    return (
      <Host>
        <div
          class="live"
          role="status"
          aria-live={this.liveAssertive ? 'assertive' : this.live}
          aria-atomic="true"
        >
          {this.liveText}
        </div>
        <div class="slot">
          {item && (
            <material-snackbar
              ref={this.setSnackbarRef}
              hosted={true}
              message={item.message}
              action-label={item.actionLabel}
              closable={!!item.closable}
              duration={item.duration ?? 5000}
              onMaterialSnackbarAction={this.handleAction}
              onMaterialSnackbarClose={this.handleClosed}
            />
          )}
        </div>
      </Host>
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'material-snackbar-host': HTMLElement & {
      enqueue: MaterialSnackbarHost['enqueue'];
      replace: MaterialSnackbarHost['replace'];
      clear: MaterialSnackbarHost['clear'];
    };
  }
}
