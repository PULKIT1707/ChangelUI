"use client";

import { motion, useMotionTemplate, useMotionValue, useSpring } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { composeEventHandlers } from "../lib/compose";
import { blockReset } from "../lib/styles";
import type { MotionSafeHTMLProps } from "../lib/types";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export interface TiltCardProps extends MotionSafeHTMLProps<HTMLDivElement> {
  /** Maximum rotation in degrees. Default 10. */
  maxTilt?: number;
  /** Perspective in px. Default 1000. */
  perspective?: number;
  /** Hover scale. Default 1.02. */
  scale?: number;
  /** Glare highlight following the pointer. Default true. */
  glare?: boolean;
  disabled?: boolean;
}

const tiltSpring = { stiffness: 300, damping: 25, mass: 0.5 };

/** 3D tilt toward the pointer with an optional glare (design 7.3 #48). */
export const TiltCard = React.forwardRef<HTMLDivElement, TiltCardProps>(function TiltCard(
  {
    maxTilt = 10,
    perspective = 1000,
    scale = 1.02,
    glare = true,
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
  const rotateX = useSpring(0, tiltSpring);
  const rotateY = useSpring(0, tiltSpring);
  const lift = useSpring(1, tiltSpring);
  const glareX = useMotionValue(50);
  const glareY = useMotionValue(50);
  const glareOpacity = useSpring(0, tiltSpring);
  const glareBackground = useMotionTemplate`radial-gradient(circle at ${glareX}% ${glareY}%, color-mix(in oklab, var(--pui-shimmer) 35%, transparent), transparent 60%)`;

  const reset = () => {
    rotateX.set(0);
    rotateY.set(0);
    lift.set(1);
    glareOpacity.set(0);
  };

  const handleMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!enabled || event.pointerType === "touch") return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;
    rotateY.set(px * 2 * maxTilt);
    rotateX.set(-py * 2 * maxTilt);
    lift.set(scale);
    glareX.set((px + 0.5) * 100);
    glareY.set((py + 0.5) * 100);
    glareOpacity.set(1);
  };

  return (
    <motion.div
      ref={ref}
      data-state={enabled ? "interactive" : "static"}
      {...props}
      onPointerMove={composeEventHandlers(onPointerMove, handleMove)}
      onPointerLeave={composeEventHandlers(onPointerLeave, reset)}
      style={{ rotateX, rotateY, scale: lift, transformPerspective: perspective, ...style }}
      className={cn(blockReset, "relative will-change-transform", className)}
    >
      {children}
      {glare && enabled ? (
        <motion.div
          aria-hidden="true"
          data-pui-glare=""
          className={cn(blockReset, "pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]")}
          style={{ background: glareBackground, opacity: glareOpacity }}
        />
      ) : null}
    </motion.div>
  );
});
