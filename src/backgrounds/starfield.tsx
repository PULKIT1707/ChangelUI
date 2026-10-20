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
export interface StarfieldProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Stars per square px (capped at 2000 stars). Default 0.0008. */
  density?: number;
  /** Cruise speed multiplier. Default 1. */
  speed?: number;
  /** Hyperspace: stars accelerate into streaks. Toggling it eases in and out. Default false. */
  warp?: boolean;
  /** Star color. Default the root's text color (`text-pui-foreground`). */
  color?: string;
  /** Color for about one star in six, and the streak heads in warp. Default `var(--pui-primary)`. */
  accentColor?: string;
  /** The pointer nudges the vanishing point (mouse and pen). Default true. */
  interactive?: boolean;
  /** Distant stars shimmer. Default true. */
  twinkle?: boolean;
  /** Default "none". */
  mask?: PatternMask;
}
interface Star {
  x: number;
  y: number;
  z: number;
  /** z the star had when it was last placed, used to fade it in. */
  z0: number;
  accent: boolean;
  phase: number;
}
const MAX_STARS = 2000;
const CRUISE = 0.06;
const WARP = 1.15;
/** `spread` is in focal units, so new stars land inside the (non-square) canvas. */
function place(star: Star, z: number, spread: { x: number; y: number }) {
  star.x = (Math.random() * 2 - 1) * spread.x;
  star.y = (Math.random() * 2 - 1) * spread.y;
  star.z = z;
  star.z0 = z;
  star.accent = Math.random() < 0.16;
  star.phase = Math.random() * Math.PI * 2;
}
/** A 3D starfield flying toward the viewer, with a hyperspace `warp` mode and pointer parallax. */
export const Starfield = React.forwardRef<HTMLDivElement, StarfieldProps>(function Starfield(
  {
    density = 0.0008,
    speed = 1,
    warp = false,
    color,
    accentColor = "var(--pui-primary)",
    interactive = true,
    twinkle = true,
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
  const palette = useCanvasPalette(rootRef, [color, accentColor]);
  const pointer = useCanvasPointer(rootRef, interactive && !reduced);
  const stars = React.useRef<Star[]>([]);
  const motion = React.useRef({ velocity: 0, vx: 0, vy: 0 });
  const spreadRef = React.useRef({ x: 1, y: 1 });
  const safeDensity = Math.min(Math.max(Number.isFinite(density) ? density : 0, 0), 0.01);
  const safeSpeed = Math.min(Math.max(Number.isFinite(speed) ? speed : 0, 0), 10);
  const fill = (frame: CanvasFrame) => {
    const focal = Math.max(frame.width, frame.height) * 0.55;
    const spread = spreadRef.current;
    spread.x = (frame.width / 2 / focal) * 1.15;
    spread.y = (frame.height / 2 / focal) * 1.15;
    const target = Math.min(MAX_STARS, Math.round(frame.width * frame.height * safeDensity));
    const list = stars.current;
    while (list.length < target) {
      const star: Star = { x: 0, y: 0, z: 1, z0: 1, accent: false, phase: 0 };
      place(star, 0.05 + Math.random() * 0.95, spread);
      star.z0 = 2; // already visible: no fade-in for the first frame
      list.push(star);
    }
    list.length = target;
  };
  const draw = (frame: CanvasFrame) => {
    const { ctx, width, height, delta, time } = frame;
    if (stars.current.length === 0) fill(frame);
    const [starColor = frame.color, accent = frame.color] = palette(frame.color);
    const m = motion.current;
    const goal = reduced ? 0 : warp ? WARP * Math.max(1, safeSpeed) : CRUISE * safeSpeed;
    // Ease toward the target so warp spools up and down instead of snapping.
    m.velocity += (goal - m.velocity) * (1 - Math.exp(-delta * (warp ? 1.4 : 2.2)));
    const p = pointer.current;
    const tx = p.inside ? (p.x / width - 0.5) * 0.35 : 0;
    const ty = p.inside ? (p.y / height - 0.5) * 0.35 : 0;
    m.vx += (tx - m.vx) * (1 - Math.exp(-delta * 3));
    m.vy += (ty - m.vy) * (1 - Math.exp(-delta * 3));
    const cx = width * (0.5 - m.vx);
    const cy = height * (0.5 - m.vy);
    const focal = Math.max(width, height) * 0.55;
    const streak = Math.min(m.velocity * 0.09, 0.5);
    const streaking = streak > 0.012;
    ctx.clearRect(0, 0, width, height);
    ctx.lineCap = "round";
    for (const star of stars.current) {
      star.z -= m.velocity * delta;
      if (star.z <= 0.02) place(star, 1, spreadRef.current);
      const inv = 1 / star.z;
      const sx = cx + star.x * focal * inv;
      const sy = cy + star.y * focal * inv;
      if (sx < -40 || sx > width + 40 || sy < -40 || sy > height + 40) {
        place(star, 1, spreadRef.current);
        continue;
      }
      const near = 1 - star.z;
      const fadeIn = Math.min(1, (star.z0 - star.z) * 6);
      let alpha = Math.min(1, near * 1.5 + 0.08) * fadeIn;
      if (twinkle && !reduced && star.z > 0.5) alpha *= 0.65 + 0.35 * Math.sin(time * 3 + star.phase);
      if (alpha <= 0.01) continue;
      const radius = 0.35 + near * near * 1.9;
      ctx.globalAlpha = alpha;
      const c = star.accent ? accent : starColor;
      if (streaking) {
        const tz = star.z + streak;
        const px = cx + (star.x * focal) / tz;
        const py = cy + (star.y * focal) / tz;
        ctx.strokeStyle = c;
        ctx.lineWidth = Math.max(0.6, radius * 1.4);
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(sx, sy);
        ctx.stroke();
      } else {
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.arc(sx, sy, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  };
  useCanvasLoop(canvasRef, draw, {
    running: !reduced,
    onResize: (frame) => {
      stars.current = [];
      fill(frame);
    },
  });
  return (
    <div
      ref={mergedRef}
      aria-hidden="true"
      data-mask={mask}
      data-warp={warp ? "" : undefined}
      data-state={reduced ? "static" : "animated"}
      {...props}
      className={cn(blockReset, backgroundBase, "overflow-hidden text-pui-foreground", patternMasks[mask], className)}
    >
      <canvas ref={canvasRef} className={cn(blockReset, "absolute inset-0 block size-full")} />
    </div>
  );
});
