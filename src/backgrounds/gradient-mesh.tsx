"use client";
import { motion, useSpring } from "motion/react";
import * as React from "react";
import { backgroundBase, patternMasks } from "../lib/backgrounds";
import { cn } from "../lib/cn";
import { mergeRefs } from "../lib/compose";
import { djb2 } from "../lib/ids";
import { springs } from "../lib/motion";
import { mulberry32 } from "../lib/random";
import { blockReset } from "../lib/styles";
import type { PatternMask } from "../lib/types";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";
export interface GradientMeshProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Blob colors (4–6 read best; cycled when fewer than `blobs`). Default the gradient + aurora tokens. */
  colors?: string[];
  /** Number of color blobs (2..8). Default 5. */
  blobs?: number;
  /** Speed multiplier; each blob drifts over about 20s at 1. Default 1. */
  speed?: number;
  /** Softness in px. Default 60. */
  blur?: number;
  /** Fill under the blobs. Default transparent (the parent's surface). */
  baseColor?: string;
  /** Animate the blobs. false renders the cheap static CSS mesh (see `gradientMeshBackground`). Default true. */
  animate?: boolean;
  /** A highlight blob that springs after the pointer (mouse and pen). Default false. */
  followPointer?: boolean;
  /** Color of the pointer blob. Default `var(--pui-primary)`. */
  pointerColor?: string;
  /** Layout seed. Default: derived from the instance id (stable across SSR and hydration). */
  seed?: number;
  /** Default "none". */
  mask?: PatternMask;
}
export interface GradientMeshBackgroundOptions {
  colors?: string[];
  blobs?: number;
  seed?: number;
  /** A color under the blobs. Default none. */
  baseColor?: string;
}
const DEFAULT_COLORS = [
  "var(--pui-gradient-1)",
  "var(--pui-gradient-2)",
  "var(--pui-gradient-3)",
  "var(--pui-aurora-1)",
  "var(--pui-aurora-2)",
];
const clamp = (v: number, min: number, max: number) => Math.min(Math.max(Number.isFinite(v) ? v : min, min), max);
interface MeshBlob {
  x: number;
  y: number;
  size: number;
  dx: number;
  dy: number;
  s0: number;
  s1: number;
  duration: number;
  phase: number;
  color: string;
}
function meshLayout(count: number, seed: number, colors: readonly string[]): MeshBlob[] {
  const random = mulberry32(seed);
  const palette = colors.length ? colors : DEFAULT_COLORS;
  return Array.from({ length: count }, (_, i) => {
    // Blobs sit on a loose ring around the center so the corners are always covered.
    const angle = (i / count) * Math.PI * 2 + random() * 0.8;
    const ring = 22 + random() * 18;
    return {
      x: 50 + Math.cos(angle) * ring,
      y: 50 + Math.sin(angle) * ring,
      size: 55 + random() * 35,
      dx: (random() - 0.5) * 36,
      dy: (random() - 0.5) * 36,
      s0: 0.85 + random() * 0.15,
      s1: 1.05 + random() * 0.3,
      duration: 16 + random() * 10,
      phase: random(),
      color: palette[i % palette.length] ?? "var(--pui-primary)",
    };
  });
}
/**
 * A static mesh gradient as one CSS `background` value (layered radial gradients), for places that
 * only take CSS: `style={{ background: gradientMeshBackground() }}`, or paste it into a stylesheet.
 */
export function gradientMeshBackground({ colors = DEFAULT_COLORS, blobs = 5, seed = 1, baseColor }: GradientMeshBackgroundOptions = {}): string {
  const layers = meshLayout(Math.round(clamp(blobs, 2, 8)), seed, colors).map(
    (b) => `radial-gradient(at ${b.x.toFixed(1)}% ${b.y.toFixed(1)}%, ${b.color} 0px, transparent ${(b.size * 0.75).toFixed(0)}%)`,
  );
  return baseColor ? `${layers.join(", ")}, ${baseColor}` : layers.join(", ");
}
/**
 * A soft animated mesh gradient: theme-colored blobs drift and breathe on their own clocks under a
 * heavy blur, with an optional pointer highlight and a static CSS-only mode.
 */
export const GradientMesh = React.forwardRef<HTMLDivElement, GradientMeshProps>(function GradientMesh(
  {
    colors = DEFAULT_COLORS,
    blobs = 5,
    speed = 1,
    blur = 60,
    baseColor,
    animate = true,
    followPointer = false,
    pointerColor = "var(--pui-primary)",
    seed,
    mask = "none",
    style,
    className,
    ...props
  },
  ref,
) {
  const id = React.useId();
  const reduced = usePrefersReducedMotion();
  const rootRef = React.useRef<HTMLDivElement>(null);
  const mergedRef = React.useMemo(() => mergeRefs(ref, rootRef), [ref]);
  const count = Math.round(clamp(blobs, 2, 8));
  const rate = clamp(speed, 0.05, 10);
  const soft = clamp(blur, 0, 200);
  const resolvedSeed = seed ?? djb2(id);
  const colorKey = colors.join("|");
  const layout = React.useMemo(() => meshLayout(count, resolvedSeed, colorKey ? colorKey.split("|") : []), [count, resolvedSeed, colorKey]);
  const moving = animate && !reduced;
  const tracking = followPointer && !reduced;
  const x = useSpring(0, springs.gentle);
  const y = useSpring(0, springs.gentle);
  const presence = useSpring(0, springs.gentle);
  React.useEffect(() => {
    const el = rootRef.current;
    if (!tracking || !el) return;
    const onMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      const rect = el.getBoundingClientRect();
      const px = event.clientX - rect.left;
      const py = event.clientY - rect.top;
      const inside = px >= 0 && py >= 0 && px <= rect.width && py <= rect.height;
      if (inside && presence.get() < 0.05) {
        // Appear where the pointer enters instead of flying in from the corner.
        x.jump(px);
        y.jump(py);
      }
      x.set(px);
      y.set(py);
      presence.set(inside ? 1 : 0);
    };
    const onLeave = () => presence.set(0);
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, [tracking, x, y, presence]);
  const staticMesh = !animate;
  return (
    <div
      ref={mergedRef}
      aria-hidden="true"
      data-mask={mask}
      data-state={moving ? "animated" : "static"}
      {...props}
      style={{
        containerType: "size",
        ...(staticMesh ? { background: gradientMeshBackground({ colors, blobs: count, seed: resolvedSeed, baseColor }) } : baseColor ? { background: baseColor } : null),
        ...style,
      }}
      className={cn(blockReset, backgroundBase, "overflow-hidden", patternMasks[mask], className)}
    >
      {staticMesh ? null : (
        <div className={cn(blockReset, "absolute -inset-[10%]")} style={soft ? { filter: `blur(${soft}px)` } : undefined}>
          {layout.map((blob, i) => {
            const duration = blob.duration / rate;
            return (
              <div
                key={i}
                data-pui-mesh-blob=""
                className={cn(blockReset, "absolute -translate-x-1/2 -translate-y-1/2 rounded-pui-full", moving && "motion-safe:animate-pui-mesh-drift")}
                style={
                  {
                    left: `${blob.x.toFixed(2)}%`,
                    top: `${blob.y.toFixed(2)}%`,
                    width: `${blob.size.toFixed(1)}cqmax`,
                    height: `${blob.size.toFixed(1)}cqmax`,
                    background: `radial-gradient(circle, ${blob.color} 0%, color-mix(in oklab, ${blob.color} 55%, transparent) 38%, transparent 70%)`,
                    "--pui-mesh-x": `${blob.dx.toFixed(1)}cqw`,
                    "--pui-mesh-y": `${blob.dy.toFixed(1)}cqh`,
                    "--pui-mesh-s0": blob.s0.toFixed(2),
                    "--pui-mesh-s1": blob.s1.toFixed(2),
                    "--pui-mesh-duration": `${duration.toFixed(2)}s`,
                    animationDelay: `${(-blob.phase * duration * 2).toFixed(2)}s`,
                  } as React.CSSProperties
                }
              />
            );
          })}
        </div>
      )}
      {tracking ? (
        <motion.div
          data-pui-mesh-pointer=""
          className={cn(blockReset, "absolute top-0 left-0 size-[50cqmin] -translate-x-1/2 -translate-y-1/2 rounded-pui-full")}
          style={{
            x,
            y,
            opacity: presence,
            scale: presence,
            filter: soft ? `blur(${Math.round(soft * 0.6)}px)` : undefined,
            background: `radial-gradient(circle, color-mix(in oklab, ${pointerColor} 80%, transparent) 0%, transparent 65%)`,
          }}
        />
      ) : null}
    </div>
  );
});
