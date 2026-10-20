"use client";

import type { Variants } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { mergeRefs } from "../lib/compose";
import { easings } from "../lib/motion";
import { motionTagMap } from "../lib/motion-tags";
import { reducedRevealVariants, revealPresets, type RevealPreset } from "../lib/reveal-presets";
import { blockReset, listReset } from "../lib/styles";
import type { MotionSafeHTMLProps, Trigger } from "../lib/types";
import { useInViewTrigger, type InViewTriggerOptions } from "../lib/use-in-view-trigger";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export interface StaggerProps extends MotionSafeHTMLProps<HTMLElement> {
  /** Default "div". "ul" and "ol" get the list reset. */
  as?: "div" | "ul" | "ol" | "section";
  /** Inherited by items. Default "fade-up". */
  preset?: RevealPreset;
  /** Seconds between items. Default 0.06. */
  stagger?: number;
  /** Seconds before the first item (delayChildren). Default 0. */
  delay?: number;
  /** Seconds per item. Default 0.45. */
  duration?: number;
  /** Travel in px for the directional presets. Default 16. */
  distance?: number;
  /** Default "inView". */
  trigger?: Trigger;
  /** Default true. */
  once?: boolean;
  /** IntersectionObserver rootMargin. Default "0px 0px -10% 0px". */
  inViewMargin?: string;
}

export interface StaggerItemProps extends MotionSafeHTMLProps<HTMLElement> {
  /** Default "div". */
  as?: "div" | "li" | "span" | "article";
  /** Overrides the container preset. */
  preset?: RevealPreset;
}

interface StaggerContextValue {
  preset: RevealPreset;
  duration: number;
  distance: number;
  reduced: boolean;
}

const StaggerContext = React.createContext<StaggerContextValue>({
  preset: "fade-up",
  duration: 0.45,
  distance: 16,
  reduced: false,
});

/** Staggers the entrance of its StaggerItem children through variant propagation (design 7.3 #43). */
export const Stagger = React.forwardRef<HTMLElement, StaggerProps>(function Stagger(
  {
    as = "div",
    preset = "fade-up",
    stagger = 0.06,
    delay = 0,
    duration = 0.45,
    distance = 16,
    trigger = "inView",
    once = true,
    inViewMargin = "0px 0px -10% 0px",
    className,
    children,
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
  const context = React.useMemo(
    () => ({ preset, duration, distance, reduced }),
    [preset, duration, distance, reduced],
  );
  const variants: Variants = {
    hidden: {},
    visible: { transition: reduced ? {} : { staggerChildren: stagger, delayChildren: delay } },
  };
  const MotionTag = motionTagMap[as];

  return (
    <StaggerContext.Provider value={context}>
      <MotionTag
        ref={mergedRef}
        data-state={active ? "visible" : "hidden"}
        initial="hidden"
        animate={active ? "visible" : "hidden"}
        variants={variants}
        {...props}
        className={cn(as === "ul" || as === "ol" ? listReset : blockReset, className)}
      >
        {children}
      </MotionTag>
    </StaggerContext.Provider>
  );
});

/** One staggered child; inherits the container's trigger, preset and timing. */
export const StaggerItem = React.forwardRef<HTMLElement, StaggerItemProps>(function StaggerItem(
  { as = "div", preset, className, ...props },
  ref,
) {
  const ctx = React.useContext(StaggerContext);
  const target = revealPresets(ctx.distance)[preset ?? ctx.preset];
  const variants: Variants = ctx.reduced
    ? reducedRevealVariants
    : {
        hidden: target.hidden,
        visible: { ...target.visible, transition: { duration: ctx.duration, ease: easings.out } },
      };
  const MotionTag = motionTagMap[as];

  return (
    <MotionTag
      ref={ref}
      data-preset={preset ?? ctx.preset}
      variants={variants}
      {...props}
      className={cn(blockReset, className)}
    />
  );
});
