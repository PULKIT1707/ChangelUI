"use client";

import { motion, useMotionTemplate, useMotionValue, useSpring, useTransform } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { composeEventHandlers } from "../lib/compose";
import { easings } from "../lib/motion";
import { blockReset } from "../lib/styles";
import type { MotionSafeHTMLProps } from "../lib/types";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export type HoloFoil = "rainbow" | "galaxy" | "metal";

export interface HoloCardProps extends MotionSafeHTMLProps<HTMLDivElement> {
  /** Foil strength, 0-2. Default 1. */
  intensity?: number;
  /** Foil pattern. Default "rainbow". */
  foil?: HoloFoil;
  /** Light glare that follows the pointer. Default true. */
  glare?: boolean;
  /** Sparkle grain near the glare. Default true. */
  sparkle?: boolean;
  /** Idle shimmer sweep every few seconds. Default true. */
  shimmer?: boolean;
  /** Maximum rotation in degrees. Default 14. */
  maxTilt?: number;
  /** Perspective in px. Default 900. */
  perspective?: number;
  /** Hover scale. Default 1.03. */
  scale?: number;
  disabled?: boolean;
}

const tiltSpring = { stiffness: 300, damping: 25, mass: 0.5 };

// Every color comes from theme tokens, so presets recolor the foil too.
const foils: Record<HoloFoil, { image: (angle: string) => string; blend: "color-dodge" | "overlay" | "soft-light" }> = {
  rainbow: {
    image: (angle) =>
      `repeating-linear-gradient(${angle}, var(--pui-chart-4) 0%, var(--pui-chart-3) 7%, var(--pui-chart-2) 14%, var(--pui-chart-6) 21%, var(--pui-chart-1) 28%, var(--pui-chart-5) 35%, var(--pui-chart-4) 42%)`,
    blend: "color-dodge",
  },
  galaxy: {
    image: (angle) =>
      `conic-gradient(from ${angle} at 50% 50%, var(--pui-gradient-1), var(--pui-chart-2), var(--pui-gradient-2), var(--pui-gradient-3), var(--pui-chart-3), var(--pui-gradient-1))`,
    blend: "color-dodge",
  },
  metal: {
    image: (angle) =>
      `repeating-linear-gradient(${angle}, color-mix(in oklab, var(--pui-shimmer) 90%, transparent) 0%, color-mix(in oklab, var(--pui-foreground) 30%, transparent) 6%, color-mix(in oklab, var(--pui-shimmer) 70%, transparent) 11%, color-mix(in oklab, var(--pui-foreground) 45%, transparent) 17%, color-mix(in oklab, var(--pui-shimmer) 90%, transparent) 22%)`,
    blend: "overlay",
  },
};

const sparkleImage =
  "radial-gradient(circle at 30% 40%, var(--pui-shimmer) 0 0.6px, transparent 1.2px), radial-gradient(circle at 70% 80%, var(--pui-shimmer) 0 0.5px, transparent 1px)";

const layer = cn(blockReset, "pointer-events-none absolute inset-0 rounded-[inherit]");

/**
 * Holographic foil trading-card surface: a token-colored foil, glare and sparkle grain shift with a
 * 3D tilt toward the pointer, and an idle shimmer sweeps across at rest. Content stays fully
 * accessible underneath; the layers are decorative.
 */
export const HoloCard = React.forwardRef<HTMLDivElement, HoloCardProps>(function HoloCard(
  {
    intensity = 1,
    foil = "rainbow",
    glare = true,
    sparkle = true,
    shimmer = true,
    maxTilt = 14,
    perspective = 900,
    scale = 1.03,
    disabled = false,
    onPointerMove,
    onPointerLeave,
    style,
    className,
    children,
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const enabled = !disabled && !reduced;
  const strength = Math.min(Math.max(intensity, 0), 2);
  const rotateX = useSpring(0, tiltSpring);
  const rotateY = useSpring(0, tiltSpring);
  const lift = useSpring(1, tiltSpring);
  const px = useSpring(50, tiltSpring);
  const py = useSpring(50, tiltSpring);
  const hover = useSpring(0, { stiffness: 200, damping: 30 });
  const hyp = useMotionValue(0);
  const [hovering, setHovering] = React.useState(false);

  const angle = useTransform([px, py], ([x, y]) => `${105 + ((x as number) - 50) * 0.6 + ((y as number) - 50) * 0.3}deg`);
  const foilPosition = useMotionTemplate`${px}% ${py}%`;
  const foilOpacity = useTransform([hover, hyp], ([h, d]) => strength * (0.16 + (h as number) * (0.3 + (d as number) * 0.35)));
  const glareImage = useMotionTemplate`radial-gradient(farthest-corner circle at ${px}% ${py}%, color-mix(in oklab, var(--pui-shimmer) 80%, transparent) 0%, color-mix(in oklab, var(--pui-shimmer) 25%, transparent) 25%, transparent 60%)`;
  const glareOpacity = useTransform(hover, (h) => h * 0.75);
  const sparkleMask = useMotionTemplate`radial-gradient(circle at ${px}% ${py}%, black 0%, transparent 55%)`;
  const sparkleOpacity = useTransform([hover, hyp], ([h, d]) => Math.min(1, strength * (h as number) * (0.4 + (d as number) * 0.6)));

  const reset = () => {
    rotateX.set(0);
    rotateY.set(0);
    lift.set(1);
    px.set(50);
    py.set(50);
    hyp.set(0);
    hover.set(0);
    setHovering(false);
  };

  const handleMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!enabled || event.pointerType === "touch") return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    rotateY.set(x * 2 * maxTilt);
    rotateX.set(-y * 2 * maxTilt);
    lift.set(scale);
    px.set((x + 0.5) * 100);
    py.set((y + 0.5) * 100);
    hyp.set(Math.min(1, Math.hypot(x, y) / Math.SQRT1_2));
    hover.set(1);
    if (!hovering) setHovering(true);
  };

  return (
    <motion.div
      ref={ref}
      data-state={enabled ? "interactive" : "static"}
      data-foil={foil}
      {...props}
      onPointerMove={composeEventHandlers(onPointerMove, handleMove)}
      onPointerLeave={composeEventHandlers(onPointerLeave, reset)}
      style={{ rotateX, rotateY, scale: lift, transformPerspective: perspective, ...style }}
      className={cn(blockReset, "relative isolate overflow-hidden will-change-transform", className)}
    >
      {children}
      <motion.div
        aria-hidden="true"
        data-pui-foil=""
        className={layer}
        style={{
          ["--pui-holo-angle" as string]: angle,
          backgroundImage: foils[foil].image("var(--pui-holo-angle, 105deg)"),
          backgroundSize: "300% 300%",
          backgroundPosition: foilPosition,
          mixBlendMode: foils[foil].blend,
          opacity: enabled ? foilOpacity : strength * 0.16,
        }}
      />
      {sparkle && enabled ? (
        <motion.div
          aria-hidden="true"
          className={layer}
          style={{
            backgroundImage: sparkleImage,
            backgroundSize: "9px 9px, 13px 13px",
            mixBlendMode: "overlay",
            maskImage: sparkleMask,
            WebkitMaskImage: sparkleMask,
            opacity: sparkleOpacity,
          }}
        />
      ) : null}
      {glare && enabled ? (
        <motion.div
          aria-hidden="true"
          data-pui-glare=""
          className={layer}
          style={{ backgroundImage: glareImage, mixBlendMode: "overlay", opacity: glareOpacity }}
        />
      ) : null}
      {shimmer && enabled ? (
        <motion.div
          aria-hidden="true"
          className={layer}
          style={{
            backgroundImage:
              "linear-gradient(105deg, transparent 38%, color-mix(in oklab, var(--pui-shimmer) 45%, transparent) 50%, transparent 62%)",
            backgroundSize: "250% 100%",
            backgroundRepeat: "no-repeat",
            mixBlendMode: "overlay",
          }}
          initial={{ backgroundPositionX: "150%" }}
          animate={{ backgroundPositionX: "-50%", opacity: hovering ? 0 : 1 }}
          transition={{
            backgroundPositionX: { duration: 1.4, ease: easings.inOut, repeat: Infinity, repeatDelay: 4.6, delay: 1 },
            opacity: { duration: 0.2 },
          }}
        />
      ) : null}
    </motion.div>
  );
});
