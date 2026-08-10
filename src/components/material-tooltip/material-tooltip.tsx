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
  Element,
  Event,
  EventEmitter,
  Host,
  Prop,
  State,
  Watch,
  h,
} from '@stencil/core';
import {
  AnchorPlacement,
  trackAnchored,
} from '../../utils/anchor-position';

export type MaterialTooltipVariant = 'plain' | 'rich';
export type MaterialTooltipPlacement = 'top' | 'bottom' | 'bottom-end';

let uid = 0;

const LONG_PRESS_MS = 500;

let openInstance: MaterialTooltip | null = null;

@Component({
  tag: 'material-tooltip',
  styleUrl: 'material-tooltip.css',
  shadow: true,
})
export class MaterialTooltip {
  @Element() el!: HTMLElement;

  @Prop({ reflect: true }) variant: MaterialTooltipVariant = 'plain';
  @Prop() text?: string;
  @Prop({ attribute: 'for' }) htmlFor?: string;
  @Prop({ reflect: true }) placement?: MaterialTooltipPlacement;
  @Prop() offset = 4;
  @Prop({ reflect: true }) persistent = false;
  @Prop({ mutable: true, reflect: true }) open = false;
  @Prop() delay = 500;
  @Prop() hideDelay = 1500;

  @Event() tooltipShow!: EventEmitter<void>;
  @Event() tooltipHide!: EventEmitter<void>;

  @State() private surfaceId = `material-tooltip-${++uid}`;
  @State() private hasSubhead = false;
  @State() private hasActions = false;

  private trigger: HTMLElement | null = null;
  private cleanupTrack?: () => void;
  private showTimer = 0;
  private hideTimer = 0;
  private longPressTimer = 0;
  private savedTitle: string | null = null;
  private surfaceEl?: HTMLElement & {
    popover?: string;
    showPopover?: () => void;
    hidePopover?: () => void;
  };
  // Render the surface in the top layer (above modal dialogs) via the Popover
  // API where available, falling back to position:fixed + z-index otherwise.
  private supportsPopover =
    typeof HTMLElement !== 'undefined' &&
    Object.prototype.hasOwnProperty.call(HTMLElement.prototype, 'popover');
  private dismissBound = false;

  connectedCallback() {
    // The trigger's aria-describedby/-details must reference a light-DOM id —
    // an id inside this shadow root is unreachable from the trigger's tree.
    // The host carries it; the browser computes the description from the
    // host's flattened (shadow-inclusive) subtree.
    if (!this.el.id) this.el.id = this.surfaceId;
    queueMicrotask(() => this.bindTrigger());
  }

  disconnectedCallback() {
    this.unbindTrigger();
    this.cancelTimers();
    this.cleanupTrack?.();
    this.cleanupTrack = undefined;
    this.unbindDismiss();
    this.surfaceEl?.removeEventListener('toggle', this.onSurfaceToggle as EventListener);
    if (openInstance === this) openInstance = null;
  }

  // The Popover API drives top-layer + light-dismiss for hover-mode tooltips.
  // Persistent rich tooltips are click-toggled: hint's own light-dismiss would
  // race the re-open click, so they keep the position:fixed fallback and the
  // manual document dismiss listeners instead.
  private usePopover() {
    return this.supportsPopover && this.hoverMode();
  }

  // Document-level dismiss listeners (outside click / Escape). Only bound
  // while open, and only when the Popover API isn't handling light-dismiss.
  private bindDismiss() {
    if (this.dismissBound || this.usePopover()) return;
    this.dismissBound = true;
    document.addEventListener('pointerdown', this.onDocPointerDown, true);
    document.addEventListener('keydown', this.onDocKeyDown, true);
  }

  private unbindDismiss() {
    if (!this.dismissBound) return;
    this.dismissBound = false;
    document.removeEventListener('pointerdown', this.onDocPointerDown, true);
    document.removeEventListener('keydown', this.onDocKeyDown, true);
  }

  private showSurface() {
    const el = this.surfaceEl;
    if (!el || !this.usePopover() || !el.popover) return;
    if (!el.matches(':popover-open')) {
      try { el.showPopover?.(); } catch { /* not yet connected */ }
    }
  }

  private hideSurface() {
    const el = this.surfaceEl;
    if (!el || !this.usePopover() || !el.popover) return;
    if (el.matches(':popover-open')) {
      try { el.hidePopover?.(); } catch { /* already hidden */ }
    }
  }

  // The browser closes a `hint` popover on outside click / Escape; mirror that
  // back into our reactive `open` state so the two never drift.
  private onSurfaceToggle = (e: Event & { newState?: string }) => {
    if (e.newState === 'closed' && this.open) this.open = false;
  };

  private setSurfaceRef = (el?: HTMLElement) => {
    if (!el || el === this.surfaceEl) return;
    this.surfaceEl = el as typeof this.surfaceEl;
    if (this.usePopover()) {
      const s = this.surfaceEl!;
      try {
        // Prefer `hint` (light-dismiss, separate top-layer stack that doesn't
        // close open `auto` popovers); fall back to `manual` if the keyword
        // isn't recognized (older Popover API implementations).
        s.popover = 'hint';
        if (s.popover !== 'hint') s.popover = 'manual';
      } catch {
        this.supportsPopover = false;
      }
      s.addEventListener('toggle', this.onSurfaceToggle as EventListener);
      if (this.open) this.showSurface();
    }
  };

  @Watch('htmlFor')
  onForChange() {
    this.unbindTrigger();
    this.bindTrigger();
  }

  @Watch('open')
  onOpenChange(now: boolean) {
    if (now) {
      if (openInstance && openInstance !== this) openInstance.open = false;
      openInstance = this;
      this.showSurface();
      this.startTracking();
      this.bindDismiss();
      this.tooltipShow.emit();
    } else {
      this.hideSurface();
      this.cleanupTrack?.();
      this.cleanupTrack = undefined;
      this.unbindDismiss();
      if (openInstance === this) openInstance = null;
      this.tooltipHide.emit();
    }
  }

  private resolveTrigger(): HTMLElement | null {
    if (this.htmlFor) {
      const root = this.el.getRootNode() as Document | ShadowRoot;
      const found = (root as Document).getElementById?.(this.htmlFor);
      return found ?? null;
    }
    for (const child of Array.from(this.el.children)) {
      if (child instanceof HTMLElement) return child;
    }
    return null;
  }

  private bindTrigger() {
    const t = this.resolveTrigger();
    if (!t || t === this.trigger) return;
    this.trigger = t;

    if (t.hasAttribute('title')) {
      this.savedTitle = t.getAttribute('title');
      t.removeAttribute('title');
    }
    const aria = this.variant === 'rich' ? 'aria-details' : 'aria-describedby';
    t.setAttribute(aria, this.el.id);

    if (this.persistent && this.variant === 'rich') {
      t.addEventListener('click', this.onTriggerClick);
    } else {
      t.addEventListener('pointerenter', this.onTriggerPointerEnter);
      t.addEventListener('pointerleave', this.onTriggerPointerLeave);
      t.addEventListener('focus', this.onTriggerFocus);
      t.addEventListener('blur', this.onTriggerBlur);
      t.addEventListener('pointerdown', this.onTriggerPointerDown);
      t.addEventListener('pointerup', this.onTriggerPointerUp);
      t.addEventListener('pointercancel', this.onTriggerPointerUp);
    }
  }

  private unbindTrigger() {
    const t = this.trigger;
    if (!t) return;
    if (this.savedTitle != null) {
      t.setAttribute('title', this.savedTitle);
      this.savedTitle = null;
    }
    const aria = this.variant === 'rich' ? 'aria-details' : 'aria-describedby';
    if (t.getAttribute(aria) === this.el.id) t.removeAttribute(aria);
    t.removeEventListener('click', this.onTriggerClick);
    t.removeEventListener('pointerenter', this.onTriggerPointerEnter);
    t.removeEventListener('pointerleave', this.onTriggerPointerLeave);
    t.removeEventListener('focus', this.onTriggerFocus);
    t.removeEventListener('blur', this.onTriggerBlur);
    t.removeEventListener('pointerdown', this.onTriggerPointerDown);
    t.removeEventListener('pointerup', this.onTriggerPointerUp);
    t.removeEventListener('pointercancel', this.onTriggerPointerUp);
    this.trigger = null;
  }

  private resolvedPlacement(): AnchorPlacement {
    const p = this.placement ?? (this.variant === 'rich' ? 'bottom-end' : 'top');
    if (p === 'top') return 'top-center';
    if (p === 'bottom') return 'bottom-center';
    return 'bottom-end';
  }

  private startTracking() {
    if (!this.trigger || !this.surfaceEl) return;
    this.cleanupTrack?.();
    this.cleanupTrack = trackAnchored(this.surfaceEl, this.trigger, {
      placement: this.resolvedPlacement(),
      offset: this.offset,
    });
  }

  private cancelTimers() {
    if (this.showTimer) { clearTimeout(this.showTimer); this.showTimer = 0; }
    if (this.hideTimer) { clearTimeout(this.hideTimer); this.hideTimer = 0; }
    if (this.longPressTimer) { clearTimeout(this.longPressTimer); this.longPressTimer = 0; }
  }

  private scheduleShow() {
    if (this.hideTimer) { clearTimeout(this.hideTimer); this.hideTimer = 0; }
    if (this.open || this.showTimer) return;
    this.showTimer = window.setTimeout(() => {
      this.showTimer = 0;
      this.open = true;
    }, this.delay);
  }

  private scheduleHide() {
    if (this.showTimer) { clearTimeout(this.showTimer); this.showTimer = 0; }
    if (!this.open || this.hideTimer) return;
    this.hideTimer = window.setTimeout(() => {
      this.hideTimer = 0;
      this.open = false;
    }, this.hideDelay);
  }

  private onTriggerPointerEnter = (e: PointerEvent) => {
    if (e.pointerType === 'touch') return;
    this.scheduleShow();
  };

  private onTriggerPointerLeave = (e: PointerEvent) => {
    if (e.pointerType === 'touch') return;
    this.scheduleHide();
  };

  private onTriggerFocus = () => {
    this.scheduleShow();
  };

  private onTriggerBlur = () => {
    this.scheduleHide();
  };

  private onTriggerPointerDown = (e: PointerEvent) => {
    if (e.pointerType !== 'touch') return;
    if (this.longPressTimer) clearTimeout(this.longPressTimer);
    this.longPressTimer = window.setTimeout(() => {
      this.longPressTimer = 0;
      this.open = true;
    }, LONG_PRESS_MS);
  };

  private onTriggerPointerUp = (e: PointerEvent) => {
    if (e.pointerType !== 'touch') return;
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = 0;
    }
    if (this.open) this.scheduleHide();
  };

  private onNamedSlotChange = (e: Event, name: 'subhead' | 'actions') => {
    const slot = e.target as HTMLSlotElement;
    const has = slot.assignedNodes({ flatten: true }).some((n) =>
      n.nodeType === Node.ELEMENT_NODE ||
      (n.nodeType === Node.TEXT_NODE && (n.textContent ?? '').trim() !== '')
    );
    if (name === 'subhead') this.hasSubhead = has;
    else this.hasActions = has;
  };

  // WCAG 1.4.13 (hoverable): while the pointer/focus is over the tooltip
  // surface itself, the auto-hide must not fire — otherwise rich-tooltip
  // actions disappear as the user reaches for them. Only applies in hover
  // mode (persistent rich tooltips are click-toggled, not hover-dismissed).
  private hoverMode() {
    return !(this.persistent && this.variant === 'rich');
  }

  private onSurfacePointerEnter = (e: PointerEvent) => {
    if (e.pointerType === 'touch' || !this.hoverMode()) return;
    if (this.hideTimer) { clearTimeout(this.hideTimer); this.hideTimer = 0; }
  };

  private onSurfacePointerLeave = (e: PointerEvent) => {
    if (e.pointerType === 'touch' || !this.hoverMode()) return;
    this.scheduleHide();
  };

  private onSurfaceFocusIn = () => {
    if (!this.hoverMode()) return;
    if (this.hideTimer) { clearTimeout(this.hideTimer); this.hideTimer = 0; }
  };

  private onSurfaceFocusOut = () => {
    if (!this.hoverMode()) return;
    this.scheduleHide();
  };

  private onTriggerClick = (e: MouseEvent) => {
    e.preventDefault();
    this.open = !this.open;
  };

  private onActionsClick = () => {
    this.open = false;
  };

  private onDocPointerDown = (e: PointerEvent) => {
    if (!this.open) return;
    const path = e.composedPath();
    if (this.trigger && path.includes(this.trigger)) return;
    if (this.surfaceEl && path.includes(this.surfaceEl)) return;
    this.open = false;
  };

  private onDocKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && this.open) this.open = false;
  };

  render() {
    return (
      <Host>
        <slot />
        <div
          part="surface"
          id={this.surfaceId}
          role="tooltip"
          aria-hidden={this.open ? 'false' : 'true'}
          inert={this.open ? undefined : true}
          ref={this.setSurfaceRef}
          onPointerEnter={this.onSurfacePointerEnter}
          onPointerLeave={this.onSurfacePointerLeave}
          onFocusin={this.onSurfaceFocusIn}
          onFocusout={this.onSurfaceFocusOut}
        >
          {this.variant === 'rich'
            ? [
                <div part="subhead" hidden={!this.hasSubhead}>
                  <slot name="subhead" onSlotchange={(e) => this.onNamedSlotChange(e, 'subhead')} />
                </div>,
                <div part="body"><slot name="body">{this.text}</slot></div>,
                <div part="actions" hidden={!this.hasActions} onClick={this.onActionsClick}>
                  <slot name="actions" onSlotchange={(e) => this.onNamedSlotChange(e, 'actions')} />
                </div>,
              ]
            : <span part="body">{this.text}</span>}
        </div>
      </Host>
    );
  }
}
