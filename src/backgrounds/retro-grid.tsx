"use client";
import * as React from "react";
import { backgroundBase, patternMasks } from "../lib/backgrounds";
import { cn } from "../lib/cn";
import { blockReset } from "../lib/styles";
import type { PatternMask } from "../lib/types";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";
export interface RetroGridProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Tilt of the floor in degrees (30..85). Default 65. */
  angle?: number;
  /** Grid cell size in px at the near edge (16..200). Default 60. */
  cellSize?: number;
  /** Line width in px (1..4). Default 1. */
  lineWidth?: number;
  /** Line color. Default `var(--pui-gradient-2)`. */
  lineColor?: string;
  /** Horizon height as a fraction of the container from the top (0.15..0.85). Default 0.5. */
  horizon?: number;
  /** Striped synthwave sun sinking into the horizon. Default true. */
  sun?: boolean;
  /** Sun gradient, top to bottom. Default `[var(--pui-gradient-3), var(--pui-gradient-2)]`. */
  sunColors?: [top: string, bottom: string];
  /** Cells scrolled per second toward the viewer. 0 stops it. Default 0.7. */
  speed?: number;
  /** Default "none". */
  mask?: PatternMask;
}
const clamp = (v: number, min: number, max: number) => Math.min(Math.max(Number.isFinite(v) ? v : min, min), max);
const DEFAULT_SUN: [string, string] = ["var(--pui-gradient-3)", "var(--pui-gradient-2)"];
/** A synthwave perspective floor scrolling toward a glowing horizon, with an optional striped sun. */
export const RetroGrid = React.forwardRef<HTMLDivElement, RetroGridProps>(function RetroGrid(
  {
    angle = 65,
    cellSize = 60,
    lineWidth = 1,
    lineColor = "var(--pui-gradient-2)",
    horizon = 0.5,
    sun = true,
    sunColors = DEFAULT_SUN,
    speed = 0.7,
    mask = "none",
    style,
    className,
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const tilt = clamp(angle, 30, 85);
  const cell = clamp(cellSize, 16, 200);
  const stroke = clamp(lineWidth, 1, 4);
  const line = `${(clamp(horizon, 0.15, 0.85) * 100).toFixed(1)}%`;
  const rate = clamp(speed, 0, 20);
  const moving = !reduced && rate > 0;
  const vars = {
    "--pui-retro-line": lineColor,
    "--pui-retro-cell": `${cell}px`,
    "--pui-retro-duration": `${(1 / Math.max(rate, 0.01)).toFixed(3)}s`,
    "--pui-retro-sun-top": sunColors[0],
    "--pui-retro-sun-bottom": sunColors[1],
  } as React.CSSProperties;
  return (
    <div
      ref={ref}
      aria-hidden="true"
      data-mask={mask}
      data-state={moving ? "animated" : "static"}
      {...props}
      style={{ ...vars, ...style }}
      className={cn(blockReset, backgroundBase, "overflow-hidden", patternMasks[mask], className)}
    >
      {/* Horizon haze behind the sun. */}
      <div
        className={cn(blockReset, "absolute inset-x-0 top-0")}
        style={{
          height: line,
          background:
            "radial-gradient(ellipse 60% 70% at 50% 100%, color-mix(in oklab, var(--pui-retro-sun-bottom) 28%, transparent), transparent 70%)",
        }}
      />
      {sun ? (
        <div className={cn(blockReset, "absolute inset-x-0 top-0 overflow-hidden")} style={{ height: line }}>
          <div
            data-pui-retro-sun=""
            className={cn(
              blockReset,
              "absolute bottom-0 left-1/2 aspect-square w-[min(34%,22rem)] -translate-x-1/2 translate-y-[38%] rounded-pui-full",
            )}
            style={{
              background: "linear-gradient(to bottom, var(--pui-retro-sun-top), var(--pui-retro-sun-bottom) 75%)",
              boxShadow: "0 0 80px 10px color-mix(in oklab, var(--pui-retro-sun-bottom) 45%, transparent)",
              // Solid top half, then bands that thicken toward the horizon.
              maskImage:
                "linear-gradient(to bottom, black 46%, transparent 46%), repeating-linear-gradient(to bottom, transparent 0 4.5%, black 4.5% 9%)",
              WebkitMaskImage:
                "linear-gradient(to bottom, black 46%, transparent 46%), repeating-linear-gradient(to bottom, transparent 0 4.5%, black 4.5% 9%)",
            }}
          />
        </div>
      ) : null}
      {/* The floor: a tall plane tilted back from its bottom edge, vanishing toward the horizon. */}
      <div
        className={cn(blockReset, "absolute inset-x-0 bottom-0 overflow-hidden")}
        style={{
          top: line,
          perspective: "220px",
          perspectiveOrigin: "50% 0%",
          maskImage: "linear-gradient(to bottom, transparent, black 38%)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent, black 38%)",
        }}
      >
        <div
          className={cn(blockReset, "absolute bottom-0 -left-[250%] h-[500%] w-[600%] origin-bottom")}
          style={{ transform: `rotateX(${tilt}deg)` }}
        >
          <div
            data-pui-retro-floor=""
            className={cn(blockReset, "absolute inset-x-0 bottom-0", moving && "motion-safe:animate-pui-retro-scroll")}
            style={{
              top: `-${cell}px`,
              backgroundImage: `linear-gradient(to right, var(--pui-retro-line) ${stroke}px, transparent ${stroke}px), linear-gradient(to bottom, var(--pui-retro-line) ${stroke}px, transparent ${stroke}px)`,
              backgroundSize: `${cell}px ${cell}px`,
              backgroundPosition: "50% 0",
            }}
          />
        </div>
      </div>
      {/* Glowing horizon line. */}
      <div
        className={cn(blockReset, "absolute inset-x-0 h-px")}
        style={{
          top: line,
          background: "linear-gradient(to right, transparent, var(--pui-retro-line) 20%, var(--pui-retro-line) 80%, transparent)",
          boxShadow: "0 0 14px 1px var(--pui-retro-line)",
        }}
      />
    </div>
  );
});
