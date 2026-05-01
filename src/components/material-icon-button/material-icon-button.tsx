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
import { adoptMaterialStyles } from '../../utils/adopted-styles';

// MD3 Expressive icon button.
// Sizing & shape per spec (dp = px here):
//   XS  icon 20  default 32   narrow 28   wide 40   square-r 12  pressed-r 8
//   S   icon 24  default 40   narrow 32   wide 52   square-r 12  pressed-r 8
//   M   icon 24  default 56   narrow 48   wide 72   square-r 16  pressed-r 12
//   L   icon 32  default 96   narrow 64   wide 128  square-r 28  pressed-r 16
//   XL  icon 40  default 136  narrow 104  wide 184  square-r 28  pressed-r 16
// XS/S need a 48dp interactive target — wrap the visual container in a 48dp button.

export type MaterialIconButtonVariant = 'filled' | 'tonal' | 'outlined' | 'standard';
export type MaterialIconButtonSize = 'xs' | 's' | 'm' | 'l' | 'xl';
export type MaterialIconButtonShape = 'round' | 'square';
export type MaterialIconButtonWidth = 'default' | 'narrow' | 'wide';
export type MaterialIconButtonType = 'submit' | 'reset' | 'button';

interface SizeSpec {
  h: string;          // visual height
  w: Record<MaterialIconButtonWidth, string>;
  icon: string;       // icon font-size
  square: string;     // resting square radius
  pressed: string;    // pressed-state radius — literal Tailwind class so it is scannable
}

const SIZES: Record<MaterialIconButtonSize, SizeSpec> = {
  xs: {
    h: 'h-8',
    w: { narrow: 'min-w-7',   default: 'min-w-8',   wide: 'min-w-10'  },
    icon: 'text-[20px]',
    square: 'rounded-[12px]',
    pressed: 'group-active:rounded-[8px]',
  },
  s: {
    h: 'h-10',
    w: { narrow: 'min-w-8',   default: 'min-w-10',  wide: 'min-w-[52px]' },
    icon: 'text-[24px]',
    square: 'rounded-[12px]',
    pressed: 'group-active:rounded-[8px]',
  },
  m: {
    h: 'h-14',
    w: { narrow: 'min-w-12',  default: 'min-w-14',  wide: 'min-w-[72px]' },
    icon: 'text-[24px]',
    square: 'rounded-[16px]',
    pressed: 'group-active:rounded-[12px]',
  },
  l: {
    h: 'h-24',
    w: { narrow: 'min-w-16',  default: 'min-w-24',  wide: 'min-w-32' },
    icon: 'text-[32px]',
    square: 'rounded-[28px]',
    pressed: 'group-active:rounded-[16px]',
  },
  xl: {
    h: 'h-[136px]',
    w: { narrow: 'min-w-[104px]', default: 'min-w-[136px]', wide: 'min-w-[184px]' },
    icon: 'text-[40px]',
    square: 'rounded-[28px]',
    pressed: 'group-active:rounded-[16px]',
  },
};

// Color per spec table. Filled is the only variant where non-toggle != toggle-unselected:
// non-toggle Filled = Primary container (same as toggle-selected). Tonal/Outlined/Standard
// non-toggle visuals match their toggle-unselected row.
function variantClasses(
  variant: MaterialIconButtonVariant,
  toggle: boolean,
  selected: boolean,
): string {
  switch (variant) {
    case 'filled':
      return !toggle || selected
        ? 'bg-primary text-on-primary'
        : 'bg-surface-container text-on-surface-variant';
    case 'tonal':
      return toggle && selected
        ? 'bg-secondary text-on-secondary'
        : 'bg-secondary-container text-on-secondary-container';
    case 'outlined':
      return toggle && selected
        ? 'bg-inverse-surface text-inverse-on-surface'
        : 'bg-transparent text-on-surface-variant border border-outline-variant';
    case 'standard':
      return toggle && selected
        ? 'bg-transparent text-primary'
        : 'bg-transparent text-on-surface-variant';
  }
}

// Outer 48dp target wrapper for XS/S — fully transparent, no focus ring of its own
// (the visual span inside owns the focus-visible outline so it follows the round shape).
const TARGET =
  'inline-grid place-items-center w-12 h-12 bg-transparent border-0 p-0 m-0 cursor-pointer ' +
  'focus:outline-none focus-visible:outline-none ' +
  'disabled:cursor-not-allowed disabled:opacity-40';

// Visual container — non-interactive. Focus, hover & press visuals ride the parent
// button via `group-*:` modifiers (the span itself never receives focus or :active).
// `relative + overflow-hidden` so the absolute state-layer ::after stays inside the
// rounded shape and morphs with it.
const CONTAINER_BASE =
  'relative overflow-hidden inline-flex items-center justify-center box-border ' +
  'transition-[border-radius,background-color,color] ' +
  'group-focus-visible:outline-2 group-focus-visible:outline-secondary group-focus-visible:outline-offset-2';

// MD3 state layer: 8% on hover, 10% on focus/pressed. currentColor = icon color =
// the on-color of the container, which is the canonical state-layer color.
const STATE_LAYER =
  'absolute inset-0 pointer-events-none bg-current opacity-0 transition-opacity ' +
  'group-hover:opacity-[0.08] group-focus-visible:opacity-[0.10] group-active:opacity-[0.10]';

@Component({
  tag: 'material-icon-button',
  shadow: true,
  formAssociated: true,
})
export class MaterialIconButton {
  @Element() el!: HTMLElement;
  @AttachInternals() internals!: ElementInternals;

  @Prop() variant: MaterialIconButtonVariant = 'filled';
  @Prop() size: MaterialIconButtonSize = 's';
  @Prop() shape: MaterialIconButtonShape = 'round';
  @Prop() width: MaterialIconButtonWidth = 'default';
  @Prop() icon!: string;
  @Prop() selectedIcon?: string;
  @Prop() toggle = false;
  @Prop({ mutable: true, reflect: true }) selected = false;
  @Prop({ reflect: true }) disabled = false;
  @Prop() type: MaterialIconButtonType = 'button';
  @Prop() name?: string;
  @Prop() value = 'on';
  @Prop({ attribute: 'aria-label' }) ariaLabel?: string;

  @Event() selectedChange!: EventEmitter<{ selected: boolean }>;

  private defaultSelected = false;

  componentWillLoad() {
    this.defaultSelected = this.selected;
  }

  connectedCallback() {
    if (this.el.shadowRoot) adoptMaterialStyles(this.el.shadowRoot);
    this.syncFormValue();
  }

  formDisabledCallback(disabled: boolean) {
    this.disabled = disabled;
  }

  @Watch('selected')
  @Watch('toggle')
  @Watch('value')
  @Watch('disabled')
  syncFormValue() {
    if (this.toggle && !this.disabled) {
      this.internals.setFormValue(this.selected ? this.value : null);
    } else {
      this.internals.setFormValue(null);
    }
  }

  formResetCallback() {
    this.selected = this.defaultSelected;
  }

  formStateRestoreCallback(state: string | null) {
    this.selected = state === this.value;
  }

  private handleClick = () => {
    if (this.disabled) return;
    if (this.toggle) {
      this.selected = !this.selected;
      this.selectedChange.emit({ selected: this.selected });
      return;
    }
    const form = this.internals.form;
    if (!form) return;
    if (this.type === 'submit') form.requestSubmit();
    else if (this.type === 'reset') form.reset();
  };

  render() {
    const sz = SIZES[this.size];
    const isToggle = this.toggle;
    const on = isToggle && this.selected;

    // Resting radius — round = full; square = per-size radius.
    // Toggle morph: when selected, swap (round ↔ square). Pressed morph applied via active:.
    const morphedShape: MaterialIconButtonShape =
      isToggle && this.selected
        ? this.shape === 'round'
          ? 'square'
          : 'round'
        : this.shape;
    const restingRadius = morphedShape === 'round' ? 'rounded-full' : sz.square;

    const colorCls = variantClasses(this.variant, isToggle, this.selected);
    const icon = on && this.selectedIcon ? this.selectedIcon : this.icon;

    // XS/S need a 48dp interactive target for accessibility; M/L/XL are already ≥48.
    // The button itself owns the target; the visual container is a non-interactive span inside.
    const needsTarget = this.size === 'xs' || this.size === 's';

    // Pressed-radius morph rides the button's :active state via group-active: —
    // the visual span isn't the click target, so its own :active never fires.
    const visual = (
      <span
        class={[
          CONTAINER_BASE,
          sz.h,
          sz.w[this.width],
          restingRadius,
          sz.pressed,
          colorCls,
        ].join(' ')}
        aria-hidden="true"
      >
        <span class={STATE_LAYER} aria-hidden="true"></span>
        <span class={`material-symbols leading-none ${sz.icon} relative`} aria-hidden="true">
          {icon}
        </span>
      </span>
    );

    return (
      <button
        type={isToggle ? 'button' : this.type}
        aria-pressed={isToggle ? String(this.selected) : undefined}
        aria-label={this.ariaLabel}
        disabled={this.disabled}
        data-selected={isToggle ? String(this.selected) : null}
        class={`group ${
          needsTarget
            ? TARGET
            : 'inline-grid place-items-center bg-transparent border-0 p-0 m-0 cursor-pointer focus:outline-none focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40'
        }`}
        onClick={this.handleClick}
      >
        {visual}
      </button>
    );
  }
}
