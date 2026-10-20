"use client";
import {
  motion,
  useAnimationFrame,
  useInView,
  useMotionValue,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";
import * as React from "react";
import { useScrollVelocity } from "../hooks/use-scroll-velocity";
import { cn } from "../lib/cn";
import { composeEventHandlers, mergeRefs } from "../lib/compose";
import { springs } from "../lib/motion";
import { blockReset } from "../lib/styles";
import type { MotionSafeHTMLProps } from "../lib/types";
import { useDocumentVisible } from "../lib/use-document-visible";
import { useLatestRef } from "../lib/use-latest-ref";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export interface ScrollVelocityTextProps extends MotionSafeHTMLProps<HTMLDivElement> {
  /** One marquee per string, stacked top to bottom. */
  rows: string[];
  /** Resting drift in px per second. Default 40. */
  baseVelocity?: number;
  /** How strongly scroll speed adds to the drift; 0 ignores scrolling. Default 1. */
  velocityFactor?: number;
  /** Lean the letters with scroll speed. Default true. */
  skew?: boolean;
  /** Largest lean in degrees. Default 12. */
  maxSkew?: number;
  /** Every other row runs the opposite way. Default true. */
  alternate?: boolean;
  /** Scrolling back up reverses the drift. Default true. */
  directional?: boolean;
  /** Ease the drift to a stop while the pointer is over a row. Default false. */
  pauseOnHover?: boolean;
  /** Placed between repeats of a row. Default a middle dot. */
  separator?: React.ReactNode;
  /** Scroll box to follow. Default: the window. */
  container?: React.RefObject<HTMLElement | null>;
  /** Class for every row (typography, colors). */
  rowClassName?: string;
}

const DEFAULT_SEPARATOR = (
  <span aria-hidden="true" className={cn(blockReset, "px-[0.35em] opacity-40")}>
    ·
  </span>
);

interface RowProps {
  text: string;
  direction: 1 | -1;
  baseVelocity: number;
  velocityFactor: number;
  directional: boolean;
  velocity: MotionValue<number>;
  skewX: MotionValue<number> | undefined;
  hover: MotionValue<number>;
  running: React.RefObject<boolean>;
  reduced: boolean;
  separator: React.ReactNode;
  className?: string;
}

/** One marquee row: copies of the text side by side, wrapped modulo one copy's width. */
function VelocityRow({
  text,
  direction,
  baseVelocity,
  velocityFactor,
  directional,
  velocity,
  skewX,
  hover,
  running,
  reduced,
  separator,
  className,
}: RowProps) {
  const rowRef = React.useRef<HTMLDivElement>(null);
  const copyRef = React.useRef<HTMLSpanElement>(null);
  const [copies, setCopies] = React.useState(2);
  const width = React.useRef(0);
  const offset = useMotionValue(0);
  const flip = React.useRef(1);

  React.useEffect(() => {
    const row = rowRef.current;
    const copy = copyRef.current;
    if (!row || !copy || typeof ResizeObserver === "undefined") return;
    const measure = () => {
      const w = copy.getBoundingClientRect().width;
      width.current = w;
      if (w > 0) setCopies(Math.max(2, Math.ceil(row.clientWidth / w) + 1));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(row);
    observer.observe(copy);
    return () => observer.disconnect();
  }, [text]);

  useAnimationFrame((_, delta) => {
    if (reduced || !running.current) return;
    const w = width.current;
    if (w <= 0) return;
    const v = velocity.get();
    if (directional) {
      if (v < -5) flip.current = -1;
      else if (v > 5) flip.current = 1;
    }
    // px/s of scroll -> extra multiples of the base drift (1000px/s of scrolling adds 5x).
    const boost = 1 + (Math.abs(v) / 1000) * 5 * velocityFactor;
    const step = direction * flip.current * baseVelocity * boost * (delta / 1000) * hover.get();
    let next = offset.get() - step;
    // Wrap into (-w, 0] so the copies always cover the row.
    next = ((next % w) - w) % w;
    offset.set(next);
  });

  return (
    <div ref={rowRef} className={cn(blockReset, "flex overflow-hidden whitespace-nowrap")}>
      <motion.div
        aria-hidden="true"
        style={{ x: offset, skewX }}
        className={cn(blockReset, "flex shrink-0 will-change-transform", className)}
      >
        {Array.from({ length: copies }, (_, i) => (
          <span key={i} ref={i === 0 ? copyRef : undefined} className={cn(blockReset, "flex shrink-0 items-center")}>
            <span className={cn(blockReset, "shrink-0")}>{text}</span>
            {separator}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

/**
 * Editorial marquee rows that drift on their own and speed up, reverse and lean with scroll
 * velocity (roadmap W6). Pauses off-screen and in hidden tabs; the text is read once.
 */
export const ScrollVelocityText = React.forwardRef<HTMLDivElement, ScrollVelocityTextProps>(function ScrollVelocityText(
  {
    rows,
    baseVelocity = 40,
    velocityFactor = 1,
    skew = true,
    maxSkew = 12,
    alternate = true,
    directional = true,
    pauseOnHover = false,
    separator = DEFAULT_SEPARATOR,
    container,
    rowClassName,
    className,
    onPointerEnter,
    onPointerLeave,
    ...props
  },
  ref,
) {
  const localRef = React.useRef<HTMLDivElement>(null);
  const mergedRef = React.useMemo(() => mergeRefs(localRef, ref), [ref]);
  const reduced = usePrefersReducedMotion();
  const visible = useDocumentVisible();
  const inView = useInView(localRef, { margin: "100px" });
  const running = useLatestRef(inView && visible);
  const velocity = useScrollVelocity({ container });
  const lean = useTransform(velocity, [-1500, 1500], [maxSkew, -maxSkew], { clamp: true });
  const skewX = useSpring(lean, springs.smooth);
  // 1 = full drift, eased towards 0 while hovered.
  const hover = useSpring(1, springs.gentle);

  return (
    <div
      ref={mergedRef}
      data-state={reduced ? "static" : "running"}
      {...props}
      onPointerEnter={composeEventHandlers(onPointerEnter, () => {
        if (pauseOnHover) hover.set(0);
      })}
      onPointerLeave={composeEventHandlers(onPointerLeave, () => hover.set(1))}
      className={cn(blockReset, "flex w-full flex-col overflow-hidden", className)}
    >
      {rows.map((text, i) => (
        <span key={`sr-${i}`} className={cn(blockReset, "sr-only")}>
          {text}
        </span>
      ))}
      {rows.map((text, i) => (
        <VelocityRow
          key={i}
          text={text}
          direction={alternate && i % 2 === 1 ? -1 : 1}
          baseVelocity={baseVelocity}
          velocityFactor={velocityFactor}
          directional={directional}
          velocity={velocity}
          skewX={skew && !reduced ? skewX : undefined}
          hover={hover}
          running={running}
          reduced={reduced}
          separator={separator}
          className={rowClassName}
        />
      ))}
    </div>
  );
});
