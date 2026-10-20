"use client";

import { motion, useMotionTemplate, useMotionValue } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { composeEventHandlers } from "../lib/compose";
import { blockReset } from "../lib/styles";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export interface SpotlightCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Default "var(--pui-spotlight)". */
  spotlightColor?: string;
  /** Spotlight radius in px. Default 320. */
  spotlightSize?: number;
  /** Light up the border near the pointer. Default true. */
  borderGlow?: boolean;
}

const overlay = "pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-(--pui-duration-slow) group-hover:opacity-100 group-focus-within:opacity-100";

/** Surface card with a soft spotlight following the pointer (design 7.3 #47). */
export const SpotlightCard = React.forwardRef<HTMLDivElement, SpotlightCardProps>(function SpotlightCard(
  {
    spotlightColor = "var(--pui-spotlight)",
    spotlightSize = 320,
    borderGlow = true,
    onPointerMove,
    onPointerEnter,
    onFocus,
    style,
    className,
    children,
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const spotX = useMotionTemplate`${x}px`;
  const spotY = useMotionTemplate`${y}px`;

  const center = (el: HTMLElement) => {
    x.set(el.offsetWidth / 2);
    y.set(el.offsetHeight / 2);
  };
  const follow = (event: React.PointerEvent<HTMLDivElement>) => {
    if (reduced) return;
    const rect = event.currentTarget.getBoundingClientRect();
    x.set(event.clientX - rect.left);
    y.set(event.clientY - rect.top);
  };

  const vars = { "--pui-spotlight-size": `${spotlightSize}px` } as React.CSSProperties;
  const layerVars = { "--pui-spotlight-x": spotX, "--pui-spotlight-y": spotY };

  return (
    <div
      ref={ref}
      data-state={reduced ? "static" : "interactive"}
      {...props}
      onPointerMove={composeEventHandlers(onPointerMove, follow)}
      onPointerEnter={composeEventHandlers(onPointerEnter, (event) => {
        if (reduced) center(event.currentTarget);
        else follow(event);
      })}
      // Keyboard users get a centered spotlight.
      onFocus={composeEventHandlers(onFocus, (event) => center(event.currentTarget))}
      style={{ ...vars, ...style }}
      className={cn(
        blockReset,
        "group relative isolate overflow-hidden rounded-pui-lg border border-pui-border bg-pui-surface text-pui-surface-foreground",
        className,
      )}
    >
      <motion.div
        aria-hidden="true"
        data-pui-spotlight=""
        className={cn(blockReset, overlay, "-z-10")}
        style={{
          ...layerVars,
          background: `radial-gradient(var(--pui-spotlight-size) circle at var(--pui-spotlight-x) var(--pui-spotlight-y), ${spotlightColor}, transparent 80%)`,
        }}
      />
      {borderGlow ? (
        <motion.div
          aria-hidden="true"
          data-pui-spotlight-border=""
          className={cn(
            blockReset,
            overlay,
            "p-px [mask-image:linear-gradient(black,black),linear-gradient(black,black)] [mask-clip:content-box,border-box] [-webkit-mask-composite:xor] [mask-composite:exclude]",
          )}
          style={{
            ...layerVars,
            background:
              "radial-gradient(calc(var(--pui-spotlight-size) * 0.6) circle at var(--pui-spotlight-x) var(--pui-spotlight-y), color-mix(in oklab, var(--pui-primary) 55%, transparent), transparent 70%)",
          }}
        />
      ) : null}
      {children}
    </div>
  );
});
