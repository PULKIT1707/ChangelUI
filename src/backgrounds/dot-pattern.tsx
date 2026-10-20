"use client";

import * as React from "react";
import { backgroundBase, patternMasks } from "../lib/backgrounds";
import { cn } from "../lib/cn";
import { toIdPart } from "../lib/ids";
import { blockReset } from "../lib/styles";
import type { PatternMask } from "../lib/types";

export interface DotPatternProps extends React.SVGAttributes<SVGSVGElement> {
  /** Distance between dots in px. Default 16. */
  gap?: number;
  /** Dot radius in px. Default 1. */
  dotSize?: number;
  /** Pattern offset in px. Default 0. */
  offset?: number;
  /** Default "radial". */
  mask?: PatternMask;
}

/** Decorative dot grid background (design 7.4 #53). Colored by currentColor. */
export const DotPattern = React.forwardRef<SVGSVGElement, DotPatternProps>(function DotPattern(
  { gap = 16, dotSize = 1, offset = 0, mask = "radial", className, ...props },
  ref,
) {
  const id = `pui-dots-${toIdPart(React.useId())}`;
  return (
    <svg
      ref={ref}
      aria-hidden="true"
      focusable="false"
      data-mask={mask}
      {...props}
      className={cn(
        blockReset,
        backgroundBase,
        "block size-full fill-current text-pui-pattern",
        patternMasks[mask],
        className,
      )}
    >
      <defs>
        <pattern id={id} width={gap} height={gap} x={offset} y={offset} patternUnits="userSpaceOnUse">
          <circle cx={gap / 2} cy={gap / 2} r={dotSize} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" strokeWidth={0} fill={`url(#${id})`} />
    </svg>
  );
});
