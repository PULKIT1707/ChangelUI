"use client";
import { motion, useMotionValue, useScroll, useSpring, useTransform } from "motion/react";
import * as React from "react";
import { useMediaQuery } from "../hooks/use-media-query";
import { cn } from "../lib/cn";
import { mergeRefs } from "../lib/compose";
import { sceneHeight, useContainerHeight } from "../lib/scroll-linked";
import { blockReset } from "../lib/styles";
import type { MotionSafeHTMLProps } from "../lib/types";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export interface HorizontalScrollProps extends MotionSafeHTMLProps<HTMLDivElement> {
  /** Scroll box the scene lives in. Default: the window. */
  container?: React.RefObject<HTMLElement | null>;
  /**
   * Total scroll length of the scene as a CSS length (e.g. "300vh"). Default: the sticky height plus
   * the track overflow, so one px of vertical scroll moves the track one px.
   */
  height?: string;
  /** Height of the sticky viewport. Default: the container height, else 100vh. */
  viewportHeight?: string;
  /** Below this viewport width (px) the scene becomes a plain swipeable row. Default 640. 0 never. */
  breakpoint?: number;
  /** Ease the track with a spring. Default true. */
  smooth?: boolean;
  /** Thin progress bar at the bottom of the sticky viewport. Default true. */
  progress?: boolean;
  /** Accessible name of the scrollable region in the fallback row. Default "Scrollable panels". */
  label?: string;
  /** Class for the moving track (gap, padding). */
  trackClassName?: string;
}

/**
 * Vertical scroll drives a horizontal track: the scene pins while its panels slide sideways, then
 * releases. Under reduced motion or on narrow screens it falls back to a normal horizontal scroller.
 */
export const HorizontalScroll = React.forwardRef<HTMLDivElement, HorizontalScrollProps>(function HorizontalScroll(
  {
    container,
    height,
    viewportHeight,
    breakpoint = 640,
    smooth = true,
    progress = true,
    label = "Scrollable panels",
    trackClassName,
    className,
    style,
    children,
    ...props
  },
  ref,
) {
  const sceneRef = React.useRef<HTMLDivElement>(null);
  const viewportRef = React.useRef<HTMLDivElement>(null);
  const trackRef = React.useRef<HTMLDivElement>(null);
  const mergedRef = React.useMemo(() => mergeRefs(sceneRef, ref), [ref]);
  const reduced = usePrefersReducedMotion();
  const narrow = useMediaQuery(`(max-width: ${Math.max(breakpoint - 1, 0)}px)`);
  const fallback = reduced || (breakpoint > 0 && narrow);
  const measured = useContainerHeight(container);
  const stickyHeight = sceneHeight(measured, viewportHeight);
  const [overflow, setOverflow] = React.useState(0);
  const distance = useMotionValue(0);

  React.useEffect(() => {
    const track = trackRef.current;
    const viewport = viewportRef.current;
    if (fallback || !track || !viewport || typeof ResizeObserver === "undefined") return;
    const measure = () => {
      const next = Math.max(0, track.scrollWidth - viewport.clientWidth);
      distance.set(next);
      setOverflow(next);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [fallback, distance]);

  const { scrollYProgress } = useScroll({ target: sceneRef, container, offset: ["start start", "end end"] });
  const eased = useSpring(scrollYProgress, { stiffness: 200, damping: 34, restDelta: 0.0005 });
  const p = smooth ? eased : scrollYProgress;
  const x = useTransform([p, distance], ([value, d]: number[]) => -(value ?? 0) * (d ?? 0));

  if (fallback) {
    return (
      <div ref={mergedRef} data-state="static" {...props} style={style} className={cn(blockReset, "relative", className)}>
        <div
          role="region"
          aria-label={label}
          tabIndex={0}
          className={cn(
            blockReset,
            "flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pui-ring [&>*]:shrink-0 [&>*]:snap-start",
            trackClassName,
          )}
        >
          {children}
        </div>
      </div>
    );
  }

  const total = height ?? `calc(${stickyHeight} + ${overflow}px)`;
  return (
    <div
      ref={mergedRef}
      data-state="animated"
      {...props}
      style={{ height: total, ...style }}
      className={cn(blockReset, "relative", className)}
    >
      <div
        ref={viewportRef}
        style={{ height: stickyHeight }}
        className={cn(blockReset, "sticky top-0 flex items-center overflow-hidden")}
      >
        <motion.div
          ref={trackRef}
          style={{ x }}
          className={cn(blockReset, "flex w-max will-change-transform [&>*]:shrink-0", trackClassName)}
        >
          {children}
        </motion.div>
        {progress ? (
          <div
            aria-hidden="true"
            className={cn(blockReset, "absolute right-6 bottom-4 left-6 h-0.5 overflow-hidden rounded-full bg-pui-border")}
          >
            <motion.div
              style={{ scaleX: p }}
              className={cn(blockReset, "absolute inset-0 origin-left rounded-full bg-linear-to-r from-pui-beam-from to-pui-beam-to")}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
});
