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

export type MaterialSideSheetVariant = 'modal' | 'standard' | 'adaptive';

// MD3 side sheet — the trailing detail/filter panel. Two surfaces:
//
// - modal: a real <dialog> (showModal) sliding in from the trailing edge
//   over a scrim. Works anywhere; the only sensible surface on compact.
// - standard: an in-flow panel that opens next to the primary content —
//   place the host as a flex/grid sibling of the main region and it
//   animates its inline size between 0 and the sheet width.
// - adaptive (default for record-detail layouts): standard on expanded
//   windows (>=840px), modal below — same markup for both.
//
// Same declarative triggers as material-dialog:
//   <button data-dialog-target="detail">Open</button>
//   <material-side-sheet id="detail" headline="Record">…
//     <div slot="actions"><button data-dialog-close="save">Save</button></div>
//   </material-side-sheet>

@Component({
  tag: 'material-side-sheet',
  styleUrl: 'material-side-sheet.css',
  shadow: true,
})
export class MaterialSideSheet {
  @Element() el!: HTMLElement;

  @Prop({ reflect: true }) variant: MaterialSideSheetVariant = 'modal';

  /** Reflects open state. */
  @Prop({ mutable: true, reflect: true }) open = false;

  /** Headline text. Overridden by `slot="headline"` if provided. */
  @Prop() headline?: string;

  /** Show the close icon button in the header. */
  @Prop({ attribute: 'show-close' }) showClose = true;

  /** Modal only: when false, Esc and scrim click do not close. */
  @Prop() dismissible = true;

  /** Mirrors the native dialog.returnValue after close (modal surface). */
  @Prop({ mutable: true }) returnValue = '';

  @Prop() closeLabel = '';

  @State() private isExpanded = false; // window >= 840px (adaptive)
  @State() private slotRev = 0; // bumped on slotchange to re-render

  @Event() materialSheetOpen!: EventEmitter<void>;
  @Event() materialSheetClose!: EventEmitter<{ returnValue: string }>;
  @Event({ cancelable: true }) materialSheetCancel!: EventEmitter<void>;

  private dialog?: HTMLDialogElement;
  private mql?: MediaQueryList;
  private mqlHandler?: (e: MediaQueryListEvent) => void;

  componentWillLoad() {
    ensureDialogTriggersInstalled();
    this.setupMqlIfNeeded();
  }

  disconnectedCallback() {
    this.teardownMql();
    this.detachDialog();
  }

  @Watch('variant')
  onVariantChange() {
    this.teardownMql();
    this.setupMqlIfNeeded();
  }

  @Watch('open')
  syncOpen(open: boolean) {
    if (this.effectiveVariant() !== 'modal') {
      // Standard surface: visibility is pure CSS off the reflected attr.
      if (open) this.materialSheetOpen.emit();
      else this.materialSheetClose.emit({ returnValue: this.returnValue });
      return;
    }
    const dlg = this.dialog;
    if (!dlg) return;
    if (open && !dlg.open) {
      dlg.showModal();
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

  private setupMqlIfNeeded() {
    if (this.variant !== 'adaptive' || typeof window === 'undefined') return;
    this.mql = window.matchMedia('(min-width: 840px)');
    this.isExpanded = this.mql.matches;
    this.mqlHandler = (e) => { this.isExpanded = e.matches; };
    this.mql.addEventListener('change', this.mqlHandler);
  }

  private teardownMql() {
    if (this.mql && this.mqlHandler) {
      this.mql.removeEventListener('change', this.mqlHandler);
    }
    this.mql = undefined;
    this.mqlHandler = undefined;
  }

  private effectiveVariant(): 'modal' | 'standard' {
    if (this.variant === 'adaptive') return this.isExpanded ? 'standard' : 'modal';
    return this.variant;
  }

  private handleClose = () => {
    if (!this.dialog) return;
    this.returnValue = this.dialog.returnValue;
    this.open = false;
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

  private handleDialogClick = (ev: MouseEvent) => {
    if (!this.dismissible || !this.dialog) return;
    if (ev.target !== this.dialog) return;
    const rect = this.dialog.getBoundingClientRect();
    const inside =
      ev.clientX >= rect.left && ev.clientX <= rect.right &&
      ev.clientY >= rect.top && ev.clientY <= rect.bottom;
    if (inside) return;
    const proceed = this.materialSheetCancel.emit();
    if (!proceed.defaultPrevented) this.dialog.close();
  };

  private detachDialog() {
    if (!this.dialog) return;
    this.dialog.removeEventListener('close', this.handleClose);
    this.dialog.removeEventListener('cancel', this.handleCancel);
    this.dialog.removeEventListener('click', this.handleDialogClick);
    this.dialog = undefined;
  }

  private setDialogRef = (el?: HTMLDialogElement) => {
    if (!el) {
      // Adaptive switch modal -> standard drops the dialog from the tree.
      this.detachDialog();
      return;
    }
    if (el === this.dialog) return;
    this.detachDialog();
    this.dialog = el;
    el.addEventListener('close', this.handleClose);
    el.addEventListener('cancel', this.handleCancel);
    el.addEventListener('click', this.handleDialogClick);
    if (this.open && !el.open) {
      requestAnimationFrame(() => {
        if (this.open && this.dialog && !this.dialog.open
            && this.effectiveVariant() === 'modal') {
          this.dialog.showModal();
          this.materialSheetOpen.emit();
        }
      });
    }
  };

  // Read the light DOM at render time instead of tracking slotchange state:
  // when the adaptive swap re-keys the tree, slotchange fires on the OLD
  // unmounting slot (0 assigned nodes) and not reliably on the new one —
  // slot-derived state would go stale. slotchange only bumps a revision so
  // dynamically added/removed actions still re-render.
  private hasActions(): boolean {
    return !!this.el.querySelector(':scope > [slot="actions"]');
  }

  private onActionsSlotChange = () => {
    this.slotRev++;
  };

  private renderContent(headlineId: string | undefined) {
    return [
      <header class="header" part="header">
        <slot name="leading" />
        <h2 id={headlineId} class="headline">
          <slot name="headline">{this.headline}</slot>
        </h2>
        {this.showClose && (
          <material-icon-button
            icon="close"
            variant="standard"
            class="close"
            aria-label={this.closeLabel || gettext('Close')}
            onClick={() => this.close()}
          />
        )}
      </header>,
      <div class="body" part="body">
        <slot />
      </div>,
      <div class={{ actions: true, 'has-actions': this.hasActions() }} part="actions">
        <slot name="actions" onSlotchange={this.onActionsSlotChange} />
      </div>,
    ];
  }

  render() {
    const v = this.effectiveVariant();
    const headlineId = 'sheet-headline';

    if (v === 'modal') {
      return (
        <Host data-effective-variant="modal">
          {/* Key the roots — modal vs standard are structurally different
              trees; without keys Stencil patches one into the other and the
              slide transition flashes. */}
          <dialog
            key="modal"
            ref={this.setDialogRef}
            part="sheet"
            class="sheet sheet--modal"
            aria-labelledby={headlineId}
            aria-modal="true"
          >
            {this.renderContent(headlineId)}
          </dialog>
        </Host>
      );
    }

    return (
      <Host data-effective-variant="standard">
        <aside
          key="standard"
          part="sheet"
          class={{ sheet: true, 'sheet--standard': true, 'sheet--open': this.open }}
          aria-labelledby={headlineId}
          aria-hidden={this.open ? undefined : 'true'}
          inert={this.open ? undefined : true}
        >
          <div class="standard-clip">
            {this.renderContent(headlineId)}
          </div>
        </aside>
      </Host>
    );
  }
}
