import {
  Component,
  Element,
  Event,
  EventEmitter,
  Host,
  Prop,
  h,
} from '@stencil/core';
import { adoptMaterialStyles } from '../../utils/adopted-styles';

// MD3 list item. Heights follow the baseline spec:
//   1-line  56dp  (text-only / leading icon)
//   2-line  72dp  (label + supporting-text)
//   3-line  88dp  (overline + label + supporting-text, top-aligned)
// Slots: leading | (default = label) | trailing — slotted content overrides
// the matching icon/text props for richer cases (avatar, image, checkbox,
// switch).

@Component({
  tag: 'material-list-item',
  styleUrl: 'material-list-item.css',
  shadow: true,
})
export class MaterialListItem {
  @Element() el!: HTMLElement;

  @Prop() label?: string;
  @Prop() overline?: string;
  @Prop() supportingText?: string;
  @Prop() leadingIcon?: string;
  @Prop() trailingIcon?: string;
  @Prop() trailingText?: string;
  @Prop() value?: string;
  @Prop() href?: string;

  @Prop({ reflect: true }) disabled = false;
  @Prop({ reflect: true, mutable: true }) selected = false;
  @Prop({ reflect: true }) divider: 'top' | 'bottom' | 'none' = 'none';

  /** Internal: tells the parent list this item was activated. */
  @Event({ bubbles: true, composed: true })
  materialListItemActivate!: EventEmitter<{ value?: string; checked?: boolean }>;

  componentWillLoad() {
    return this.el.shadowRoot ? adoptMaterialStyles(this.el.shadowRoot) : undefined;
  }

  private parentVariant(): 'baseline' | 'expressive' {
    const list = this.el.closest('material-list') as HTMLElement | null;
    return (list?.getAttribute('variant') as 'baseline' | 'expressive') || 'baseline';
  }

  private parentDense(): boolean {
    const list = this.el.closest('material-list') as HTMLElement | null;
    return !!list && list.hasAttribute('dense');
  }

  private activate = (e?: Event) => {
    if (this.disabled) return;
    // If a checkbox lives in the leading slot, clicking the row toggles it.
    const leading = this.el.querySelector<HTMLElement>(':scope > [slot="leading"]');
    const tag = leading?.tagName.toLowerCase();
    let checked: boolean | undefined;
    if (leading && (tag === 'material-checkbox') && e && !e.composedPath().includes(leading)) {
      const cb = leading as HTMLElement & { checked: boolean };
      cb.checked = !cb.checked;
      checked = cb.checked;
    } else if (leading && tag === 'material-checkbox') {
      checked = (leading as HTMLElement & { checked: boolean }).checked;
    }
    this.materialListItemActivate.emit({ value: this.value, checked });
  };

  private handleClick = (e: MouseEvent) => {
    // Anchor handles its own activation; just emit the event.
    if (this.href) {
      this.materialListItemActivate.emit({ value: this.value });
      return;
    }
    this.activate(e);
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (this.href) {
        (this.el.shadowRoot?.querySelector('a') as HTMLAnchorElement | null)?.click();
      } else {
        this.activate(e);
      }
    }
  };

  render() {
    const expressive = this.parentVariant() === 'expressive';
    const dense = this.parentDense();
    const twoLine = !!this.supportingText;
    const threeLine = !!this.overline && !!this.supportingText;

    const heightCls = threeLine
      ? 'min-h-[88px] py-3 items-start'
      : twoLine
        ? 'min-h-[72px] py-2 items-center'
        : 'min-h-14 py-2 items-center';
    const densityCls = dense ? 'py-1' : '';
    const selectedCls = this.selected
      ? expressive
        ? 'bg-primary-container text-on-primary-container'
        : 'bg-secondary-container text-on-secondary-container'
      : 'text-on-surface';
    const expressiveShape = expressive ? 'rounded-2xl mx-2' : '';

    const inner = (
      <div
        class={[
          'group relative flex w-full px-4 gap-4 cursor-pointer select-none',
          heightCls,
          densityCls,
          selectedCls,
          expressiveShape,
          this.disabled ? 'opacity-40 pointer-events-none' : '',
        ].join(' ')}
      >
        {/* state layer */}
        <span
          class="absolute inset-0 pointer-events-none transition-colors group-hover:bg-on-surface/10 group-active:bg-on-surface/15 group-focus-visible:bg-on-surface/10"
          aria-hidden="true"
        ></span>

        <span class={`flex ${threeLine ? 'items-start pt-0.5' : 'items-center'} justify-center shrink-0 min-w-6`}>
          <slot name="leading">
            {this.leadingIcon && (
              <span class="material-symbols text-[24px]" aria-hidden="true">
                {this.leadingIcon}
              </span>
            )}
          </slot>
        </span>

        <span class="flex flex-col flex-1 min-w-0 gap-0.5 justify-center">
          {this.overline && (
            <span class="truncate text-[11px] uppercase tracking-wide text-on-surface-variant">
              {this.overline}
            </span>
          )}
          <span class="truncate text-sm leading-5">
            <slot>{this.label}</slot>
          </span>
          {twoLine && (
            <span class="line-clamp-2 text-xs leading-4 text-on-surface-variant">
              {this.supportingText}
            </span>
          )}
        </span>

        <span class={`flex ${threeLine ? 'items-start' : 'items-center'} justify-end gap-3 shrink-0`}>
          <slot name="trailing">
            {this.trailingText && (
              <span class="text-xs text-on-surface-variant">{this.trailingText}</span>
            )}
            {this.trailingIcon && (
              <span class="material-symbols text-[24px] text-on-surface-variant" aria-hidden="true">
                {this.trailingIcon}
              </span>
            )}
          </slot>
        </span>
      </div>
    );

    // ARIA role: listbox parent → option; group parent (multi) → keep as listitem
    // with aria-checked; otherwise listitem.
    const list = this.el.closest('material-list');
    const sel = list?.getAttribute('selection');
    const role = sel === 'single' ? 'option' : sel === 'multi' ? 'menuitemcheckbox' : 'listitem';
    const ariaSelected = sel === 'single' ? (this.selected ? 'true' : 'false') : null;
    const ariaChecked = sel === 'multi' ? (this.selected ? 'true' : 'false') : null;

    return (
      <Host
        role={role}
        aria-selected={ariaSelected}
        aria-checked={ariaChecked}
        aria-disabled={this.disabled ? 'true' : null}
        tabindex={this.disabled ? -1 : 0}
        onClick={this.handleClick}
        onKeyDown={this.handleKeyDown}
      >
        {this.href ? (
          <a
            href={this.href}
            class="block no-underline text-inherit"
            tabIndex={-1}
          >
            {inner}
          </a>
        ) : (
          inner
        )}
      </Host>
    );
  }
}
