import {
  Component,
  Element,
  Event,
  EventEmitter,
  Prop,
  State,
  AttachInternals,
  h,
} from '@stencil/core';
import { installRipple, RippleHandle } from '../../utils/ripple';
import { handleFormSubmitterClick } from '../../utils/form-submitter';

export type MaterialSplitButtonVariant = 'filled' | 'tonal' | 'elevated' | 'outlined';
export type MaterialSplitButtonSize = 'xs' | 's' | 'm' | 'l' | 'xl';
export type MaterialSplitButtonType = 'submit' | 'reset' | 'button';

let splitButtonId = 0;

@Component({
  tag: 'material-split-button',
  styleUrl: 'material-split-button.css',
  shadow: true,
  formAssociated: true,
})
export class MaterialSplitButton {
  @Element() el!: HTMLElement;
  @AttachInternals() internals!: ElementInternals;

  @Prop({ reflect: true }) variant: MaterialSplitButtonVariant = 'filled';
  @Prop({ reflect: true }) size: MaterialSplitButtonSize = 's';
  @Prop({ reflect: true }) disabled = false;
  @Prop() label?: string;
  @Prop() icon?: string;
  /** Native `<button>` parity: defaults to `submit` (like a plain `<button>`
   *  in a form), not `button`. Set `type="button"` explicitly to opt out. */
  @Prop() type: MaterialSplitButtonType = 'submit';
  @Prop() name?: string;
  @Prop() value?: string;
  @Prop() href?: string;
  @Prop() target?: '_self' | '_blank' | '_parent' | '_top';
  @Prop() rel?: string;
  @Prop() download?: string;
  @Prop({ attribute: 'aria-label' }) ariaLabel?: string;
  @Prop() menuLabel = 'More options';

  @Event() splitAction!: EventEmitter<void>;
  @Event() splitMenuOpen!: EventEmitter<void>;
  @Event() splitMenuClose!: EventEmitter<void>;

  @State() expanded = false;

  private menuId = `material-split-menu-${++splitButtonId}`;
  private trailingId = `${this.menuId}-trigger`;
  private trailingEl?: HTMLButtonElement;
  private menuEl?: HTMLElement & {
    show: (anchor?: Element) => Promise<void>;
    hide: () => Promise<void>;
  };

  formDisabledCallback(disabled: boolean) {
    this.disabled = disabled;
  }

  private handleLeadingClick = (e: MouseEvent) => {
    if (this.disabled) {
      e.preventDefault();
      return;
    }
    this.splitAction.emit();
    if (this.href) return;
    const form = this.internals.form;
    if (!form) return;
    if (this.type === 'submit' || this.type === 'reset') {
      handleFormSubmitterClick(e, form, this.type, {
        hostElement: this.el,
        name: this.name,
        value: this.value,
      });
    }
  };

  private handleMenuToggle = (ev: Event) => {
    const e = ev as ToggleEvent;
    const opening = e.newState === 'open';
    this.expanded = opening;
    if (opening) this.splitMenuOpen.emit();
    else this.splitMenuClose.emit();
  };

  private handleTrailingClick = () => {
    if (this.disabled || !this.menuEl || !this.trailingEl) return;
    if (this.expanded) this.menuEl.hide();
    else this.menuEl.show(this.trailingEl);
  };

  private ripple?: RippleHandle;

  componentDidLoad() {
    this.ripple = installRipple(this.el.shadowRoot!);
  }

  disconnectedCallback() {
    this.ripple?.destroy();
    this.ripple = undefined;
  }

  render() {
    const leadingInner = [
      this.icon && (
        <span class="icon" aria-hidden="true">{this.icon}</span>
      ),
      this.label && <span class="label">{this.label}</span>,
    ];

    const leading = this.href ? (
      <a
        href={this.disabled ? undefined : this.href}
        target={this.target}
        rel={this.rel ?? (this.target === '_blank' ? 'noopener noreferrer' : undefined)}
        download={this.download}
        aria-label={this.ariaLabel}
        aria-disabled={this.disabled ? 'true' : undefined}
        tabindex={this.disabled ? -1 : undefined}
        part="leading"
        class="leading"
        data-ripple
        onClick={this.handleLeadingClick}
      >
        <span class="state-layer" aria-hidden="true"></span>
        <span class="md-ripple" aria-hidden="true"></span>
        {leadingInner}
      </a>
    ) : (
      <button
        type={this.type}
        disabled={this.disabled}
        aria-label={this.ariaLabel}
        part="leading"
        class="leading"
        data-ripple
        onClick={this.handleLeadingClick}
      >
        <span class="state-layer" aria-hidden="true"></span>
        <span class="md-ripple" aria-hidden="true"></span>
        {leadingInner}
      </button>
    );

    return (
      <div class="root">
        {leading}
        <button
          type="button"
          id={this.trailingId}
          part="trailing"
          class="trailing"
          disabled={this.disabled}
          aria-label={this.menuLabel}
          aria-haspopup="menu"
          aria-expanded={String(this.expanded)}
          aria-controls={this.menuId}
          data-ripple
          ref={(el) => (this.trailingEl = el)}
          onClick={this.handleTrailingClick}
        >
          <span class="state-layer" aria-hidden="true"></span>
          <span class="md-ripple" aria-hidden="true"></span>
          <span class="chevron" aria-hidden="true">arrow_drop_down</span>
        </button>
        <material-menu
          id={this.menuId}
          placement="bottom-end"
          ref={(el) => (this.menuEl = el as typeof this.menuEl)}
          onToggle={this.handleMenuToggle}
        >
          <slot />
        </material-menu>
      </div>
    );
  }
}
