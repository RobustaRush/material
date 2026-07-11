import {
  Component,
  Element,
  Event,
  EventEmitter,
  Host,
  Prop,
  h,
} from '@stencil/core';

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
        aria-current={this.selected ? 'true' : null}
        onClick={this.handleClick}
        onKeyDown={this.handleKeyDown}
      >
        <div
          class={[
            'row',
            twoLine ? 'two-line' : '',
            this.disabled ? 'disabled' : '',
            this.selected ? 'selected' : '',
          ].filter(Boolean).join(' ')}
        >
          <span class="state-layer" aria-hidden="true"></span>

          <span class="leading">
            <slot name="leading">
              {this.leadingIcon && (
                <span class="icon" aria-hidden="true">
                  {this.leadingIcon}
                </span>
              )}
            </slot>
          </span>

          <span class="text">
            <span class="label">
              <slot>{this.label}</slot>
            </span>
            {twoLine && (
              <span class="supporting-text">
                {this.supportingText}
              </span>
            )}
          </span>

          <span class="trailing">
            <slot name="trailing">
              {this.trailingText && (
                <span class="trailing-text">{this.trailingText}</span>
              )}
              {this.trailingIcon && (
                <span class="icon" aria-hidden="true">
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
