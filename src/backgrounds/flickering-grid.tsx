"use client";
import * as React from "react";
import { backgroundBase, patternMasks } from "../lib/backgrounds";
import { useCanvasLoop, type CanvasFrame } from "../lib/canvas-loop";
import { useCanvasPalette } from "../lib/canvas-palette";
import { useCanvasPointer } from "../lib/canvas-pointer";
import { cn } from "../lib/cn";
import { mergeRefs } from "../lib/compose";
import { mulberry32 } from "../lib/random";
import { blockReset } from "../lib/styles";
import type { PatternMask } from "../lib/types";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";
export interface FlickeringGridProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Square size in px (1..40). Default 4. */
  squareSize?: number;
  /** Gap between squares in px (0..40). Default 6. */
  gap?: number;
  /** Chance per second that a square changes brightness (0..10). Default 0.3. */
  flickerChance?: number;
  /** Square color. Default the root's text color (`text-pui-primary`). */
  color?: string;
  /** Brightest a resting square gets (0..1). Default 0.3. */
  maxOpacity?: number;
  /** Squares near the pointer light up (mouse and pen). Default false. */
  interactive?: boolean;
  /** Pointer glow radius in px. Default 120. */
  radius?: number;
  /** Text spelled out in brighter squares (a dot-matrix sign). Decorative: render the real text too. */
  text?: string;
  /** Color for the text squares. Default `color`. */
  textColor?: string;
  /** Font weight for `text` (it uses the root's font family). Default 700. */
  fontWeight?: number;
  /** Redraws per second (the flicker is meant to be choppy). Default 24. */
  fps?: number;
  /** Default "none". */
  mask?: PatternMask;
}
const LEVELS = 12;
interface Grid {
  cols: number;
  rows: number;
  pitch: number;
  opacity: Float32Array;
  glow: Float32Array;
  text: Uint8Array;
}
const emptyGrid: Grid = { cols: 0, rows: 0, pitch: 1, opacity: new Float32Array(0), glow: new Float32Array(0), text: new Uint8Array(0) };
/** Rasterizes `text` to a cell mask: 1 where a cell's center falls inside a glyph. */
function textMask(text: string, cols: number, rows: number, weight: number, fontFamily: string): Uint8Array {
  const out = new Uint8Array(cols * rows);
  if (!text || typeof document === "undefined") return out;
  const canvas = document.createElement("canvas");
  canvas.width = cols;
  canvas.height = rows;
  const ctx = canvas.getContext("2d");
  if (!ctx) return out;
  // Fit the text to 86% of the width and 60% of the height, in cell units.
  let size = rows * 0.6;
  ctx.font = `${weight} ${size}px ${fontFamily}`;
  const measured = ctx.measureText(text).width;
  if (measured > cols * 0.86) size *= (cols * 0.86) / measured;
  ctx.font = `${weight} ${Math.max(size, 3)}px ${fontFamily}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "black";
  ctx.fillText(text, cols / 2, rows / 2);
  const data = ctx.getImageData(0, 0, cols, rows).data;
  for (let i = 0; i < out.length; i++) out[i] = (data[i * 4 + 3] ?? 0) > 110 ? 1 : 0;
  return out;
}
/** A canvas grid of tiny squares flickering in opacity, with an optional pointer glow and dot-matrix text. */
export const FlickeringGrid = React.forwardRef<HTMLDivElement, FlickeringGridProps>(function FlickeringGrid(
  {
    squareSize = 4,
    gap = 6,
    flickerChance = 0.3,
    color,
    maxOpacity = 0.3,
    interactive = false,
    radius = 120,
    text,
    textColor,
    fontWeight = 700,
    fps = 24,
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
  const palette = useCanvasPalette(rootRef, [color, textColor ?? color]);
  const pointer = useCanvasPointer(rootRef, interactive && !reduced);
  const grid = React.useRef<Grid>(emptyGrid);
  const size = Math.min(Math.max(Number.isFinite(squareSize) ? squareSize : 4, 1), 40);
  const space = Math.min(Math.max(Number.isFinite(gap) ? gap : 6, 0), 40);
  const chance = Math.min(Math.max(Number.isFinite(flickerChance) ? flickerChance : 0, 0), 10);
  const peak = Math.min(Math.max(Number.isFinite(maxOpacity) ? maxOpacity : 0.3, 0), 1);
  // Rebuild when the inputs that shape the grid change (the loop itself only rebuilds on resize).
  const shapeKey = `${size}|${space}|${peak}|${text ?? ""}|${fontWeight}`;
  const builtKey = React.useRef("");
  const build = (frame: CanvasFrame) => {
    builtKey.current = shapeKey;
    const pitch = size + space;
    const cols = Math.ceil(frame.width / pitch) + 1;
    const rows = Math.ceil(frame.height / pitch) + 1;
    const random = mulberry32(cols * 7919 + rows);
    const opacity = new Float32Array(cols * rows);
    for (let i = 0; i < opacity.length; i++) opacity[i] = random() * peak;
    const family = rootRef.current ? getComputedStyle(rootRef.current).fontFamily : "system-ui, sans-serif";
    grid.current = {
      cols,
      rows,
      pitch,
      opacity,
      glow: new Float32Array(cols * rows),
      text: textMask(text ?? "", cols, rows, fontWeight, family),
    };
  };
  const draw = (frame: CanvasFrame) => {
    if (builtKey.current !== shapeKey || grid.current.cols === 0) build(frame);
    const { ctx, width, height, delta } = frame;
    const g = grid.current;
    const [base = frame.color, textFill = frame.color] = palette(frame.color);
    const flip = reduced ? 0 : chance * delta;
    const p = pointer.current;
    const glowing = interactive && !reduced;
    const r2 = radius * radius;
    const textPeak = Math.min(1, Math.max(peak * 2.6, 0.75));
    // Buckets by quantized alpha so each level is one fill() call.
    const buckets: number[][] = Array.from({ length: LEVELS * 2 }, () => []);
    for (let row = 0; row < g.rows; row++) {
      for (let col = 0; col < g.cols; col++) {
        const i = row * g.cols + col;
        const isText = g.text[i] === 1;
        if (flip && Math.random() < flip) g.opacity[i] = Math.random() * peak;
        let alpha = isText ? textPeak * (0.72 + (g.opacity[i] ?? 0) / Math.max(peak, 0.001) * 0.28) : (g.opacity[i] ?? 0);
        if (glowing) {
          const x = col * g.pitch + size / 2;
          const y = row * g.pitch + size / 2;
          const dx = x - p.x;
          const dy = y - p.y;
          const target = p.inside ? Math.max(0, 1 - (dx * dx + dy * dy) / r2) : 0;
          // Glow eases in and lingers a little on the way out.
          const current = g.glow[i] ?? 0;
          g.glow[i] = current + (target - current) * Math.min(1, delta * (target > current ? 14 : 3));
          alpha = Math.min(1, alpha + (g.glow[i] ?? 0) * (1 - alpha) * 0.85);
        }
        if (alpha < 0.02) continue;
        const level = Math.min(LEVELS - 1, Math.round(alpha * (LEVELS - 1)));
        buckets[(isText ? LEVELS : 0) + level]?.push(i);
      }
    }
    ctx.clearRect(0, 0, width, height);
    for (let b = 0; b < buckets.length; b++) {
      const cells = buckets[b];
      if (!cells || cells.length === 0) continue;
      ctx.globalAlpha = (b % LEVELS) / (LEVELS - 1);
      ctx.fillStyle = b >= LEVELS ? textFill : base;
      ctx.beginPath();
      for (const i of cells) ctx.rect((i % g.cols) * g.pitch, Math.floor(i / g.cols) * g.pitch, size, size);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  };
  useCanvasLoop(canvasRef, draw, {
    running: !reduced,
    fps: Math.min(Math.max(fps, 1), 60),
    onResize: build,
  });
  return (
    <div
      ref={mergedRef}
      aria-hidden="true"
      data-mask={mask}
      data-state={reduced ? "static" : "animated"}
      {...props}
      className={cn(blockReset, backgroundBase, "overflow-hidden text-pui-primary", patternMasks[mask], className)}
    >
      <canvas ref={canvasRef} className={cn(blockReset, "absolute inset-0 block size-full")} />
    </div>
  );
});
