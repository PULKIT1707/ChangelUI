"use client";
import { useMotionValue, type MotionValue } from "motion/react";
import { useEffect, type RefObject } from "react";
import { useLatestRef } from "../lib/use-latest-ref";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";
import { useMediaQuery } from "./use-media-query";

export interface UsePointerProximityOptions {
  /** px; `proximity` reaches 0 at this distance. Default 200. */
  radius?: number;
  /** Measure from the element's center, or from its nearest edge (0 inside). Default "center". */
  measure?: "center" | "edge";
  /** Default true. Also off for coarse pointers and under reduced motion. */
  enabled?: boolean;
}

export interface UsePointerProximityResult {
  /** px from the element (see `measure`). Starts at `radius`. */
  distance: MotionValue<number>;
  /** 1 at the element, 0 at `radius` or beyond, linear in between. */
  proximity: MotionValue<number>;
  /** Degrees from the element's center to the pointer: 0 = right, 90 = down. */
  angle: MotionValue<number>;
  /** px from the element's center to the pointer. */
  x: MotionValue<number>;
  y: MotionValue<number>;
}

/**
 * Distance, closeness and angle from the pointer to an element as MotionValues, updated at most
 * once per frame without re-rendering (proximity glows, variable fonts, magnetic grids).
 * Turns itself off for coarse pointers and under reduced motion. SSR-safe: resting values.
 */
export function usePointerProximity(
  ref: RefObject<Element | null>,
  { radius = 200, measure = "center", enabled = true }: UsePointerProximityOptions = {},
): UsePointerProximityResult {
  const distance = useMotionValue(radius);
  const proximity = useMotionValue(0);
  const angle = useMotionValue(0);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const reduced = usePrefersReducedMotion();
  const coarse = useMediaQuery("(pointer: coarse)");
  const active = enabled && !reduced && !coarse;
  const values = useLatestRef({ distance, proximity, angle, x, y });
  useEffect(() => {
    const v = values.current;
    const reset = () => {
      v.distance.set(radius);
      v.proximity.set(0);
      v.angle.set(0);
      v.x.set(0);
      v.y.set(0);
    };
    if (!active) {
      reset();
      return;
    }
    let frame = 0;
    let pointer: { x: number; y: number } | null = null;
    const update = () => {
      frame = 0;
      const el = ref.current;
      if (!el || !pointer) return;
      const rect = el.getBoundingClientRect();
      const dx = pointer.x - (rect.left + rect.width / 2);
      const dy = pointer.y - (rect.top + rect.height / 2);
      let d: number;
      if (measure === "edge") {
        const ex = Math.max(rect.left - pointer.x, 0, pointer.x - rect.right);
        const ey = Math.max(rect.top - pointer.y, 0, pointer.y - rect.bottom);
        d = Math.hypot(ex, ey);
      } else {
        d = Math.hypot(dx, dy);
      }
      v.x.set(dx);
      v.y.set(dy);
      v.distance.set(d);
      v.proximity.set(radius > 0 ? Math.max(0, 1 - d / radius) : 0);
      v.angle.set((Math.atan2(dy, dx) * 180) / Math.PI);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const onMove = (event: PointerEvent) => {
      pointer = { x: event.clientX, y: event.clientY };
      schedule();
    };
    // The element moves under a still pointer while the page scrolls.
    const onScroll = () => {
      if (pointer) schedule();
    };
    const onLeave = () => {
      pointer = null;
      reset();
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", onScroll, { capture: true });
      document.documentElement.removeEventListener("pointerleave", onLeave);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [active, radius, measure, ref, values]);
  return { distance, proximity, angle, x, y };
}
