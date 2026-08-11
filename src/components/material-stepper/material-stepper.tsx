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

import {
  Component,
  Element,
  Event,
  EventEmitter,
  Host,
  Method,
  Prop,
  State,
  h,
} from '@stencil/core';

// Stepper / wizard — M2 anatomy (M3 never shipped one) with M3 tokens, like
// the data table. Children are material-step elements; this component draws
// the header (numbered circles, labels, connectors) from their props and
// shows only the `active` step's content.
//
// Two modes, one markup:
//
// Server-driven (django-formtools WizardView) — the indicator. Each request
// renders ONE form; the template marks the current step `active` and earlier
// ones `completed`. Header clicks on visited steps emit a cancelable
// `materialStepClick` — post `wizard_goto_step` with the step's `value` and
// preventDefault():
//
//   <material-stepper>
//     {% for step in wizard.steps.all %}
//     <material-step label="{{ step }}" value="{{ step }}"
//       {% if step == wizard.steps.current %}active{% endif %}
//       {% if forloop.counter0 < wizard.steps.step0 %}completed{% endif %}>
//     </material-step>
//     {% endfor %}
//   </material-stepper>
//
// Client-side — all steps in one page/form. Buttons marked
// data-stepper-next / data-stepper-back anywhere inside navigate; `next`
// gates on constraint validation of the active step's controls (native and
// form-associated components exposing checkValidity/reportValidity). The
// last step's submit button is an ordinary type=submit — the stepper never
// owns the form.

export interface StepChangeDetail {
  from: number;
  to: number;
  fromValue: string;
  toValue: string;
}

export interface StepClickDetail {
  index: number;
  value: string;
}

type StepEl = HTMLElement & {
  label: string;
  supportingText?: string;
  value?: string;
  active: boolean;
  completed: boolean;
  error: boolean;
  disabled: boolean;
};

const STATE_ATTRS = ['active', 'completed', 'error', 'disabled', 'label', 'supporting-text'];

@Component({
  tag: 'material-stepper',
  styleUrl: 'material-stepper.css',
  shadow: true,
})
export class MaterialStepper {
  @Element() el!: HTMLElement;

  /** Header layout; vertical puts each step's content under its header. */
  @Prop({ reflect: true }) orientation: 'horizontal' | 'vertical' = 'horizontal';

  /** Steps must be completed in order — header jumps ahead are blocked. */
  @Prop() linear = true;

  /** Emitted after the active step changed (next/back/goTo/header click). */
  @Event() materialStepChange!: EventEmitter<StepChangeDetail>;

  /** Emitted on a header click before any navigation — preventDefault() to
   *  take over (e.g. post wizard_goto_step to a formtools view). */
  @Event() materialStepClick!: EventEmitter<StepClickDetail>;

  @State() rev = 0;

  private observer?: MutationObserver;

  connectedCallback() {
    this.observer = new MutationObserver(() => this.rev++);
    this.observer.observe(this.el, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: STATE_ATTRS,
    });
    // Wizard buttons usually live OUTSIDE the stepper (under the panels), so
    // the triggers are document-delegated, like the dialog triggers: a bare
    // data-stepper-next targets the enclosing stepper, a value targets by id.
    document.addEventListener('click', this.onDocClick);
  }

  disconnectedCallback() {
    this.observer?.disconnect();
    document.removeEventListener('click', this.onDocClick);
  }

  private onDocClick = (e: MouseEvent) => {
    // e.target is retargeted to the light-DOM host (e.g. material-button)
    const target = e.target as HTMLElement;
    const trigger = target.closest?.('[data-stepper-next], [data-stepper-back]') as HTMLElement | null;
    if (!trigger) return;
    const back = trigger.hasAttribute('data-stepper-back');
    const ref = trigger.getAttribute(back ? 'data-stepper-back' : 'data-stepper-next');
    const stepper = ref
      ? document.getElementById(ref)
      : trigger.closest('material-stepper') ?? trigger.closest('form')?.querySelector('material-stepper');
    if (stepper !== this.el) return;
    if (back) this.back();
    else this.next();
  };

  /** Advance one step after the active step's controls validate. */
  @Method()
  async next(): Promise<boolean> {
    return this.goTo(this.activeIndex() + 1, true);
  }

  /** Go back one step (no validation). */
  @Method()
  async back(): Promise<boolean> {
    return this.goTo(this.activeIndex() - 1, false);
  }

  /** Jump to a step by index; `validate` gates on the current step. */
  @Method()
  async goTo(to: number, validate = false): Promise<boolean> {
    const steps = this.steps();
    const from = this.activeIndex();
    if (to === from || to < 0 || to >= steps.length) return false;
    const current = steps[from];
    if (validate && current) {
      if (!(await this.validateStep(current))) {
        current.error = true;
        return false;
      }
      current.error = false;
      current.completed = true;
    }
    steps.forEach((s, i) => (s.active = i === to));
    this.materialStepChange.emit({
      from,
      to,
      fromValue: this.stepValue(steps[from], from),
      toValue: this.stepValue(steps[to], to),
    });
    return true;
  }

  private steps(): StepEl[] {
    return Array.from(this.el.querySelectorAll<StepEl>(':scope > material-step'));
  }

  private activeIndex(): number {
    return Math.max(0, this.steps().findIndex((s) => s.active));
  }

  private stepValue(step: StepEl | undefined, i: number): string {
    return step?.value ?? String(i);
  }

  /** Native constraint validation over the active step's light DOM. Elements
   *  exposing checkValidity (inputs, selects, form-associated components)
   *  gate the advance; the first invalid one shows its native bubble. */
  private async validateStep(step: HTMLElement): Promise<boolean> {
    const controls = Array.from(step.querySelectorAll<HTMLInputElement>('*'))
      .filter((el) => typeof el.checkValidity === 'function' && !el.closest('[hidden]'));
    for (const el of controls) {
      if (!(await el.checkValidity())) {
        await (el.reportValidity?.() ?? Promise.resolve());
        return false;
      }
    }
    return true;
  }

  /** In linear mode a header is clickable only for visited ground: completed
   *  steps or anything before the first incomplete step. */
  private clickable(steps: StepEl[], i: number): boolean {
    const active = this.activeIndex();
    if (steps[i].disabled || i === active) return false;
    if (!this.linear) return true;
    if (i < active || steps[i].completed) return true;
    return steps.slice(0, i).every((s) => s.completed);
  }

  private headerClick(i: number) {
    const steps = this.steps();
    const ev = this.materialStepClick.emit({ index: i, value: this.stepValue(steps[i], i) });
    if (ev.defaultPrevented) return;
    this.goTo(i, false);
  }

  componentWillRender() {
    // Vertical layout interleaves headers and content wells, so each step is
    // routed to its own named slot; horizontal uses the single default slot.
    this.steps().forEach((s, i) => {
      const want = this.orientation === 'vertical' ? `s${i}` : null;
      if ((s.getAttribute('slot') ?? null) !== want) {
        if (want) s.setAttribute('slot', want);
        else s.removeAttribute('slot');
      }
    });
  }

  private renderItem(steps: StepEl[], i: number, last: boolean) {
    const s = steps[i];
    const clickable = this.clickable(steps, i);
    return [
      <button
        type="button"
        class={{
          item: true,
          active: s.active,
          completed: s.completed,
          error: s.error,
          clickable,
        }}
        disabled={!clickable && !s.active}
        aria-current={s.active ? 'step' : undefined}
        onClick={() => clickable && this.headerClick(i)}
      >
        <span class="circle" aria-hidden="true">
          {s.error ? (
            <span class="glyph">priority_high</span>
          ) : s.completed ? (
            <span class="glyph">check</span>
          ) : (
            <span class="num">{i + 1}</span>
          )}
        </span>
        <span class="texts">
          <span class="label">{s.label}</span>
          {s.supportingText && <span class="supporting">{s.supportingText}</span>}
        </span>
      </button>,
      !last && <span class="connector" aria-hidden="true"></span>,
    ];
  }

  render() {
    const steps = this.steps();
    const vertical = this.orientation === 'vertical';
    return (
      <Host>
        {vertical ? (
          steps.map((_, i) => [
            this.renderItem(steps, i, true),
            <div class={{ well: true, last: i === steps.length - 1 }}>
              <slot name={`s${i}`} />
            </div>,
          ])
        ) : (
          <div class="header">
            {steps.map((_, i) => this.renderItem(steps, i, i === steps.length - 1))}
          </div>
        )}
        {!vertical && (
          <div class="body">
            <slot />
          </div>
        )}
      </Host>
    );
  }
}
