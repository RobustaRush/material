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

// MD3-styled option for `material-select`. Visually mirrors a
// `material-menu-item` (48dp single-line, 64dp two-line) but emits its own
// `materialOptionSelect` event so a parent select can intercept without
// colliding with the menu's `materialMenuSelect` channel.

@Component({
  tag: 'material-option',
  styleUrl: 'material-option.css',
  shadow: true,
})
export class MaterialOption {
  @Element() el!: HTMLElement;

  @Prop() value = '';
  @Prop() label?: string;
  @Prop() leadingIcon?: string;
  @Prop() trailingIcon?: string;
  @Prop() supportingText?: string;
  @Prop({ reflect: true }) disabled = false;
  @Prop({ mutable: true, reflect: true }) selected = false;

  @Event({ bubbles: true, composed: true })
  materialOptionSelect!: EventEmitter<{ value: string }>;

  componentWillLoad() {
    return this.el.shadowRoot ? adoptMaterialStyles(this.el.shadowRoot) : undefined;
  }

  private activate = (e?: Event) => {
    if (this.disabled) return;
    e?.stopPropagation();
    this.materialOptionSelect.emit({ value: this.value });
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.activate(e);
    }
  };

  render() {
    const twoLine = !!this.supportingText;
    return (
      <Host
        role="option"
        tabindex={this.disabled ? -1 : 0}
        aria-disabled={this.disabled ? 'true' : null}
        aria-selected={this.selected ? 'true' : 'false'}
        onClick={this.activate}
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
                <slot name="supporting-text">{this.supportingText}</slot>
              </span>
            )}
          </span>

          <span class="flex items-center justify-end gap-2 shrink-0 pl-2">
            <slot name="trailing">
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
