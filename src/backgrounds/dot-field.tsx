"use client";
import * as React from "react";
import { backgroundBase, patternMasks } from "../lib/backgrounds";
import { useCanvasLoop, type CanvasFrame } from "../lib/canvas-loop";
import { useCanvasPalette } from "../lib/canvas-palette";
import { useCanvasPointer } from "../lib/canvas-pointer";
import { cn } from "../lib/cn";
import { mergeRefs } from "../lib/compose";
import { blockReset } from "../lib/styles";
import type { PatternMask } from "../lib/types";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";
export type DotFieldMode = "repel" | "attract" | "glow";
export interface DotFieldProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Distance between dots in px (8..80). Default 24. */
  spacing?: number;
  /** Dot diameter in px (1..12). Default 2.5. */
  dotSize?: number;
  /** Pointer influence radius in px. Default 120. */
  radius?: number;
  /** "repel" pushes dots away, "attract" pulls them in, "glow" only lights them. Default "repel". */
  mode?: DotFieldMode;
  /** Push strength multiplier (0..4). Default 1. */
  strength?: number;
  /** Clicks and taps send a ripple ring through the field. Default true. */
  clickRipple?: boolean;
  /** A slow diagonal shimmer passes over the dots while idle. Default true. */
  ambient?: boolean;
  /** Resting dot color. Default the root's text color (`text-pui-muted-foreground`). */
  color?: string;
  /** Color of dots lit by the pointer or a ripple. Default `var(--pui-primary)`. */
  activeColor?: string;
  /** Resting dot opacity (0..1). Default 0.45. */
  opacity?: number;
  /** Default "none". */
  mask?: PatternMask;
}
const STIFFNESS = 0.08;
const DAMPING = 0.85;
const RIPPLE_SPEED = 600;
const RIPPLE_BAND = 46;
const LEVELS = 8;
const clamp = (v: number, min: number, max: number) => Math.min(Math.max(Number.isFinite(v) ? v : min, min), max);
interface Field {
  count: number;
  hx: Float32Array;
  hy: Float32Array;
  ox: Float32Array;
  oy: Float32Array;
  vx: Float32Array;
  vy: Float32Array;
  lit: Float32Array;
}
interface Ripple {
  x: number;
  y: number;
  r: number;
  max: number;
}
const emptyField: Field = {
  count: 0,
  hx: new Float32Array(0),
  hy: new Float32Array(0),
  ox: new Float32Array(0),
  oy: new Float32Array(0),
  vx: new Float32Array(0),
  vy: new Float32Array(0),
  lit: new Float32Array(0),
};
/**
 * An interactive dot grid: dots spring away from (or toward) the pointer, light up near it, and a
 * click sends a ripple ring rolling through the field.
 */
export const DotField = React.forwardRef<HTMLDivElement, DotFieldProps>(function DotField(
  {
    spacing = 24,
    dotSize = 2.5,
    radius = 120,
    mode = "repel",
    strength = 1,
    clickRipple = true,
    ambient = true,
    color,
    activeColor = "var(--pui-primary)",
    opacity = 0.45,
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
  const palette = useCanvasPalette(rootRef, [color, activeColor]);
  const live = !reduced;
  const pointer = useCanvasPointer(rootRef, live);
  const field = React.useRef<Field>(emptyField);
  const ripples = React.useRef<Ripple[]>([]);
  const pitch = clamp(spacing, 8, 80);
  const size = clamp(dotSize, 1, 12);
  const push = clamp(strength, 0, 4);
  const rest = clamp(opacity, 0, 1);
  const builtKey = React.useRef(0);
  React.useEffect(() => {
    const el = rootRef.current;
    if (!live || !clickRipple || !el) return;
    // The field is pointer-events: none, so listen on window and keep presses inside its box.
    const onDown = (event: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      if (x < 0 || y < 0 || x > rect.width || y > rect.height) return;
      const max = Math.hypot(Math.max(x, rect.width - x), Math.max(y, rect.height - y)) + RIPPLE_BAND;
      ripples.current = [...ripples.current.slice(-4), { x, y, r: 0, max }];
    };
    window.addEventListener("pointerdown", onDown, { passive: true });
    return () => window.removeEventListener("pointerdown", onDown);
  }, [live, clickRipple]);
  const build = (frame: CanvasFrame) => {
    builtKey.current = pitch;
    const cols = Math.ceil(frame.width / pitch) + 1;
    const rows = Math.ceil(frame.height / pitch) + 1;
    // Center the lattice so the margins match on both sides.
    const offX = (frame.width - (cols - 1) * pitch) / 2;
    const offY = (frame.height - (rows - 1) * pitch) / 2;
    const count = cols * rows;
    const f: Field = {
      count,
      hx: new Float32Array(count),
      hy: new Float32Array(count),
      ox: new Float32Array(count),
      oy: new Float32Array(count),
      vx: new Float32Array(count),
      vy: new Float32Array(count),
      lit: new Float32Array(count),
    };
    for (let i = 0; i < count; i++) {
      f.hx[i] = offX + (i % cols) * pitch;
      f.hy[i] = offY + Math.floor(i / cols) * pitch;
    }
    field.current = f;
  };
  const draw = (frame: CanvasFrame) => {
    if (builtKey.current !== pitch || field.current.count === 0) build(frame);
    const { ctx, width: w, height: h, delta, time } = frame;
    const f = field.current;
    const [base = frame.color, accent = frame.color] = palette(frame.color);
    const steps = live ? Math.min(delta * 60, 3) : 0;
    const p = pointer.current;
    const near = live && p.inside;
    const r2 = radius * radius;
    const damping = Math.pow(DAMPING, steps);
    const list = ripples.current;
    for (const ripple of list) ripple.r += RIPPLE_SPEED * delta;
    if (list.length && list.some((ripple) => ripple.r > ripple.max)) ripples.current = list.filter((ripple) => ripple.r <= ripple.max);
    const buckets: number[][] = Array.from({ length: LEVELS * 2 }, () => []);
    for (let i = 0; i < f.count; i++) {
      const hx = f.hx[i] as number;
      const hy = f.hy[i] as number;
      let ox = f.ox[i] as number;
      let oy = f.oy[i] as number;
      let vx = f.vx[i] as number;
      let vy = f.vy[i] as number;
      let target = 0;
      if (steps > 0) {
        if (near) {
          const dx = hx + ox - p.x;
          const dy = hy + oy - p.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < r2) {
            const d = Math.sqrt(d2) || 1;
            const k = 1 - d / radius;
            target = k;
            if (mode !== "glow") {
              const dir = mode === "repel" ? 1 : -1;
              const force = k * k * 2.2 * push * dir * steps;
              vx += (dx / d) * force;
              vy += (dy / d) * force;
            }
          }
        }
        for (const ripple of list) {
          const dx = hx - ripple.x;
          const dy = hy - ripple.y;
          const d = Math.sqrt(dx * dx + dy * dy) || 1;
          const gap = Math.abs(d - ripple.r);
          if (gap < RIPPLE_BAND) {
            // The ring fades as it travels out.
            const k = (1 - gap / RIPPLE_BAND) * (1 - ripple.r / ripple.max);
            target = Math.max(target, k);
            const force = k * 1.4 * push * steps;
            vx += (dx / d) * force;
            vy += (dy / d) * force;
          }
        }
        // Spring home: stiffness 0.08 and damping 0.85 per 60 fps frame.
        vx += -ox * STIFFNESS * steps;
        vy += -oy * STIFFNESS * steps;
        vx *= damping;
        vy *= damping;
        ox += vx * steps;
        oy += vy * steps;
        f.ox[i] = ox;
        f.oy[i] = oy;
        f.vx[i] = vx;
        f.vy[i] = vy;
      }
      const lit = f.lit[i] as number;
      const next = live ? lit + (target - lit) * Math.min(1, delta * (target > lit ? 18 : 3.5)) : 0;
      f.lit[i] = next;
      let alpha = rest;
      if (ambient && live) alpha *= 0.75 + 0.25 * Math.sin(time * 1.1 - (hx + hy) * 0.008);
      alpha += next * (1 - alpha);
      if (alpha < 0.02) continue;
      const level = Math.min(LEVELS - 1, Math.round(alpha * (LEVELS - 1)));
      buckets[(next > 0.18 ? LEVELS : 0) + level]?.push(i);
    }
    ctx.clearRect(0, 0, w, h);
    for (let b = 0; b < buckets.length; b++) {
      const dots = buckets[b];
      if (!dots || dots.length === 0) continue;
      const active = b >= LEVELS;
      ctx.globalAlpha = (b % LEVELS) / (LEVELS - 1);
      ctx.fillStyle = active ? accent : base;
      ctx.beginPath();
      for (const i of dots) {
        const r = (size / 2) * (1 + (f.lit[i] as number) * 0.9);
        const x = (f.hx[i] as number) + (f.ox[i] as number);
        const y = (f.hy[i] as number) + (f.oy[i] as number);
        ctx.moveTo(x + r, y);
        ctx.arc(x, y, r, 0, Math.PI * 2);
      }
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  };
  useCanvasLoop(canvasRef, draw, {
    running: live,
    fps: 60,
    onResize: build,
    redrawKey: `${pitch}|${size}|${rest}|${color}|${activeColor}`,
  });
  return (
    <div
      ref={mergedRef}
      aria-hidden="true"
      data-mask={mask}
      data-mode={mode}
      data-state={live ? "animated" : "static"}
      {...props}
      className={cn(blockReset, backgroundBase, "overflow-hidden text-pui-muted-foreground", patternMasks[mask], className)}
    >
      <canvas ref={canvasRef} className={cn(blockReset, "absolute inset-0 block size-full")} />
    </div>
  );
});
