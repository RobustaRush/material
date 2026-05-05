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
import { adoptMaterialStyles } from '../../utils/adopted-styles';

export type MaterialSnackbarCloseReason =
  | 'timeout'
  | 'action'
  | 'close'
  | 'replaced'
  | 'programmatic';

// MD3 snackbar. Single-line by default, two-line when content wraps.
// Auto-dismisses after `duration` ms unless duration === 0 (sticky) or an
// action button is present (per a11y guidelines, actionable snackbars
// remain until the user acts).
//
// Most apps should not place this element directly — use
// <material-snackbar-host> which owns positioning and the queue.

@Component({
  tag: 'material-snackbar',
  styleUrl: 'material-snackbar.css',
  shadow: true,
})
export class MaterialSnackbar {
  @Element() el!: HTMLElement;

  /** Supporting text. Default slot also accepted; slot wins when both are set. */
  @Prop() message?: string;

  /** When set, renders a trailing text button. */
  @Prop() actionLabel?: string;

  /** When true, renders a trailing close icon button next to (or instead of)
   *  the action button. */
  @Prop() closable = false;

  /** Auto-dismiss timeout in ms. `0` disables auto-dismiss. Ignored when
   *  an action is present (action-bearing snackbars stay until acted on). */
  @Prop() duration = 5000;

  /** Reflects open state. Toggling drives the enter/exit animation. */
  @Prop({ mutable: true, reflect: true }) open = false;

  @State() private hasSlotted = false;

  @Event() materialSnackbarOpen!: EventEmitter<void>;
  @Event({ cancelable: true }) materialSnackbarAction!: EventEmitter<void>;
  @Event() materialSnackbarClose!: EventEmitter<{ reason: MaterialSnackbarCloseReason }>;

  private timer?: number;
  private closeReason: MaterialSnackbarCloseReason = 'programmatic';

  componentWillLoad() {
    return this.el.shadowRoot ? adoptMaterialStyles(this.el.shadowRoot) : undefined;
  }

  disconnectedCallback() {
    this.clearTimer();
  }

  @Watch('open')
  onOpenChange(open: boolean) {
    if (open) {
      this.materialSnackbarOpen.emit();
      this.scheduleAutoDismiss();
    } else {
      this.clearTimer();
      this.materialSnackbarClose.emit({ reason: this.closeReason });
      this.closeReason = 'programmatic';
    }
  }

  @Watch('duration')
  onDurationChange() {
    if (this.open) this.scheduleAutoDismiss();
  }

  /** Open the snackbar. */
  @Method()
  async show(): Promise<void> {
    this.open = true;
  }

  /** Close the snackbar with an optional reason. */
  @Method()
  async close(reason: MaterialSnackbarCloseReason = 'programmatic'): Promise<void> {
    if (!this.open) return;
    this.closeReason = reason;
    this.open = false;
  }

  private scheduleAutoDismiss() {
    this.clearTimer();
    // Action-bearing snackbars don't auto-dismiss (a11y guideline).
    if (this.actionLabel) return;
    if (!this.duration || this.duration <= 0) return;
    this.timer = window.setTimeout(() => {
      this.close('timeout');
    }, this.duration);
  }

  private clearTimer() {
    if (this.timer !== undefined) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
  }

  private onSlotChange = (ev: Event) => {
    this.hasSlotted = (ev.target as HTMLSlotElement).assignedNodes().length > 0;
  };

  private handleAction = (ev: MouseEvent) => {
    ev.stopPropagation();
    const evt = this.materialSnackbarAction.emit();
    if (evt.defaultPrevented) return;
    this.close('action');
  };

  private handleClose = (ev: MouseEvent) => {
    ev.stopPropagation();
    this.close('close');
  };

  render() {
    const showAction = !!this.actionLabel;
    const showClose = this.closable;
    return (
      <Host>
        <div class="sb" part="container" role="presentation">
          <div class="sb__label">
            <slot onSlotchange={this.onSlotChange}>{!this.hasSlotted && this.message}</slot>
          </div>
          {showAction && (
            <button
              type="button"
              class="sb__action"
              part="action"
              onClick={this.handleAction}
            >
              {this.actionLabel}
            </button>
          )}
          {showClose && (
            <button
              type="button"
              class="sb__close"
              part="close"
              aria-label="Dismiss"
              onClick={this.handleClose}
            >
              <span class="material-symbols" aria-hidden="true">close</span>
            </button>
          )}
        </div>
      </Host>
    );
  }
}
