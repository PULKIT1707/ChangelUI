"use client";
import * as React from "react";
import { backgroundBase, patternMasks } from "../lib/backgrounds";
import { useCanvasLoop, type CanvasFrame } from "../lib/canvas-loop";
import { useCanvasPalette } from "../lib/canvas-palette";
import { useCanvasPointer } from "../lib/canvas-pointer";
import { cn } from "../lib/cn";
import { mergeRefs } from "../lib/compose";
import { createNoise3D } from "../lib/noise";
import { mulberry32 } from "../lib/random";
import { blockReset } from "../lib/styles";
import type { PatternMask } from "../lib/types";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";
export interface FlowFieldProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Particles per 1000x600 px of area (10..4000). Scales with the container. Default 800. */
  particles?: number;
  /** Noise frequency: smaller values give wider, calmer currents (0.0005..0.02). Default 0.0035. */
  noiseScale?: number;
  /** Travel speed multiplier (0..5). Default 1. */
  speed?: number;
  /** How fast trails fade per frame (0.005..1). Small values leave long silky trails. Default 0.08. */
  trail?: number;
  /** Particle colors (cycled). Default the chart tokens 1–3. */
  colors?: string[];
  /** Stroke width in px (0.25..6). Default 1. */
  lineWidth?: number;
  /** Stroke opacity (0..1). Default 0.7. */
  opacity?: number;
  /** How quickly the field itself morphs over time (0..5). Default 1. */
  evolve?: number;
  /** The pointer stirs a swirl into the field (mouse and pen). Default false. */
  interactive?: boolean;
  /** Swirl radius in px. Default 160. */
  radius?: number;
  /** Field seed. Default 1. */
  seed?: number;
  /** Default "none". */
  mask?: PatternMask;
}
const DEFAULT_COLORS = ["var(--pui-chart-1)", "var(--pui-chart-2)", "var(--pui-chart-3)"];
const REFERENCE_AREA = 1000 * 600;
const clamp = (v: number, min: number, max: number) => Math.min(Math.max(Number.isFinite(v) ? v : min, min), max);
interface Swarm {
  x: Float32Array;
  y: Float32Array;
  px: Float32Array;
  py: Float32Array;
  life: Float32Array;
  color: Uint8Array;
  count: number;
}
const emptySwarm: Swarm = {
  x: new Float32Array(0),
  y: new Float32Array(0),
  px: new Float32Array(0),
  py: new Float32Array(0),
  life: new Float32Array(0),
  color: new Uint8Array(0),
  count: 0,
};
/**
 * Generative-art background: particles drift along a smooth, slowly morphing noise field and leave
 * fading trails. Trails fade to transparent, so it sits on any surface in light and dark mode.
 */
export const FlowField = React.forwardRef<HTMLDivElement, FlowFieldProps>(function FlowField(
  {
    particles = 800,
    noiseScale = 0.0035,
    speed = 1,
    trail = 0.08,
    colors = DEFAULT_COLORS,
    lineWidth = 1,
    opacity = 0.7,
    evolve = 1,
    interactive = false,
    radius = 160,
    seed = 1,
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
  const list = colors.length ? colors : DEFAULT_COLORS;
  const palette = useCanvasPalette(rootRef, list);
  const pointer = useCanvasPointer(rootRef, interactive && !reduced);
  const noise = React.useMemo(() => createNoise3D(Math.round(seed) || 1), [seed]);
  const swarm = React.useRef<Swarm>(emptySwarm);
  const density = clamp(particles, 10, 4000);
  const scale = clamp(noiseScale, 0.0005, 0.02);
  const rate = clamp(speed, 0, 5);
  const fadeRate = clamp(trail, 0.005, 1);
  const width = clamp(lineWidth, 0.25, 6);
  const alpha = clamp(opacity, 0, 1);
  const morph = clamp(evolve, 0, 5);
  const shapeKey = `${density}|${list.length}|${seed}`;
  const builtKey = React.useRef("");
  const random = React.useRef(mulberry32(1));
  const spawn = (s: Swarm, i: number, w: number, h: number) => {
    const r = random.current;
    s.x[i] = r() * w;
    s.y[i] = r() * h;
    s.px[i] = s.x[i] as number;
    s.py[i] = s.y[i] as number;
    s.life[i] = 2 + r() * 6;
  };
  const build = (frame: CanvasFrame) => {
    builtKey.current = shapeKey;
    random.current = mulberry32((Math.round(seed) || 1) * 2654435761);
    const count = Math.max(1, Math.round((density * frame.width * frame.height) / REFERENCE_AREA));
    const s: Swarm = {
      x: new Float32Array(count),
      y: new Float32Array(count),
      px: new Float32Array(count),
      py: new Float32Array(count),
      life: new Float32Array(count),
      color: new Uint8Array(count),
      count,
    };
    for (let i = 0; i < count; i++) {
      spawn(s, i, frame.width, frame.height);
      s.color[i] = i % list.length;
    }
    swarm.current = s;
    frame.ctx.clearRect(0, 0, frame.width, frame.height);
  };
  /** Advances every particle by `dt` seconds and strokes its segment, batched per color. */
  const step = (frame: CanvasFrame, dt: number, time: number) => {
    const { ctx, width: w, height: h } = frame;
    const s = swarm.current;
    const fills = palette(frame.color);
    const p = pointer.current;
    const swirl = interactive && !reduced && p.inside;
    const r2 = radius * radius;
    const velocity = 60 * rate;
    const z = time * 0.08 * morph;
    for (let i = 0; i < s.count; i++) {
      const x = s.x[i] as number;
      const y = s.y[i] as number;
      s.px[i] = x;
      s.py[i] = y;
      let angle = noise(x * scale, y * scale, z) * Math.PI * 2.4;
      if (swirl) {
        const dx = x - p.x;
        const dy = y - p.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < r2) {
          // Blend toward a tangent around the pointer: a vortex that fades out at the radius.
          const k = 1 - d2 / r2;
          const tangent = Math.atan2(dy, dx) + Math.PI / 2;
          const diff = Math.atan2(Math.sin(tangent - angle), Math.cos(tangent - angle));
          angle += diff * k * k;
        }
      }
      s.x[i] = x + Math.cos(angle) * velocity * dt;
      s.y[i] = y + Math.sin(angle) * velocity * dt;
      s.life[i] = (s.life[i] as number) - dt;
      const nx = s.x[i] as number;
      const ny = s.y[i] as number;
      if ((s.life[i] as number) <= 0 || nx < -4 || ny < -4 || nx > w + 4 || ny > h + 4) spawn(s, i, w, h);
    }
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.globalAlpha = alpha;
    for (let c = 0; c < list.length; c++) {
      ctx.strokeStyle = fills[c] ?? frame.color;
      ctx.beginPath();
      for (let i = c; i < s.count; i += list.length) {
        const x0 = s.px[i] as number;
        const y0 = s.py[i] as number;
        const x1 = s.x[i] as number;
        const y1 = s.y[i] as number;
        // Respawned particles jump; skip that segment.
        if (Math.abs(x1 - x0) > 20 || Math.abs(y1 - y0) > 20) continue;
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  };
  const fade = (frame: CanvasFrame, amount: number) => {
    const { ctx, width: w, height: h } = frame;
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = `rgba(0,0,0,${amount})`;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = "source-over";
  };
  const draw = (frame: CanvasFrame) => {
    if (builtKey.current !== shapeKey || swarm.current.count === 0) build(frame);
    if (reduced) {
      // One still artwork: trace every particle's path once, with no fade between steps.
      build(frame);
      for (let k = 0; k < 40; k++) step(frame, 1 / 30, 0);
      return;
    }
    fade(frame, fadeRate);
    step(frame, frame.delta || 1 / 60, frame.time);
  };
  useCanvasLoop(canvasRef, draw, {
    running: !reduced,
    fps: 60,
    onResize: build,
    redrawKey: `${shapeKey}|${scale}|${rate}|${width}|${alpha}|${list.join(",")}`,
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
