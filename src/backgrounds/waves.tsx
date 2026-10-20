"use client";
import * as React from "react";
import { backgroundBase, patternMasks } from "../lib/backgrounds";
import { cn } from "../lib/cn";
import { blockReset } from "../lib/styles";
import type { PatternMask } from "../lib/types";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";
export type WavesVariant = "fill" | "line";
export interface WavesProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Number of layers (1..12). Default 3. */
  layers?: number;
  /** Peak height of the front layer in px. Default 18. */
  amplitude?: number;
  /** Crests across the container width (1..8, whole numbers keep the loop seamless). Default 2. */
  crests?: number;
  /** Height of the wave band in px. Default 180. */
  height?: number;
  /** Speed multiplier; layers take 14–40s per loop at 1. Default 1. */
  speed?: number;
  /** Layer colors from back to front (cycled). Default the three gradient tokens. */
  colors?: string[];
  /** "fill" stacks solid hills; "line" draws thin flowing strands. Default "fill". */
  variant?: WavesVariant;
  /** Edge the band sits on. "top" mirrors it. Default "bottom". */
  position?: "top" | "bottom";
  /** Opacity of the back layer; layers ramp up to 1 at the front. Default 0.35. */
  depth?: number;
  /** Default "none". */
  mask?: PatternMask;
}
const DEFAULT_COLORS = ["var(--pui-gradient-1)", "var(--pui-gradient-2)", "var(--pui-gradient-3)"];
const clamp = (v: number, min: number, max: number) => Math.min(Math.max(Number.isFinite(v) ? v : min, min), max);
const VIEW_W = 1200;
const VIEW_H = 100;
const STEPS = 48;
/** A periodic sine path two container-widths wide, so translating it by -50% loops seamlessly. */
function wavePath(crests: number, amp: number, baseline: number, phase: number, closed: boolean): string {
  const periods = crests * 2;
  const total = periods * STEPS;
  let d = "";
  for (let i = 0; i <= total; i++) {
    const x = (i / total) * VIEW_W;
    // Two harmonics give a less mechanical swell while keeping the period.
    const t = (i / STEPS) * Math.PI * 2 + phase;
    const y = baseline - amp * (0.78 * Math.sin(t) + 0.22 * Math.sin(2 * t + phase * 1.7));
    d += `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(2)}`;
  }
  return closed ? `${d}L${VIEW_W} ${VIEW_H}L0 ${VIEW_H}Z` : d;
}
/** Layered sine waves drifting sideways at different speeds (footer and hero bottoms). Pure CSS motion. */
export const Waves = React.forwardRef<HTMLDivElement, WavesProps>(function Waves(
  {
    layers = 3,
    amplitude = 18,
    crests = 2,
    height = 180,
    speed = 1,
    colors = DEFAULT_COLORS,
    variant = "fill",
    position = "bottom",
    depth = 0.35,
    mask = "none",
    style,
    className,
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const count = Math.round(clamp(layers, 1, 12));
  const crestCount = Math.round(clamp(crests, 1, 8));
  const band = clamp(height, 24, 2000);
  const amp = (clamp(amplitude, 0, band / 2) / band) * VIEW_H;
  const safeSpeed = clamp(speed, 0.05, 10);
  const backOpacity = clamp(depth, 0, 1);
  const palette = colors.length ? colors : DEFAULT_COLORS;
  const line = variant === "line";
  const paths = React.useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const front = count === 1 ? 1 : i / (count - 1);
        // Back layers sit higher and swell more gently; strands spread across the band.
        const baseline = line ? 20 + (60 * (i + 0.5)) / count : 30 + front * 45;
        const layerAmp = line ? amp * (0.7 + 0.3 * Math.sin(i * 1.3)) : amp * (0.55 + 0.45 * front);
        return wavePath(crestCount, layerAmp, baseline, i * 1.9, !line);
      }),
    [count, crestCount, amp, line],
  );
  return (
    <div
      ref={ref}
      aria-hidden="true"
      data-mask={mask}
      data-variant={variant}
      data-state={reduced ? "static" : "animated"}
      {...props}
      style={style}
      className={cn(blockReset, backgroundBase, "overflow-hidden", patternMasks[mask], className)}
    >
      <div
        className={cn(blockReset, "absolute inset-x-0", position === "top" ? "top-0 -scale-y-100" : "bottom-0")}
        style={{ height: band }}
      >
        {paths.map((d, i) => {
          const front = count === 1 ? 1 : i / (count - 1);
          const duration = (40 - front * 26) / safeSpeed + (line ? i * 1.3 : 0);
          return (
            <div
              key={i}
              data-pui-wave-layer=""
              className={cn(blockReset, "absolute inset-y-0 left-0 w-[200%]", !reduced && "motion-safe:animate-pui-wave-drift")}
              style={
                {
                  "--pui-wave-drift-duration": `${duration.toFixed(2)}s`,
                  animationDirection: i % 2 ? "reverse" : undefined,
                  opacity: backOpacity + (1 - backOpacity) * front,
                } as React.CSSProperties
              }
            >
              <svg
                viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
                preserveAspectRatio="none"
                className={cn(blockReset, "block size-full overflow-visible")}
                focusable="false"
              >
                <path
                  d={d}
                  vectorEffect={line ? "non-scaling-stroke" : undefined}
                  style={
                    line
                      ? { fill: "none", stroke: palette[i % palette.length], strokeWidth: 1.5 }
                      : { fill: palette[i % palette.length] }
                  }
                />
              </svg>
            </div>
          );
        })}
      </div>
    </div>
  );
});
