"use client";

import { motion, type Variants } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { mergeRefs } from "../lib/compose";
import { easings } from "../lib/motion";
import { motionTagMap } from "../lib/motion-tags";
import { blockReset } from "../lib/styles";
import type { TextBaseProps } from "../lib/types";
import { useInViewTrigger } from "../lib/use-in-view-trigger";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export type TextRevealVariant = "fade" | "blur" | "slide-up";

export interface TextRevealProps extends TextBaseProps {
  children: string;
  /** Default "word". */
  split?: "word" | "char";
  /** Default "blur". */
  variant?: TextRevealVariant;
  /** Seconds between segments. Default 0.04. */
  stagger?: number;
  /** Seconds per segment. Default 0.5. */
  duration?: number;
}

const hiddenStates: Record<TextRevealVariant, Record<string, number | string>> = {
  fade: { opacity: 0 },
  blur: { opacity: 0, filter: "blur(8px)", y: 8 },
  "slide-up": { opacity: 0, y: "0.6em" },
};
const visibleStates: Record<TextRevealVariant, Record<string, number | string>> = {
  fade: { opacity: 1 },
  blur: { opacity: 1, filter: "blur(0px)", y: 0 },
  "slide-up": { opacity: 1, y: 0 },
};

interface Segment {
  text: string;
  space: boolean;
}

function splitText(text: string): Segment[] {
  return text
    .split(/(\s+)/)
    .filter((part) => part.length > 0)
    .map((part) => ({ text: part, space: /^\s+$/.test(part) }));
}

/** Word- or character-staggered entrance for a line of text (design 7.2 #38). */
export const TextReveal = React.forwardRef<HTMLElement, TextRevealProps>(function TextReveal(
  {
    children,
    split = "word",
    variant = "blur",
    stagger = 0.04,
    duration = 0.5,
    as = "p",
    trigger = "inView",
    once = true,
    delay = 0,
    className,
    ...props
  },
  ref,
) {
  const localRef = React.useRef<HTMLElement>(null);
  const mergedRef = React.useMemo(() => mergeRefs(localRef, ref), [ref]);
  const active = useInViewTrigger(localRef, { trigger, once });
  const reduced = usePrefersReducedMotion();

  const variants: Variants = reduced
    ? { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0.15 } } }
    : {
        hidden: hiddenStates[variant],
        visible: (i: number) => ({
          ...visibleStates[variant],
          transition: { delay: delay + i * stagger, duration, ease: easings.out },
        }),
      };

  const segments: React.ReactNode[] = [];
  let order = 0;
  for (const [i, segment] of splitText(children).entries()) {
    if (segment.space) {
      segments.push(segment.text);
    } else if (split === "word") {
      segments.push(
        <motion.span key={i} custom={order} variants={variants} className={cn(blockReset, "inline-block")}>
          {segment.text}
        </motion.span>,
      );
      order += 1;
    } else {
      const chars: React.ReactNode[] = [];
      for (const [j, char] of Array.from(segment.text).entries()) {
        chars.push(
          <motion.span key={j} custom={order} variants={variants} className={cn(blockReset, "inline-block")}>
            {char}
          </motion.span>,
        );
        order += 1;
      }
      segments.push(
        <span key={i} className={cn(blockReset, "inline-block whitespace-nowrap")}>
          {chars}
        </span>,
      );
    }
  }

  const MotionTag = motionTagMap[as];

  return (
    <MotionTag
      ref={mergedRef}
      data-state={active ? "visible" : "hidden"}
      {...props}
      className={cn(blockReset, className)}
    >
      <span className={cn(blockReset, "sr-only")}>{children}</span>
      <motion.span
        aria-hidden="true"
        initial="hidden"
        animate={active ? "visible" : "hidden"}
        className={cn(blockReset, "whitespace-pre-wrap")}
      >
        {segments}
      </motion.span>
    </MotionTag>
  );
});
