"use client";
import { AnimatePresence, motion } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { durations, easings, springs } from "../lib/motion";
import { blockReset, listReset } from "../lib/styles";
import type { MotionSafeHTMLProps } from "../lib/types";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export interface AnimatedListProps extends MotionSafeHTMLProps<HTMLDivElement> {
  /** Keyed elements in display order. New keys animate in; removed keys fade out while the rest reflow. */
  children?: React.ReactNode;
  /** Where new items arrive from: "top" (feeds, notifications) or "bottom" (chat, agent logs). Default "top". */
  direction?: "top" | "bottom";
  /** Keep at most this many items: the first ones for "top", the last ones for "bottom". */
  max?: number;
  /** Live region (role=log, polite) so screen readers hear new items. Default true. */
  announce?: boolean;
  /** Animate the items present on first render, staggered. Default false. */
  animateInitial?: boolean;
  /** Seconds between items when animateInitial is on. Default 0.06. */
  stagger?: number;
  /** Accessible name of the list. */
  label?: string;
  /** Class for each item wrapper (li). */
  itemClassName?: string;
}

/**
 * A live feed where new items spring in from the top (or bottom) and the others glide aside, while
 * removed items fade and collapse. Pass keyed children; the list animates whatever changes.
 */
export const AnimatedList = React.forwardRef<HTMLDivElement, AnimatedListProps>(function AnimatedList(
  {
    children,
    direction = "top",
    max,
    announce = true,
    animateInitial = false,
    stagger = 0.06,
    label,
    itemClassName,
    className,
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const all = React.Children.toArray(children).filter(React.isValidElement);
  const limited =
    max === undefined || all.length <= max ? all : direction === "top" ? all.slice(0, max) : all.slice(all.length - max);
  // The entrance stagger only applies to the first batch; later arrivals come in immediately.
  const [settled, setSettled] = React.useState(!animateInitial);
  React.useEffect(() => {
    if (settled) return;
    const id = window.setTimeout(() => setSettled(true), 50);
    return () => window.clearTimeout(id);
  }, [settled]);
  const from = direction === "top" ? -12 : 12;
  return (
    <div
      ref={ref}
      role={announce ? "log" : undefined}
      aria-live={announce ? "polite" : undefined}
      aria-relevant={announce ? "additions" : undefined}
      aria-label={label}
      data-direction={direction}
      {...props}
      className={cn(blockReset, "relative", className)}
    >
      <ul className={cn(listReset, "flex flex-col gap-2")}>
        <AnimatePresence initial={animateInitial} mode="popLayout">
          {limited.map((child, index) => (
            <motion.li
              key={child.key ?? index}
              layout={reduced ? false : "position"}
              initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.92, y: from }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={
                reduced
                  ? { opacity: 0, transition: { duration: durations.fast } }
                  : { opacity: 0, scale: 0.95, transition: { duration: durations.fast, ease: easings.inQuint } }
              }
              transition={
                reduced
                  ? { duration: 0.15 }
                  : { ...springs.layout, delay: settled ? 0 : index * stagger }
              }
              style={{ transformOrigin: direction === "top" ? "50% 0%" : "50% 100%" }}
              className={cn(blockReset, itemClassName)}
            >
              {child}
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
});
