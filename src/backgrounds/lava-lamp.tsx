"use client";
import * as React from "react";
import { backgroundBase, patternMasks } from "../lib/backgrounds";
import { cn } from "../lib/cn";
import { djb2 } from "../lib/ids";
import { mulberry32 } from "../lib/random";
import { blockReset } from "../lib/styles";
import type { PatternMask } from "../lib/types";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";
export interface LavaLampProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Number of blobs (1..12). Default 6. */
  blobs?: number;
  /** Speed multiplier; each blob rises and falls over 14–30s at 1. Default 1. */
  speed?: number;
  /** Extra softness in px applied over the whole lamp. 0 keeps crisp lava edges. Default 24. */
  blur?: number;
  /** Merge blobs where they touch (an SVG gooey filter). Default true. */
  gooey?: boolean;
  /** Blob colors (cycled). Default the gradient and aurora tokens. */
  colors?: string[];
  /** Blob size as a share of the container's smaller side (0.1..1). Default 0.42. */
  size?: number;
  /** Layout seed. Default: derived from the instance id (stable across SSR and hydration). */
  seed?: number;
  /** Default "none". */
  mask?: PatternMask;
}
const DEFAULT_COLORS = ["var(--pui-gradient-1)", "var(--pui-gradient-2)", "var(--pui-gradient-3)", "var(--pui-aurora-2)"];
const clamp = (v: number, min: number, max: number) => Math.min(Math.max(Number.isFinite(v) ? v : min, min), max);
/**
 * Blobs drifting on independent horizontal and vertical periods (a Lissajous wander) that melt
 * together through a gooey filter, colored from theme tokens. Pure CSS motion.
 */
export const LavaLamp = React.forwardRef<HTMLDivElement, LavaLampProps>(function LavaLamp(
  {
    blobs = 6,
    speed = 1,
    blur = 24,
    gooey = true,
    colors = DEFAULT_COLORS,
    size = 0.42,
    seed,
    mask = "none",
    style,
    className,
    ...props
  },
  ref,
) {
  const id = React.useId();
  const uid = id.replace(/[^a-zA-Z0-9_-]/g, "");
  const reduced = usePrefersReducedMotion();
  const count = Math.round(clamp(blobs, 1, 12));
  const rate = clamp(speed, 0.05, 10);
  const soft = clamp(blur, 0, 120);
  const scale = clamp(size, 0.1, 1);
  const palette = colors.length ? colors : DEFAULT_COLORS;
  const resolvedSeed = seed ?? djb2(id);
  const layout = React.useMemo(() => {
    const random = mulberry32(resolvedSeed);
    return Array.from({ length: count }, (_, i) => {
      // Spread blobs across the width, then let each wander on its own x and y period.
      const left = 12 + ((i + 0.5) / count) * 76 + (random() - 0.5) * 10;
      const sizeShare = scale * (0.55 + random() * 0.6);
      return {
        left,
        top: 20 + random() * 60,
        size: sizeShare * 100,
        x: 8 + random() * 14,
        y: 22 + random() * 26,
        s0: 0.8 + random() * 0.2,
        s1: 1 + random() * 0.25,
        dx: 14 + random() * 12,
        dy: 16 + random() * 14,
        phase: random(),
        color: palette[i % palette.length] ?? DEFAULT_COLORS[0],
      };
    });
  }, [resolvedSeed, count, scale, palette]);
  return (
    <div
      ref={ref}
      aria-hidden="true"
      data-mask={mask}
      data-state={reduced ? "static" : "animated"}
      {...props}
      style={{ containerType: "size", ...style }}
      className={cn(blockReset, backgroundBase, "overflow-hidden", patternMasks[mask], className)}
    >
      {gooey ? (
        <svg className={cn(blockReset, "absolute size-0")} focusable="false">
          <defs>
            <filter id={`${uid}-lava`} colorInterpolationFilters="sRGB">
              <feGaussianBlur in="SourceGraphic" stdDeviation="14" result="blur" />
              <feColorMatrix in="blur" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 24 -9" />
            </filter>
          </defs>
        </svg>
      ) : null}
      <div className={cn(blockReset, "absolute inset-0")} style={soft ? { filter: `blur(${soft}px)` } : undefined}>
        <div className={cn(blockReset, "absolute inset-0")} style={gooey ? { filter: `url(#${uid}-lava)` } : undefined}>
          {layout.map((blob, i) => {
            const dx = blob.dx / rate;
            const dy = blob.dy / rate;
            return (
              <div
                key={i}
                data-pui-lava-blob=""
                className={cn(blockReset, "absolute -translate-x-1/2 -translate-y-1/2", !reduced && "motion-safe:animate-pui-lava-x")}
                style={
                  {
                    left: `${blob.left.toFixed(2)}%`,
                    top: `${blob.top.toFixed(2)}%`,
                    width: `${blob.size.toFixed(2)}cqmin`,
                    height: `${blob.size.toFixed(2)}cqmin`,
                    "--pui-lava-x0": `${(-blob.x).toFixed(1)}cqw`,
                    "--pui-lava-x1": `${blob.x.toFixed(1)}cqw`,
                    "--pui-lava-x-duration": `${dx.toFixed(2)}s`,
                    animationDelay: `${(-blob.phase * dx * 2).toFixed(2)}s`,
                  } as React.CSSProperties
                }
              >
                <div
                  className={cn(blockReset, "size-full rounded-pui-full", !reduced && "motion-safe:animate-pui-lava-y")}
                  style={
                    {
                      "--pui-lava-y0": `${(-blob.y).toFixed(1)}cqh`,
                      "--pui-lava-y1": `${blob.y.toFixed(1)}cqh`,
                      "--pui-lava-s0": blob.s0.toFixed(2),
                      "--pui-lava-s1": blob.s1.toFixed(2),
                      "--pui-lava-y-duration": `${dy.toFixed(2)}s`,
                      animationDelay: `${(-((blob.phase + 0.37) % 1) * dy * 2).toFixed(2)}s`,
                      background: `radial-gradient(circle at 35% 30%, color-mix(in oklab, ${blob.color} 70%, var(--pui-background)), ${blob.color} 60%)`,
                    } as React.CSSProperties
                  }
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});
