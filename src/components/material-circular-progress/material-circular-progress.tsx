import { Component, Element, Host, Prop, State, Watch, h } from '@stencil/core';

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
const GAP_DP = 4;                    // spec: ~4dp gap between active arc and track
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
  /** Diameter in dp. Defaults to 40 (flat) or 48 (wavy) when unset. */
  @Prop() size?: number;
  @Prop() label?: string;
  @Prop({ reflect: true }) paused = false;

  @State() activeD = '';
  @State() trackD = '';

  private rafId = 0;
  private startedAt = 0;
  private prefersReducedMotion = false;
  private mql?: MediaQueryList;

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
    this.ensureLoop();
  }

  @Watch('paused')
  handlePausedChange(now: boolean) {
    if (now) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    } else {
      this.ensureLoop();
    }
  }

  private handleReducedMotion = (e: MediaQueryListEvent) => {
    this.prefersReducedMotion = e.matches;
    // Entering reduced-motion is handled by the next tick (it idles); leaving it
    // needs an explicit restart.
    if (!e.matches) this.ensureLoop();
  };

  private get isDeterminate(): boolean {
    return this.value != null && !Number.isNaN(this.value);
  }

  private get isAnimated(): boolean {
    return !this.isDeterminate || this.wavy;
  }

  // Resolved diameter — wavy indicators default to 48dp, flat to 40dp (spec).
  private get sz(): number {
    return this.size ?? (this.wavy ? 48 : 40);
  }

  private get cx(): number { return this.sz / 2; }
  private get cy(): number { return this.sz / 2; }

  // Centerline radius — leaves room for half the stroke and the wave amplitude.
  private get r(): number {
    const padding = this.thickness / 2 + (this.wavy ? WAVE_AMPLITUDE : 0);
    return this.sz / 2 - padding;
  }

  private startLoop() {
    this.startedAt = performance.now();
    this.rafId = requestAnimationFrame(this.tick);
  }

  // Start the rAF loop only when there is motion to render and it isn't already
  // running. Prop/paused/reduced-motion changes call this to (re)start after
  // the loop has idled. Unlike the linear indicator, size is a plain prop
  // here — there's no measured width to gate on.
  private ensureLoop() {
    if (this.rafId || this.paused || this.prefersReducedMotion) return;
    if (this.isAnimated) this.startLoop();
  }

  private tick = (now: number) => {
    // Idle when nothing animates (determinate flat), or while paused / reduced
    // motion — instead of spinning a no-op rAF every frame.
    if (!this.isAnimated || this.paused || this.prefersReducedMotion) {
      this.rafId = 0;
      return;
    }
    this.recomputePaths(now);
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
    const full = 2 * Math.PI;

    // Active arc.
    let theta_a: number, theta_b: number;
    if (this.isDeterminate) {
      const v = Math.max(0, Math.min(100, this.value!)) / 100;
      theta_a = -Math.PI / 2;
      theta_b = theta_a + v * full;
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

    // Track: the remainder of the ring, retracted from each active end by a
    // ~4dp gap (plus both cap radii) so the active arc reads as separated from
    // the track rather than drawn over a full underlying ring.
    const activeLen = Math.abs(theta_b - theta_a);
    if (activeLen < 1e-4) {
      this.trackD = this.buildArc(-Math.PI / 2, -Math.PI / 2 + full - 1e-4, r, 0, 0);
    } else {
      const gapArc = (GAP_DP + this.thickness / 2 + TRACK_THICKNESS / 2) / r;
      const start = theta_b + gapArc;
      const end = theta_a + full - gapArc;
      this.trackD = end > start ? this.buildArc(start, end, r, 0, 0) : '';
    }
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
    const sz = this.sz;
    const valueNow = this.isDeterminate
      ? String(Math.max(0, Math.min(100, this.value!)))
      : null;
    return (
      <Host
        role="progressbar"
        aria-label={this.label ?? 'Loading'}
        aria-valuemin={this.isDeterminate ? '0' : null}
        aria-valuemax={this.isDeterminate ? '100' : null}
        aria-valuenow={valueNow}
        style={{ display: 'inline-block', width: `${sz}px`, height: `${sz}px` }}
      >
        <svg viewBox={`0 0 ${sz} ${sz}`} width={String(sz)} height={String(sz)}>
          {this.trackD && (
            <path
              d={this.trackD}
              class="track"
              stroke="currentColor"
              stroke-width={String(TRACK_THICKNESS)}
              stroke-linecap="round"
              fill="none"
            />
          )}
          {this.activeD && (
            <path
              d={this.activeD}
              class="active"
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
