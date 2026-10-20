"use client";

import * as React from "react";
import { cn } from "../lib/cn";
import { mergeRefs } from "../lib/compose";
import { observeTheme, resolveCssColors } from "../lib/css-color";
import { blockReset } from "../lib/styles";
import { useLatestRef } from "../lib/use-latest-ref";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export type CursorTrailVariant = "ribbon" | "dots" | "sparkle";

export interface CursorTrailProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Default "ribbon". */
  variant?: CursorTrailVariant;
  /** Points in the trail. Default 24. */
  length?: number;
  /** CSS colors blended along the trail, tokens allowed. Default the gradient tokens. */
  colors?: readonly string[];
  /** Head thickness in px. Default 10. */
  size?: number;
  /** How quickly the head follows the pointer, 0-1. Default 0.35. */
  smoothing?: number;
  /** Track the pointer over the whole page instead of this element. Default false. */
  global?: boolean;
  /** Fade out after the pointer rests this long. Default 600. */
  idleMs?: number;
  /** Additive "lighter" blending, for glowing trails on dark surfaces. Default false. */
  glow?: boolean;
  disabled?: boolean;
}

interface Point {
  x: number;
  y: number;
}

interface Sparkle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: number;
}

const DEFAULT_COLORS = ["var(--pui-gradient-1)", "var(--pui-gradient-2)", "var(--pui-gradient-3)"] as const;

function sparklePath(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.closePath();
}

/**
 * A canvas trail (tapered ribbon, dots or sparkles) that follows the pointer over its children or
 * the whole page. It never hides the native cursor, stops its loop when idle, ignores touch and is
 * off under reduced motion.
 */
export const CursorTrail = React.forwardRef<HTMLDivElement, CursorTrailProps>(function CursorTrail(
  {
    variant = "ribbon",
    length = 24,
    colors = DEFAULT_COLORS,
    size = 10,
    smoothing = 0.35,
    global = false,
    idleMs = 600,
    glow = false,
    disabled = false,
    className,
    children,
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const active = !reduced && !disabled;
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const settings = useLatestRef({ variant, length, size, smoothing, idleMs, glow });
  const colorKey = colors.join("|");
  const colorsRef = useLatestRef(colors);

  React.useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!active || !root || !canvas || !ctx) return;
    let palette = resolveCssColors(root, colorsRef.current);
    const stopTheme = observeTheme(() => {
      palette = resolveCssColors(root, colorsRef.current);
    });
    let width = 0;
    let height = 0;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      width = global ? window.innerWidth : root.clientWidth;
      height = global ? window.innerHeight : root.clientHeight;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(root);
    if (global) window.addEventListener("resize", resize);

    let points: Point[] = [];
    let sparkles: Sparkle[] = [];
    let target: Point | null = null;
    let lastMove = 0;
    let alpha = 0;
    let frame = 0;
    let last = 0;
    let hue = 0;

    const mix = (t: number) => palette[Math.min(palette.length - 1, Math.floor(t * palette.length))] ?? "currentColor";

    const draw = (now: number) => {
      const s = settings.current;
      const k = last ? Math.min((now - last) / (1000 / 60), 3) : 1;
      last = now;
      const idle = now - lastMove > s.idleMs;
      alpha = idle || !target ? Math.max(0, alpha - 0.06 * k) : Math.min(1, alpha + 0.2 * k);
      ctx.clearRect(0, 0, width, height);
      if (target) {
        const n = Math.max(2, Math.round(s.length));
        if (points.length !== n) points = Array.from({ length: n }, (_, i) => points[i] ?? { ...target! });
        const lerp = 1 - Math.pow(1 - Math.min(Math.max(s.smoothing, 0.02), 1), k);
        const head = points[0]!;
        head.x += (target.x - head.x) * lerp;
        head.y += (target.y - head.y) * lerp;
        for (let i = 1; i < points.length; i++) {
          const p = points[i]!;
          const prev = points[i - 1]!;
          const follow = 1 - Math.pow(0.45, k);
          p.x += (prev.x - p.x) * follow;
          p.y += (prev.y - p.y) * follow;
        }
        if (s.variant === "sparkle" && !idle) {
          const tail = points[1]!;
          const speed = Math.hypot(head.x - tail.x, head.y - tail.y);
          const spawn = Math.min(3, speed / 6);
          for (let i = 0; i < spawn; i++) {
            hue = (hue + 1) % 997;
            sparkles.push({
              x: head.x + (Math.random() - 0.5) * s.size,
              y: head.y + (Math.random() - 0.5) * s.size,
              vx: (Math.random() - 0.5) * 1.2,
              vy: Math.random() * 0.8 + 0.2,
              life: 0,
              max: 28 + Math.random() * 24,
              size: s.size * (0.35 + Math.random() * 0.45),
              color: hue,
            });
          }
          if (sparkles.length > 160) sparkles = sparkles.slice(-160);
        }
      }
      ctx.globalCompositeOperation = s.glow ? "lighter" : "source-over";
      if (points.length > 1 && alpha > 0) {
        const n = points.length;
        if (s.variant === "ribbon") {
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          for (let i = 0; i < n - 1; i++) {
            const t = i / (n - 1);
            const a = points[i]!;
            const b = points[i + 1]!;
            ctx.globalAlpha = alpha * (1 - t) ** 1.2;
            ctx.strokeStyle = mix(t);
            ctx.lineWidth = Math.max(0.5, s.size * (1 - t));
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        } else if (s.variant === "dots") {
          for (let i = n - 1; i >= 0; i -= 1) {
            const t = i / (n - 1);
            const p = points[i]!;
            ctx.globalAlpha = alpha * (1 - t * 0.85);
            ctx.fillStyle = mix(t);
            ctx.beginPath();
            ctx.arc(p.x, p.y, Math.max(0.6, (s.size / 2) * (1 - t * 0.8)), 0, Math.PI * 2);
            ctx.fill();
          }
        } else {
          const head = points[0]!;
          ctx.globalAlpha = alpha;
          ctx.fillStyle = mix(0);
          sparklePath(ctx, head.x, head.y, s.size * 0.8);
          ctx.fill();
        }
      }
      if (sparkles.length) {
        const alive: Sparkle[] = [];
        for (const p of sparkles) {
          p.life += k;
          if (p.life >= p.max) continue;
          p.x += p.vx * k;
          p.y += p.vy * k;
          const t = p.life / p.max;
          ctx.globalAlpha = (1 - t) * Math.max(alpha, 0.35);
          ctx.fillStyle = palette[p.color % palette.length] ?? "currentColor";
          sparklePath(ctx, p.x, p.y, p.size * (1 - t * 0.6));
          ctx.fill();
          alive.push(p);
        }
        sparkles = alive;
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      if (alpha <= 0 && sparkles.length === 0 && (idle || !target)) {
        frame = 0;
        last = 0;
        points = [];
        ctx.clearRect(0, 0, width, height);
        return;
      }
      frame = requestAnimationFrame(draw);
    };

    const wake = () => {
      if (!frame) frame = requestAnimationFrame(draw);
    };
    const move = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      const rect = global ? { left: 0, top: 0 } : root.getBoundingClientRect();
      target = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      lastMove = performance.now();
      wake();
    };
    const leave = () => {
      target = null;
      wake();
    };
    const source: HTMLElement | Window = global ? window : root;
    source.addEventListener("pointermove", move as EventListener, { passive: true });
    if (global) document.documentElement.addEventListener("pointerleave", leave);
    else root.addEventListener("pointerleave", leave);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      observer.disconnect();
      stopTheme();
      source.removeEventListener("pointermove", move as EventListener);
      if (global) {
        window.removeEventListener("resize", resize);
        document.documentElement.removeEventListener("pointerleave", leave);
      } else root.removeEventListener("pointerleave", leave);
    };
  }, [active, global, colorKey, settings, colorsRef]);

  return (
    <div
      ref={mergeRefs(rootRef, ref)}
      data-state={active ? "active" : "static"}
      {...props}
      className={cn(blockReset, global ? "contents" : "relative", className)}
    >
      {children}
      {active ? (
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          data-pui-cursor-trail=""
          className={cn(
            blockReset,
            "pointer-events-none",
            global ? "fixed inset-0 z-(--pui-z-cursor) h-dvh w-screen" : "absolute inset-0 z-10 size-full",
          )}
        />
      ) : null}
    </div>
  );
});
