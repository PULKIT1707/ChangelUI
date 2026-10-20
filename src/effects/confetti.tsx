"use client";

import * as React from "react";
import { Button, type ButtonProps } from "../components/button";
import { cn } from "../lib/cn";
import { mergeRefs } from "../lib/compose";
import { prefersReducedMotion, resolveCssColors } from "../lib/css-color";
import { blockReset } from "../lib/styles";
import { useLatestRef } from "../lib/use-latest-ref";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export type ConfettiShape = "square" | "circle" | "star" | "ribbon";

export interface ConfettiOptions {
  /** Viewport fractions ({ x: 0.5, y: 0.6 }) or an element whose center is the origin. Default { x: 0.5, y: 0.6 }. */
  origin?: { x: number; y: number } | Element | null;
  /** Pieces. Default 120. */
  count?: number;
  /** Cone width in degrees. Default 70. */
  spread?: number;
  /** Launch direction in degrees, 90 = straight up, 0 = right. Default 90. */
  angle?: number;
  /** Launch speed in px per frame (60 fps). Default 38. */
  startVelocity?: number;
  /** Velocity kept per frame (air drag). Default 0.92. */
  decay?: number;
  /** Gravity multiplier. Default 1. */
  gravity?: number;
  /** Sideways wind in px per frame. Default 0. */
  drift?: number;
  /** CSS colors, tokens allowed. Default the chart palette + primary. */
  colors?: readonly string[];
  /** Default ["square", "ribbon", "circle"]. */
  shapes?: readonly ConfettiShape[];
  /** Emoji or short text pieces, used instead of shapes when set. */
  emojis?: readonly string[];
  /** Size multiplier. Default 1. */
  scalar?: number;
  /** Lifetime in frames at 60 fps. Default 200. */
  ticks?: number;
  /** No 3D flutter: pieces stay face-on. Default false. */
  flat?: boolean;
  /** Skip under prefers-reduced-motion (the promise still resolves). Default true. */
  disableForReducedMotion?: boolean;
}

export interface FireworksOptions extends Omit<ConfettiOptions, "origin" | "angle" | "spread"> {
  /** Total show length. Default 2500. */
  durationMs?: number;
  /** Gap between shells. Default 260. */
  intervalMs?: number;
}

interface Piece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  drift: number;
  decay: number;
  gravity: number;
  wobble: number;
  wobbleSpeed: number;
  tilt: number;
  tiltSpeed: number;
  rotate: number;
  spin: number;
  size: number;
  color: string;
  shape: ConfettiShape;
  emoji: string | null;
  flat: boolean;
  life: number;
  maxLife: number;
  group: number;
}

const DEFAULT_COLORS = [
  "var(--pui-chart-1)",
  "var(--pui-chart-2)",
  "var(--pui-chart-3)",
  "var(--pui-chart-4)",
  "var(--pui-chart-5)",
  "var(--pui-primary)",
] as const;
const DEFAULT_SHAPES: readonly ConfettiShape[] = ["square", "ribbon", "circle"];
const MAX_PIECES = 1500;

// One shared overlay canvas for every call; it is created on demand and removed when idle.
const engine = {
  canvas: null as HTMLCanvasElement | null,
  ctx: null as CanvasRenderingContext2D | null,
  pieces: [] as Piece[],
  frame: 0,
  last: 0,
  nextGroup: 1,
  groups: new Map<number, { left: number; resolve: () => void }>(),
  timers: new Set<ReturnType<typeof setTimeout>>(),
};

function ensureCanvas(): CanvasRenderingContext2D | null {
  if (engine.ctx && engine.canvas?.isConnected) return engine.ctx;
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  canvas.dataset.puiConfetti = "";
  Object.assign(canvas.style, { position: "fixed", inset: "0", width: "100%", height: "100%", pointerEvents: "none" });
  canvas.style.setProperty("z-index", "var(--pui-z-cursor, 90)");
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    canvas.remove();
    return null;
  }
  engine.canvas = canvas;
  engine.ctx = ctx;
  sizeCanvas();
  window.addEventListener("resize", sizeCanvas);
  return ctx;
}

function sizeCanvas() {
  const { canvas, ctx } = engine;
  if (!canvas || !ctx) return;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function teardown() {
  if (engine.frame) cancelAnimationFrame(engine.frame);
  engine.frame = 0;
  engine.last = 0;
  window.removeEventListener("resize", sizeCanvas);
  engine.canvas?.remove();
  engine.canvas = null;
  engine.ctx = null;
}

function settle(piece: Piece) {
  const group = engine.groups.get(piece.group);
  if (!group) return;
  group.left -= 1;
  if (group.left <= 0) {
    engine.groups.delete(piece.group);
    group.resolve();
  }
}

function starPath(ctx: CanvasRenderingContext2D, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? r : r * 0.45;
    const a = (i * Math.PI) / 5 - Math.PI / 2;
    ctx.lineTo(Math.cos(a) * radius, Math.sin(a) * radius);
  }
  ctx.closePath();
}

function drawPiece(ctx: CanvasRenderingContext2D, p: Piece, alpha: number) {
  const flutter = p.flat ? 0 : Math.cos(p.wobble) * p.size * 0.6;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(p.x + flutter, p.y);
  ctx.rotate(p.rotate);
  if (!p.flat) ctx.scale(1, Math.max(0.12, Math.abs(Math.cos(p.tilt))));
  ctx.fillStyle = p.color;
  const s = p.size;
  if (p.emoji) {
    ctx.font = `${s * 2.2}px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(p.emoji, 0, 0);
  } else if (p.shape === "circle") {
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.45, 0, Math.PI * 2);
    ctx.fill();
  } else if (p.shape === "star") {
    starPath(ctx, s * 0.7);
    ctx.fill();
  } else if (p.shape === "ribbon") {
    ctx.fillRect(-s * 0.18, -s * 0.85, s * 0.36, s * 1.7);
  } else {
    ctx.fillRect(-s / 2, -s * 0.35, s, s * 0.7);
  }
  ctx.restore();
}

function tick(now: number) {
  const ctx = engine.ctx;
  if (!ctx) return;
  const k = engine.last ? Math.min((now - engine.last) / (1000 / 60), 3) : 1;
  engine.last = now;
  const width = window.innerWidth;
  const height = window.innerHeight;
  ctx.clearRect(0, 0, width, height);
  const alive: Piece[] = [];
  for (const p of engine.pieces) {
    p.life += k;
    const keep = Math.pow(p.decay, k);
    p.vx *= keep;
    p.vy = p.vy * keep + 0.6 * p.gravity * k;
    p.x += (p.vx + p.drift) * k;
    p.y += p.vy * k;
    p.wobble += p.wobbleSpeed * k;
    p.tilt += p.tiltSpeed * k;
    p.rotate += p.spin * k;
    const progress = p.life / p.maxLife;
    if (progress >= 1 || p.y > height + 60) {
      settle(p);
      continue;
    }
    // Fade over the last 30% of the lifetime.
    drawPiece(ctx, p, progress > 0.7 ? 1 - (progress - 0.7) / 0.3 : 1);
    alive.push(p);
  }
  engine.pieces = alive;
  if (alive.length === 0 && engine.timers.size === 0) {
    teardown();
    return;
  }
  engine.frame = requestAnimationFrame(tick);
}

function originPoint(origin: ConfettiOptions["origin"]): { x: number; y: number; host: Element } {
  if (origin && typeof (origin as Element).getBoundingClientRect === "function") {
    const el = origin as Element;
    const rect = el.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, host: el };
  }
  const point = (origin as { x: number; y: number } | null | undefined) ?? { x: 0.5, y: 0.6 };
  return { x: point.x * window.innerWidth, y: point.y * window.innerHeight, host: document.body };
}

/**
 * Fires a burst of canvas confetti on a shared full-screen overlay (no dependencies, no DOM until
 * called). Resolves when the last piece of this burst has landed or faded.
 */
export function confetti(options: ConfettiOptions = {}): Promise<void> {
  if (typeof window === "undefined" || typeof document === "undefined") return Promise.resolve();
  const {
    origin,
    count = 120,
    spread = 70,
    angle = 90,
    startVelocity = 38,
    decay = 0.92,
    gravity = 1,
    drift = 0,
    colors = DEFAULT_COLORS,
    shapes = DEFAULT_SHAPES,
    emojis,
    scalar = 1,
    ticks = 200,
    flat = false,
    disableForReducedMotion = true,
  } = options;
  if ((disableForReducedMotion && prefersReducedMotion()) || count <= 0) return Promise.resolve();
  const ctx = ensureCanvas();
  if (!ctx) return Promise.resolve();
  const { x, y, host } = originPoint(origin);
  const palette = resolveCssColors(host, colors.length ? colors : DEFAULT_COLORS);
  const room = Math.max(0, MAX_PIECES - engine.pieces.length);
  const total = Math.min(Math.round(count), room);
  if (total === 0) return Promise.resolve();
  const group = engine.nextGroup++;
  const promise = new Promise<void>((resolve) => engine.groups.set(group, { left: total, resolve }));
  for (let i = 0; i < total; i++) {
    const direction = ((angle + (Math.random() - 0.5) * spread) * Math.PI) / 180;
    const speed = startVelocity * (0.5 + Math.random() * 0.5);
    engine.pieces.push({
      x,
      y,
      vx: Math.cos(direction) * speed,
      vy: -Math.sin(direction) * speed,
      drift,
      decay,
      gravity,
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.05 + Math.random() * 0.06,
      tilt: Math.random() * Math.PI,
      tiltSpeed: 0.08 + Math.random() * 0.12,
      rotate: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.2,
      size: (6 + Math.random() * 5) * scalar,
      color: palette[i % palette.length] ?? "currentColor",
      shape: shapes[Math.floor(Math.random() * shapes.length)] ?? "square",
      emoji: emojis?.length ? (emojis[Math.floor(Math.random() * emojis.length)] ?? null) : null,
      flat: flat || Boolean(emojis?.length),
      life: 0,
      maxLife: ticks * (0.8 + Math.random() * 0.4),
      group,
    });
  }
  if (!engine.frame) engine.frame = requestAnimationFrame(tick);
  return promise;
}

/** A short fireworks show: round shells bursting at random points in the upper half of the screen. */
export function fireworks(options: FireworksOptions = {}): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  const { durationMs = 2500, intervalMs = 260, count = 46, disableForReducedMotion = true, ...rest } = options;
  if (disableForReducedMotion && prefersReducedMotion()) return Promise.resolve();
  const shells = Math.max(1, Math.floor(durationMs / Math.max(intervalMs, 16)));
  const bursts: Promise<void>[] = [];
  return new Promise<void>((resolve) => {
    let fired = 0;
    const launch = () => {
      bursts.push(
        confetti({
          startVelocity: 20,
          decay: 0.935,
          gravity: 0.55,
          ticks: 110,
          shapes: ["circle", "star"],
          flat: true,
          scalar: 0.8,
          ...rest,
          count,
          spread: 360,
          angle: 90,
          disableForReducedMotion: false,
          origin: { x: 0.12 + Math.random() * 0.76, y: 0.12 + Math.random() * 0.36 },
        }),
      );
      fired += 1;
      if (fired < shells) {
        const timer = setTimeout(() => {
          engine.timers.delete(timer);
          launch();
        }, intervalMs);
        engine.timers.add(timer);
      } else {
        void Promise.all(bursts).then(() => resolve());
      }
    };
    launch();
  });
}

/** Clears every piece and pending fireworks shell and removes the overlay. Pending promises resolve. */
export function resetConfetti(): void {
  if (typeof window === "undefined") return;
  for (const timer of engine.timers) clearTimeout(timer);
  engine.timers.clear();
  engine.pieces = [];
  for (const group of engine.groups.values()) group.resolve();
  engine.groups.clear();
  teardown();
}

/** Options for the declarative wrappers: a burst, or a fireworks show when effect="fireworks". */
export type ConfettiTriggerOptions = ConfettiOptions & Pick<FireworksOptions, "durationMs" | "intervalMs">;

export interface ConfettiProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Fires whenever this value changes after mount (null, undefined and false don't fire). */
  trigger?: unknown;
  /** Burst options (plus durationMs/intervalMs for fireworks); the origin defaults to this element's center. */
  options?: ConfettiTriggerOptions;
  /** "burst" (default) or a "fireworks" show. */
  effect?: "burst" | "fireworks";
  /** Called when the burst has finished (immediately under reduced motion). */
  onComplete?: () => void;
}

/**
 * Declarative confetti: wrap the thing that celebrates and change `trigger` (a counter, a status, a
 * boolean) to fire from its center.
 */
export const Confetti = React.forwardRef<HTMLDivElement, ConfettiProps>(function Confetti(
  { trigger, options, effect = "burst", onComplete, className, ...props },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const localRef = React.useRef<HTMLDivElement | null>(null);
  const previous = React.useRef(trigger);
  const optionsRef = useLatestRef(options);
  const completeRef = useLatestRef(onComplete);
  React.useEffect(() => {
    if (Object.is(previous.current, trigger)) return;
    previous.current = trigger;
    if (trigger == null || trigger === false) return;
    const done = () => completeRef.current?.();
    if (reduced) {
      done();
      return;
    }
    const opts = { ...optionsRef.current, disableForReducedMotion: false };
    if (effect === "fireworks") void fireworks(opts).then(done);
    else void confetti({ origin: localRef.current, ...opts }).then(done);
  }, [trigger, reduced, effect, optionsRef, completeRef]);
  return (
    <div
      ref={mergeRefs(localRef, ref)}
      data-state={reduced ? "static" : "animated"}
      {...props}
      className={cn(blockReset, "inline-block", className)}
    />
  );
});

export interface ConfettiButtonProps extends Omit<ButtonProps, "asChild"> {
  /** Burst options (plus durationMs/intervalMs for fireworks); the origin defaults to the button's center. */
  options?: ConfettiTriggerOptions;
  /** "burst" (default) or a "fireworks" show. */
  effect?: "burst" | "fireworks";
  /** Called when the burst has finished (immediately under reduced motion). */
  onConfettiComplete?: () => void;
}

/** A Button that celebrates every click with confetti from its own center. */
export const ConfettiButton = React.forwardRef<HTMLButtonElement, ConfettiButtonProps>(function ConfettiButton(
  { options, effect = "burst", onConfettiComplete, onClick, ...props },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    if (event.defaultPrevented) return;
    const done = () => onConfettiComplete?.();
    if (reduced) {
      done();
      return;
    }
    const opts = { ...options, disableForReducedMotion: false };
    if (effect === "fireworks") void fireworks(opts).then(done);
    else void confetti({ origin: event.currentTarget, spread: 80, startVelocity: 32, count: 90, ...opts }).then(done);
  };
  return <Button ref={ref} {...props} onClick={handleClick} />;
});
