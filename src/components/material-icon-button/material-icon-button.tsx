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
import { dispatchNativeEvents } from '../../utils/form-events';

export type MaterialIconButtonVariant = 'filled' | 'tonal' | 'outlined' | 'standard';
export type MaterialIconButtonSize = 'xs' | 's' | 'm' | 'l' | 'xl';
export type MaterialIconButtonShape = 'round' | 'square';
export type MaterialIconButtonWidth = 'default' | 'narrow' | 'wide';
export type MaterialIconButtonType = 'submit' | 'reset' | 'button';

@Component({
  tag: 'material-icon-button',
  styleUrl: 'material-icon-button.css',
  shadow: true,
  formAssociated: true,
})
export class MaterialIconButton {
  @Element() el!: HTMLElement;
  @AttachInternals() internals!: ElementInternals;

  @Prop({ reflect: true }) variant: MaterialIconButtonVariant = 'filled';
  @Prop({ reflect: true }) size: MaterialIconButtonSize = 's';
  @Prop({ reflect: true }) shape: MaterialIconButtonShape = 'round';
  @Prop({ reflect: true }) width: MaterialIconButtonWidth = 'default';
  @Prop() icon!: string;
  @Prop() selectedIcon?: string;
  @Prop({ reflect: true }) toggle = false;
  @Prop({ mutable: true, reflect: true }) selected = false;
  @Prop({ reflect: true }) disabled = false;
  @Prop() type: MaterialIconButtonType = 'button';
  @Prop({ reflect: true }) name?: string;
  @Prop() value = 'on';
  @Prop() href?: string;
  @Prop() target?: '_self' | '_blank' | '_parent' | '_top';
  @Prop() rel?: string;
  @Prop() download?: string;
  @Prop({ attribute: 'aria-label' }) ariaLabel?: string;
  @Prop({ attribute: 'popovertarget' }) popoverTarget?: string;
  @Prop({ attribute: 'popovertargetaction' }) popoverTargetAction?: 'toggle' | 'show' | 'hide';

  @Event() selectedChange!: EventEmitter<{ selected: boolean }>;

  private defaultSelected = false;

  componentWillLoad() {
    this.defaultSelected = this.selected;
  }

  connectedCallback() {
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

  private ripple?: RippleHandle;

  componentDidLoad() {
    this.ripple = installRipple(this.el.shadowRoot!);
  }

  disconnectedCallback() {
    this.ripple?.destroy();
    this.ripple = undefined;
  }

  private handleClick = (e: MouseEvent) => {
    if (this.disabled) {
      e.preventDefault();
      return;
    }
    // Toggle before the href short-circuit so toggle works on the anchor branch
    // too — previously `if (this.href) return` skipped the toggle logic entirely.
    if (this.toggle) {
      e.preventDefault();
      this.selected = !this.selected;
      this.selectedChange.emit({ selected: this.selected });
      dispatchNativeEvents(this.el, { input: true, change: true });
      return;
    }
    if (this.href) return;
    if (this.popoverTarget) {
      const root = this.el.getRootNode() as Document | ShadowRoot;
      const target = (root as Document).getElementById?.(this.popoverTarget);
      if (target && 'togglePopover' in target) {
        const action = this.popoverTargetAction ?? 'toggle';
        const t = target as HTMLElement & {
          togglePopover: (force?: boolean) => void;
          showPopover: () => void;
          hidePopover: () => void;
          show?: (anchorEl?: Element) => void;
          hide?: () => void;
        };
        // Opening via togglePopover() (not a native popovertarget on a real
        // <button>) means the browser never sets ToggleEvent.source, so an
        // anchored popover like material-menu can't find its trigger and opens
        // top-left. Use its show(anchorEl) method to pass this element as the
        // anchor. (Its private `invoker` field can't be poked from here — under
        // Stencil's lazy build the host and component instance are separate.)
        if (t.localName === 'material-menu' && typeof t.show === 'function') {
          const isOpen = t.matches(':popover-open');
          if (action === 'hide' || (action === 'toggle' && isOpen)) t.hide!();
          else t.show(this.el);
        } else if (action === 'show') t.showPopover();
        else if (action === 'hide') t.hidePopover();
        else t.togglePopover();
        return;
      }
    }
    const form = this.internals.form;
    if (!form) return;
    if (this.type === 'submit') form.requestSubmit();
    else if (this.type === 'reset') form.reset();
  };

  render() {
    const isToggle = this.toggle;
    const on = isToggle && this.selected;
    const icon = on && this.selectedIcon ? this.selectedIcon : this.icon;

    const inner = (
      <span part="visual">
        <span part="state-layer" aria-hidden="true"></span>
        <span class="md-ripple" aria-hidden="true"></span>
        <span class="icon-wrap">
          <span class="icon" aria-hidden="true">{icon}</span>
          <span class="badge"><slot name="badge" /></span>
        </span>
      </span>
    );

    if (this.href) {
      const rel =
        this.rel ?? (this.target === '_blank' ? 'noopener noreferrer' : undefined);
      return (
        <a
          href={this.disabled ? undefined : this.href}
          // a disabled link drops its href — without a role the aria-label
          // would sit on a generic element (WAI prohibits that)
          role={this.disabled ? 'link' : undefined}
          target={this.target}
          rel={rel}
          download={this.download}
          aria-label={this.ariaLabel}
          aria-pressed={isToggle ? String(this.selected) : undefined}
          aria-disabled={this.disabled ? 'true' : undefined}
          tabindex={this.disabled ? -1 : undefined}
          part="button"
          data-ripple
          onClick={this.handleClick}
        >
          {inner}
        </a>
      );
    }

    return (
      <button
        type={isToggle ? 'button' : this.type}
        aria-pressed={isToggle ? String(this.selected) : undefined}
        aria-label={this.ariaLabel}
        disabled={this.disabled}
        part="button"
        data-ripple
        onClick={this.handleClick}
      >
        {inner}
      </button>
    );
  }
}
