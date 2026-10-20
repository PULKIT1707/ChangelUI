"use client";
import { motion, useScroll, useSpring, useTransform, type MotionValue } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { mergeRefs } from "../lib/compose";
import { blockReset } from "../lib/styles";
import type { MotionSafeHTMLProps } from "../lib/types";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export interface ScrollStackProps extends MotionSafeHTMLProps<HTMLDivElement> {
  /** Scroll box the stack lives in. Default: the window. */
  container?: React.RefObject<HTMLElement | null>;
  /** Px from the top of the viewport (or container) where the first card sticks. Default 24. */
  stickyTop?: number;
  /** Px each later card sits below the one before, so the stack shows its edges. Default 24. */
  offset?: number;
  /** Scale lost per card stacked on top. Default 0.05. */
  scaleStep?: number;
  /** Degrees each buried card tilts (alternating sides). Default 0. */
  rotateStep?: number;
  /** Dim buried cards toward the background (0 off, 1 strong). Default 0.5. */
  dim?: number;
  /** Scroll distance between cards in px (the gap the next card travels before covering). Default 200. */
  distance?: number;
}

export type ScrollStackItemProps = MotionSafeHTMLProps<HTMLDivElement>;

interface StackContextValue {
  progress: MotionValue<number>;
  count: number;
  stickyTop: number;
  offset: number;
  scaleStep: number;
  rotateStep: number;
  dim: number;
  distance: number;
  reduced: boolean;
}

const StackContext = React.createContext<StackContextValue | null>(null);
const IndexContext = React.createContext(0);

/**
 * Feature walkthrough cards that pin and pile up: each card sticks a little below the last, and the
 * buried ones scale down and dim as the next card scrolls over them. Reduced motion: a plain list.
 */
export const ScrollStack = React.forwardRef<HTMLDivElement, ScrollStackProps>(function ScrollStack(
  {
    container,
    stickyTop = 24,
    offset = 24,
    scaleStep = 0.05,
    rotateStep = 0,
    dim = 0.5,
    distance = 200,
    className,
    children,
    ...props
  },
  ref,
) {
  const localRef = React.useRef<HTMLDivElement>(null);
  const mergedRef = React.useMemo(() => mergeRefs(localRef, ref), [ref]);
  const reduced = usePrefersReducedMotion();
  const { scrollYProgress } = useScroll({ target: localRef, container, offset: ["start start", "end end"] });
  const progress = useSpring(scrollYProgress, { stiffness: 260, damping: 40, restDelta: 0.0005 });
  const items = React.Children.toArray(children).filter(React.isValidElement);
  const count = items.length;
  const value = React.useMemo<StackContextValue>(
    () => ({ progress, count, stickyTop, offset, scaleStep, rotateStep, dim, distance, reduced }),
    [progress, count, stickyTop, offset, scaleStep, rotateStep, dim, distance, reduced],
  );
  return (
    <StackContext.Provider value={value}>
      <div
        ref={mergedRef}
        role="list"
        data-state={reduced ? "static" : "animated"}
        {...props}
        className={cn(blockReset, "relative flex flex-col", reduced && "gap-4", className)}
      >
        {items.map((child, index) => (
          <IndexContext.Provider key={child.key ?? index} value={index}>
            {child}
          </IndexContext.Provider>
        ))}
      </div>
    </StackContext.Provider>
  );
});

/** One card of a ScrollStack. Style it as the card surface (padding, background, radius). */
export const ScrollStackItem = React.forwardRef<HTMLDivElement, ScrollStackItemProps>(function ScrollStackItem(
  { className, style, children, ...props },
  ref,
) {
  const context = React.useContext(StackContext);
  if (!context) throw new Error("ScrollStackItem must be used inside <ScrollStack>.");
  const index = React.useContext(IndexContext);
  const { progress, count, stickyTop, offset, scaleStep, rotateStep, dim, distance, reduced } = context;
  const buried = Math.max(count - 1 - index, 0);
  // Card i starts shrinking once it is pinned and keeps shrinking as every later card arrives.
  const start = count > 0 ? index / count : 0;
  const scale = useTransform(progress, [start, 1], [1, 1 - buried * scaleStep]);
  const rotate = useTransform(progress, [start, 1], [0, buried * rotateStep * (index % 2 === 0 ? -1 : 1)]);
  const shade = useTransform(progress, [start, 1], [0, Math.min(buried * 0.18 * dim, 0.7)]);
  const last = index === count - 1;
  return (
    <motion.div
      ref={ref}
      role="listitem"
      data-index={index}
      {...props}
      style={
        reduced
          ? style
          : {
              top: stickyTop + index * offset,
              marginBottom: last ? 0 : distance,
              scale,
              rotate,
              ...style,
            }
      }
      className={cn(
        blockReset,
        "relative origin-top overflow-hidden",
        !reduced && "sticky will-change-transform",
        className,
      )}
    >
      {children}
      {!reduced && dim > 0 && buried > 0 ? (
        <motion.div
          aria-hidden="true"
          style={{ opacity: shade }}
          className={cn(blockReset, "pointer-events-none absolute inset-0 bg-pui-background")}
        />
      ) : null}
    </motion.div>
  );
});
