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

import { Component, Element, Host, Prop, State, Watch, h } from '@stencil/core';

// MD3 Linear progress indicator — determinate / indeterminate × flat / wavy.
// Spec: docs/wiki/specs/google-material/progress-indicators/specs.md
//
// Anatomy (per the spec measurement table):
//   active indicator + 4dp gap + track + 4dp gap + stop indicator (determinate)
//   inset 4dp from each container edge
//
// Token mapping:
//   active = primary
//   track  = secondary-container
//   stop   = primary
//
// All sizing uses the host's clientWidth as the dp coordinate space; the
// ResizeObserver keeps viewBox in sync with the actual rendered width so
// 4dp = 4 SVG units = 4 px (CSS px == dp on web).

export type StopIndicatorMode = 'auto' | 'always' | 'never';

const TRACK_THICKNESS = 4;       // spec: track stays at 4dp regardless of active thickness
const PADDING = 4;               // 4dp inset from each end
const SPACING = 4;               // 4dp gap between active / track / stop
const STOP_SIZE = 4;             // 4dp diameter
const WAVE_AMPLITUDE = 3;        // spec § Wavy linear: 3dp
const WAVE_WAVELENGTH = 40;      // spec § Wavy linear: 40dp
const WAVE_PHASE_PERIOD_MS = 1500; // visual flow speed of the wavy pattern
const INDETERMINATE_CYCLE_MS = 2000; // MDC two-bar sweep cycle

@Component({
  tag: 'material-linear-progress',
  styleUrl: 'material-linear-progress.css',
  shadow: true,
})
export class MaterialLinearProgress {
  @Element() el!: HTMLElement;

  @Prop() value?: number;
  @Prop({ reflect: true }) wavy = false;
  @Prop() thickness = 4;
  @Prop({ attribute: 'stop-indicator' }) stopIndicator: StopIndicatorMode = 'auto';
  @Prop() label?: string;
  @Prop({ reflect: true }) paused = false;

  @State() width = 0;
  @State() activeSegments: { d: string }[] = [];
  @State() trackSegments: { d: string }[] = [];

  private rafId = 0;
  private startedAt = 0;
  private resizeObserver?: ResizeObserver;
  private prefersReducedMotion = false;
  private mql?: MediaQueryList;

  componentWillLoad() {
    this.recomputePaths(performance.now());
  }

  componentDidLoad() {
    this.resizeObserver = new ResizeObserver(() => this.measure());
    this.resizeObserver.observe(this.el);
    this.mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.prefersReducedMotion = this.mql.matches;
    this.mql.addEventListener('change', this.handleReducedMotion);
    requestAnimationFrame(this.measure);
    this.startLoop();
  }

  disconnectedCallback() {
    cancelAnimationFrame(this.rafId);
    this.resizeObserver?.disconnect();
    this.mql?.removeEventListener('change', this.handleReducedMotion);
  }

  @Watch('value')
  @Watch('wavy')
  @Watch('thickness')
  @Watch('stopIndicator')
  handlePropChange() {
    if (this.width) this.recomputePaths(performance.now());
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

  private measure = () => {
    const w = this.el.clientWidth;
    if (w !== this.width) {
      this.width = w;
      this.recomputePaths(performance.now());
      this.ensureLoop();
    }
  };

  private get isDeterminate(): boolean {
    return this.value != null && !Number.isNaN(this.value);
  }

  private get height(): number {
    const stroke = Math.max(this.thickness, TRACK_THICKNESS);
    return this.wavy ? stroke + 2 * WAVE_AMPLITUDE : stroke;
  }

  private get cy(): number {
    return this.height / 2;
  }

  private get showStop(): boolean {
    if (this.stopIndicator === 'never') return false;
    if (this.stopIndicator === 'always') return true;
    return this.isDeterminate;
  }

  private get isAnimated(): boolean {
    return !this.isDeterminate || this.wavy;
  }

  private startLoop() {
    this.startedAt = performance.now();
    this.rafId = requestAnimationFrame(this.tick);
  }

  // Start the rAF loop only when there is motion to render and it isn't already
  // running. Width changes arrive via the ResizeObserver; prop/paused/reduced-
  // motion changes call this to (re)start after the loop has idled.
  private ensureLoop() {
    if (this.rafId || this.paused || this.prefersReducedMotion) return;
    if (this.isAnimated && this.width) this.startLoop();
  }

  private tick = (now: number) => {
    // Idle when nothing animates (determinate flat), or while paused / reduced
    // motion / not yet measured — instead of spinning a no-op rAF every frame.
    if (!this.isAnimated || this.paused || this.prefersReducedMotion || !this.width) {
      this.rafId = 0;
      return;
    }
    this.recomputePaths(now);
    this.rafId = requestAnimationFrame(this.tick);
  };

  private recomputePaths(now: number) {
    const W = this.width;
    if (!W) return;
    const cy = this.cy;
    const phase = this.wavy
      ? ((now - this.startedAt) / WAVE_PHASE_PERIOD_MS) * 2 * Math.PI
      : 0;

    const segments: [number, number][] = []; // active bar extents (start, end) in viewBox x

    if (this.isDeterminate) {
      const v = Math.max(0, Math.min(100, this.value!)) / 100;
      const usable = this.computeUsable(W);
      const len = usable.activeEnd - usable.activeStart;
      const activeEnd = usable.activeStart + len * v;
      if (v > 0) segments.push([usable.activeStart, activeEnd]);
      // Track fills the gap between active end and the stop / right inset.
      const trackStart = activeEnd + (v > 0 ? SPACING : 0);
      const trackEnd = usable.trackEnd;
      this.trackSegments = trackEnd > trackStart
        ? [{ d: `M${this.fmt(trackStart)} ${this.fmt(cy)} L${this.fmt(trackEnd)} ${this.fmt(cy)}` }]
        : [];
    } else {
      // Indeterminate: two small bars traverse the track left→right, offset by
      // half a cycle so one is always crossing (no blank frame). See sweepBar.
      const trackStart = PADDING;
      const trackEnd = W - PADDING;
      const trackLen = trackEnd - trackStart;
      const p = ((now - this.startedAt) % INDETERMINATE_CYCLE_MS) / INDETERMINATE_CYCLE_MS;
      for (const t of [p, (p + 0.5) % 1]) {
        const [l, r] = sweepBar(t);
        const cl = Math.max(0, Math.min(1, l));
        const cr = Math.max(0, Math.min(1, r));
        if (cr > cl) segments.push([trackStart + cl * trackLen, trackStart + cr * trackLen]);
      }
      segments.sort((a, b) => a[0] - b[0]);
      // Expressive look: the track is drawn only in the gaps around the active
      // bars (retracted by the 4dp SPACING) — not a full-length line the bars
      // sit on top of.
      this.trackSegments = this.trackGapSegments(segments, trackStart, trackEnd, cy);
    }

    this.activeSegments = segments.map(([x1, x2]) => ({
      d: this.wavy ? this.buildWavePath(x1, x2, cy, phase) : `M${this.fmt(x1)} ${this.fmt(cy)} L${this.fmt(x2)} ${this.fmt(cy)}`,
    }));
  }

  // Track drawn only in the gaps around the active bars, each retracted by
  // SPACING (4dp) so the moving indeterminate bars keep the expressive
  // separation from the track in every frame.
  private trackGapSegments(
    active: [number, number][],
    trackStart: number,
    trackEnd: number,
    cy: number,
  ): { d: string }[] {
    const sorted = [...active].sort((a, b) => a[0] - b[0]);
    const out: { d: string }[] = [];
    let cursor = trackStart;
    for (const [s, e] of sorted) {
      const gapEnd = s - SPACING;
      if (gapEnd > cursor) {
        out.push({ d: `M${this.fmt(cursor)} ${this.fmt(cy)} L${this.fmt(gapEnd)} ${this.fmt(cy)}` });
      }
      cursor = Math.max(cursor, e + SPACING);
    }
    if (trackEnd > cursor) {
      out.push({ d: `M${this.fmt(cursor)} ${this.fmt(cy)} L${this.fmt(trackEnd)} ${this.fmt(cy)}` });
    }
    return out;
  }

  private computeUsable(W: number) {
    // For determinate: layout = padding + active + spacing + track + (spacing + stop + padding)
    const activeStart = PADDING;
    const trackEnd = this.showStop ? W - PADDING - STOP_SIZE - SPACING : W - PADDING;
    // The "active region" stretches from activeStart up to trackEnd; any leftover
    // is the track. (active grows from 0 to (trackEnd - activeStart) with `value`.)
    return { activeStart, activeEnd: trackEnd, trackEnd };
  }

  private buildWavePath(x1: number, x2: number, cy: number, phase: number): string {
    const len = x2 - x1;
    if (len <= 0) return '';
    // ~10 samples per wavelength; minimum 4 samples for very short bars.
    const samples = Math.max(4, Math.ceil((len / WAVE_WAVELENGTH) * 10));
    const dx = len / samples;
    let d = '';
    for (let i = 0; i <= samples; i++) {
      const x = x1 + i * dx;
      const y = cy + WAVE_AMPLITUDE * Math.sin((x - x1) * 2 * Math.PI / WAVE_WAVELENGTH + phase);
      d += (i === 0 ? 'M' : 'L') + this.fmt(x) + ' ' + this.fmt(y);
    }
    return d;
  }

  private fmt(n: number): string {
    return Number.isFinite(n) ? n.toFixed(2) : '0';
  }

  render() {
    const W = this.width || 1;
    const H = this.height;
    const cy = this.cy;
    const stopX = W - PADDING - STOP_SIZE / 2;
    const stopRy = this.thickness > TRACK_THICKNESS ? 1 : STOP_SIZE / 2;
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
        style={{ height: `${H}px` }}
      >
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          height={String(H)}
          preserveAspectRatio="none"
        >
          {this.trackSegments.map((s) => (
            <path
              d={s.d}
              class="track"
              stroke="currentColor"
              stroke-width={String(TRACK_THICKNESS)}
              stroke-linecap="round"
              fill="none"
            />
          ))}
          {this.activeSegments.map((s) => (
            <path
              d={s.d}
              class="active"
              stroke="currentColor"
              stroke-width={String(this.thickness)}
              stroke-linecap="round"
              stroke-linejoin="round"
              fill="none"
            />
          ))}
          {this.showStop && (
            <ellipse
              cx={String(stopX)}
              cy={String(cy)}
              rx={String(STOP_SIZE / 2)}
              ry={String(stopRy)}
              class="stop"
              fill="currentColor"
            />
          )}
        </svg>
      </Host>
    );
  }
}

function easeInOutCubic(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// One small bar traversing left→right for the indeterminate sweep: its centre
// travels from just off the left edge to just off the right (eased accel/
// decel), its half-width swelling toward the middle and shrinking to a sliver
// at both ends. Two of these offset by half a cycle (see recomputePaths) keep
// exactly one bar crossing the visible track at every instant — no blank
// frame — matching the continuous MD3 indeterminate look. Returns [left,
// right] in track fractions (unclipped; caller clips to [0, 1]).
function sweepBar(t: number): [number, number] {
  // Centre travel and half-width tuned so each bar is on the visible track for
  // ~79% of its cycle; two offset by half a cycle then always overlap (no gap).
  const c = -0.1 + 1.2 * easeInOutCubic(t);
  const h = 0.05 + 0.14 * Math.sin(Math.PI * t);
  return [c - h, c + h];
}
