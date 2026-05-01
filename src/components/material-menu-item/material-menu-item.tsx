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

// MD3 vertical menu item. 48dp height (single-line) / 64dp (with supporting
// text). Leading icon + label + trailing icon-or-text, or named slots for
// richer leading content (checkbox, radio, avatar) and trailing content.

@Component({
  tag: 'material-menu-item',
  styleUrl: 'material-menu-item.css',
  shadow: true,
})
export class MaterialMenuItem {
  @Element() el!: HTMLElement;

  @Prop() label?: string;
  @Prop() leadingIcon?: string;
  @Prop() trailingIcon?: string;
  @Prop() trailingText?: string;
  @Prop() supportingText?: string;
  @Prop() value?: string;

  @Prop({ reflect: true }) disabled = false;
  @Prop({ reflect: true }) selected = false;
  @Prop({ reflect: true }) divider: 'top' | 'bottom' | 'none' = 'none';
  /** When true, activating the item does NOT close the parent menu. */
  @Prop() keepOpen = false;

  /** Selection event with the item's `value`. Bubbles + composed so listeners
   *  on the host page see it across the shadow boundary. */
  @Event({ bubbles: true, composed: true })
  materialMenuSelect!: EventEmitter<{ value?: string }>;

  /** Internal: tells the parent menu whether to close. */
  @Event({ bubbles: true, composed: true })
  materialMenuItemActivate!: EventEmitter<{ keepOpen: boolean }>;

  componentWillLoad() {
    return this.el.shadowRoot ? adoptMaterialStyles(this.el.shadowRoot) : undefined;
  }

  private activate = (e?: Event) => {
    if (this.disabled) return;
    // If a leading checkbox is slotted, clicking anywhere on the row toggles it.
    // Skip when the click was already on the checkbox itself (it self-toggles).
    const leading = this.el.querySelector<HTMLElement>(':scope > [slot="leading"]');
    const isCheckbox = leading && leading.tagName.toLowerCase() === 'material-checkbox';
    if (isCheckbox && e && !e.composedPath().includes(leading!)) {
      const cb = leading as HTMLElement & { checked: boolean };
      cb.checked = !cb.checked;
    }
    this.materialMenuSelect.emit({ value: this.value });
    this.materialMenuItemActivate.emit({ keepOpen: this.keepOpen });
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.activate(e);
    }
  };

  private handleClick = (e: MouseEvent) => this.activate(e);

  render() {
    const twoLine = !!this.supportingText;
    return (
      <Host
        role="menuitem"
        tabindex={this.disabled ? -1 : 0}
        aria-disabled={this.disabled ? 'true' : null}
        aria-selected={this.selected ? 'true' : null}
        onClick={this.handleClick}
        onKeyDown={this.handleKeyDown}
      >
        <div
          class={[
            'group relative flex items-center w-full pl-1 pr-3 cursor-pointer select-none',
            twoLine ? 'min-h-16 py-2' : 'h-12',
            this.disabled ? 'opacity-40 pointer-events-none' : '',
            this.selected
              ? 'bg-tertiary-container text-on-tertiary-container'
              : 'text-on-surface-variant',
          ].join(' ')}
        >
          {/* state layer */}
          <span
            class="absolute inset-0 pointer-events-none transition-colors group-hover:bg-on-surface/10 group-active:bg-on-surface/15 group-focus-visible:bg-on-surface/10"
            aria-hidden="true"
          ></span>

          <span class="flex items-center justify-center w-9 shrink-0">
            <slot name="leading">
              {this.leadingIcon && (
                <span class="material-symbols text-[24px]" aria-hidden="true">
                  {this.leadingIcon}
                </span>
              )}
            </slot>
          </span>

          <span class="flex flex-col flex-1 min-w-0 gap-0.5 px-2">
            <span class="truncate text-sm leading-5">
              <slot>{this.label}</slot>
            </span>
            {twoLine && (
              <span class="truncate text-xs leading-4 text-on-surface-variant">
                {this.supportingText}
              </span>
            )}
          </span>

          <span class="flex items-center justify-end gap-2 shrink-0 pl-2">
            <slot name="trailing">
              {this.trailingText && (
                <span class="text-xs text-on-surface-variant">{this.trailingText}</span>
              )}
              {this.trailingIcon && (
                <span class="material-symbols text-[24px]" aria-hidden="true">
                  {this.trailingIcon}
                </span>
              )}
            </slot>
          </span>
        </div>
      </Host>
    );
  }
}
