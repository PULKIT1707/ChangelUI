"use client";

import * as React from "react";
import { backgroundBase, patternMasks } from "../lib/backgrounds";
import { cn } from "../lib/cn";
import { toIdPart } from "../lib/ids";
import { blockReset } from "../lib/styles";
import type { PatternMask } from "../lib/types";

export interface GridPatternProps extends React.SVGAttributes<SVGSVGElement> {
  /** Cell size in px. Default 32. */
  cellSize?: number;
  /** Line dash pattern. Default "0" (solid). */
  strokeDasharray?: string;
  /** Highlighted cells as [column, row]. */
  squares?: Array<[x: number, y: number]>;
  /** Default "radial". */
  mask?: PatternMask;
}

/** Decorative grid lines with optional highlighted cells (design 7.4 #54). */
export const GridPattern = React.forwardRef<SVGSVGElement, GridPatternProps>(function GridPattern(
  { cellSize = 32, strokeDasharray = "0", squares, mask = "radial", className, ...props },
  ref,
) {
  const id = `pui-grid-${toIdPart(React.useId())}`;
  return (
    <svg
      ref={ref}
      aria-hidden="true"
      focusable="false"
      data-mask={mask}
      {...props}
      className={cn(blockReset, backgroundBase, "block size-full stroke-current text-pui-border", patternMasks[mask], className)}
    >
      <defs>
        <pattern id={id} width={cellSize} height={cellSize} x={-1} y={-1} patternUnits="userSpaceOnUse">
          <path d={`M.5 ${cellSize}V.5H${cellSize}`} fill="none" strokeDasharray={strokeDasharray} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" strokeWidth={0} fill={`url(#${id})`} />
      {squares?.map(([x, y]) => (
        <rect
          key={`${x}-${y}`}
          data-pui-grid-square=""
          strokeWidth={0}
          width={cellSize - 1}
          height={cellSize - 1}
          x={x * cellSize}
          y={y * cellSize}
          className="fill-pui-muted"
        />
      ))}
    </svg>
  );
});
