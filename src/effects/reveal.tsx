"use client";

import type { Transition } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { mergeRefs } from "../lib/compose";
import { easings } from "../lib/motion";
import { motionTagMap } from "../lib/motion-tags";
import { reducedRevealVariants, revealPresets, type RevealPreset } from "../lib/reveal-presets";
import { blockReset } from "../lib/styles";
import type { MotionSafeHTMLProps, Trigger } from "../lib/types";
import { useInViewTrigger, type InViewTriggerOptions } from "../lib/use-in-view-trigger";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export { revealPresets };
export type { RevealPreset };

export interface RevealProps extends MotionSafeHTMLProps<HTMLElement> {
  /** Default "fade-up". */
  preset?: RevealPreset;
  /** Default "div". */
  as?: "div" | "section" | "article" | "span" | "li";
  /** Seconds. Default 0.5. */
  duration?: number;
  /** Seconds. Default 0. */
  delay?: number;
  /** Travel in px for the directional presets. Default 16. */
  distance?: number;
  /** Default "inView". */
  trigger?: Trigger;
  /** Default true. */
  once?: boolean;
  /** IntersectionObserver rootMargin. Default "0px 0px -10% 0px". */
  inViewMargin?: string;
  /** Merged over the default transition. */
  transition?: Transition;
}

/** Entrance animation for any block when it scrolls into view (design 7.3 #42). */
export const Reveal = React.forwardRef<HTMLElement, RevealProps>(function Reveal(
  {
    preset = "fade-up",
    as = "div",
    duration = 0.5,
    delay = 0,
    distance = 16,
    trigger = "inView",
    once = true,
    inViewMargin = "0px 0px -10% 0px",
    transition,
    className,
    ...props
  },
  ref,
) {
  const localRef = React.useRef<HTMLElement>(null);
  const mergedRef = React.useMemo(() => mergeRefs(localRef, ref), [ref]);
  const active = useInViewTrigger(localRef, {
    trigger,
    once,
    margin: inViewMargin as InViewTriggerOptions["margin"],
  });
  const reduced = usePrefersReducedMotion();
  const variants = reduced ? reducedRevealVariants : revealPresets(distance)[preset];
  const MotionTag = motionTagMap[as];

  return (
    <MotionTag
      ref={mergedRef}
      data-preset={preset}
      data-state={active ? "visible" : "hidden"}
      initial="hidden"
      animate={active ? "visible" : "hidden"}
      variants={variants}
      transition={reduced ? undefined : { duration, delay, ease: easings.out, ...transition }}
      {...props}
      className={cn(blockReset, className)}
    />
  );
});
