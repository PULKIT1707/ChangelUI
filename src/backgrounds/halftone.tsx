"use client";
import * as React from "react";
import { backgroundBase, patternMasks } from "../lib/backgrounds";
import { useCanvasLoop, type CanvasFrame } from "../lib/canvas-loop";
import { useCanvasPalette } from "../lib/canvas-palette";
import { useCanvasPointer } from "../lib/canvas-pointer";
import { cn } from "../lib/cn";
import { mergeRefs } from "../lib/compose";
import { createNoise3D } from "../lib/noise";
import { blockReset } from "../lib/styles";
import type { PatternMask } from "../lib/types";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";
export type HalftoneVariant = "halftone" | "dither" | "lines";
export type HalftoneSource = "radial" | "linear" | "noise" | "flat";
export interface HalftoneProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Largest dot (or line) size in px (1..40). Default 6. */
  dotSize?: number;
  /** Distance between dot centers in px (2..60). Default 10. */
  spacing?: number;
  /** "halftone" print dots, "dither" ordered-dither pixels, "lines" engraving strokes. Default "halftone". */
  variant?: HalftoneVariant;
  /**
   * What drives the tone: "radial" falls off from `origin`, "linear" from the origin's row up and
   * down (origin [0.5, 0] fades top to bottom), "noise" drifts, "flat" is even. Default "radial".
   */
  source?: HalftoneSource;
  /** Screen angle in degrees. Default 45. */
  angle?: number;
  /** Radial center or linear start as [x, y] fractions of the box. Default [0.5, 0.5]. */
  origin?: [number, number];
  /** Flip light and dark. Default false. */
  invert?: boolean;
  /** Overall tone multiplier (0..2); with source "flat" it is the tone. Default 1. */
  intensity?: number;
  /** Noise drift speed (source "noise"). Default 1. */
  speed?: number;
  /** Dot color. Default the root's text color (`text-pui-muted-foreground`). */
  color?: string;
  /** Color for dots swelled by the pointer. Default `var(--pui-primary)`. */
  glowColor?: string;
  /** Dots grow near the pointer (mouse and pen). Default false. */
  interactive?: boolean;
  /** Pointer radius in px. Default 140. */
  radius?: number;
  /** Redraws per second while animating. Default 30. */
  fps?: number;
  /** Default "none". */
  mask?: PatternMask;
}
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const clamp = (v: number, min: number, max: number) => Math.min(Math.max(Number.isFinite(v) ? v : min, min), max);
interface Screen {
  /** Dot centers in canvas px. */
  x: Float32Array;
  y: Float32Array;
  /** Bayer threshold per dot (dither). */
  threshold: Float32Array;
  glow: Float32Array;
  count: number;
}
const emptyScreen: Screen = { x: new Float32Array(0), y: new Float32Array(0), threshold: new Float32Array(0), glow: new Float32Array(0), count: 0 };
/**
 * A print-style halftone, ordered-dither or engraving screen whose dots follow a radial, linear or
 * drifting-noise tone, and can swell around the pointer. Canvas, batched into two fills.
 */
export const Halftone = React.forwardRef<HTMLDivElement, HalftoneProps>(function Halftone(
  {
    dotSize = 6,
    spacing = 10,
    variant = "halftone",
    source = "radial",
    angle = 45,
    origin = [0.5, 0.5],
    invert = false,
    intensity = 1,
    speed = 1,
    color,
    glowColor = "var(--pui-primary)",
    interactive = false,
    radius = 140,
    fps = 30,
    mask = "none",
    className,
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const rootRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const mergedRef = React.useMemo(() => mergeRefs(ref, rootRef), [ref]);
  const palette = useCanvasPalette(rootRef, [color, glowColor]);
  const glowing = interactive && !reduced;
  const pointer = useCanvasPointer(rootRef, glowing);
  const noise = React.useMemo(() => createNoise3D(7), []);
  const screen = React.useRef<Screen>(emptyScreen);
  const size = clamp(dotSize, 1, 40);
  const pitch = clamp(spacing, 2, 60);
  const tone = clamp(intensity, 0, 2);
  const rate = clamp(speed, 0, 10);
  const [ox = 0.5, oy = 0.5] = origin;
  const rad = ((Number.isFinite(angle) ? angle : 45) * Math.PI) / 180;
  const shapeKey = `${pitch}|${rad}|${variant}`;
  const builtKey = React.useRef("");
  const build = (frame: CanvasFrame) => {
    builtKey.current = shapeKey;
    const { width: w, height: h } = frame;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const half = Math.hypot(w, h) / 2 + pitch;
    const n = Math.ceil((half * 2) / pitch);
    const xs: number[] = [];
    const ys: number[] = [];
    const ts: number[] = [];
    // Walk the rotated lattice over the box's circumscribed square and keep the dots that land inside.
    for (let row = 0; row < n; row++) {
      for (let col = 0; col < n; col++) {
        const gx = -half + col * pitch;
        const gy = -half + row * pitch;
        const x = w / 2 + gx * cos - gy * sin;
        const y = h / 2 + gx * sin + gy * cos;
        if (x < -pitch || y < -pitch || x > w + pitch || y > h + pitch) continue;
        xs.push(x);
        ys.push(y);
        ts.push(BAYER[(row % 4) * 4 + (col % 4)] ?? 0.5);
      }
    }
    screen.current = {
      x: Float32Array.from(xs),
      y: Float32Array.from(ys),
      threshold: Float32Array.from(ts),
      glow: new Float32Array(xs.length),
      count: xs.length,
    };
  };
  const draw = (frame: CanvasFrame) => {
    if (builtKey.current !== shapeKey || screen.current.count === 0) build(frame);
    const { ctx, width: w, height: h, delta, time } = frame;
    const s = screen.current;
    const [base = frame.color, accent = frame.color] = palette(frame.color);
    const p = pointer.current;
    const r2 = radius * radius;
    const cx = ox * w;
    const cy = oy * h;
    const reach = Math.max(Math.hypot(Math.max(cx, w - cx), Math.max(cy, h - cy)), 1);
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const z = reduced ? 0 : time * 0.12 * rate;
    const plain = new Path2D();
    const lit = new Path2D();
    for (let i = 0; i < s.count; i++) {
      const x = s.x[i] as number;
      const y = s.y[i] as number;
      let t: number;
      if (source === "radial") t = 1 - Math.hypot(x - cx, y - cy) / reach;
      else if (source === "linear") t = 1 - Math.max(0, y - cy) / Math.max(h - cy, 1) - Math.max(0, cy - y) / Math.max(cy, 1);
      else if (source === "noise") t = 0.5 + noise(x * 0.004, y * 0.004, z) * 0.9;
      else t = 0.5;
      if (invert) t = 1 - t;
      t = Math.min(1, Math.max(0, t * tone));
      let g = 0;
      if (glowing) {
        const dx = x - p.x;
        const dy = y - p.y;
        const target = p.inside ? Math.max(0, 1 - (dx * dx + dy * dy) / r2) : 0;
        const current = s.glow[i] ?? 0;
        // Swell fast, settle slowly: an eased per-dot response instead of a hard cursor edge.
        g = current + (target - current) * Math.min(1, delta * (target > current ? 16 : 4));
        s.glow[i] = g;
        t = Math.min(1, t + g * (1 - t));
      }
      const path = g > 0.25 ? lit : plain;
      if (variant === "dither") {
        if (t <= (s.threshold[i] as number)) continue;
        path.rect(x - pitch / 2, y - pitch / 2, Math.min(size, pitch), Math.min(size, pitch));
      } else if (variant === "lines") {
        const thick = size * t;
        if (thick < 0.3) continue;
        // A short stroke along the screen angle; neighbours join into continuous engraving lines.
        const hx = (cos * pitch) / 2;
        const hy = (sin * pitch) / 2;
        const nx = (-sin * thick) / 2;
        const ny = (cos * thick) / 2;
        path.moveTo(x - hx + nx, y - hy + ny);
        path.lineTo(x + hx + nx, y + hy + ny);
        path.lineTo(x + hx - nx, y + hy - ny);
        path.lineTo(x - hx - nx, y - hy - ny);
        path.closePath();
      } else {
        // Area-proportional dots read as the right tone.
        const r = (size / 2) * Math.sqrt(t);
        if (r < 0.3) continue;
        path.moveTo(x + r, y);
        path.arc(x, y, r, 0, Math.PI * 2);
      }
    }
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = base;
    ctx.fill(plain);
    ctx.fillStyle = accent;
    ctx.fill(lit);
  };
  const animated = !reduced && (source === "noise" || interactive);
  useCanvasLoop(canvasRef, draw, {
    running: animated,
    fps: clamp(fps, 1, 60),
    onResize: build,
    redrawKey: `${shapeKey}|${size}|${source}|${ox}|${oy}|${invert}|${tone}|${color}|${glowColor}`,
  });
  return (
    <div
      ref={mergedRef}
      aria-hidden="true"
      data-mask={mask}
      data-variant={variant}
      data-state={animated ? "animated" : "static"}
      {...props}
      className={cn(blockReset, backgroundBase, "overflow-hidden text-pui-muted-foreground", patternMasks[mask], className)}
    >
      <canvas ref={canvasRef} className={cn(blockReset, "absolute inset-0 block size-full")} />
    </div>
  );
});
