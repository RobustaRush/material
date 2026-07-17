import {
  Component,
  Element,
  Event,
  EventEmitter,
  Prop,
  State,
  Watch,
  AttachInternals,
  h,
} from '@stencil/core';
import { dispatchNativeEvents } from '../../utils/form-events';

export type MaterialSliderSize = 'xs' | 's' | 'm' | 'l' | 'xl';
export type MaterialSliderOrientation = 'horizontal' | 'vertical';

type Thumb = 'low' | 'high';

@Component({
  tag: 'material-slider',
  styleUrl: 'material-slider.css',
  shadow: true,
  formAssociated: true,
})
export class MaterialSlider {
  @Element() el!: HTMLElement;
  @AttachInternals() internals!: ElementInternals;

  @Prop() min = 0;
  @Prop() max = 100;
  @Prop() step = 1;

  @Prop({ mutable: true, reflect: true }) value = 0;
  @Prop({ mutable: true }) valueLow?: number;
  @Prop({ mutable: true }) valueHigh?: number;

  @Prop() origin?: number;
  @Prop({ reflect: true }) discrete = false;

  @Prop({ reflect: true }) size: MaterialSliderSize = 's';
  @Prop({ reflect: true }) orientation: MaterialSliderOrientation = 'horizontal';
  @Prop() icon?: string;

  @Prop() valueIndicator = true;
  @Prop() valueFormatter?: (n: number) => string;
  @Prop({ reflect: true, attribute: 'tick-labels' }) tickLabels = false;

  @Prop({ reflect: true }) disabled = false;
  @Prop({ reflect: true }) readonly = false;
  @Prop({ reflect: true }) required = false;

  @Prop() name?: string;
  @Prop() label?: string;
  @Prop() helpText?: string;
  @Prop({ reflect: true }) error = false;
  @Prop() errorText?: string;
  @Prop({ attribute: 'aria-label' }) ariaLabel?: string;

  @Event() valueChange!: EventEmitter<
    { value: number } | { valueLow: number; valueHigh: number }
  >;
  @Event() valueCommit!: EventEmitter<
    { value: number } | { valueLow: number; valueHigh: number }
  >;

  @State() dragging = false;
  @State() activeThumb: Thumb = 'low';

  private defaultValue = 0;
  private defaultLow?: number;
  private defaultHigh?: number;

  componentWillLoad() {
    this.defaultValue = this.value;
    this.defaultLow = this.valueLow;
    this.defaultHigh = this.valueHigh;
    this.value = this.clamp(this.snap(this.value));
    if (this.valueLow !== undefined)
      this.valueLow = this.clamp(this.snap(this.valueLow));
    if (this.valueHigh !== undefined)
      this.valueHigh = this.clamp(this.snap(this.valueHigh));
  }

  connectedCallback() {
    this.syncFormValue();
    this.syncValidity();
  }

  @Watch('value')
  @Watch('valueLow')
  @Watch('valueHigh')
  @Watch('name')
  syncFormValue() {
    if (this.isRange()) {
      const fd = new FormData();
      if (this.name) {
        fd.append(this.name, String(this.valueLow));
        fd.append(this.name, String(this.valueHigh));
      }
      this.internals.setFormValue(fd);
    } else {
      this.internals.setFormValue(String(this.value));
    }
  }

  @Watch('required')
  @Watch('error')
  @Watch('errorText')
  syncValidity() {
    // `required` intentionally never reports `valueMissing`: a slider always
    // has a committed numeric value (defaults to 0, or to the low/high
    // bounds for a range), so there is no "empty" state to withhold commit
    // on — same as a native <input type="range">, which does not support
    // `required` at all. The prop still drives the visible required mark
    // and `aria-required` for assistive tech.
    if (this.error) {
      this.internals.setValidity(
        { customError: true },
        this.errorText || 'Invalid',
      );
    } else {
      this.internals.setValidity({});
    }
  }

  formDisabledCallback(disabled: boolean) {
    this.disabled = disabled;
  }

  formResetCallback() {
    this.value = this.defaultValue;
    this.valueLow = this.defaultLow;
    this.valueHigh = this.defaultHigh;
  }

  formStateRestoreCallback(
    state: string | FormData | Array<[string, FormDataEntryValue]> | null,
  ) {
    if (state == null) return;
    if (typeof state === 'string') {
      const n = parseFloat(state);
      if (!isNaN(n)) this.value = n;
      return;
    }
    // Multi-entry state may arrive as FormData or as an Array<[name, value]>
    // of entries (both holding just this control's own entries), depending
    // on the browser.
    const all = (
      Array.isArray(state)
        ? state.map(([, v]) => v)
        : this.name
          ? state.getAll(this.name)
          : []
    ).map(v => parseFloat(String(v)));
    if (all.length >= 2 && all.every(n => !isNaN(n))) {
      this.valueLow = all[0];
      this.valueHigh = all[1];
    }
  }

  private isRange() {
    return this.valueLow !== undefined && this.valueHigh !== undefined;
  }

  private clamp(n: number) {
    return Math.max(this.min, Math.min(this.max, n));
  }

  private snap(n: number) {
    if (!this.step || this.step <= 0) return n;
    return Math.round((n - this.min) / this.step) * this.step + this.min;
  }

  private pct(n: number) {
    if (this.max === this.min) return 0;
    return ((n - this.min) / (this.max - this.min)) * 100;
  }

  private valueFromPointer(e: PointerEvent, container: HTMLElement) {
    const rect = container.getBoundingClientRect();
    let frac: number;
    if (this.orientation === 'vertical') {
      // Top is max in MD3 vertical sliders.
      frac = 1 - (e.clientY - rect.top) / rect.height;
    } else {
      const isRTL = getComputedStyle(this.el).direction === 'rtl';
      const x = (e.clientX - rect.left) / rect.width;
      frac = isRTL ? 1 - x : x;
    }
    frac = Math.max(0, Math.min(1, frac));
    return this.clamp(this.snap(this.min + frac * (this.max - this.min)));
  }

  private writeValue(next: number, thumb: Thumb) {
    if (this.isRange()) {
      if (thumb === 'low') {
        const high = this.valueHigh ?? this.max;
        this.valueLow = Math.min(next, high);
      } else {
        const low = this.valueLow ?? this.min;
        this.valueHigh = Math.max(next, low);
      }
      this.valueChange.emit({
        valueLow: this.valueLow!,
        valueHigh: this.valueHigh!,
      });
    } else {
      this.value = next;
      this.valueChange.emit({ value: this.value });
    }
    dispatchNativeEvents(this.el, { input: true });
  }

  private emitChange() {
    if (this.isRange()) {
      this.valueCommit.emit({
        valueLow: this.valueLow!,
        valueHigh: this.valueHigh!,
      });
    } else {
      this.valueCommit.emit({ value: this.value });
    }
    dispatchNativeEvents(this.el, { change: true });
  }

  private nearestThumb(target: number): Thumb {
    if (!this.isRange()) return 'low';
    const dLow = Math.abs(target - (this.valueLow ?? this.min));
    const dHigh = Math.abs(target - (this.valueHigh ?? this.max));
    if (dLow === dHigh) {
      // Tie-break: pick the side the value is leaning toward.
      const mid = ((this.valueLow ?? 0) + (this.valueHigh ?? 0)) / 2;
      return target < mid ? 'low' : 'high';
    }
    return dLow < dHigh ? 'low' : 'high';
  }

  private isInert() {
    return this.disabled || this.readonly;
  }

  private handlePointerDown = (e: PointerEvent) => {
    if (this.isInert()) return;
    const container = e.currentTarget as HTMLElement;
    try { container.setPointerCapture(e.pointerId); } catch { /* synthetic events */ }
    const next = this.valueFromPointer(e, container);
    const thumb = this.nearestThumb(next);
    this.activeThumb = thumb;
    this.dragging = true;
    this.writeValue(next, thumb);
    this.focusThumb(thumb);
  };

  private handlePointerMove = (e: PointerEvent) => {
    if (!this.dragging || this.isInert()) return;
    const container = e.currentTarget as HTMLElement;
    const next = this.valueFromPointer(e, container);
    this.writeValue(next, this.activeThumb);
  };

  private handlePointerUp = (e: PointerEvent) => {
    if (!this.dragging) return;
    const container = e.currentTarget as HTMLElement;
    try {
      if (container.hasPointerCapture(e.pointerId)) {
        container.releasePointerCapture(e.pointerId);
      }
    } catch { /* synthetic events */ }
    this.dragging = false;
    this.emitChange();
  };

  private focusThumb(thumb: Thumb) {
    const sel = thumb === 'high' ? '[part~="thumb-high"]' : '[part~="thumb-low"]';
    const el = this.el.shadowRoot?.querySelector<HTMLElement>(sel);
    el?.focus();
  }

  private handleThumbKeyDown = (thumb: Thumb) => (e: KeyboardEvent) => {
    if (this.isInert()) return;
    // Per MD3: ArrowUp/Right always increase, ArrowDown/Left always decrease,
    // regardless of orientation.
    let next: number | null = null;
    const cur =
      thumb === 'high' ? this.valueHigh ?? this.max
      : this.isRange() ? this.valueLow ?? this.min
      : this.value;
    switch (e.key) {
      case 'ArrowUp': case 'ArrowRight': next = cur + this.step; break;
      case 'ArrowDown': case 'ArrowLeft': next = cur - this.step; break;
      case 'PageUp':   next = cur + this.step * 10; break;
      case 'PageDown': next = cur - this.step * 10; break;
      case 'Home':     next = this.min; break;
      case 'End':      next = this.max; break;
      default: return;
    }
    e.preventDefault();
    const target = this.clamp(this.snap(next));
    // Squelch: a key held at a clamped boundary (e.g. ArrowUp at max, or a
    // range thumb pushed against its sibling) computes the same effective
    // value as before — don't emit spurious valueChange/valueCommit for a
    // no-op move. Mirror writeValue's own cross-thumb clamp so this check
    // sees the value that will actually land.
    const effective = this.isRange()
      ? thumb === 'high'
        ? Math.max(target, this.valueLow ?? this.min)
        : Math.min(target, this.valueHigh ?? this.max)
      : target;
    if (effective === cur) return;
    this.writeValue(target, thumb);
    this.emitChange();
  };

  private formatValue(n: number) {
    return this.valueFormatter ? this.valueFormatter(n) : String(n);
  }

  private renderStops() {
    if (!this.discrete) return null;
    const span = this.max - this.min;
    if (span <= 0 || this.step <= 0) return null;
    const count = Math.round(span / this.step) + 1;
    if (count <= 2 || count > 200) return null;

    const lowPct = this.pct(this.isRange() ? this.valueLow! : this.min);
    const highPct = this.pct(this.isRange() ? this.valueHigh! : this.value);

    // Skip i=0 and i=count-1 — endpoints coincide with track ends.
    const stops = [];
    for (let i = 1; i < count - 1; i++) {
      const p = (i / (count - 1)) * 100;
      let active: boolean;
      if (this.isRange()) {
        active = p >= lowPct && p <= highPct;
      } else if (this.origin !== undefined) {
        const op = this.pct(this.origin);
        active = p >= Math.min(op, highPct) && p <= Math.max(op, highPct);
      } else {
        active = p <= highPct;
      }
      const v = this.min + (i * (this.max - this.min)) / (count - 1);
      stops.push(
        <div
          part="stop"
          class={active ? 'stop active' : 'stop'}
          style={{ '--p': `${p}%` } as Record<string, string>}
          aria-hidden="true"
        ></div>,
      );
      if (this.tickLabels) {
        stops.push(
          <span
            part="tick-label"
            class="tick-label"
            style={{ '--p': `${p}%` } as Record<string, string>}
            aria-hidden="true"
          >{this.formatValue(v)}</span>,
        );
      }
    }
    return stops;
  }

  private renderThumb(thumb: Thumb, descId?: string, labelId?: string) {
    const v =
      thumb === 'high'
        ? this.valueHigh!
        : this.isRange()
          ? this.valueLow!
          : this.value;
    const p = this.pct(v);
    const partExtra = thumb === 'high' ? 'thumb-high' : 'thumb-low';
    return (
      <div
        part={`thumb ${partExtra}`}
        class="thumb"
        role="slider"
        tabindex={this.isInert() ? -1 : 0}
        aria-orientation={this.orientation}
        aria-valuemin={this.min}
        aria-valuemax={this.max}
        aria-valuenow={v}
        aria-valuetext={this.formatValue(v)}
        aria-label={this.ariaLabel}
        aria-labelledby={!this.ariaLabel && labelId ? labelId : undefined}
        aria-disabled={this.disabled ? 'true' : null}
        aria-readonly={this.readonly ? 'true' : null}
        aria-required={this.required ? 'true' : null}
        aria-invalid={this.error ? 'true' : null}
        aria-describedby={descId}
        style={{ '--p': `${p}%` } as Record<string, string>}
        onKeyDown={this.handleThumbKeyDown(thumb)}
      >
        {this.valueIndicator && (
          <div part="value-indicator" class="indicator" aria-hidden="true">
            {this.formatValue(v)}
          </div>
        )}
      </div>
    );
  }

  render() {
    const range = this.isRange();
    const valueLeft =
      range ? this.pct(this.valueLow!) :
      this.origin !== undefined ? Math.min(this.pct(this.clamp(this.origin)), this.pct(this.value)) :
      0;
    const valueRight =
      range ? this.pct(this.valueHigh!) :
      this.origin !== undefined ? Math.max(this.pct(this.clamp(this.origin)), this.pct(this.value)) :
      this.pct(this.value);

    // Active rounding: rounded only on the side that touches the track edge.
    // Standard slider starts at track-start (left); centered and range never
    // touch an edge because the thumb sits on at least one boundary.
    const activeRoundLeft = !range && this.origin === undefined;

    const showInsetIcon =
      !!this.icon && (this.size === 'm' || this.size === 'l' || this.size === 'xl');

    const subText = this.error ? this.errorText : this.helpText;
    const subId = subText ? 'sub' : undefined;
    const labelId = this.label ? 'label' : undefined;

    return (
      <div class="root">
        {this.label && (
          <span id={labelId} part="label" class="label">
            {this.label}{this.required && <span class="required-mark" aria-hidden="true">*</span>}
          </span>
        )}
        <div
          part="container"
          class={{ container: true, dragging: this.dragging }}
          onPointerDown={this.handlePointerDown}
          onPointerMove={this.handlePointerMove}
          onPointerUp={this.handlePointerUp}
          onPointerCancel={this.handlePointerUp}
        >
          <div
            part="track"
            class="track"
            style={{
              '--vl': `${valueLeft}%`,
              '--vr': `${valueRight}%`,
            } as Record<string, string>}
          >
            <div part="seg-leading" class="seg leading" aria-hidden="true"></div>
            <div
              part="seg-active"
              class={{ seg: true, active: true, 'round-l': activeRoundLeft }}
              aria-hidden="true"
            ></div>
            <div part="seg-trailing" class="seg trailing" aria-hidden="true"></div>

            {showInsetIcon && (
              <span part="icon" class="icon inactive" aria-hidden="true">{this.icon}</span>
            )}
            {showInsetIcon && (
              <span part="icon-active" class="icon active" aria-hidden="true">{this.icon}</span>
            )}

            {this.renderStops()}
          </div>

          {this.renderThumb('low', subId, labelId)}
          {range && this.renderThumb('high', subId, labelId)}
        </div>

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
    );
  }
}
