"use client";

import { motion } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { mergeRefs } from "../lib/compose";
import { blockReset } from "../lib/styles";
import { useIsomorphicLayoutEffect } from "../lib/use-latest-ref";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export interface BorderBeamProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Beam length in px. Default 80. */
  beamSize?: number;
  /** Seconds per lap. Default 6. */
  duration?: number;
  /** Seconds. Default 0. */
  delay?: number;
  /** Default "var(--pui-beam-from)". */
  colorFrom?: string;
  /** Default "var(--pui-beam-to)". */
  colorTo?: string;
  /** Border ring width in px. Default 1. */
  borderWidth?: number;
  /** Travel counter-clockwise. Default false. */
  reverse?: boolean;
  /** Start position along the border, in %. Default 0. */
  initialOffset?: number;
  /** Corner radius in px. Default: the parent's computed border-top-left-radius. */
  radius?: number;
  /** A soft blurred halo follows the beam outside the border line. Default true. */
  glow?: boolean;
}

const ring =
  "absolute inset-0 block rounded-[inherit] border-(length:--pui-beam-width) border-solid border-transparent";
const onPath =
  "absolute hidden supports-[offset-path:rect(0_auto_auto_0)]:block [offset-path:rect(0_auto_auto_0_round_var(--pui-beam-radius,0px))]";

/**
 * A light beam travelling around the parent's border (design 7.3 #45). The parent must be
 * `relative` and rounded. Needs `offset-path: rect()`; where unsupported the beam is absent.
 */
export const BorderBeam = React.forwardRef<HTMLDivElement, BorderBeamProps>(function BorderBeam(
  {
    beamSize = 80,
    duration = 6,
    delay = 0,
    colorFrom = "var(--pui-beam-from)",
    colorTo = "var(--pui-beam-to)",
    borderWidth = 1,
    reverse = false,
    initialOffset = 0,
    radius,
    glow = true,
    style,
    className,
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const localRef = React.useRef<HTMLDivElement>(null);
  const mergedRef = React.useMemo(() => mergeRefs(localRef, ref), [ref]);

  // Without a radius prop, mirror the parent's radius into --pui-beam-radius (no state, no re-render).
  useIsomorphicLayoutEffect(() => {
    const el = localRef.current;
    const parent = el?.parentElement;
    if (!el || !parent || radius !== undefined) return;
    el.style.setProperty("--pui-beam-radius", getComputedStyle(parent).borderTopLeftRadius || "0px");
  }, [radius, reduced]);

  if (reduced) return null;

  const vars = {
    "--pui-beam-size": `${beamSize}px`,
    "--pui-beam-width": `${borderWidth}px`,
    ...(radius === undefined ? {} : { "--pui-beam-radius": `${radius}px` }),
  } as React.CSSProperties;
  const from = initialOffset;
  const path = reverse ? [`${100 - from}%`, `${-from}%`] : [`${from}%`, `${100 + from}%`];
  const background = `linear-gradient(to left, ${colorFrom}, ${colorTo}, transparent)`;
  const travel = {
    initial: { offsetDistance: path[0] },
    animate: { offsetDistance: path },
    transition: { repeat: Infinity, ease: "linear", duration, delay },
  } as const;

  return (
    <div
      ref={mergedRef}
      aria-hidden="true"
      data-pui-border-beam=""
      {...props}
      style={{ ...vars, ...style }}
      className={cn(blockReset, "pointer-events-none absolute inset-0 rounded-[inherit]", className)}
    >
      {/* The glow lives outside the masked ring, which would clip it to the border line. */}
      {glow ? (
        <span className={cn(blockReset, ring)}>
          <motion.span
            data-pui-beam-glow=""
            className={cn(blockReset, onPath, "h-1.5 w-(--pui-beam-size) opacity-70 blur-[6px]")}
            style={{ background }}
            {...travel}
          />
        </span>
      ) : null}
      <span
        className={cn(
          blockReset,
          ring,
          "[mask-clip:padding-box,border-box] [mask-composite:intersect] [mask-image:linear-gradient(transparent,transparent),linear-gradient(black,black)]",
        )}
      >
        <motion.span
          data-pui-beam-dot=""
          className={cn(blockReset, onPath, "aspect-square w-(--pui-beam-size)")}
          style={{ background }}
          {...travel}
        />
      </span>
    </div>
  );
});
