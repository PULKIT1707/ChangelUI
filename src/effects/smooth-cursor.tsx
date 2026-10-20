"use client";

import { motion, useMotionValue, useSpring, type SpringOptions } from "motion/react";
import * as React from "react";
import { useMediaQuery } from "../hooks/use-media-query";
import { cn } from "../lib/cn";
import { Portal } from "../lib/portal";
import { blockReset } from "../lib/styles";
import { useIsClient } from "../lib/use-is-client";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export interface SmoothCursorProps {
  /** "parent": active only while the pointer is inside the parent element. Default "parent". */
  scope?: "parent" | "window";
  /** Sets cursor:none on the scope while active; restored on unmount. Default true. */
  hideNativeCursor?: boolean;
  /** Cursor size in px. Default 20. */
  cursorSize?: number;
  /** Default { stiffness: 400, damping: 40, mass: 0.6 }. */
  spring?: SpringOptions;
  /** Rotate toward the direction of travel. Default false. */
  rotate?: boolean;
  /** Custom cursor visual. Default: a ring and a dot. */
  children?: React.ReactNode;
  className?: string;
}

const defaultSpring: SpringOptions = { stiffness: 400, damping: 40, mass: 0.6 };

/**
 * A spring-smoothed custom cursor (design 7.3 #52). Renders only on the client with a fine
 * pointer and motion allowed; otherwise it returns null and leaves the native cursor alone.
 */
export const SmoothCursor = React.forwardRef<HTMLDivElement, SmoothCursorProps>(function SmoothCursor(
  { scope = "parent", hideNativeCursor = true, cursorSize = 20, spring = defaultSpring, rotate = false, children, className },
  ref,
) {
  const isClient = useIsClient();
  const finePointer = useMediaQuery("(pointer: fine)");
  const reduced = usePrefersReducedMotion();
  const active = isClient && finePointer && !reduced;
  const anchorRef = React.useRef<HTMLSpanElement>(null);

  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const angle = useMotionValue(0);
  const opacity = useMotionValue(0);
  const sx = useSpring(x, spring);
  const sy = useSpring(y, spring);
  const sAngle = useSpring(angle, spring);

  React.useEffect(() => {
    if (!active) return;
    const parent = anchorRef.current?.parentElement;
    const target: HTMLElement | null = scope === "window" ? document.documentElement : (parent ?? null);
    if (!target) return;
    const previousCursor = target.style.cursor;
    if (hideNativeCursor) target.style.cursor = "none";
    let last: { x: number; y: number } | null = null;
    const onMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      if (last && rotate) {
        const dx = event.clientX - last.x;
        const dy = event.clientY - last.y;
        if (Math.hypot(dx, dy) > 2) angle.set((Math.atan2(dy, dx) * 180) / Math.PI + 90);
      }
      last = { x: event.clientX, y: event.clientY };
      x.set(event.clientX);
      y.set(event.clientY);
      opacity.set(1);
    };
    const onLeave = () => opacity.set(0);
    target.addEventListener("pointermove", onMove);
    target.addEventListener("pointerleave", onLeave);
    return () => {
      target.removeEventListener("pointermove", onMove);
      target.removeEventListener("pointerleave", onLeave);
      if (hideNativeCursor) target.style.cursor = previousCursor;
      opacity.set(0);
    };
  }, [active, scope, hideNativeCursor, rotate, x, y, angle, opacity]);

  if (!active) return null;

  return (
    <>
      <span ref={anchorRef} hidden className={cn(blockReset, "hidden")} />
      <Portal>
        <motion.div
          ref={ref}
          aria-hidden="true"
          data-pui-cursor=""
          style={{
            x: sx,
            y: sy,
            rotate: rotate ? sAngle : 0,
            opacity,
            width: cursorSize,
            height: cursorSize,
            marginLeft: -cursorSize / 2,
            marginTop: -cursorSize / 2,
          }}
          className={cn(blockReset, "pointer-events-none fixed left-0 top-0 z-(--pui-z-cursor)", className)}
        >
          {children ?? (
            <>
              <span
                className={cn(blockReset, "absolute inset-0 rounded-pui-full border-2 border-solid border-pui-foreground/70")}
              />
              <span
                className={cn(
                  blockReset,
                  "absolute left-1/2 top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-pui-full bg-pui-foreground",
                )}
              />
            </>
          )}
        </motion.div>
      </Portal>
    </>
  );
});
