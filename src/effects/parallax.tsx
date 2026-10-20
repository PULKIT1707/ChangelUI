"use client";
import {
  motion,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
  type UseScrollOptions,
} from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { composeEventHandlers, mergeRefs } from "../lib/compose";
import { blockReset } from "../lib/styles";
import type { MotionSafeHTMLProps } from "../lib/types";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export interface ParallaxProps extends MotionSafeHTMLProps<HTMLDivElement> {
  /** Scroll box to follow (it needs a non-static position). Default: the window. */
  container?: React.RefObject<HTMLElement | null>;
  /**
   * Scroll range that maps to the layers' full travel, as Motion `useScroll` offsets.
   * Default ["start end", "end start"]: from the scene entering the viewport to leaving it.
   */
  offset?: UseScrollOptions["offset"];
  /** Ease scroll and pointer input with a spring (120/20). Default true. */
  smooth?: boolean;
  /** Track the mouse over the scene so layers with `pointer` drift with it. Default true. */
  trackPointer?: boolean;
}

export interface ParallaxLayerProps extends MotionSafeHTMLProps<HTMLDivElement> {
  /**
   * Scroll travel: the layer moves `speed * 100`px each way across the range. Positive values lag
   * behind the page (far away), negative values rush ahead (close to the viewer). Default 0.2.
   */
  speed?: number;
  /** Scroll axis the layer travels on. Default "y". */
  axis?: "x" | "y";
  /** Px the layer drifts toward the pointer at the scene edge (negative drifts away). Default 0. */
  pointer?: number;
  /** Degrees the layer turns across the scroll range. Default 0. */
  rotate?: number;
  /** Scale at the start and end of the range, e.g. [1.1, 1]. Default none. */
  scale?: [number, number];
  /** Opacity at the start, middle and end of the range, e.g. [0, 1, 0]. Default none. */
  fade?: [number, number, number];
}

interface ParallaxContextValue {
  /** -1 when the scene enters, 0 in the middle, 1 when it leaves. */
  progress: MotionValue<number>;
  /** -1..1 across the scene, 0 when the pointer is away. */
  pointerX: MotionValue<number>;
  pointerY: MotionValue<number>;
  reduced: boolean;
}

const ParallaxContext = React.createContext<ParallaxContextValue | null>(null);
const DEFAULT_OFFSET: UseScrollOptions["offset"] = ["start end", "end start"];
const ease = { stiffness: 120, damping: 20, restDelta: 0.0005 };

/**
 * A scroll scene for layered parallax. Each ParallaxLayer inside moves at its own rate as the scene
 * scrolls through the viewport, and can also drift with the pointer for a sense of depth.
 */
export const Parallax = React.forwardRef<HTMLDivElement, ParallaxProps>(function Parallax(
  {
    container,
    offset = DEFAULT_OFFSET,
    smooth = true,
    trackPointer = true,
    onPointerMove,
    onPointerLeave,
    className,
    children,
    ...props
  },
  ref,
) {
  const localRef = React.useRef<HTMLDivElement>(null);
  const mergedRef = React.useMemo(() => mergeRefs(localRef, ref), [ref]);
  const reduced = usePrefersReducedMotion();
  const { scrollYProgress } = useScroll({ target: localRef, container, offset });
  const centered = useTransform(scrollYProgress, (p) => p * 2 - 1);
  const easedProgress = useSpring(centered, ease);
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const easedX = useSpring(rawX, ease);
  const easedY = useSpring(rawY, ease);

  const value = React.useMemo<ParallaxContextValue>(
    () => ({
      progress: smooth ? easedProgress : centered,
      pointerX: smooth ? easedX : rawX,
      pointerY: smooth ? easedY : rawY,
      reduced,
    }),
    [smooth, easedProgress, centered, easedX, rawX, easedY, rawY, reduced],
  );

  const handleMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!trackPointer || reduced || event.pointerType !== "mouse") return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    rawX.set(((event.clientX - rect.left) / rect.width) * 2 - 1);
    rawY.set(((event.clientY - rect.top) / rect.height) * 2 - 1);
  };
  const handleLeave = () => {
    rawX.set(0);
    rawY.set(0);
  };

  return (
    <ParallaxContext.Provider value={value}>
      <div
        ref={mergedRef}
        data-state={reduced ? "static" : "animated"}
        {...props}
        onPointerMove={composeEventHandlers(onPointerMove, handleMove)}
        onPointerLeave={composeEventHandlers(onPointerLeave, handleLeave)}
        className={cn(blockReset, "relative", className)}
      >
        {children}
      </div>
    </ParallaxContext.Provider>
  );
});

/** One depth plane of a Parallax scene. Position it like any element (absolute layers stack). */
export const ParallaxLayer = React.forwardRef<HTMLDivElement, ParallaxLayerProps>(function ParallaxLayer(
  { speed = 0.2, axis = "y", pointer = 0, rotate = 0, scale, fade, style, className, ...props },
  ref,
) {
  const context = React.useContext(ParallaxContext);
  if (!context) throw new Error("ParallaxLayer must be used inside <Parallax>.");
  const { progress, pointerX, pointerY, reduced } = context;
  const travel = reduced ? 0 : speed * 100;
  const drift = reduced ? 0 : pointer;
  const x = useTransform([progress, pointerX], ([p, px]: number[]) => (axis === "x" ? (p ?? 0) * travel : 0) + (px ?? 0) * drift);
  const y = useTransform([progress, pointerY], ([p, py]: number[]) => (axis === "y" ? (p ?? 0) * travel : 0) + (py ?? 0) * drift);
  const turn = useTransform(progress, (p) => (reduced ? 0 : p * rotate * 0.5));
  const scaleValue = useTransform(progress, [-1, 1], reduced || !scale ? [1, 1] : scale);
  const opacity = useTransform(progress, [-1, 0, 1], reduced || !fade ? [1, 1, 1] : fade);
  return (
    <motion.div
      ref={ref}
      data-speed={speed}
      {...props}
      style={{ x, y, rotate: turn, scale: scaleValue, opacity, ...style }}
      className={cn(blockReset, "will-change-transform", className)}
    />
  );
});
