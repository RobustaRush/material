/*
 * @viewflow/material — Material 3 web components
 * Copyright (c) 2017-2026 Mikhail Podgurskiy
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * AGPLv3 with the Viewflow Library Exception — see LICENSE_EXCEPTION.
 *
 * The copyright holder regards code produced from this file with an LLM's
 * help as a derived work: placing it in a model's context is copying it.
 * A commercial licence without copyleft: https://viewflow.io/pro.html
 */

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
import { dispatchNativeEvents, activateOnLabelClick } from '../../utils/form-events';

@Component({
  tag: 'material-switch',
  styleUrl: 'material-switch.css',
  shadow: true,
  formAssociated: true,
})
export class MaterialSwitch {
  @Element() el!: HTMLElement;
  @AttachInternals() internals!: ElementInternals;

  @Prop({ mutable: true, reflect: true }) checked = false;
  @Prop({ reflect: true }) disabled = false;
  @Prop({ reflect: true }) readonly = false;
  @Prop({ reflect: true }) required = false;
  @Prop({ reflect: true }) error = false;

  @Prop() name?: string;
  @Prop() value = 'on';

  @Prop() label?: string;
  @Prop() helpText?: string;
  @Prop() errorText?: string;

  @Prop({ reflect: true }) icon?: string;
  @Prop({ reflect: true, attribute: 'icon-unchecked' }) iconUnchecked?: string;

  @Prop({ attribute: 'aria-label' }) ariaLabel?: string;

  @Event() checkedChange!: EventEmitter<{ checked: boolean }>;

  private defaultChecked = false;

  componentWillLoad() {
    this.defaultChecked = this.checked;
  }

  connectedCallback() {
    this.syncFormValue();
    this.syncValidity();
  }

  @Watch('checked')
  @Watch('value')
  @Watch('name')
  syncFormValue() {
    this.internals.setFormValue(this.checked ? this.value : null);
    this.internals.ariaChecked = String(this.checked);
  }

  @Watch('required')
  @Watch('checked')
  @Watch('error')
  @Watch('errorText')
  syncValidity() {
    if (this.error) {
      this.internals.setValidity(
        { customError: true },
        this.errorText || 'Invalid',
      );
    } else if (this.required && !this.checked) {
      this.internals.setValidity(
        { valueMissing: true },
        'Please turn on this switch.',
      );
    } else {
      this.internals.setValidity({});
    }
  }

  formDisabledCallback(disabled: boolean) {
    this.disabled = disabled;
  }

  formResetCallback() {
    this.checked = this.defaultChecked;
  }

  formStateRestoreCallback(state: string | null) {
    this.checked = state === this.value;
  }

  private toggle = () => {
    if (this.disabled || this.readonly) return;
    this.checked = !this.checked;
    this.checkedChange.emit({ checked: this.checked });
    // Native semantics: a checkbox-like switch fires input+change together.
    dispatchNativeEvents(this.el, { input: true, change: true });
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      this.toggle();
    }
  };

  private ripple?: RippleHandle;
  private teardownLabelActivation?: () => void;

  componentDidLoad() {
    this.ripple = installRipple(this.el.shadowRoot!);
    // External <label for="…"> / internals.labels click activation: toggle
    // and focus the inner switch.
    this.teardownLabelActivation = activateOnLabelClick(this.el, () => {
      this.toggle();
      this.el.shadowRoot?.querySelector('button')?.focus();
    });
  }

  disconnectedCallback() {
    this.ripple?.destroy();
    this.ripple = undefined;
    this.teardownLabelActivation?.();
    this.teardownLabelActivation = undefined;
  }

  render() {
    const subText = this.error ? this.errorText : this.helpText;
    const subId = subText ? 'sub' : undefined;
    const labelId = this.label ? 'label' : undefined;
    const onIcon = this.icon;
    const offIcon = this.iconUnchecked;

    const button = (
      <button
        part="switch"
        type="button"
        role="switch"
        class="switch"
        aria-checked={String(this.checked)}
        aria-label={this.ariaLabel ?? (this.label ? undefined : 'switch')}
        aria-labelledby={!this.ariaLabel && labelId ? labelId : undefined}
        aria-required={this.required ? 'true' : null}
        aria-invalid={this.error ? 'true' : null}
        aria-readonly={this.readonly ? 'true' : null}
        aria-describedby={subId}
        disabled={this.disabled}
        data-ripple
        onClick={this.toggle}
        onKeyDown={this.handleKeyDown}
      >
        <span class="track" aria-hidden="true">
          <span class="state-layer">
            <span class="md-ripple" aria-hidden="true"></span>
          </span>
          <span class="handle">
            {/* Both glyphs render whenever supplied; opacity/transform (in
                the CSS) cross-fade between them on toggle instead of
                swapping textContent. */}
            {onIcon && <span class="icon icon-on">{onIcon}</span>}
            {offIcon && <span class="icon icon-off">{offIcon}</span>}
          </span>
        </span>
      </button>
    );

    if (!this.label && !subText) {
      return <div class="root">{button}</div>;
    }

    return (
      <div class="root has-text">
        <div class="text-col">
          {this.label && (
            <span id={labelId} part="label" class="label">
              {this.label}
              {this.required && <span class="required-mark" aria-hidden="true">*</span>}
            </span>
          )}
          {subText && (
            <div
              id={subId}
              part={this.error ? 'error-text' : 'help-text'}
              class={{ subtext: true, error: this.error }}
            >
              {subText}
            </div>
          )}
        </div>
        {button}
      </div>
    );
  }
}
