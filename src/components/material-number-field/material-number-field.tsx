import {
  Component,
  Element,
  Event,
  EventEmitter,
  Host,
  Prop,
  State,
  Watch,
  h,
} from '@stencil/core';
import { gettext } from '../../utils/i18n';

export type MaterialNumberFieldVariant = 'filled' | 'outlined';

// Number field — textfield with stepper buttons, min/max/step, decimal
// precision and optional locale-aware thousands grouping. Light DOM (like
// material-date-field): a hidden input posts the canonical dot-decimal
// string, so Django's DecimalField/IntegerField parse it unmodified while
// the visible text shows "12 400,50" per locale.
//
//   <material-number-field name="total" label="Total" min="0" step="0.01"
//                          decimals="2" grouping prefix="$"></material-number-field>
//
// Out-of-range / unparseable entry follows material-date-field's contract:
// keep the text, flag `error`, post nothing new — never silently clamp what
// the user typed. Steppers and ArrowUp/Down do clamp (they generate values).

@Component({
  tag: 'material-number-field',
  styleUrl: 'material-number-field.css',
  shadow: false,
})
export class MaterialNumberField {
  @Element() el!: HTMLElement;

  @Prop() variant: MaterialNumberFieldVariant = 'outlined';
  @Prop() name?: string;
  @Prop() label?: string;
  @Prop() placeholder?: string;

  /** Canonical value — dot-decimal string ("1234.5"), empty = no value. */
  @Prop({ mutable: true, reflect: true }) value = '';

  @Prop() min?: number;
  @Prop() max?: number;
  @Prop() step = 1;

  /** Fraction digits shown/kept. Defaults to the step's precision
   *  (step 0.01 → 2). */
  @Prop() decimals?: number;

  /** Group thousands in the visible text (via Intl, `locale` or page
   *  locale). The posted value stays plain. */
  @Prop({ reflect: true }) grouping = false;

  @Prop() locale = '';

  /** Static text inside the field, e.g. a currency sign or unit. */
  @Prop() prefix?: string;
  @Prop() suffix?: string;

  @Prop({ mutable: true, reflect: true }) disabled = false;
  @Prop({ reflect: true }) required = false;
  @Prop({ reflect: true, attribute: 'readonly' }) readOnly = false;
  @Prop() helpText?: string;
  @Prop() errorText?: string;
  @Prop({ mutable: true, reflect: true }) error = false;
  @Prop() invalidLabel = '';

  @State() display = '';
  @State() liveError = '';

  @Event() valueChange!: EventEmitter<{ value: string; number: number | null }>;

  private hiddenInput?: HTMLInputElement;

  componentWillLoad() {
    this.display = this.format(this.parse(this.value));
  }

  @Watch('value')
  onValueChange() {
    this.display = this.format(this.parse(this.value));
    if (this.hiddenInput) this.hiddenInput.value = this.value;
  }

  private effectiveDecimals(): number {
    if (typeof this.decimals === 'number') return this.decimals;
    const s = String(this.step);
    const dot = s.indexOf('.');
    return dot < 0 ? 0 : s.length - dot - 1;
  }

  private effectiveLocale(): string | undefined {
    return this.locale || document.documentElement.lang || undefined;
  }

  private separators(): { group: string; decimal: string } {
    const parts = new Intl.NumberFormat(this.effectiveLocale()).formatToParts(12345.6);
    return {
      group: parts.find((p) => p.type === 'group')?.value ?? ',',
      decimal: parts.find((p) => p.type === 'decimal')?.value ?? '.',
    };
  }

  /** Lenient parse of user text: strips group separators and spaces,
   *  accepts both the locale decimal mark and a plain dot. */
  private parse(text: string): number | null {
    const raw = (text ?? '').trim();
    if (!raw) return null;
    const { group, decimal } = this.separators();
    let s = raw
      .split(group).join('')
      .replace(/[\s  ]/g, '')
      .replace(decimal, '.');
    // A lone comma decimal in a dot-locale (or vice versa) still parses.
    if (!s.includes('.') && s.includes(',')) s = s.replace(',', '.');
    if (!/^[+-]?(\d+(\.\d*)?|\.\d+)$/.test(s)) return NaN;
    return Number(s);
  }

  private format(n: number | null): string {
    if (n === null || Number.isNaN(n)) return '';
    const decimals = this.effectiveDecimals();
    if (!this.grouping) return n.toFixed(decimals);
    return new Intl.NumberFormat(this.effectiveLocale(), {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
      useGrouping: true,
    }).format(n);
  }

  private roundToStep(n: number): number {
    const decimals = this.effectiveDecimals();
    return Number(n.toFixed(decimals));
  }

  private commit(n: number | null) {
    const canonical = n === null ? '' : String(this.roundToStep(n));
    this.value = canonical;
    this.display = this.format(n);
    this.error = false;
    this.liveError = '';
    this.valueChange.emit({ value: canonical, number: n });
  }

  private handleTextChange = (e: Event) => {
    e.stopPropagation();
    const detail = (e as CustomEvent<{ value: string }>).detail;
    const raw = (detail?.value ?? '').trim();
    if (raw === '') {
      this.commit(null);
      return;
    }
    const n = this.parse(raw);
    if (n === null || Number.isNaN(n)) {
      this.error = true;
      this.liveError = this.invalidLabel || gettext('Invalid number');
      return;
    }
    if ((this.min !== undefined && n < this.min) || (this.max !== undefined && n > this.max)) {
      this.error = true;
      this.liveError = this.invalidLabel || gettext('Value outside allowed range');
      return;
    }
    this.commit(n);
  };

  private nudge(direction: 1 | -1) {
    if (this.disabled || this.readOnly) return;
    const current = this.parse(this.value);
    const base = current === null || Number.isNaN(current)
      ? (direction > 0 ? (this.min ?? 0) - this.step : (this.max ?? 0) + this.step)
      : current;
    let next = this.roundToStep(base + direction * this.step);
    if (this.min !== undefined) next = Math.max(this.min, next);
    if (this.max !== undefined) next = Math.min(this.max, next);
    this.commit(next);
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.nudge(1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.nudge(-1);
    }
  };

  // Keep stepper mouse presses from stealing focus (label flicker).
  private suppressFocus = (e: MouseEvent) => e.preventDefault();

  render() {
    const subText = this.error ? (this.errorText || this.liveError) : this.helpText;
    const atMin = this.min !== undefined && (this.parse(this.value) ?? NaN) <= this.min;
    const atMax = this.max !== undefined && (this.parse(this.value) ?? NaN) >= this.max;

    return (
      <Host class="block w-full" onKeyDown={this.handleKeyDown}>
        <material-textfield
          variant={this.variant}
          label={this.label}
          value={this.display}
          placeholder={this.placeholder}
          disabled={this.disabled}
          required={this.required}
          readOnly={this.readOnly}
          helpText={!this.error ? this.helpText : undefined}
          errorText={subText}
          error={this.error}
          leadingText={this.prefix}
          trailingText={this.suffix}
          wideTrailing={true}
          onValueChange={this.handleTextChange as unknown as (e: Event) => void}
        >
          <span slot="trailing" class="stepper">
            <material-icon-button
              size="xs"
              variant="standard"
              icon="remove"
              aria-label={gettext('Decrease')}
              disabled={this.disabled || this.readOnly || atMin}
              onClick={() => this.nudge(-1)}
              onMouseDown={this.suppressFocus}
            />
            <material-icon-button
              size="xs"
              variant="standard"
              icon="add"
              aria-label={gettext('Increase')}
              disabled={this.disabled || this.readOnly || atMax}
              onClick={() => this.nudge(1)}
              onMouseDown={this.suppressFocus}
            />
          </span>
        </material-textfield>

        <input
          ref={(el) => {
            this.hiddenInput = el;
          }}
          type="hidden"
          name={this.name}
          value={this.value}
        />
      </Host>
    );
  }
}
