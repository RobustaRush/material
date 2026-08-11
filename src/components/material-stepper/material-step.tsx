/*
 * advanced-material-web — Material 3 web components
 * Copyright (c) 2017-2026 Mikhail Podgurskiy
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * AGPLv3 with the Viewflow Library Exception — see LICENSE_EXCEPTION.
 *
 * The copyright holder regards code produced from this file with an LLM's
 * help as a derived work: placing it in a model's context is copying it.
 * A commercial licence without copyleft: https://viewflow.io/pro.html
 */

import { Component, Host, Prop, h } from '@stencil/core';

// One step of material-stepper. The header (circle, label, connector) is
// drawn by the parent stepper from these props; this element is the step's
// content panel — visible only while `active`. With no content it is a pure
// indicator entry (django-formtools mode: the server renders one form per
// request and marks the current step `active`, earlier ones `completed`).

@Component({
  tag: 'material-step',
  styleUrl: 'material-step.css',
  shadow: true,
})
export class MaterialStep {
  /** Step title in the stepper header. */
  @Prop() label = '';

  /** Second line under the label, e.g. "Optional". */
  @Prop() supportingText?: string;

  /** Step name used in events (defaults to the index). For formtools use the
   *  wizard step name so `materialStepClick` maps to `wizard_goto_step`. */
  @Prop() value?: string;

  /** The current step. Set by the server (indicator mode) or by the
   *  stepper's own next/back navigation. */
  @Prop({ reflect: true, mutable: true }) active = false;

  /** Passed validation / already submitted. */
  @Prop({ reflect: true, mutable: true }) completed = false;

  /** Failed validation — error circle + error-toned label. */
  @Prop({ reflect: true, mutable: true }) error = false;

  /** Header never clickable for this step. */
  @Prop({ reflect: true }) disabled = false;

  render() {
    return (
      <Host>
        <slot />
      </Host>
    );
  }
}
