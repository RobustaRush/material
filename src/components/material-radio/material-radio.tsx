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
  AttachInternals,
  h,
} from '@stencil/core';
import { installRipple, RippleHandle } from '../../utils/ripple';
import { activateOnLabelClick } from '../../utils/form-events';

// MD3 spec: icon 20dp / target 48dp / state-layer 40dp.
// Selection state, focus order and form value are owned by <material-radio-group>.
// This component renders the visual + emits a select intent on click/Space.
// The group sets `checked`, `tabindex`, `error`, `disabled` as a property.
//
// `formAssociated` here is *not* about posting a value (the group owns
// form-value/validity) — it exists solely so this element is "labelable":
// only form-associated custom elements gain `internals.labels`, which is
// what makes an external <label for="…"> dispatch a click here at all.

@Component({
  tag: 'material-radio',
  styleUrl: 'material-radio.css',
  shadow: true,
  formAssociated: true,
})
export class MaterialRadio {
  @Element() el!: HTMLElement;
  @AttachInternals() internals!: ElementInternals;

  @Prop({ mutable: true, reflect: true }) checked = false;
  @Prop({ reflect: true }) disabled = false;
  @Prop() value!: string;
  @Prop() label?: string;
  @Prop({ attribute: 'label-position' }) labelPosition: 'trailing' | 'leading' = 'trailing';
  @Prop({ reflect: true }) error = false;
  @Prop({ attribute: 'aria-label' }) ariaLabel?: string;
  /** Roving-tabindex slot, driven by material-radio-group. When false the
   *  inner button leaves the tab order (tabindex -1). Reactive, so it applies
   *  on the next render rather than requiring shadow-DOM access. */
  @Prop() focusable = true;
  /** Group-level disable, driven by material-radio-group. Kept separate from
   *  the per-radio `disabled` so toggling the group off doesn't erase an
   *  individually-disabled radio's state. */
  @Prop({ reflect: true, attribute: 'group-disabled' }) groupDisabled = false;

  @Event({ bubbles: true, composed: true })
  radioSelect!: EventEmitter<{ value: string }>;

  private select = () => {
    if (this.disabled || this.groupDisabled || this.checked) return;
    this.radioSelect.emit({ value: this.value });
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === ' ') {
      e.preventDefault();
      this.select();
    }
  };

  private ripple?: RippleHandle;
  private teardownLabelActivation?: () => void;

  componentDidLoad() {
    this.ripple = installRipple(this.el.shadowRoot!);
    // External <label for="…"> / internals.labels click activation: select
    // and focus the inner radio button — selection flows through the same
    // `select()` path a real click uses, so the group stays the source of truth.
    this.teardownLabelActivation = activateOnLabelClick(this.el, () => {
      this.select();
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
    const isOn = this.checked;
    const inError = this.error;

    const stateLayerCls = inError ? 'state-layer err' : isOn ? 'state-layer on' : 'state-layer off';
    const ringCls = inError ? 'ring err' : isOn ? 'ring on' : 'ring off';
    const dotColorCls = inError ? 'error' : 'primary';

    const button = (
      <button
        type="button"
        role="radio"
        class="target"
        disabled={this.disabled || this.groupDisabled}
        tabindex={this.focusable ? 0 : -1}
        aria-checked={String(isOn)}
        aria-label={this.ariaLabel ?? (this.label ? undefined : 'radio')}
        data-ripple
        onClick={this.select}
        onKeyDown={this.handleKeyDown}
      >
        <span class={stateLayerCls} aria-hidden="true">
          <span class="md-ripple" aria-hidden="true"></span>
        </span>
        <span class={ringCls}>
          {/* Always rendered so the dot can scale in — a conditionally rendered
              dot can't transition. 200ms standard easing per MD3 selection-control motion. */}
          <span
            class={`dot ${dotColorCls} ${isOn ? 'on' : ''}`}
            aria-hidden="true"
          ></span>
        </span>
      </button>
    );

    if (!this.label) return button;

    // items-start + mt-3 mirrors material-checkbox: 48dp target anchors to the
    // top of the row, the primary label drops 12px so its first line vertically
    // centers against the 20dp ring.
    const reverse = this.labelPosition === 'leading' ? 'row reverse' : 'row';
    return (
      <label class={reverse}>
        {button}
        <span class="label">{this.label}</span>
      </label>
    );
  }
}
