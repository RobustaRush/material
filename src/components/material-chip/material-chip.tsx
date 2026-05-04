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
    }
  };

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
    const showCheckmark =
      this.variant === 'filter' && this.selected && !this.icon;
    const leadingIcon = showCheckmark ? 'check' : this.icon;
    const hasAvatar = !!this.el.querySelector('[slot="avatar"]');

    return [
      hasAvatar && (
        <span class="avatar" aria-hidden="true">
          <slot name="avatar" />
        </span>
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
          aria-label={this.ariaLabel}
          aria-disabled={this.disabled ? 'true' : undefined}
          tabindex={this.disabled ? -1 : undefined}
          part="chip"
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
            aria-label={this.ariaLabel}
            onClick={this.toggle}
            onKeyDown={this.handleBodyKeyDown}
          >
            {this.renderBodyContents()}
          </button>
          <button
            type="button"
            class="trailing-btn"
            disabled={this.disabled}
            aria-label="Remove"
            onClick={this.handleTrailingClick}
            onKeyDown={this.handleTrailingKeyDown}
          >
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
        aria-label={this.ariaLabel}
        part="chip"
        onClick={this.toggle}
        onKeyDown={this.handleBodyKeyDown}
      >
        {inner}
      </button>
    );
  }
}
