"use client";
import * as React from "react";
import { backgroundBase, patternMasks } from "../lib/backgrounds";
import { cn } from "../lib/cn";
import { blockReset } from "../lib/styles";
import type { PatternMask } from "../lib/types";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";
export type NoiseOverlayVariant = "film" | "color" | "ink";
export type NoiseOverlayBlend = "normal" | "overlay" | "soft-light" | "multiply" | "screen";
export interface NoiseOverlayProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Grain strength (0..1). Default 0.08. */
  opacity?: number;
  /** Grain fineness: higher is finer (0.05..2). Default 0.8. */
  baseFrequency?: number;
  /** Noise layers (1..6): more layers add soft clumps. Default 3. */
  octaves?: number;
  /** "film" gray grain, "color" RGB sensor noise, "ink" grain in the root's text color. Default "film". */
  variant?: NoiseOverlayVariant;
  /** How the grain mixes with what's below. Default "normal". */
  blend?: NoiseOverlayBlend;
  /** Jitter the grain like projected film (stepped, compositor-only). Default false. */
  animate?: boolean;
  /** Jitter steps per second when animating (1..24). Default 8. */
  fps?: number;
  /** Turbulence seed. Default 0. */
  seed?: number;
  /** Default "none". */
  mask?: PatternMask;
}
const BLEND: Record<NoiseOverlayBlend, string> = {
  normal: "mix-blend-normal",
  overlay: "mix-blend-overlay",
  "soft-light": "mix-blend-soft-light",
  multiply: "mix-blend-multiply",
  screen: "mix-blend-screen",
};
/** Keyframe stops in the pui-grain animation (one jump per stop). */
const GRAIN_STOPS = 10;
const clamp = (v: number, min: number, max: number) => Math.min(Math.max(Number.isFinite(v) ? v : min, min), max);
/**
 * Film grain or sensor noise from an SVG `feTurbulence` filter, laid over anything. Static by default;
 * `animate` jitters an oversized grain layer in steps, which stays on the compositor.
 */
export const NoiseOverlay = React.forwardRef<HTMLDivElement, NoiseOverlayProps>(function NoiseOverlay(
  {
    opacity = 0.08,
    baseFrequency = 0.8,
    octaves = 3,
    variant = "film",
    blend = "normal",
    animate = false,
    fps = 8,
    seed = 0,
    mask = "none",
    style,
    className,
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const uid = React.useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const filterId = `${uid}-grain`;
  const moving = animate && !reduced;
  const frequency = clamp(baseFrequency, 0.05, 2);
  const layers = Math.round(clamp(octaves, 1, 6));
  const rate = clamp(fps, 1, 24);
  return (
    <div
      ref={ref}
      aria-hidden="true"
      data-mask={mask}
      data-variant={variant}
      data-state={moving ? "animated" : "static"}
      {...props}
      style={{ opacity: clamp(opacity, 0, 1), ...style }}
      className={cn(blockReset, backgroundBase, "overflow-hidden text-pui-foreground", BLEND[blend], patternMasks[mask], className)}
    >
      <svg
        focusable="false"
        className={cn(
          blockReset,
          "absolute block",
          // The jittering layer is oversized so its edges never show while it jumps around.
          moving ? "-inset-1/2 h-[200%] w-[200%] will-change-transform motion-safe:animate-pui-grain" : "inset-0 size-full",
        )}
        style={moving ? ({ "--pui-grain-duration": `${(GRAIN_STOPS / rate).toFixed(3)}s` } as React.CSSProperties) : undefined}
      >
        <filter id={filterId} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency={frequency} numOctaves={layers} seed={seed} stitchTiles="stitch" result="noise" />
          {variant === "film" ? (
            // Luminance to gray, fully opaque.
            <feColorMatrix in="noise" type="matrix" values="0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0 0 0 0 1" />
          ) : variant === "color" ? (
            <feColorMatrix in="noise" type="matrix" values="1.4 0 0 0 -0.2  0 1.4 0 0 -0.2  0 0 1.4 0 -0.2  0 0 0 0 1" />
          ) : (
            <>
              {/* Contrasty luminance becomes alpha, then the text color floods through it. */}
              <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1.2 1.2 1.2 0 -1.4" result="alpha" />
              <feFlood floodColor="currentColor" result="ink" />
              <feComposite in="ink" in2="alpha" operator="in" />
            </>
          )}
        </filter>
        <rect width="100%" height="100%" filter={`url(#${filterId})`} />
      </svg>
    </div>
  );
});
