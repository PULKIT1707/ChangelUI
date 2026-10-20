"use client";
import * as React from "react";
import { backgroundBase, patternMasks } from "../lib/backgrounds";
import { cn } from "../lib/cn";
import { djb2 } from "../lib/ids";
import { mulberry32 } from "../lib/random";
import { blockReset } from "../lib/styles";
import type { PatternMask } from "../lib/types";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";
export type LightRaysOrigin = "top-left" | "top" | "top-right" | "left" | "right" | "bottom";
export interface LightRaysProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Where the light comes from. Default "top-left". */
  origin?: LightRaysOrigin;
  /** Number of rays (1..16). Default 6. */
  rays?: number;
  /** Ray color. Default `var(--pui-primary)`. */
  color?: string;
  /** Strength of the light (0..1). Default 0.5. */
  intensity?: number;
  /** Width of the fan in degrees (10..180). Default 70. */
  spread?: number;
  /** How far the rays reach, as a share of the container's larger side (0.3..2). Default 1.1. */
  reach?: number;
  /** Sway amplitude in degrees (0..15). Default 3. */
  sway?: number;
  /** Speed multiplier; each ray sways over 9–15s at 1. Default 1. */
  speed?: number;
  /** Soft glow at the light source. Default true. */
  glow?: boolean;
  /** Layout seed. Default: derived from the instance id (stable across SSR and hydration). */
  seed?: number;
  /** Default "none". */
  mask?: PatternMask;
}
const clamp = (v: number, min: number, max: number) => Math.min(Math.max(Number.isFinite(v) ? v : min, min), max);
// Source position (% of the container) and the fan's center direction (conic degrees, 0 = up, clockwise).
const ORIGINS: Record<LightRaysOrigin, { x: number; y: number; dir: number }> = {
  "top-left": { x: 0, y: 0, dir: 135 },
  top: { x: 50, y: -4, dir: 180 },
  "top-right": { x: 100, y: 0, dir: 225 },
  left: { x: -2, y: 40, dir: 105 },
  right: { x: 102, y: 40, dir: 255 },
  bottom: { x: 50, y: 104, dir: 0 },
};
/** Soft god rays fanning from a corner or edge, each slowly swaying and breathing. Pure CSS motion. */
export const LightRays = React.forwardRef<HTMLDivElement, LightRaysProps>(function LightRays(
  {
    origin = "top-left",
    rays = 6,
    color = "var(--pui-primary)",
    intensity = 0.5,
    spread = 70,
    reach = 1.1,
    sway = 3,
    speed = 1,
    glow = true,
    seed,
    mask = "none",
    style,
    className,
    ...props
  },
  ref,
) {
  const id = React.useId();
  const reduced = usePrefersReducedMotion();
  const source = ORIGINS[origin] ?? ORIGINS["top-left"];
  const count = Math.round(clamp(rays, 1, 16));
  const strength = clamp(intensity, 0, 1);
  const fan = clamp(spread, 10, 180);
  const length = clamp(reach, 0.3, 2);
  const swing = clamp(sway, 0, 15);
  const rate = clamp(speed, 0.05, 10);
  const resolvedSeed = seed ?? djb2(id);
  const layout = React.useMemo(() => {
    const random = mulberry32(resolvedSeed);
    return Array.from({ length: count }, (_, i) => {
      const slot = count === 1 ? 0 : i / (count - 1) - 0.5;
      return {
        angle: source.dir + slot * fan + (random() - 0.5) * (fan / Math.max(count, 2)) * 0.6,
        width: 4 + random() * 9,
        strength: 0.45 + random() * 0.55,
        duration: 9 + random() * 6,
        phase: random(),
        dim: 0.45 + random() * 0.35,
      };
    });
  }, [resolvedSeed, count, fan, source.dir]);
  const vars = {
    "--pui-rays-color": color,
    "--pui-ray-sway": `${swing}deg`,
  } as React.CSSProperties;
  const size = `${(length * 200).toFixed(0)}cqmax`;
  return (
    <div
      ref={ref}
      aria-hidden="true"
      data-mask={mask}
      data-origin={origin}
      data-state={reduced ? "static" : "animated"}
      {...props}
      style={{ containerType: "size", ...vars, ...style }}
      className={cn(blockReset, backgroundBase, "overflow-hidden", patternMasks[mask], className)}
    >
      {layout.map((ray, i) => {
        const duration = ray.duration / rate;
        const peak = Math.round(strength * ray.strength * 100);
        const half = ray.width / 2;
        return (
          <div
            key={i}
            data-pui-ray=""
            className={cn(
              blockReset,
              "absolute -translate-x-1/2 -translate-y-1/2 rounded-pui-full",
              !reduced && swing > 0 && "motion-safe:animate-pui-ray-sway",
            )}
            style={
              {
                left: `${source.x}%`,
                top: `${source.y}%`,
                width: size,
                height: size,
                "--pui-ray-angle": `${ray.angle.toFixed(2)}deg`,
                "--pui-ray-duration": `${duration.toFixed(2)}s`,
                "--pui-ray-dim": ray.dim.toFixed(2),
                animationDelay: `${(-ray.phase * duration * 2).toFixed(2)}s`,
                transform: `rotate(${ray.angle.toFixed(2)}deg)`,
                background: `conic-gradient(from ${(-half).toFixed(2)}deg at 50% 50%, transparent, color-mix(in oklab, var(--pui-rays-color) ${peak}%, transparent) ${half.toFixed(2)}deg, transparent ${ray.width.toFixed(2)}deg, transparent)`,
                maskImage: "radial-gradient(circle closest-side, black, transparent)",
                WebkitMaskImage: "radial-gradient(circle closest-side, black, transparent)",
              } as React.CSSProperties
            }
          />
        );
      })}
      {glow ? (
        <div
          className={cn(blockReset, "absolute size-[60cqmax] -translate-x-1/2 -translate-y-1/2 rounded-pui-full")}
          style={{
            left: `${source.x}%`,
            top: `${source.y}%`,
            background: `radial-gradient(circle closest-side, color-mix(in oklab, var(--pui-rays-color) ${Math.round(strength * 55)}%, transparent), transparent)`,
          }}
        />
      ) : null}
    </div>
  );
});
