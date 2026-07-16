import {
  Component,
  Element,
  Event,
  EventEmitter,
  Prop,
  Watch,
  AttachInternals,
  h,
} from '@stencil/core';
import { installRipple, RippleHandle } from '../../utils/ripple';

export type MaterialChipVariant = 'assist' | 'filter' | 'input' | 'suggestion';

@Component({
  tag: 'material-chip',
  styleUrl: 'material-chip.css',
  shadow: true,
  formAssociated: true,
})
export class MaterialChip {
  @Element() el!: HTMLElement;
  @AttachInternals() internals!: ElementInternals;

  @Prop({ reflect: true }) variant: MaterialChipVariant = 'assist';
  @Prop({ reflect: true }) elevated = false;
  @Prop({ reflect: true, mutable: true }) selected = false;
  @Prop({ reflect: true }) disabled = false;
  @Prop() label?: string;
  @Prop() icon?: string;
  @Prop() trailingIcon?: string;
  @Prop() name?: string;
  @Prop() value = 'on';
  @Prop() href?: string;
  @Prop() target?: '_self' | '_blank' | '_parent' | '_top';
  @Prop() rel?: string;
  @Prop({ attribute: 'aria-label' }) ariaLabel?: string;

  @Event() selectedChange!: EventEmitter<{ selected: boolean }>;
  @Event() remove!: EventEmitter<void>;

  private defaultSelected = false;

  componentWillLoad() {
    this.defaultSelected = this.selected;
  }

  connectedCallback() {
    this.syncFormValue();
  }

  @Watch('selected')
  @Watch('value')
  @Watch('variant')
  syncFormValue() {
    const selectable = this.variant === 'filter' || this.variant === 'input';
    this.internals.setFormValue(selectable && this.selected ? this.value : null);
  }

  formDisabledCallback(disabled: boolean) {
    this.disabled = disabled;
  }

  formResetCallback() {
    this.selected = this.defaultSelected;
  }

  formStateRestoreCallback(state: string | null) {
    this.selected = state === this.value;
  }

  private ripple?: RippleHandle;

  componentDidLoad() {
    this.ripple = installRipple(this.el.shadowRoot!);
  }

  disconnectedCallback() {
    this.ripple?.destroy();
    this.ripple = undefined;
  }

  private isSelectable() {
    return this.variant === 'filter' || this.variant === 'input';
  }

  private toggle = () => {
    if (this.disabled) return;
    if (this.isSelectable()) {
      this.selected = !this.selected;
      this.selectedChange.emit({ selected: this.selected });
    }
  };

  private handleBodyKeyDown = (e: KeyboardEvent) => {
    if (this.disabled) return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      this.toggle();
      return;
    }
    // Input chips: Backspace/Delete on the focused chip removes it
    // (chips/accessibility.md § Keyboard).
    if (this.variant === 'input' && (e.key === 'Backspace' || e.key === 'Delete')) {
      e.preventDefault();
      this.remove.emit();
    }
  };

  // "Remove {label}" per spec, falling back to the slotted text content.
  private removeLabel(): string {
    const name = this.label ?? this.el.textContent?.trim() ?? '';
    return `Remove ${name}`.trim();
  }

  private handleTrailingClick = (e: MouseEvent) => {
    e.stopPropagation();
    if (this.disabled) return;
    this.remove.emit();
  };

  private handleTrailingKeyDown = (e: KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      if (!this.disabled) this.remove.emit();
    }
  };

  private renderBodyContents() {
    // Filter chips reserve a check glyph that is always in the DOM so it can
    // animate its width/scale in on selection (see .check in the CSS) instead
    // of popping via a conditional render. A custom leading icon suppresses it.
    const showCheck = this.variant === 'filter' && !this.icon;
    const leadingIcon = this.icon;
    const hasAvatar = !!this.el.querySelector('[slot="avatar"]');

    return [
      <span class="md-ripple" aria-hidden="true"></span>,
      hasAvatar && (
        <span class="avatar" aria-hidden="true">
          <slot name="avatar" />
        </span>
      ),
      showCheck && (
        <span class="icon leading check" aria-hidden="true">check</span>
      ),
      leadingIcon && (
        <span class="icon leading" aria-hidden="true">{leadingIcon}</span>
      ),
      <span class="label"><slot>{this.label}</slot></span>,
    ];
  }

  render() {
    const selectable = this.isSelectable();
    const role = selectable ? 'checkbox' : undefined;
    const ariaChecked = selectable ? String(this.selected) : undefined;

    if (this.href) {
      const rel =
        this.rel ?? (this.target === '_blank' ? 'noopener noreferrer' : undefined);
      const inner = [
        ...this.renderBodyContents(),
        this.trailingIcon && (
          <span class="icon trailing" aria-hidden="true">{this.trailingIcon}</span>
        ),
      ];
      return (
        <a
          href={this.disabled ? undefined : this.href}
          target={this.target}
          rel={rel}
          aria-label={this.ariaLabel ?? this.label ?? undefined}
          aria-disabled={this.disabled ? 'true' : undefined}
          tabindex={this.disabled ? -1 : undefined}
          part="chip"
          data-ripple
          onClick={(e) => { if (this.disabled) e.preventDefault(); }}
        >
          {inner}
        </a>
      );
    }

    if (this.variant === 'input') {
      const trailingName = this.trailingIcon ?? 'close';
      return (
        <div part="chip">
          <button
            type="button"
            class="body"
            disabled={this.disabled}
            role={role}
            aria-checked={ariaChecked}
            aria-label={this.ariaLabel ?? this.label ?? undefined}
            data-ripple
            onClick={this.toggle}
            onKeyDown={this.handleBodyKeyDown}
          >
            {this.renderBodyContents()}
          </button>
          <button
            type="button"
            class="trailing-btn"
            disabled={this.disabled}
            aria-label={this.removeLabel()}
            data-ripple
            onClick={this.handleTrailingClick}
            onKeyDown={this.handleTrailingKeyDown}
          >
            <span class="md-ripple" aria-hidden="true"></span>
            <span class="icon" aria-hidden="true">{trailingName}</span>
          </button>
        </div>
      );
    }

    const inner = [
      ...this.renderBodyContents(),
      this.trailingIcon && (
        <span class="icon trailing" aria-hidden="true">{this.trailingIcon}</span>
      ),
    ];
    return (
      <button
        type="button"
        disabled={this.disabled}
        role={role}
        aria-checked={ariaChecked}
        aria-label={this.ariaLabel ?? this.label ?? undefined}
        part="chip"
        data-ripple
        onClick={this.toggle}
        onKeyDown={this.handleBodyKeyDown}
      >
        {inner}
      </button>
    );
  }
}
