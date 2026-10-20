"use client";

import * as React from "react";
import { backgroundBase, patternMasks } from "../lib/backgrounds";
import { cn } from "../lib/cn";
import { blockReset } from "../lib/styles";
import type { PatternMask } from "../lib/types";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export type AuroraIntensity = "subtle" | "normal" | "vivid";

export interface AuroraBackgroundProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Default the three --pui-aurora-* tokens. */
  colors?: string[];
  /** Seconds per drift cycle. Default 60. */
  duration?: number;
  /** Opacity and blur. Default "normal". */
  intensity?: AuroraIntensity;
  /** Fade the aurora out from the top-right corner. Default true. */
  radialMask?: boolean;
  /** Default "none". */
  mask?: PatternMask;
}

const defaultColors = ["var(--pui-aurora-1)", "var(--pui-aurora-2)", "var(--pui-aurora-3)"];

const intensities: Record<AuroraIntensity, string> = {
  subtle: "opacity-30 blur-[40px]",
  normal: "opacity-60 blur-[56px]",
  vivid: "opacity-70 blur-[80px]",
};

/** Slowly drifting aurora light bands (design 7.4 #58). */
export const AuroraBackground = React.forwardRef<HTMLDivElement, AuroraBackgroundProps>(function AuroraBackground(
  {
    colors = defaultColors,
    duration = 60,
    intensity = "normal",
    radialMask = true,
    mask = "none",
    className,
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const palette = colors.length > 0 ? colors : defaultColors;
  const stops = [...palette, palette[0]].map((c, i, all) => `${c} ${10 + (i * 20) / Math.max(all.length - 1, 1)}%`);
  // The veil token draws the dark stripes between the bands; light mode uses a translucent white
  // veil so the colors read on a white page.
  const bands =
    "repeating-linear-gradient(100deg, var(--pui-aurora-veil) 0%, var(--pui-aurora-veil) 7%, transparent 10%, transparent 12%, var(--pui-aurora-veil) 16%)";

  return (
    <div
      ref={ref}
      aria-hidden="true"
      data-intensity={intensity}
      data-state={reduced ? "static" : "animated"}
      {...props}
      className={cn(blockReset, backgroundBase, "overflow-hidden", patternMasks[mask], className)}
    >
      <div
        data-pui-aurora=""
        style={{
          backgroundImage: `${bands}, repeating-linear-gradient(100deg, ${stops.join(", ")})`,
          animationDuration: `${duration}s`,
        }}
        className={cn(
          blockReset,
          "absolute -inset-2.5 [background-position:50%_50%,50%_50%] [background-size:300%,200%] will-change-[background-position]",
          intensities[intensity],
          radialMask && "[mask-image:radial-gradient(ellipse_at_100%_0%,black_10%,transparent_70%)]",
          !reduced && "motion-safe:animate-pui-aurora",
        )}
      />
    </div>
  );
});
