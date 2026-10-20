"use client";
// Chart motion: shared presets (charts-roadmap 4.3), the animation policy, and a data tween that
// interpolates value arrays without re-rendering React per frame.
// TODO(track-f): source the springs from the W1 motion-presets module once it lands; the values
// here are the ones charts-roadmap 4.3 specifies.
import { animate, useMotionValue, type MotionValue, type Transition } from "motion/react";
import { useState } from "react";
import { easings, springs } from "../../lib/motion";
import { useIsClient } from "../../lib/use-is-client";
import { useIsomorphicLayoutEffect } from "../../lib/use-latest-ref";
import { usePrefersReducedMotion } from "../../lib/use-reduced-motion";

const outExpo = [0.16, 1, 0.3, 1] as const;

/** Motion presets for every chart (seconds, Motion's unit). */
export const chartMotion = {
  /** Data tweens: critically damped, about 0.5 s, no overshoot. */
  update: { type: "spring", stiffness: 170, damping: 26, mass: 1 },
  /** Line entrance (pathLength 0 -> 1). */
  drawLine: { duration: 0.9, ease: outExpo },
  /** Area fill fade after the line starts drawing. */
  areaFill: { duration: 0.5, delay: 0.2, ease: easings.out },
  /** Bars grow from the baseline. */
  growBar: { type: "spring", stiffness: 260, damping: 26 },
  barStagger: 0.025,
  /** Cap on the total bar stagger. */
  barStaggerMax: 0.5,
  /** Pie, donut and radial bar sweeps. */
  sweep: { duration: 0.8, ease: outExpo },
  sweepStagger: 0.06,
  rings: { type: "spring", stiffness: 120, damping: 20 },
  /** Pointer-following layers (tooltip, crosshair). */
  hover: springs.snappy,
  /** Highlight and fade. */
  fade: { duration: 0.15, ease: easings.out },
  /** Legend toggles (series weight 1 <-> 0). */
  weight: springs.smooth,
  /** Drill zoom, rank re-order, morphs, small-multiples expand. */
  layout: { type: "spring", stiffness: 380, damping: 34 },
  /**
   * Rect sizes that can shrink to zero (bins, boxes, bridge bars): overdamped, so a width or
   * height never overshoots below 0 (negative SVG sizes are invalid and log console errors).
   */
  size: { type: "spring", stiffness: 260, damping: 38 },
  /** Gauge needle: deliberately underdamped. */
  needle: { type: "spring", stiffness: 140, damping: 14 },
} as const satisfies Record<string, Transition | number>;

/** Streaming slide: linear over the update interval. */
export function liveTransition(intervalMs: number): Transition {
  return { duration: Math.max(0, intervalMs) / 1000, ease: "linear" };
}

/** Stagger delay for bar i of n, capped so the cascade never exceeds barStaggerMax. */
export function barDelay(index: number, count: number): number {
  const step = count > 1 ? Math.min(chartMotion.barStagger, chartMotion.barStaggerMax / (count - 1)) : 0;
  return index * step;
}

export type ChartAnimation = "auto" | "always" | "never";

export interface ChartAnimationState {
  /** Play the entrance (draw-in, grow, sweep). */
  entrance: boolean;
  /** Tween data updates. */
  updates: boolean;
  reducedMotion: boolean;
}

/**
 * The policy: "never" and reduced motion turn everything off. "auto" skips the entrance when the
 * chart was server-rendered or hydrated (that HTML already shows the final chart) and plays it for
 * client-only mounts. "always" plays it regardless.
 */
export function resolveChartAnimation(policy: ChartAnimation, env: { reducedMotion: boolean; hydrated: boolean }): ChartAnimationState {
  if (policy === "never" || env.reducedMotion) return { entrance: false, updates: false, reducedMotion: env.reducedMotion };
  return { entrance: policy === "always" || !env.hydrated, updates: true, reducedMotion: false };
}

/** resolveChartAnimation for the current render. */
export function useChartAnimation(policy: ChartAnimation = "auto"): ChartAnimationState {
  const reducedMotion = usePrefersReducedMotion();
  const isClient = useIsClient();
  // The first render decides: false on the server and during hydration, true for client mounts.
  const [hydrated] = useState(() => !isClient);
  return resolveChartAnimation(policy, { reducedMotion, hydrated });
}

/** Holds the from/to arrays and two output buffers (a new identity every frame, no allocation). */
export function createTweenEngine(initial: ArrayLike<number>) {
  let from = Float64Array.from(initial);
  let to = Float64Array.from(initial);
  const buffers = [Float64Array.from(initial), Float64Array.from(initial)];
  let flip = 0;
  let current: Float64Array = buffers[0] as Float64Array;
  return {
    current: () => current,
    jump(target: ArrayLike<number>): Float64Array {
      from = Float64Array.from(target);
      to = Float64Array.from(target);
      buffers[0] = Float64Array.from(target);
      buffers[1] = Float64Array.from(target);
      current = buffers[flip] as Float64Array;
      return current;
    },
    /** Starts a new tween from wherever the last one is now (interruptions never jump). */
    retarget(target: ArrayLike<number>): boolean {
      if (target.length !== current.length) return false;
      from = Float64Array.from(current);
      to = Float64Array.from(target);
      return true;
    },
    at(t: number): Float64Array {
      flip ^= 1;
      const out = buffers[flip] as Float64Array;
      for (let i = 0; i < out.length; i++) {
        const a = from[i] as number;
        const b = to[i] as number;
        // Gaps (NaN) never interpolate: a value appearing or vanishing snaps to its target.
        out[i] = Number.isFinite(a) && Number.isFinite(b) ? a + (b - a) * t : b;
      }
      current = out;
      return out;
    },
  };
}

/**
 * Tweens a numeric array (y values, angles, rect edges) to `target` and exposes the in-between
 * values as a MotionValue, so marks derive their `d` with useTransform and React renders once per
 * data change. Disabled (or reduced motion, or a length change) jumps straight to the target.
 * `target` should keep its identity between renders when the data is unchanged (useMemo).
 */
export function useDataTween(
  target: ArrayLike<number>,
  options: { enabled: boolean; transition?: Transition; resetKey?: string | number },
): MotionValue<Float64Array> {
  const [engine] = useState(() => ({ ...createTweenEngine(target), key: options.resetKey }));
  const output = useMotionValue<Float64Array>(engine.current());
  const { enabled, transition = chartMotion.update, resetKey } = options;

  useIsomorphicLayoutEffect(() => {
    // A new resetKey (e.g. the chart was resized) jumps: only data changes animate.
    const reset = engine.key !== resetKey;
    engine.key = resetKey;
    if (!enabled || reset || !engine.retarget(target)) {
      output.set(engine.jump(target));
      return;
    }
    const controls = animate(0, 1, { ...transition, onUpdate: (t) => output.set(engine.at(t)) });
    return () => controls.stop();
  }, [target, enabled, transition, engine, output, resetKey]);

  return output;
}
