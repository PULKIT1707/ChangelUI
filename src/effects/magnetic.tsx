"use client";

import { motion, useSpring } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { mergeRefs } from "../lib/compose";
import { blockReset } from "../lib/styles";
import type { MotionSafeHTMLProps } from "../lib/types";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export interface MagneticProps extends MotionSafeHTMLProps<HTMLSpanElement> {
  /** Fraction of the pointer offset to follow. Default 0.3. */
  strength?: number;
  /** Activation distance in px from the element's edge. Default 100. */
  distance?: number;
  disabled?: boolean;
}

const magnetSpring = { stiffness: 220, damping: 18, mass: 0.4 };

/** Pulls its child toward a nearby pointer (design 7.3 #49). Off for coarse pointers and reduced motion. */
export const Magnetic = React.forwardRef<HTMLSpanElement, MagneticProps>(function Magnetic(
  { strength = 0.3, distance = 100, disabled = false, style, className, ...props },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const localRef = React.useRef<HTMLSpanElement>(null);
  const mergedRef = React.useMemo(() => mergeRefs(localRef, ref), [ref]);
  const x = useSpring(0, magnetSpring);
  const y = useSpring(0, magnetSpring);
  const enabled = !disabled && !reduced;

  React.useEffect(() => {
    const el = localRef.current;
    if (!enabled || !el) return;
    if (typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches) return;
    let frame = 0;
    let pending: { x: number; y: number } | null = null;
    let attracted = false;
    const update = () => {
      frame = 0;
      if (!pending) return;
      const { x: px, y: py } = pending;
      pending = null;
      const rect = el.getBoundingClientRect();
      // Distance from the nearest edge (0 inside the element).
      const dx = Math.max(rect.left - px, 0, px - rect.right);
      const dy = Math.max(rect.top - py, 0, py - rect.bottom);
      if (Math.hypot(dx, dy) <= distance) {
        attracted = true;
        x.set((px - (rect.left + rect.width / 2)) * strength);
        y.set((py - (rect.top + rect.height / 2)) * strength);
      } else if (attracted) {
        attracted = false;
        x.set(0);
        y.set(0);
      }
    };
    const onMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      pending = { x: event.clientX, y: event.clientY };
      if (!frame) frame = requestAnimationFrame(update);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(frame);
      x.set(0);
      y.set(0);
    };
  }, [enabled, distance, strength, x, y]);

  return (
    <motion.span
      ref={mergedRef}
      data-state={enabled ? "active" : "inactive"}
      {...props}
      style={{ x, y, ...style }}
      className={cn(blockReset, "inline-block", className)}
    />
  );
});
