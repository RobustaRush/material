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

export type MaterialDialogVariant = 'basic' | 'full-screen' | 'adaptive';
export type MaterialDialogPosition =
  | 'center'
  | 'top' | 'top-start' | 'top-end'
  | 'bottom' | 'bottom-start' | 'bottom-end';

// MD3 emphasized easings (see --md-sys-motion-easing-emphasized(-accelerate)
// in src/theme/system.css). WAAPI keyframes can't consume CSS custom
// properties, so the values are duplicated here — keep them in sync.
const EASE_EMPHASIZED = 'cubic-bezier(0.2, 0, 0, 1)';
const EASE_EMPHASIZED_ACCELERATE = 'cubic-bezier(0.3, 0, 0.8, 0.15)';

// MD3 dialog. Wraps a real <dialog> in shadow DOM so we get top layer,
// scrim (::backdrop), focus trap, Esc handling, and focus return for free.
//
// Triggers (any combination, all browsers):
//   <button data-dialog-target="d1">Open</button>           // delegated
//   <button command="show-modal" commandfor="d1">Open</button>  // native invoker
//   document.getElementById('d1').show()                     // programmatic
//
// Closing from within:
//   <button data-dialog-close="confirm">Confirm</button>   // sets returnValue

@Component({
  tag: 'material-dialog',
  styleUrl: 'material-dialog.css',
  shadow: true,
})
export class MaterialDialog {
  @Element() el!: HTMLElement;

  /** `basic` (centered card), `full-screen` (full bleed), or `adaptive`
   *  (full-screen below the compact breakpoint, basic above). */
  @Prop({ reflect: true }) variant: MaterialDialogVariant = 'basic';

  /** Reflects open state. Toggling this prop drives showModal()/close(). */
  @Prop({ mutable: true, reflect: true }) open = false;

  /** Basic-variant only. Edge positions respect a 56dp margin from the
   *  viewport per spec; ignored for full-screen. */
  @Prop({ reflect: true }) position: MaterialDialogPosition = 'center';

  /** Headline text. Overridden by `slot="headline"` if provided. */
  @Prop() headline?: string;

  /** Material Symbols icon name for the basic variant. Overridden by
   *  `slot="icon"` if provided. */
  @Prop() icon?: string;

  /** When false, Esc and backdrop click do not close the dialog. */
  @Prop() dismissible = true;

  /** When true, the inner dialog uses role="alertdialog". */
  @Prop({ reflect: true }) alert = false;

  /** Skip the open/close animations entirely — instant show/hide. Covers
   *  the basic variant's WAAPI choreography, full-screen's CSS scale+fade,
   *  and the scrim fade (see :host([quick]) in the stylesheet). */
  @Prop({ reflect: true }) quick = false;

  /** Mirrors the native dialog.returnValue after close. */
  @Prop({ mutable: true }) returnValue = '';

  @State() private isCompact = false;
  @State() private hasIconSlot = false;
  @State() private hasHeadlineSlot = false;
  @State() private hasLeadingSlot = false;

  @Event() materialDialogOpen!: EventEmitter<void>;
  @Event() materialDialogClose!: EventEmitter<{ returnValue: string }>;
  @Event({ cancelable: true }) materialDialogCancel!: EventEmitter<void>;

  private dialog?: HTMLDialogElement;
  private mql?: MediaQueryList;
  private mqlHandler?: (e: MediaQueryListEvent) => void;

  // Open/close choreography (basic variant only — see animateOpen/animateClose).
  private headlineEl?: HTMLElement;
  private bodyEl?: HTMLElement;
  private actionsEl?: HTMLElement;
  private activeAnimations: Animation[] = [];
  // Bumped by cancelAnimations() every time a new open/close phase starts —
  // lets a pending runClose() detect it's been superseded (a reopen, or a
  // second close) and skip its now-stale dialog.close() call.
  private animationGeneration = 0;

  componentWillLoad() {
    ensureDialogTriggersInstalled();
    this.setupMqlIfNeeded();
  }

  connectedCallback() {
    this.el.addEventListener('command', this.handleCommand as EventListener);
    // Slotted content lives in the host's light DOM, not inside the shadow
    // <dialog>, so a `<form method="dialog">` submit has no ancestor
    // <dialog> to close and would otherwise navigate. Listen on the host
    // and route it through the same close path ourselves.
    this.el.addEventListener('submit', this.handleFormSubmit as EventListener);
  }

  disconnectedCallback() {
    this.el.removeEventListener('command', this.handleCommand as EventListener);
    this.el.removeEventListener('submit', this.handleFormSubmit as EventListener);
    this.teardownMql();
    this.cancelAnimations();
    if (this.dialog) {
      this.dialog.removeEventListener('close', this.handleClose);
      this.dialog.removeEventListener('cancel', this.handleCancel);
      this.dialog.removeEventListener('click', this.handleDialogClick);
    }
  }

  @Watch('variant')
  onVariantChange() {
    this.teardownMql();
    this.setupMqlIfNeeded();
  }

  @Watch('open')
  syncOpen(open: boolean) {
    const dlg = this.dialog;
    if (!dlg) return;
    if (open && !dlg.open) {
      dlg.showModal();
      this.materialDialogOpen.emit();
      this.animateOpen();
    } else if (!open && dlg.open) {
      this.runClose(this.returnValue);
    }
  }

  /** Open the dialog (modal). */
  @Method()
  async show(): Promise<void> {
    this.open = true;
  }

  /** Close the dialog, optionally setting the return value. */
  @Method()
  async close(returnValue?: string): Promise<void> {
    if (returnValue !== undefined) this.returnValue = returnValue;
    this.open = false;
  }

  private setupMqlIfNeeded() {
    if (this.variant !== 'adaptive' || typeof window === 'undefined') return;
    this.mql = window.matchMedia('(max-width: 599px)');
    this.isCompact = this.mql.matches;
    this.mqlHandler = (e) => { this.isCompact = e.matches; };
    this.mql.addEventListener('change', this.mqlHandler);
  }

  private teardownMql() {
    if (this.mql && this.mqlHandler) {
      this.mql.removeEventListener('change', this.mqlHandler);
    }
    this.mql = undefined;
    this.mqlHandler = undefined;
  }

  private handleCommand = (ev: Event) => {
    const e = ev as Event & { command?: string };
    switch (e.command) {
      case 'show-modal':
      case 'show':
        ev.preventDefault();
        this.show();
        break;
      case 'close':
      case 'hide':
        ev.preventDefault();
        this.close();
        break;
    }
  };

  private handleFormSubmit = (ev: SubmitEvent) => {
    const form = ev.target as HTMLFormElement;
    if (!form || form.getAttribute('method') !== 'dialog') return;
    ev.preventDefault();
    // Close reason is the submitter's value attribute, or the dialog's
    // current returnValue if there is none.
    this.close(ev.submitter?.getAttribute('value') ?? this.returnValue);
  };

  private handleClose = () => {
    if (!this.dialog) return;
    this.returnValue = this.dialog.returnValue;
    this.open = false;
    this.materialDialogClose.emit({ returnValue: this.returnValue });
  };

  private handleCancel = (ev: Event) => {
    if (!this.dismissible) {
      ev.preventDefault();
      return;
    }
    // Always take over the close ourselves (see runClose()) instead of
    // letting the browser's native cancel→close cascade run, so Esc gets
    // the same exit choreography as every other close path.
    ev.preventDefault();
    const proceed = this.materialDialogCancel.emit();
    if (!proceed.defaultPrevented) this.runClose();
  };

  // Native <dialog> doesn't dismiss on backdrop click. The click event
  // fires on the dialog itself when the press lands on the backdrop area
  // (outside the dialog's own content box).
  private handleDialogClick = (ev: MouseEvent) => {
    if (!this.dismissible || !this.dialog) return;
    if (ev.target !== this.dialog) return;
    const rect = this.dialog.getBoundingClientRect();
    const inside =
      ev.clientX >= rect.left && ev.clientX <= rect.right &&
      ev.clientY >= rect.top && ev.clientY <= rect.bottom;
    if (inside) return;
    // Route backdrop dismiss through the same cancelable path as Esc so
    // "unsaved changes" guards can veto it.
    const proceed = this.materialDialogCancel.emit();
    if (!proceed.defaultPrevented) this.runClose();
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
          this.dialog.showModal();
          this.materialDialogOpen.emit();
          this.animateOpen();
        }
      });
    }
  };

  private effectiveVariant(): 'basic' | 'full-screen' {
    if (this.variant === 'adaptive') return this.isCompact ? 'full-screen' : 'basic';
    return this.variant;
  }

  private setHeadlineRef = (el?: HTMLElement) => { this.headlineEl = el; };
  private setBodyRef = (el?: HTMLElement) => { this.bodyEl = el; };
  private setActionsRef = (el?: HTMLElement) => { this.actionsEl = el; };

  private prefersReducedMotion(): boolean {
    return typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  // Cancel whatever's still running before starting a new phase — handles
  // the quick-reopen/quick-reclose race, and clears any `fill: forwards`
  // left over from a previous run (e.g. a non-quick close followed by a
  // quick reopen must not leave content stuck at opacity 0).
  private cancelAnimations() {
    this.animationGeneration++;
    for (const anim of this.activeAnimations) anim.cancel();
    this.activeAnimations = [];
  }

  // MD3 dialog open choreography, basic variant only (full-screen keeps its
  // plain CSS scale+fade — see .dlg--full-screen in the stylesheet). Runs
  // via WAAPI so the surface, headline, content and actions can stagger
  // independently: dialog slides down while its own height grows from 35%
  // to 100% of its natural size (clip-reveal), and headline/content/actions
  // fade in with increasing offsets.
  private animateOpen() {
    this.cancelAnimations();
    const dlg = this.dialog;
    if (!dlg) return;
    // Clear the close-state scrim class from a prior cycle, else a reopen
    // renders with a transparent backdrop.
    dlg.classList.remove('is-closing');
    // Always release a clip left over from a previous cycle (e.g. a
    // non-quick close followed by a quick or reduced-motion reopen must not
    // stay clipped forever with nothing left to clear it).
    dlg.style.overflow = '';
    if (this.quick || this.prefersReducedMotion() || this.effectiveVariant() !== 'basic') return;

    const naturalHeight = dlg.offsetHeight;
    if (!naturalHeight) return;

    dlg.style.overflow = 'hidden';
    const grow = dlg.animate(
      [{ height: `${naturalHeight * 0.35}px` }, { height: `${naturalHeight}px` }],
      { duration: 500, easing: EASE_EMPHASIZED, fill: 'forwards' },
    );
    // `fill: forwards` pins the px height so a subpixel mismatch against
    // `height: fit-content` can't cause a snap; release it once the growth
    // is done so later content/window changes resize normally again.
    const release = () => {
      grow.cancel();
      if (this.dialog === dlg) dlg.style.overflow = '';
    };
    grow.addEventListener('finish', release, { once: true });

    const anims: Animation[] = [
      dlg.animate(
        [{ transform: 'translateY(-50px)' }, { transform: 'translateY(0)' }],
        { duration: 500, easing: EASE_EMPHASIZED },
      ),
      grow,
      // Quick surface fade-in, mirrors the reference's container fade.
      dlg.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 50, easing: 'linear' }),
    ];
    if (this.headlineEl) {
      anims.push(this.headlineEl.animate(
        [{ opacity: 0 }, { opacity: 0, offset: 0.2 }, { opacity: 1 }],
        { duration: 250, easing: 'linear' },
      ));
    }
    if (this.bodyEl) {
      anims.push(this.bodyEl.animate(
        [{ opacity: 0 }, { opacity: 0, offset: 0.2 }, { opacity: 1 }],
        { duration: 250, easing: 'linear' },
      ));
    }
    if (this.actionsEl) {
      anims.push(this.actionsEl.animate(
        [{ opacity: 0 }, { opacity: 0, offset: 0.5 }, { opacity: 1 }],
        { duration: 300, easing: 'linear' },
      ));
    }
    this.activeAnimations = anims;
  }

  // Close the dialog: for the basic variant (and not quick/reduced-motion),
  // run the exit choreography and only call the real dialog.close() once it
  // finishes, so the box is still genuinely open (and thus a real, laid-out
  // element to animate) for the whole thing — mirrors the reference
  // dialog's close(), which awaits its animation before calling close().
  // Full-screen (and quick/reduced-motion) close synchronously as before,
  // unchanged — full-screen still gets its plain CSS scale+fade exit via
  // the existing `overlay`/`display` allow-discrete transition.
  private runClose(returnValue?: string) {
    const dlg = this.dialog;
    if (!dlg || !dlg.open) return;
    if (returnValue !== undefined) this.returnValue = returnValue;
    if (this.quick || this.prefersReducedMotion() || this.effectiveVariant() !== 'basic') {
      dlg.close(this.returnValue);
      return;
    }
    const promise = this.animateClose();
    // animateClose() bumps animationGeneration synchronously (via
    // cancelAnimations()) before returning, so this reads the generation for
    // *this* close call. If another runClose() lands before this promise
    // settles, its own animateClose() bumps the generation again and cancels
    // these animations — which resolves this promise early too, so without
    // this check both calls would race to call the real dialog.close().
    const gen = this.animationGeneration;
    promise.then(() => {
      if (this.dialog === dlg && dlg.open && this.animationGeneration === gen) {
        dlg.close(this.returnValue);
      }
    });
  }

  // MD3 dialog close, basic variant only — see runClose(). Returns a promise
  // that resolves once the exit finishes (or immediately if nothing to run).
  //
  // Compositor-only exit: a subtle scale-down + fade on the whole surface,
  // NO `height` animation. The open side keeps its clip-reveal height grow
  // (it reads well and only runs while settling in), but collapsing `height`
  // on close re-lays-out the centred box every frame — content visibly
  // squashes and Chromium shows a faint layout jitter. transform+opacity run
  // off the main thread and stay smooth everywhere. `.is-closing` (added
  // here, cleared in animateOpen) fades the scrim in CSS while the dialog is
  // still modal — see material-dialog.css.
  private animateClose(): Promise<void> {
    this.cancelAnimations();
    const dlg = this.dialog;
    if (!dlg) return Promise.resolve();
    dlg.style.overflow = '';
    if (this.quick || this.prefersReducedMotion() || this.effectiveVariant() !== 'basic') return Promise.resolve();

    dlg.classList.add('is-closing');
    const anims: Animation[] = [
      dlg.animate(
        [
          { transform: 'scale(1)', opacity: 1 },
          { transform: 'scale(0.95)', opacity: 0 },
        ],
        { duration: 150, easing: EASE_EMPHASIZED_ACCELERATE, fill: 'forwards' },
      ),
    ];
    this.activeAnimations = anims;
    return Promise.all(anims.map((a) => a.finished.catch(() => {}))).then(() => {});
  }

  private onIconSlotChange = (ev: Event) => {
    this.hasIconSlot = (ev.target as HTMLSlotElement).assignedNodes().length > 0;
  };
  private onHeadlineSlotChange = (ev: Event) => {
    this.hasHeadlineSlot = (ev.target as HTMLSlotElement).assignedNodes().length > 0;
  };
  private onLeadingSlotChange = (ev: Event) => {
    this.hasLeadingSlot = (ev.target as HTMLSlotElement).assignedNodes().length > 0;
  };

  render() {
    const v = this.effectiveVariant();
    const role = this.alert ? 'alertdialog' : 'dialog';
    const headlineId = (this.headline || this.hasHeadlineSlot) ? 'dlg-headline' : undefined;

    return (
      <Host data-effective-variant={v}>
        <dialog
          ref={this.setDialogRef}
          role={role}
          aria-labelledby={headlineId}
          aria-modal="true"
          part="dialog"
          class={`dlg dlg--${v}`}
        >
          {v === 'basic' ? this.renderBasic(headlineId) : this.renderFullscreen(headlineId)}
        </dialog>
      </Host>
    );
  }

  private renderBasic(headlineId: string | undefined) {
    const showIcon = this.hasIconSlot || !!this.icon;
    const showHeadline = this.hasHeadlineSlot || !!this.headline;
    return [
      <div class="dlg__icon" hidden={!showIcon}>
        <slot name="icon" onSlotchange={this.onIconSlotChange}>
          {this.icon ? (
            <span class="dlg__icon-glyph" aria-hidden="true">{this.icon}</span>
          ) : null}
        </slot>
      </div>,
      <h2 id={headlineId} class="dlg__headline" hidden={!showHeadline} ref={this.setHeadlineRef}>
        <slot name="headline" onSlotchange={this.onHeadlineSlotChange}>
          {this.headline}
        </slot>
      </h2>,
      <div class="dlg__body" ref={this.setBodyRef}><slot /></div>,
      <div class="dlg__actions" ref={this.setActionsRef}><slot name="actions" /></div>,
    ];
  }

  private renderFullscreen(headlineId: string | undefined) {
    const showHeadline = this.hasHeadlineSlot || !!this.headline;
    return [
      <header class="dlg__header">
        <div class="dlg__leading">
          <slot name="leading" onSlotchange={this.onLeadingSlotChange}>
            {!this.hasLeadingSlot ? (
              <material-icon-button
                icon="close"
                variant="standard"
                aria-label="Close"
                onClick={() => this.close()}
              />
            ) : null}
          </slot>
        </div>
        <h2 id={headlineId} class="dlg__headline" hidden={!showHeadline}>
          <slot name="headline" onSlotchange={this.onHeadlineSlotChange}>
            {this.headline}
          </slot>
        </h2>
        <div class="dlg__actions dlg__actions--header">
          <slot name="actions" />
        </div>
      </header>,
      <div class="dlg__body"><slot /></div>,
    ];
  }
}
