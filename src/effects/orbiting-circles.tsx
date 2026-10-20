"use client";

import * as React from "react";
import { cn } from "../lib/cn";
import { blockReset } from "../lib/styles";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export interface OrbitingCirclesProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Orbit radius in px. Default 120. */
  radius?: number;
  /** Seconds per revolution. Default 20. */
  duration?: number;
  /** Orbit counter-clockwise. Default false. */
  reverse?: boolean;
  /** Draw the orbit path. Default true. */
  showPath?: boolean;
  /** Child wrapper size in px. Default 32. */
  itemSize?: number;
  /** Angle of the first child in degrees. Default 0. */
  startAngle?: number;
}

const orbitTransform =
  "rotate(var(--pui-orbit-angle)) translateY(var(--pui-orbit-radius)) rotate(calc(var(--pui-orbit-angle) * -1))";

/** Children spaced evenly on a circular orbit (design 7.3 #51). Children are decorative. */
export const OrbitingCircles = React.forwardRef<HTMLDivElement, OrbitingCirclesProps>(function OrbitingCircles(
  {
    radius = 120,
    duration = 20,
    reverse = false,
    showPath = true,
    itemSize = 32,
    startAngle = 0,
    style,
    className,
    children,
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const items = React.Children.toArray(children);
  const box = radius * 2 + itemSize;
  const vars = {
    "--pui-orbit-radius": `${radius}px`,
    "--pui-orbit-duration": `${duration}s`,
  } as React.CSSProperties;

  return (
    <div
      ref={ref}
      data-state={reduced ? "static" : "animated"}
      {...props}
      style={{ ...vars, minWidth: box, minHeight: box, ...style }}
      className={cn(blockReset, "relative flex items-center justify-center", className)}
    >
      {showPath ? (
        <svg
          aria-hidden="true"
          focusable="false"
          className={cn(blockReset, "pointer-events-none absolute inset-0 block size-full")}
        >
          <circle cx="50%" cy="50%" r={radius} fill="none" strokeWidth={1} className="stroke-pui-border" />
        </svg>
      ) : null}
      {items.map((child, i) => {
        const angle = startAngle + (360 / items.length) * i;
        return (
          <div
            key={i}
            data-pui-orbit-item=""
            style={
              {
                "--pui-orbit-angle": `${angle}deg`,
                width: itemSize,
                height: itemSize,
                transform: orbitTransform,
              } as React.CSSProperties
            }
            className={cn(
              blockReset,
              "absolute flex items-center justify-center",
              !reduced && "motion-safe:animate-pui-orbit",
              !reduced && reverse && "[animation-direction:reverse]",
            )}
          >
            {child}
          </div>
        );
      })}
    </div>
  );
});
