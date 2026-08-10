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
  Method,
  Prop,
  State,
  Watch,
  h,
} from '@stencil/core';
import { ensureDialogTriggersInstalled } from '../../utils/dialog-triggers';
import { gettext } from '../../utils/i18n';

export type MaterialBottomSheetVariant = 'modal' | 'standard';

// MD3 bottom sheet. Modal variant wraps a real <dialog> (showModal) for the
// top layer, scrim, focus trap and Esc handling; the standard variant uses
// the same element non-modally (show()) so the page stays interactive —
// e.g. a persistent audio-player / cart bar.
//
// Same declarative triggers as material-dialog (duck-typed show()/close()):
//   <button data-dialog-target="sheet1">Open</button>
//   <material-bottom-sheet id="sheet1">…
//     <button data-dialog-close="ok">Done</button>
//   </material-bottom-sheet>
//
// The sheet opens at its content height capped at 50% of the viewport
// (spec: initial position ≤ 50%); the drag handle can be dragged (pointer or
// touch) to expand to full height, snap back, or swipe-to-dismiss. Clicking
// or pressing Enter/Space on the handle toggles peek <-> full.

@Component({
  tag: 'material-bottom-sheet',
  styleUrl: 'material-bottom-sheet.css',
  shadow: true,
})
export class MaterialBottomSheet {
  @Element() el!: HTMLElement;

  @Prop({ reflect: true }) variant: MaterialBottomSheetVariant = 'modal';

  /** Reflects open state. Toggling this prop drives showModal()/show()/close(). */
  @Prop({ mutable: true, reflect: true }) open = false;

  /** Show the drag handle (and enable drag/swipe gestures). */
  @Prop({ attribute: 'drag-handle' }) dragHandle = true;

  /** Modal only: when false, Esc / scrim click / swipe-down do not close. */
  @Prop() dismissible = true;

  /** Mirrors the native dialog.returnValue after close. */
  @Prop({ mutable: true }) returnValue = '';

  /** Accessible name for the drag handle button. */
  @Prop() dragHandleLabel = '';

  /** Expanded (full-height) vs peek state. Reflected so consumers can style
   *  against it; toggled by the handle and by dragging. */
  @Prop({ mutable: true, reflect: true }) expanded = false;

  @State() dragging = false;

  @Event() materialSheetOpen!: EventEmitter<void>;
  @Event() materialSheetClose!: EventEmitter<{ returnValue: string }>;
  @Event({ cancelable: true }) materialSheetCancel!: EventEmitter<void>;

  private dialog?: HTMLDialogElement;

  // Drag state
  private dragStartY = 0;
  private dragStartHeight = 0;
  private dragMoved = false;
  private lastY = 0;
  private lastT = 0;
  private velocity = 0; // px/ms, positive = downward

  componentWillLoad() {
    ensureDialogTriggersInstalled();
  }

  disconnectedCallback() {
    if (this.dialog) {
      this.dialog.removeEventListener('close', this.handleClose);
      this.dialog.removeEventListener('cancel', this.handleCancel);
      this.dialog.removeEventListener('click', this.handleDialogClick);
    }
  }

  @Watch('open')
  syncOpen(open: boolean) {
    const dlg = this.dialog;
    if (!dlg) return;
    if (open && !dlg.open) {
      this.expanded = false;
      if (this.variant === 'modal') dlg.showModal();
      else dlg.show();
      this.materialSheetOpen.emit();
    } else if (!open && dlg.open) {
      dlg.close(this.returnValue);
    }
  }

  /** Open the sheet. */
  @Method()
  async show(): Promise<void> {
    this.open = true;
  }

  /** Close the sheet, optionally setting the return value. */
  @Method()
  async close(returnValue?: string): Promise<void> {
    if (returnValue !== undefined) this.returnValue = returnValue;
    this.open = false;
  }

  private handleClose = () => {
    if (!this.dialog) return;
    this.returnValue = this.dialog.returnValue;
    this.open = false;
    this.expanded = false;
    this.materialSheetClose.emit({ returnValue: this.returnValue });
  };

  private handleCancel = (ev: Event) => {
    if (!this.dismissible) {
      ev.preventDefault();
      return;
    }
    const proceed = this.materialSheetCancel.emit();
    if (proceed.defaultPrevented) ev.preventDefault();
  };

  // Scrim dismiss (modal only): the click lands on the dialog element itself
  // when the press is outside its content box.
  private handleDialogClick = (ev: MouseEvent) => {
    if (this.variant !== 'modal' || !this.dismissible || !this.dialog) return;
    if (ev.target !== this.dialog) return;
    const rect = this.dialog.getBoundingClientRect();
    const inside =
      ev.clientX >= rect.left && ev.clientX <= rect.right &&
      ev.clientY >= rect.top && ev.clientY <= rect.bottom;
    if (inside) return;
    const proceed = this.materialSheetCancel.emit();
    if (!proceed.defaultPrevented) this.dialog.close();
  };

  private setDialogRef = (el?: HTMLDialogElement) => {
    if (!el || el === this.dialog) return;
    this.dialog = el;
    el.addEventListener('close', this.handleClose);
    el.addEventListener('cancel', this.handleCancel);
    el.addEventListener('click', this.handleDialogClick);
    if (this.open && !el.open) {
      requestAnimationFrame(() => {
        if (this.open && this.dialog && !this.dialog.open) {
          if (this.variant === 'modal') this.dialog.showModal();
          else this.dialog.show();
          this.materialSheetOpen.emit();
        }
      });
    }
  };

  private fullHeight(): number {
    // 72dp top margin; 56dp when the window is wider than 640dp (spec).
    const topMargin = window.innerWidth > 640 ? 56 : 72;
    return window.innerHeight - topMargin;
  }

  // ---- Drag handle gestures --------------------------------------------
  // The sheet is bottom-anchored, so animating its inline height reads as
  // sliding: shrinking = sinking down, growing = expanding up. One regime,
  // no transform/height hand-off jump.

  private handlePointerDown = (ev: PointerEvent) => {
    if (!this.dialog || !this.dragHandle) return;
    (ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId);
    this.dragStartY = ev.clientY;
    this.dragStartHeight = this.dialog.getBoundingClientRect().height;
    this.dragMoved = false;
    this.lastY = ev.clientY;
    this.lastT = ev.timeStamp;
    this.velocity = 0;
  };

  private handlePointerMove = (ev: PointerEvent) => {
    if (!this.dialog) return;
    const target = ev.currentTarget as HTMLElement;
    if (!target.hasPointerCapture?.(ev.pointerId)) return;
    const dy = ev.clientY - this.dragStartY;
    if (!this.dragMoved && Math.abs(dy) < 4) return; // click slack
    this.dragMoved = true;
    this.dragging = true;
    const dt = ev.timeStamp - this.lastT;
    if (dt > 0) this.velocity = (ev.clientY - this.lastY) / dt;
    this.lastY = ev.clientY;
    this.lastT = ev.timeStamp;
    const next = Math.min(this.dragStartHeight - dy, this.fullHeight());
    this.dialog.style.height = `${Math.max(0, next)}px`;
  };

  private handlePointerUp = (ev: PointerEvent) => {
    if (!this.dialog) return;
    const target = ev.currentTarget as HTMLElement;
    if (target.hasPointerCapture?.(ev.pointerId)) target.releasePointerCapture(ev.pointerId);
    if (!this.dragMoved) return; // plain click — handleHandleClick runs next
    this.dragging = false;
    const h = this.dialog.getBoundingClientRect().height;
    this.dialog.style.height = '';
    const full = this.fullHeight();
    const canDismiss = this.variant !== 'modal' || this.dismissible;
    // Fast downward flick dismisses regardless of position.
    if (canDismiss && this.velocity > 0.5) {
      this.requestDismiss();
      return;
    }
    if (canDismiss && h < this.dragStartHeight * 0.5 && !this.expanded) {
      this.requestDismiss();
      return;
    }
    if (h < this.dragStartHeight * 0.5 && this.expanded) {
      // Collapsed well below full — snap back to peek.
      this.expanded = false;
      return;
    }
    // Snap to whichever preset is closer.
    this.expanded = h > (this.dragStartHeight + full) / 2 ? true : (h >= full * 0.75);
  };

  private requestDismiss() {
    const proceed = this.materialSheetCancel.emit();
    // Vetoed: the inline height is already cleared, CSS snaps back to the
    // current preset.
    if (!proceed.defaultPrevented) this.dialog?.close();
  }

  private handleHandleClick = () => {
    if (this.dragMoved) {
      this.dragMoved = false;
      return;
    }
    this.expanded = !this.expanded;
  };

  private handleHandleKeyDown = (ev: KeyboardEvent) => {
    if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault();
      this.expanded = !this.expanded;
    } else if (ev.key === 'ArrowUp') {
      ev.preventDefault();
      this.expanded = true;
    } else if (ev.key === 'ArrowDown') {
      ev.preventDefault();
      if (this.expanded) this.expanded = false;
      else if (this.variant !== 'modal' || this.dismissible) this.requestDismiss();
    }
  };

  render() {
    return (
      <Host>
        <dialog
          ref={this.setDialogRef}
          part="sheet"
          class={{
            sheet: true,
            'sheet--standard': this.variant === 'standard',
            'sheet--expanded': this.expanded,
            'sheet--dragging': this.dragging,
          }}
          aria-modal={this.variant === 'modal' ? 'true' : undefined}
        >
          {this.dragHandle && (
            <button
              type="button"
              class="handle-area"
              aria-label={this.dragHandleLabel || gettext('Drag handle')}
              aria-expanded={this.expanded ? 'true' : 'false'}
              onPointerDown={this.handlePointerDown}
              onPointerMove={this.handlePointerMove}
              onPointerUp={this.handlePointerUp}
              onClick={this.handleHandleClick}
              onKeyDown={this.handleHandleKeyDown}
            >
              <span class="handle" aria-hidden="true"></span>
            </button>
          )}
          <div class="body" part="body">
            <slot />
          </div>
        </dialog>
      </Host>
    );
  }
}
