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
export interface TopographyProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Contour levels (2..40). Default 12. */
  lines?: number;
  /** Terrain morph speed multiplier (0..5). Default 1. */
  speed?: number;
  /** Line color. Default the root's text color (`text-pui-muted-foreground`). */
  color?: string;
  /** Color of the thicker index contours. Default `color`. */
  accentColor?: string;
  /** Line width in px (0.25..4). Default 1. */
  strokeWidth?: number;
  /** Every nth contour is an index line, drawn thicker and brighter. 0 turns them off. Default 5. */
  indexEvery?: number;
  /** Terrain feature size in px: larger values give broader hills (60..1200). Default 320. */
  scale?: number;
  /** Sampling cell in px (4..32): smaller is smoother and costlier. Default 10. */
  resolution?: number;
  /** Line opacity (0..1). Default 0.5. */
  opacity?: number;
  /** The pointer raises a summit the contours wrap around (mouse and pen). Default false. */
  interactive?: boolean;
  /** Summit radius in px. Default 140. */
  radius?: number;
  /** Terrain seed. Default 3. */
  seed?: number;
  /** Redraws per second. Default 20. */
  fps?: number;
  /** Default "none". */
  mask?: PatternMask;
}
const clamp = (v: number, min: number, max: number) => Math.min(Math.max(Number.isFinite(v) ? v : min, min), max);
/** Marching-squares edge points: 0 top, 1 right, 2 bottom, 3 left. Segments per case as edge pairs. */
const CASES: ReadonlyArray<readonly number[]> = [
  [],
  [3, 2],
  [2, 1],
  [3, 1],
  [0, 1],
  [], // saddle, resolved per cell
  [0, 2],
  [3, 0],
  [3, 0],
  [0, 2],
  [], // saddle, resolved per cell
  [0, 1],
  [3, 1],
  [2, 1],
  [3, 2],
  [],
];
/**
 * Animated contour lines over slowly morphing terrain (marching squares on gradient noise), with
 * index contours and an optional pointer summit. Reads like a living topographic map.
 */
export const Topography = React.forwardRef<HTMLDivElement, TopographyProps>(function Topography(
  {
    lines = 12,
    speed = 1,
    color,
    accentColor,
    strokeWidth = 1,
    indexEvery = 5,
    scale = 320,
    resolution = 10,
    opacity = 0.5,
    interactive = false,
    radius = 140,
    seed = 3,
    fps = 20,
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
  const palette = useCanvasPalette(rootRef, [color, accentColor ?? color]);
  const lifting = interactive && !reduced;
  const pointer = useCanvasPointer(rootRef, lifting);
  const noise = React.useMemo(() => createNoise3D(Math.round(seed) || 1), [seed]);
  const levels = Math.round(clamp(lines, 2, 40));
  const rate = clamp(speed, 0, 5);
  const width = clamp(strokeWidth, 0.25, 4);
  const every = Math.round(clamp(indexEvery, 0, 40));
  const feature = clamp(scale, 60, 1200);
  const cell = Math.round(clamp(resolution, 4, 32));
  const alpha = clamp(opacity, 0, 1);
  const field = React.useRef(new Float32Array(0));
  // The summit eases toward the pointer and grows/shrinks as it enters or leaves.
  const summit = React.useRef({ x: 0, y: 0, h: 0 });
  const draw = (frame: CanvasFrame) => {
    const { ctx, width: w, height: h, delta, time } = frame;
    const cols = Math.ceil(w / cell) + 1;
    const rows = Math.ceil(h / cell) + 1;
    if (field.current.length !== cols * rows) field.current = new Float32Array(cols * rows);
    const f = field.current;
    const k = 1 / feature;
    const z = reduced ? 0 : time * 0.035 * rate;
    const p = pointer.current;
    const s = summit.current;
    if (lifting) {
      const ease = Math.min(1, delta * 6);
      if (p.inside) {
        if (s.h < 0.01) {
          s.x = p.x;
          s.y = p.y;
        }
        s.x += (p.x - s.x) * ease;
        s.y += (p.y - s.y) * ease;
      }
      s.h += ((p.inside ? 1 : 0) - s.h) * Math.min(1, delta * 2.5);
    } else s.h = 0;
    const sigma2 = 2 * radius * radius * 0.35;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = col * cell;
        const y = row * cell;
        let v = noise(x * k, y * k, z) * 0.7 + noise(x * k * 2.3 + 17, y * k * 2.3 - 9, z * 1.4) * 0.3;
        if (s.h > 0.001) {
          const dx = x - s.x;
          const dy = y - s.y;
          v += s.h * 0.9 * Math.exp(-(dx * dx + dy * dy) / sigma2);
        }
        f[row * cols + col] = 0.5 + v * 0.8;
      }
    }
    const [base = frame.color, accent = frame.color] = palette(frame.color);
    const minor = new Path2D();
    const major = new Path2D();
    const point = [0, 0, 0, 0, 0, 0, 0, 0];
    for (let level = 1; level <= levels; level++) {
      const th = level / (levels + 1);
      const path = every > 0 && level % every === 0 ? major : minor;
      for (let row = 0; row < rows - 1; row++) {
        for (let col = 0; col < cols - 1; col++) {
          const i = row * cols + col;
          const a = f[i] as number;
          const b = f[i + 1] as number;
          const c = f[i + cols + 1] as number;
          const d = f[i + cols] as number;
          const index = (a > th ? 8 : 0) | (b > th ? 4 : 0) | (c > th ? 2 : 0) | (d > th ? 1 : 0);
          if (index === 0 || index === 15) continue;
          const x0 = col * cell;
          const y0 = row * cell;
          point[0] = x0 + (cell * (th - a)) / (b - a);
          point[1] = y0;
          point[2] = x0 + cell;
          point[3] = y0 + (cell * (th - b)) / (c - b);
          point[4] = x0 + (cell * (th - d)) / (c - d);
          point[5] = y0 + cell;
          point[6] = x0;
          point[7] = y0 + (cell * (th - a)) / (d - a);
          let pairs = CASES[index] as readonly number[];
          if (index === 5 || index === 10) {
            const center = (a + b + c + d) / 4 > th;
            // Saddles: the center value decides which corners connect.
            pairs = index === 5 ? (center ? [3, 0, 2, 1] : [0, 1, 3, 2]) : center ? [0, 1, 3, 2] : [3, 0, 2, 1];
          }
          for (let e = 0; e < pairs.length; e += 2) {
            const from = pairs[e] as number;
            const to = pairs[e + 1] as number;
            path.moveTo(point[from * 2] as number, point[from * 2 + 1] as number);
            path.lineTo(point[to * 2] as number, point[to * 2 + 1] as number);
          }
        }
      }
    }
    ctx.clearRect(0, 0, w, h);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.globalAlpha = alpha;
    ctx.lineWidth = width;
    ctx.strokeStyle = base;
    ctx.stroke(minor);
    ctx.globalAlpha = Math.min(1, alpha * 1.6);
    ctx.lineWidth = width * 1.8;
    ctx.strokeStyle = accent;
    ctx.stroke(major);
    ctx.globalAlpha = 1;
  };
  useCanvasLoop(canvasRef, draw, {
    running: !reduced,
    fps: clamp(fps, 1, 60),
    redrawKey: `${levels}|${width}|${every}|${feature}|${cell}|${alpha}|${seed}|${color}|${accentColor}`,
  });
  return (
    <div
      ref={mergedRef}
      aria-hidden="true"
      data-mask={mask}
      data-state={reduced ? "static" : "animated"}
      {...props}
      className={cn(blockReset, backgroundBase, "overflow-hidden text-pui-muted-foreground", patternMasks[mask], className)}
    >
      <canvas ref={canvasRef} className={cn(blockReset, "absolute inset-0 block size-full")} />
    </div>
  );
});
