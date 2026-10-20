"use client";
import { useScroll, useSpring, useVelocity, type MotionValue, type SpringOptions } from "motion/react";
import type { RefObject } from "react";

export interface UseScrollVelocityOptions {
  /** Scroll box to watch. Default: the window. */
  container?: RefObject<HTMLElement | null>;
  /** Default "y". */
  axis?: "x" | "y";
  /** Spring that smooths the raw velocity, or false for the raw value. Default { damping: 50, stiffness: 400 }. */
  smooth?: SpringOptions | false;
}

/** px per second; positive while scrolling down (or right), negative while scrolling back. */
export type UseScrollVelocityResult = MotionValue<number>;

const DEFAULT_SMOOTH: SpringOptions = { damping: 50, stiffness: 400 };

/**
 * Signed, smoothed scroll velocity as a MotionValue, for skewing text, speeding up marquees or
 * stretching cards with scroll. It never re-renders the component; read it with useTransform.
 * SSR-safe: the value is 0 on the server.
 */
export function useScrollVelocity({
  container,
  axis = "y",
  smooth = DEFAULT_SMOOTH,
}: UseScrollVelocityOptions = {}): UseScrollVelocityResult {
  const { scrollX, scrollY } = useScroll(container ? { container } : undefined);
  const velocity = useVelocity(axis === "x" ? scrollX : scrollY);
  const smoothed = useSpring(velocity, smooth === false ? DEFAULT_SMOOTH : smooth);
  return smooth === false ? velocity : smoothed;
}
