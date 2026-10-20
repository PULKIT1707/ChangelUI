"use client";

import { motion } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { toIdPart } from "../lib/ids";
import { blockReset } from "../lib/styles";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export interface AnimatedBeamProps extends React.SVGAttributes<SVGSVGElement> {
  /** The positioned (relative) element that holds both endpoints. The beam's SVG covers it. */
  containerRef: React.RefObject<HTMLElement | null>;
  /** Where the beam starts. */
  fromRef: React.RefObject<HTMLElement | null>;
  /** Where the beam ends. */
  toRef: React.RefObject<HTMLElement | null>;
  /** px the curve bends away from the straight line; positive bends to the left of travel (up for left → right). Default 0. */
  curvature?: number;
  /** Seconds for the pulse to travel the beam. Default 3. */
  duration?: number;
  /** Seconds before the first pulse (stagger several beams). Default 0. */
  delay?: number;
  /** Seconds of rest between pulses. Default 0.5. */
  repeatDelay?: number;
  /** Pulse travels from `toRef` back to `fromRef`. Default false. */
  reverse?: boolean;
  /** Pulse length as a fraction of the beam (0.05..0.9). Default 0.25. */
  pulseLength?: number;
  /** CSS color of the resting path. Default var(--pui-border). */
  pathColor?: string;
  /** Default 2. */
  pathWidth?: number;
  /** Default 1. */
  pathOpacity?: number;
  /** Dashed resting path. Default false. */
  dashed?: boolean;
  /** CSS color at the pulse's tail. Default var(--pui-gradient-1). */
  gradientStart?: string;
  /** CSS color at the pulse's head. Default var(--pui-gradient-2). */
  gradientStop?: string;
  /** Soft blurred halo around the pulse. Default true. */
  glow?: boolean;
  /** Endpoint offsets from each element's center, px. */
  startXOffset?: number;
  startYOffset?: number;
  endXOffset?: number;
  endYOffset?: number;
}

interface BeamGeometry {
  width: number;
  height: number;
  d: string;
  length: number;
  sx: number;
  sy: number;
  ex: number;
  ey: number;
}

/** Arc length of a quadratic bezier, sampled. */
function quadLength(sx: number, sy: number, cx: number, cy: number, ex: number, ey: number): number {
  let length = 0;
  let px = sx;
  let py = sy;
  const steps = 32;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    const x = u * u * sx + 2 * u * t * cx + t * t * ex;
    const y = u * u * sy + 2 * u * t * cy + t * t * ey;
    length += Math.hypot(x - px, y - py);
    px = x;
    py = y;
  }
  return length;
}

/**
 * An SVG beam between two elements with a gradient pulse that travels along it (integration and
 * architecture diagrams). Place it inside the relative container that holds both endpoints; it
 * re-measures whenever the container or either endpoint resizes. Decorative: aria-hidden.
 */
export const AnimatedBeam = React.forwardRef<SVGSVGElement, AnimatedBeamProps>(function AnimatedBeam(
  {
    containerRef,
    fromRef,
    toRef,
    curvature = 0,
    duration = 3,
    delay = 0,
    repeatDelay = 0.5,
    reverse = false,
    pulseLength = 0.25,
    pathColor = "var(--pui-border)",
    pathWidth = 2,
    pathOpacity = 1,
    dashed = false,
    gradientStart = "var(--pui-gradient-1)",
    gradientStop = "var(--pui-gradient-2)",
    glow = true,
    startXOffset = 0,
    startYOffset = 0,
    endXOffset = 0,
    endYOffset = 0,
    className,
    style,
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const uid = toIdPart(React.useId());
  const gradientId = `pui-beam-${uid}-g`;
  const filterId = `pui-beam-${uid}-f`;
  const [geometry, setGeometry] = React.useState<BeamGeometry | null>(null);

  React.useEffect(() => {
    const container = containerRef.current;
    const from = fromRef.current;
    const to = toRef.current;
    if (!container || !from || !to) return;
    const measure = () => {
      const c = container.getBoundingClientRect();
      const a = from.getBoundingClientRect();
      const b = to.getBoundingClientRect();
      // Rects are in screen px; a CSS scale on an ancestor (a zoomed-out preview) shrinks them, while
      // the SVG draws in the container's own px. Divide the scale back out.
      const kx = container.offsetWidth > 0 && c.width > 0 ? c.width / container.offsetWidth : 1;
      const ky = container.offsetHeight > 0 && c.height > 0 ? c.height / container.offsetHeight : 1;
      const sx = (a.left - c.left + a.width / 2) / kx + startXOffset;
      const sy = (a.top - c.top + a.height / 2) / ky + startYOffset;
      const ex = (b.left - c.left + b.width / 2) / kx + endXOffset;
      const ey = (b.top - c.top + b.height / 2) / ky + endYOffset;
      const dx = ex - sx;
      const dy = ey - sy;
      const span = Math.hypot(dx, dy) || 1;
      // Bend along the normal so vertical and diagonal beams curve as nicely as horizontal ones.
      const cx = (sx + ex) / 2 + (dy / span) * curvature;
      const cy = (sy + ey) / 2 - (dx / span) * curvature;
      const next: BeamGeometry = {
        width: c.width / kx,
        height: c.height / ky,
        d: `M ${sx.toFixed(2)},${sy.toFixed(2)} Q ${cx.toFixed(2)},${cy.toFixed(2)} ${ex.toFixed(2)},${ey.toFixed(2)}`,
        length: quadLength(sx, sy, cx, cy, ex, ey),
        sx,
        sy,
        ex,
        ey,
      };
      setGeometry((prev) => (prev && prev.d === next.d && prev.width === next.width && prev.height === next.height ? prev : next));
    };
    if (typeof ResizeObserver === "undefined") return;
    // Fires once on observe(), so the first measurement is asynchronous.
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    observer.observe(from);
    observer.observe(to);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [containerRef, fromRef, toRef, curvature, startXOffset, startYOffset, endXOffset, endYOffset]);

  if (!geometry) return null;

  const { width, height, d, length } = geometry;
  const fraction = Math.min(Math.max(pulseLength, 0.05), 0.9);
  const dash = length * fraction;
  // One dash per period: hidden before the start (offset = dash) and after the end (offset = -length).
  const dasharray = `${dash} ${length + dash}`;
  const offsets = reverse ? [-length, dash] : [dash, -length];
  // The gradient rides with the pulse along the chord: transparent tail, then start → stop at the head.
  const [ax, ay, bx, by] = reverse
    ? [geometry.ex, geometry.ey, geometry.sx, geometry.sy]
    : [geometry.sx, geometry.sy, geometry.ex, geometry.ey];
  const along = (t: number) => [ax + (bx - ax) * t, ay + (by - ay) * t] as const;
  const [tailStartX, tailStartY] = along(-fraction);
  const [tailEndX, tailEndY] = along(1);
  const [headStartX, headStartY] = along(0);
  const [headEndX, headEndY] = along(1 + fraction);
  const animate = !reduced && length > 0;
  const pulseTransition = { duration, delay, repeat: Infinity, repeatDelay, ease: "linear" } as const;

  return (
    <svg
      ref={ref}
      aria-hidden="true"
      focusable="false"
      data-state={animate ? "animated" : "static"}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      {...props}
      style={style}
      className={cn(blockReset, "pointer-events-none absolute left-0 top-0 overflow-visible", className)}
    >
      <defs>
        <motion.linearGradient
          id={gradientId}
          gradientUnits="userSpaceOnUse"
          initial={{ x1: tailStartX, y1: tailStartY, x2: headStartX, y2: headStartY }}
          animate={
            animate
              ? { x1: [tailStartX, tailEndX], y1: [tailStartY, tailEndY], x2: [headStartX, headEndX], y2: [headStartY, headEndY] }
              : undefined
          }
          transition={pulseTransition}
        >
          <stop offset="0%" style={{ stopColor: gradientStart, stopOpacity: 0 }} />
          <stop offset="45%" style={{ stopColor: gradientStart, stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: gradientStop, stopOpacity: 1 }} />
        </motion.linearGradient>
        {glow ? (
          <filter id={filterId} filterUnits="userSpaceOnUse" x={-20} y={-20} width={width + 40} height={height + 40}>
            <feGaussianBlur stdDeviation={pathWidth * 1.6} />
          </filter>
        ) : null}
      </defs>
      <path
        d={d}
        strokeWidth={pathWidth}
        strokeLinecap="round"
        strokeDasharray={dashed ? `${pathWidth * 2} ${pathWidth * 3}` : undefined}
        style={{ stroke: pathColor, opacity: pathOpacity }}
      />
      {animate ? (
        <>
          {glow ? (
            <motion.path
              d={d}
              stroke={`url(#${gradientId})`}
              strokeWidth={pathWidth * 3}
              strokeLinecap="round"
              strokeDasharray={dasharray}
              filter={`url(#${filterId})`}
              opacity={0.55}
              initial={{ strokeDashoffset: offsets[0] }}
              animate={{ strokeDashoffset: offsets }}
              transition={pulseTransition}
            />
          ) : null}
          <motion.path
            d={d}
            stroke={`url(#${gradientId})`}
            strokeWidth={pathWidth}
            strokeLinecap="round"
            strokeDasharray={dasharray}
            initial={{ strokeDashoffset: offsets[0] }}
            animate={{ strokeDashoffset: offsets }}
            transition={pulseTransition}
          />
        </>
      ) : null}
    </svg>
  );
});
