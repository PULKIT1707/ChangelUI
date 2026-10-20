"use client";

import * as React from "react";
import { cn } from "../lib/cn";
import { devWarn } from "../lib/dev";
import { blockReset } from "../lib/styles";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export interface MarqueeProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Default "left". */
  direction?: "left" | "right" | "up" | "down";
  /** Seconds per loop. Default 30. */
  duration?: number;
  /** CSS length between items and copies. Default "1rem". */
  gap?: string;
  /** Number of copies (min 1). Default 4. */
  repeat?: number;
  /** Also pauses on focus within. Default true. */
  pauseOnHover?: boolean;
  paused?: boolean;
  /** Fade the edges with a mask. Default true. */
  fade?: boolean;
}

/** Copies 2..n are duplicates: hidden from AT and removed from the tab order (no cleanup return: React 18). */
function makeInert(el: HTMLDivElement | null): void {
  if (el) el.inert = true;
}

/** Infinite scrolling row or column of content (design 7.3 #44). */
export const Marquee = React.forwardRef<HTMLDivElement, MarqueeProps>(function Marquee(
  {
    direction = "left",
    duration = 30,
    gap = "1rem",
    repeat = 4,
    pauseOnHover = true,
    paused = false,
    fade = true,
    style,
    className,
    children,
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const vertical = direction === "up" || direction === "down";
  const reverse = direction === "right" || direction === "down";
  let copies = Math.floor(repeat);
  if (!(copies >= 1)) {
    devWarn("marquee:repeat", "Marquee repeat must be at least 1; using 1.");
    copies = 1;
  }
  if (reduced) copies = 1;
  const vars = {
    "--pui-marquee-gap": gap,
    "--pui-marquee-duration": `${duration}s`,
  } as React.CSSProperties;

  return (
    <div
      ref={ref}
      data-direction={direction}
      data-state={reduced ? "static" : paused ? "paused" : "running"}
      {...props}
      style={{ ...vars, ...style }}
      className={cn(
        blockReset,
        "group flex [gap:var(--pui-marquee-gap)]",
        vertical ? "flex-col" : "flex-row",
        reduced ? "overflow-auto" : "overflow-hidden",
        fade &&
          !reduced &&
          (vertical
            ? "[mask-image:linear-gradient(to_bottom,transparent,black_10%,black_90%,transparent)]"
            : "[mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]"),
        className,
      )}
    >
      {Array.from({ length: copies }, (_, i) => (
        <div
          key={i}
          ref={i > 0 ? makeInert : undefined}
          aria-hidden={i > 0 ? true : undefined}
          data-pui-marquee-copy=""
          className={cn(
            blockReset,
            "flex shrink-0 justify-around [gap:var(--pui-marquee-gap)]",
            vertical ? "flex-col" : "flex-row",
            !reduced && (vertical ? "motion-safe:animate-pui-marquee-y" : "motion-safe:animate-pui-marquee-x"),
            !reduced && reverse && "[animation-direction:reverse]",
            !reduced &&
              pauseOnHover &&
              "group-hover:[animation-play-state:paused] group-focus-within:[animation-play-state:paused]",
            !reduced && paused && "[animation-play-state:paused]",
          )}
        >
          {children}
        </div>
      ))}
    </div>
  );
});
