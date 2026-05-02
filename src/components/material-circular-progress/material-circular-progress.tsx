import { Component, Element, Host, Prop, State, Watch, h } from '@stencil/core';
import { adoptMaterialStyles } from '../../utils/adopted-styles';

// MD3 Circular progress indicator — determinate / indeterminate × flat / wavy.
// Spec: docs/wiki/specs/google-material/progress-indicators/specs.md
//
// Token mapping (spec § Color):
//   active = primary
//   track  = secondary-container
//
// Sizing per spec measurement table:
//   Flat 4dp  → 40dp diameter, 4dp stroke
//   Flat 8dp  → 44dp diameter, 8dp stroke
//   Wavy 4dp  → 48dp diameter, 4dp stroke, 1.6dp amplitude, ~15dp wavelength
//   Wavy 8dp  → 52dp diameter, 8dp stroke, 1.6dp amplitude, ~15dp wavelength
//
// `size` (= total diameter in dp) and `thickness` (stroke width) are
// independent props; the active circle's centerline radius is derived so
// the stroke + amplitude fit within the box.

const TRACK_THICKNESS = 4;          // spec: track stays 4dp
const WAVE_AMPLITUDE = 1.6;
const WAVE_WAVELENGTH = 15;          // arc length (dp) per wave cycle
const WAVE_PHASE_PERIOD_MS = 1800;
const SPIN_PERIOD_MS = 2000;         // outer rotation period (indeterminate)
const SWEEP_PERIOD_MS = 1333;        // grow/shrink period (indeterminate)
const SWEEP_MIN_DEG = 25;
const SWEEP_MAX_DEG = 270;

@Component({
  tag: 'material-circular-progress',
  styleUrl: 'material-circular-progress.css',
  shadow: true,
})
export class MaterialCircularProgress {
  @Element() el!: HTMLElement;

  @Prop() value?: number;
  @Prop({ reflect: true }) wavy = false;
  @Prop() thickness = 4;
  @Prop() size = 40;
  @Prop() label?: string;
  @Prop({ reflect: true }) paused = false;

  @State() activeD = '';
  @State() trackD = '';

  private rafId = 0;
  private startedAt = 0;
  private prefersReducedMotion = false;
  private mql?: MediaQueryList;

  componentWillLoad() {
    return this.el.shadowRoot ? adoptMaterialStyles(this.el.shadowRoot) : undefined;
  }

  componentDidLoad() {
    this.mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.prefersReducedMotion = this.mql.matches;
    this.mql.addEventListener('change', this.handleReducedMotion);
    this.recomputePaths(performance.now());
    this.startLoop();
  }

  disconnectedCallback() {
    cancelAnimationFrame(this.rafId);
    this.mql?.removeEventListener('change', this.handleReducedMotion);
  }

  @Watch('value')
  @Watch('wavy')
  @Watch('thickness')
  @Watch('size')
  handlePropChange() {
    this.recomputePaths(performance.now());
  }

  private handleReducedMotion = (e: MediaQueryListEvent) => {
    this.prefersReducedMotion = e.matches;
  };

  private get isDeterminate(): boolean {
    return this.value != null && !Number.isNaN(this.value);
  }

  private get cx(): number { return this.size / 2; }
  private get cy(): number { return this.size / 2; }

  // Centerline radius — leaves room for half the stroke and the wave amplitude.
  private get r(): number {
    const padding = this.thickness / 2 + (this.wavy ? WAVE_AMPLITUDE : 0);
    return this.size / 2 - padding;
  }

  private startLoop() {
    this.startedAt = performance.now();
    this.rafId = requestAnimationFrame(this.tick);
  }

  private tick = (now: number) => {
    if (!this.paused && !this.prefersReducedMotion) {
      // Animate every frame when motion is required (indeterminate sweep
      // and/or wavy phase). Determinate flat is static — only re-renders
      // when props change via the @Watch handlers.
      if (!this.isDeterminate || this.wavy) {
        this.recomputePaths(now);
      }
    }
    this.rafId = requestAnimationFrame(this.tick);
  };

  private recomputePaths(now: number) {
    const r = this.r;
    if (r <= 0) {
      this.activeD = '';
      this.trackD = '';
      return;
    }
    const phase = this.wavy
      ? ((now - this.startedAt) / WAVE_PHASE_PERIOD_MS) * 2 * Math.PI
      : 0;

    // Track is a full ring.
    this.trackD = this.buildArc(-Math.PI / 2, -Math.PI / 2 + 2 * Math.PI - 0.0001, r, 0, phase);

    // Active arc.
    let theta_a: number, theta_b: number;
    if (this.isDeterminate) {
      const v = Math.max(0, Math.min(100, this.value!)) / 100;
      theta_a = -Math.PI / 2;
      theta_b = theta_a + v * 2 * Math.PI;
    } else {
      // Indeterminate: outer rotation + grow/shrink sweep.
      const t_spin = ((now - this.startedAt) % SPIN_PERIOD_MS) / SPIN_PERIOD_MS;
      const t_sweep = ((now - this.startedAt) % SWEEP_PERIOD_MS) / SWEEP_PERIOD_MS;
      // sweep oscillates between SWEEP_MIN_DEG and SWEEP_MAX_DEG using a smooth pulse
      const pulse = 0.5 - 0.5 * Math.cos(t_sweep * 2 * Math.PI);
      const sweepDeg = SWEEP_MIN_DEG + (SWEEP_MAX_DEG - SWEEP_MIN_DEG) * pulse;
      const startDeg = t_spin * 360;
      theta_a = (startDeg - 90) * Math.PI / 180;
      theta_b = theta_a + sweepDeg * Math.PI / 180;
    }
    const amp = this.wavy ? WAVE_AMPLITUDE : 0;
    this.activeD = this.buildArc(theta_a, theta_b, r, amp, phase);
  }

  // Build an SVG path tracing an arc from theta_a to theta_b at centerline r,
  // optionally with a sinusoidal radial oscillation of amplitude `amp` whose
  // wavelength is measured along the arc length.
  private buildArc(theta_a: number, theta_b: number, r: number, amp: number, phase: number): string {
    const len = Math.abs(theta_b - theta_a);
    if (len <= 0) return '';
    // Sample density: ~16 per radian for flat, denser for wavy so the wave is crisp.
    const samplesPerRad = amp > 0 ? 32 : 16;
    const samples = Math.max(8, Math.ceil(len * samplesPerRad));
    let d = '';
    for (let i = 0; i <= samples; i++) {
      const tau = i / samples;
      const theta = theta_a + (theta_b - theta_a) * tau;
      const s = r * (theta - theta_a); // arc length from start
      const wave = amp ? amp * Math.sin(s * 2 * Math.PI / WAVE_WAVELENGTH + phase) : 0;
      const rr = r + wave;
      const x = this.cx + rr * Math.cos(theta);
      const y = this.cy + rr * Math.sin(theta);
      d += (i === 0 ? 'M' : 'L') + x.toFixed(2) + ' ' + y.toFixed(2);
    }
    return d;
  }

  render() {
    return (
      <Host
        role="progressbar"
        aria-label={this.label ?? 'Loading'}
        aria-valuemin={this.isDeterminate ? '0' : null}
        aria-valuemax={this.isDeterminate ? '100' : null}
        aria-valuenow={this.isDeterminate ? String(this.value) : null}
        style={{ display: 'inline-block', width: `${this.size}px`, height: `${this.size}px` }}
      >
        <svg viewBox={`0 0 ${this.size} ${this.size}`} width={String(this.size)} height={String(this.size)}>
          {this.trackD && (
            <path
              d={this.trackD}
              class="text-secondary-container"
              stroke="currentColor"
              stroke-width={String(TRACK_THICKNESS)}
              stroke-linecap="round"
              fill="none"
            />
          )}
          {this.activeD && (
            <path
              d={this.activeD}
              class="text-primary"
              stroke="currentColor"
              stroke-width={String(this.thickness)}
              stroke-linecap="round"
              stroke-linejoin="round"
              fill="none"
            />
          )}
        </svg>
      </Host>
    );
  }
}
