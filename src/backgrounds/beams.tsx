"use client";
import * as React from "react";
import { backgroundBase, patternMasks } from "../lib/backgrounds";
import { cn } from "../lib/cn";
import { djb2 } from "../lib/ids";
import { mulberry32 } from "../lib/random";
import { blockReset } from "../lib/styles";
import type { PatternMask } from "../lib/types";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";
export interface BeamsProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Number of beams (1..40). Default 8. */
  count?: number;
  /** Tail color (any CSS color or token var). Default `var(--pui-beam-from)`. */
  color?: string;
  /** Head color, blended at the leading edge with a soft glow. Default `var(--pui-beam-to)`. */
  accentColor?: string;
  /** Speed multiplier; beams take 4–9s per pass at 1. Default 1. */
  speed?: number;
  /** Tail length as a fraction of the height (0.05..0.8). Default 0.35. */
  length?: number;
  /** Beam width in px (1..6). Default 1. */
  width?: number;
  /** Tilt of the whole field in degrees (-45..45). Default 0. */
  tilt?: number;
  /** Faint vertical rails the beams travel on. Default true. */
  rails?: boolean;
  /** Soft glow along the top edge. Default true. */
  glow?: boolean;
  /** Layout seed. Default: derived from the instance id (stable across SSR and hydration). */
  seed?: number;
  /** Default "none". */
  mask?: PatternMask;
}
const clamp = (v: number, min: number, max: number) => Math.min(Math.max(Number.isFinite(v) ? v : min, min), max);
/** Light beams falling down vertical rails at seeded speeds (a dark-hero backdrop). */
export const Beams = React.forwardRef<HTMLDivElement, BeamsProps>(function Beams(
  {
    count = 8,
    color = "var(--pui-beam-from)",
    accentColor = "var(--pui-beam-to)",
    speed = 1,
    length = 0.35,
    width = 1,
    tilt = 0,
    rails = true,
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
  const safeCount = Math.round(clamp(count, 1, 40));
  const safeSpeed = clamp(speed, 0.1, 10);
  const tail = clamp(length, 0.05, 0.8);
  const beamWidth = clamp(width, 1, 6);
  const angle = clamp(tilt, -45, 45);
  const resolvedSeed = seed ?? djb2(id);
  const beams = React.useMemo(() => {
    const random = mulberry32(resolvedSeed);
    return Array.from({ length: safeCount }, (_, i) => {
      const duration = 4 + random() * 5;
      return {
        left: ((i + 0.5 + (random() - 0.5) * 0.6) / safeCount) * 100,
        duration,
        phase: random(),
        opacity: 0.55 + random() * 0.45,
      };
    });
  }, [resolvedSeed, safeCount]);
  const vars = {
    "--pui-beams-color": color,
    "--pui-beams-accent": accentColor,
  } as React.CSSProperties;
  const tailStart = `${((1 - tail) * 100).toFixed(1)}%`;
  return (
    <div
      ref={ref}
      aria-hidden="true"
      data-mask={mask}
      data-state={reduced ? "static" : "animated"}
      {...props}
      style={{ ...vars, ...style }}
      className={cn(blockReset, backgroundBase, "overflow-hidden", patternMasks[mask], className)}
    >
      {glow ? (
        <div
          className={cn(blockReset, "absolute inset-x-0 top-0 h-1/2 opacity-60")}
          style={{
            background:
              "radial-gradient(ellipse 70% 60% at 50% 0%, color-mix(in oklab, var(--pui-beams-color) 35%, transparent), transparent 70%)",
          }}
        />
      ) : null}
      <div
        className={cn(blockReset, "absolute", angle ? "-inset-1/4" : "inset-0")}
        style={angle ? { transform: `rotate(${angle}deg)` } : undefined}
      >
        {beams.map((beam, i) => {
          const duration = beam.duration / safeSpeed;
          return (
            <span
              key={i}
              data-pui-beam=""
              className={cn(blockReset, "absolute inset-y-0 -translate-x-1/2 overflow-visible")}
              style={{ left: `${beam.left.toFixed(2)}%`, width: beamWidth, opacity: beam.opacity }}
            >
              {rails ? (
                <span
                  className={cn(blockReset, "absolute inset-0")}
                  style={{
                    background:
                      "linear-gradient(to bottom, transparent, color-mix(in oklab, var(--pui-beams-color) 16%, transparent) 20%, color-mix(in oklab, var(--pui-beams-color) 16%, transparent) 80%, transparent)",
                  }}
                />
              ) : null}
              <span
                className={cn(
                  blockReset,
                  "absolute inset-0",
                  !reduced && "motion-safe:animate-pui-beam-fall",
                  "after:absolute after:bottom-0 after:left-1/2 after:size-(--pui-beam-head) after:-translate-x-1/2 after:translate-y-1/2 after:rounded-pui-full after:bg-(--pui-beams-accent) after:shadow-[0_0_10px_3px_var(--pui-beams-accent)] after:content-['']",
                )}
                style={
                  {
                    "--pui-beam-duration": `${duration.toFixed(2)}s`,
                    "--pui-beam-head": `${beamWidth + 2}px`,
                    animationDelay: `${(-beam.phase * duration).toFixed(2)}s`,
                    background: `linear-gradient(to bottom, transparent ${tailStart}, var(--pui-beams-color) 88%, var(--pui-beams-accent))`,
                    transform: reduced ? `translateY(${(beam.phase * 140 - 90).toFixed(1)}%)` : undefined,
                  } as React.CSSProperties
                }
              />
            </span>
          );
        })}
      </div>
    </div>
  );
});
