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

  componentWillLoad() {
    ensureDialogTriggersInstalled();
    this.setupMqlIfNeeded();
  }

  connectedCallback() {
    this.el.addEventListener('command', this.handleCommand as EventListener);
  }

  disconnectedCallback() {
    this.el.removeEventListener('command', this.handleCommand as EventListener);
    this.teardownMql();
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
    } else if (!open && dlg.open) {
      dlg.close(this.returnValue);
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
    const proceed = this.materialDialogCancel.emit();
    if (proceed.defaultPrevented) ev.preventDefault();
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
          this.dialog.showModal();
          this.materialDialogOpen.emit();
        }
      });
    }
  };

  private effectiveVariant(): 'basic' | 'full-screen' {
    if (this.variant === 'adaptive') return this.isCompact ? 'full-screen' : 'basic';
    return this.variant;
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
      <h2 id={headlineId} class="dlg__headline" hidden={!showHeadline}>
        <slot name="headline" onSlotchange={this.onHeadlineSlotChange}>
          {this.headline}
        </slot>
      </h2>,
      <div class="dlg__body"><slot /></div>,
      <div class="dlg__actions"><slot name="actions" /></div>,
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
