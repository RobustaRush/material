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

import { Component, Element, Host, Prop, State, Watch, h } from '@stencil/core';

// MD3 Expressive loading indicator — simultaneously spins and morphs through
// 7 distinct M3 shapes on a ~4.7s loop. The combined rotation + shape change
// is the canonical motion per
// docs/wiki/specs/google-material/loading-indicator/overview.md § Animation.
//
// Two configurations:
//   default   — bare active indicator, fill = primary
//   contained — active indicator on a primary-container disk,
//               fill = on-primary-container (used when the indicator sits over
//               other content, or for pull-to-refresh)
//
// Sizes: 24–240dp range (default 48), proportional 38/48 inset for the shape.

export type MaterialLoadingIndicatorVariant = 'default' | 'contained';

const SAMPLES = 48;
const CYCLE_MS = 4700;
const VIEWBOX = 100;
const CENTER = VIEWBOX / 2;

// Each shape is a continuous radius function r(theta) sampled at SAMPLES
// uniform angular positions; consecutive samples are joined as cubic Beziers
// using catmull-rom-to-bezier so the closed silhouette is smooth.
//
// We morph by linear-interpolating the radii at matching theta between
// consecutive shapes — same-topology by construction, so the path tweens
// without popping. SAMPLES is high enough (48) that even spiky shapes look
// crisp at 240dp.

type ShapeFn = (theta: number) => number;

const SHAPES: ShapeFn[] = [
  // 1. Starburst — 10 soft scallop bumps (peaks + valleys both rounded)
  t => 38 + 5 * Math.cos(10 * t),
  // 2. Smooth scallop — 8 gentle bumps, slightly more pronounced than starburst
  t => 40 + 4 * Math.cos(8 * t + Math.PI / 8),
  // 3. Pentagon — actual rounded pentagon polygon (vertex at top)
  t => {
    const sides = 5;
    const slice = (2 * Math.PI) / sides;
    const phase = -Math.PI / 2;
    let a = ((t - phase) % slice + slice) % slice - slice / 2;
    // Sharp pentagon: r = apothem / cos(a). Soften corners by compressing
    // the in-slice angle so the trig stays away from extremes.
    const R = 46;
    const corner = 0.86;
    return (R * Math.cos(slice / 2)) / Math.cos(a * corner);
  },
  // 4. Squircle — horizontal rounded rectangle (wider than tall, n=4)
  t => {
    const a = 47, b = 38;
    const c = Math.abs(Math.cos(t));
    const s = Math.abs(Math.sin(t));
    return 1 / Math.pow(Math.pow(c / a, 4) + Math.pow(s / b, 4), 1 / 4);
  },
  // 5. Egg / asymmetric oval — one side flatter than the other
  t => 41 + 5 * Math.cos(t + 0.5) - 3 * Math.cos(2 * t + 1.0),
  // 6. 4-lobe clover — diagonal lobes with thick connecting necks (no narrow waist)
  t => 41 + 6 * Math.cos(4 * (t + Math.PI / 4)),
  // 7. Compact cross — H/V lobes with deeper waist (the "+" shape)
  t => 36 + 10 * Math.cos(4 * t),
];

// Catmull–Rom (uniform, tension 0.5) → cubic Bezier conversion for a closed
// loop of points. Output: M ... C ... C ... Z, exactly SAMPLES cubics.
function pathFromRadii(radii: number[]): string {
  const pts: { x: number; y: number }[] = new Array(SAMPLES);
  for (let i = 0; i < SAMPLES; i++) {
    const theta = (i / SAMPLES) * 2 * Math.PI;
    const r = radii[i];
    pts[i] = { x: CENTER + r * Math.cos(theta), y: CENTER + r * Math.sin(theta) };
  }
  let d = `M${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
  for (let i = 0; i < SAMPLES; i++) {
    const p0 = pts[(i - 1 + SAMPLES) % SAMPLES];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % SAMPLES];
    const p3 = pts[(i + 2) % SAMPLES];
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += `C${c1x.toFixed(2)} ${c1y.toFixed(2)} ${c2x.toFixed(2)} ${c2y.toFixed(2)} ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return d + 'Z';
}

function sampleShape(fn: ShapeFn): number[] {
  const out = new Array<number>(SAMPLES);
  for (let i = 0; i < SAMPLES; i++) out[i] = fn((i / SAMPLES) * 2 * Math.PI);
  return out;
}

// Pre-sample once at module load so the rAF loop does pure number math.
const SAMPLED: number[][] = SHAPES.map(sampleShape);

// Eased per-segment progress — smoothstep blended with a linear floor so the
// motion slows on each shape but never fully stops. Pure smoothstep / smootherstep
// reach zero velocity at endpoints, which reads as an unnatural "freeze";
// keeping a 35% linear baseline retains a constant background drift and the
// 65% smoothstep contribution still gives the visible accelerate / decelerate
// through the morph that matches the reference video.
function ease(t: number): number {
  const smooth = t * t * (3 - 2 * t);
  return 0.35 * t + 0.65 * smooth;
}

// Total rotation per morph segment (degrees). 7 × 110° ≈ 2.1 turns per
// ~4.7 s cycle (~2.2 s per turn) — visibly coupled to the morph without
// feeling spun-up.
const DEG_PER_SEGMENT = 110;

@Component({
  tag: 'material-loading-indicator',
  styleUrl: 'material-loading-indicator.css',
  shadow: true,
})
export class MaterialLoadingIndicator {
  @Element() el!: HTMLElement;

  @Prop({ reflect: true }) variant: MaterialLoadingIndicatorVariant = 'default';
  @Prop() size = 48;
  @Prop() label?: string;
  @Prop({ reflect: true }) paused = false;

  // The current path string is rendered as state so JSX picks up the initial
  // value before the rAF loop starts (avoids a one-frame flash).
  @State() d: string = pathFromRadii(SAMPLED[0]);

  private rafId = 0;
  // -1 until the first frame hands us its timestamp; see startLoop().
  private startedAt = -1;
  private pathEl?: SVGPathElement;
  private spinEl?: HTMLElement;
  private prefersReducedMotion = false;
  private mql?: MediaQueryList;

  componentDidLoad() {
    const root = this.el.shadowRoot!;
    this.pathEl = root.querySelector('path.shape') as SVGPathElement;
    this.spinEl = root.querySelector('.indicator') as HTMLElement;
    this.mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.prefersReducedMotion = this.mql.matches;
    this.mql.addEventListener('change', this.handleReducedMotion);
    this.startLoop();
  }

  disconnectedCallback() {
    cancelAnimationFrame(this.rafId);
    this.mql?.removeEventListener('change', this.handleReducedMotion);
  }

  @Watch('paused')
  handlePausedChange(now: boolean) {
    if (now) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    } else if (!this.rafId) {
      this.startLoop();
    }
  }

  private handleReducedMotion = (e: MediaQueryListEvent) => {
    this.prefersReducedMotion = e.matches;
    // Leaving reduced-motion while idled: restart the morph loop. Entering it
    // while running is handled by the next tick, which draws the static frame
    // once and stops.
    if (!e.matches && !this.paused && !this.rafId) this.startLoop();
  };

  // The epoch is adopted from the first frame's own timestamp, not from
  // performance.now() here. The two are different clocks in practice: Stencil
  // calls componentDidLoad from inside the frame already in flight, so the
  // timestamp the first tick receives can predate a performance.now() taken at
  // this point (measured at -0.3ms). A negative elapsed made idx floor to -1,
  // SAMPLED[-1] threw before the loop could reschedule itself, and the
  // indicator froze on its first frame with no way back.
  private startLoop() {
    this.startedAt = -1;
    this.rafId = requestAnimationFrame(this.tick);
  }

  private tick = (now: number) => {
    // Reduced motion: freeze on shape #4 (squircle) — the most neutral
    // silhouette. Build the static path once and idle the loop (rebuilding the
    // identical path every frame is pointless). handleReducedMotion / unpause
    // restart it if motion is re-enabled.
    if (this.prefersReducedMotion) {
      // Write through @State (not a bare setAttribute) so the static shape
      // survives any later Stencil re-render now that the loop idles here.
      this.d = pathFromRadii(SAMPLED[3]);
      if (this.spinEl) this.spinEl.style.transform = 'rotate(0deg)';
      this.rafId = 0;
      return;
    }
    if (this.startedAt < 0) this.startedAt = now;
    const elapsed = (now - this.startedAt) % CYCLE_MS;
    const t = elapsed / CYCLE_MS;        // 0..1 over full cycle
    const scaled = t * SHAPES.length;     // 0..7
    const idx = Math.floor(scaled);
    const eased = ease(scaled - idx);

    // Morph: interpolate radii between consecutive shapes using the same ease.
    const a = SAMPLED[idx];
    const b = SAMPLED[(idx + 1) % SHAPES.length];
    const radii = new Array<number>(SAMPLES);
    for (let i = 0; i < SAMPLES; i++) radii[i] = a[i] + (b[i] - a[i]) * eased;
    if (this.pathEl) this.pathEl.setAttribute('d', pathFromRadii(radii));

    // Spin: total rotation accumulates per-segment with the same ease, so the
    // wrapper rests on each shape and accelerates through the morph in lockstep.
    const rotDeg = (idx + eased) * DEG_PER_SEGMENT;
    if (this.spinEl) this.spinEl.style.transform = `rotate(${rotDeg.toFixed(2)}deg)`;

    this.rafId = requestAnimationFrame(this.tick);
  };

  render() {
    // Container disk: full 48dp track. Active indicator: 38/48 ratio inside.
    const hostStyle = { width: `${this.size}px`, height: `${this.size}px` };

    return (
      <Host
        role="progressbar"
        aria-label={this.label ?? 'Loading'}
        aria-busy={this.paused ? 'false' : 'true'}
        style={hostStyle}
      >
        <div class="wrapper">
          <span class="indicator">
            <svg viewBox="0 0 100 100">
              <path class="shape" d={this.d} fill="currentColor" />
            </svg>
          </span>
        </div>
      </Host>
    );
  }
}
