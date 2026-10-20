"use client";

import * as React from "react";
import { burst } from "../lib/burst";
import { cn } from "../lib/cn";
import { composeEventHandlers, mergeRefs } from "../lib/compose";
import { easings } from "../lib/motion";
import { blockReset } from "../lib/styles";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export type ClickSparkVariant = "lines" | "dots" | "stars";

export interface ClickSparkProps extends React.HTMLAttributes<HTMLDivElement> {
  /** CSS color of the sparks. Default "var(--pui-primary)". */
  color?: string;
  /** Several colors, cycled per spark (overrides `color`). */
  colors?: readonly string[];
  /** Sparks per click. Default 8. */
  count?: number;
  /** Travel distance in px. Default 18. */
  radius?: number;
  /** Line length in px ("lines"). Default 10. */
  length?: number;
  /** Line thickness in px ("lines"). Default 2. */
  thickness?: number;
  /** Default 400. */
  durationMs?: number;
  /** "lines" radiate and shrink, "dots" and "stars" burst outward. Default "lines". */
  variant?: ClickSparkVariant;
  /** An expanding ring under the sparks. Default false. */
  ring?: boolean;
  /** Stop sparking. Default false. */
  disabled?: boolean;
}

/**
 * Wrapper that emits radial sparks at every click, from the pointer (or the center of the clicked
 * element for keyboard clicks). Children keep their roles; the sparks are aria-hidden WAAPI nodes.
 */
export const ClickSpark = React.forwardRef<HTMLDivElement, ClickSparkProps>(function ClickSpark(
  {
    color = "var(--pui-primary)",
    colors,
    count = 8,
    radius = 18,
    length = 10,
    thickness = 2,
    durationMs = 400,
    variant = "lines",
    ring = false,
    disabled = false,
    onClick,
    className,
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const active = !reduced && !disabled;

  const spark = (event: React.MouseEvent<HTMLDivElement>) => {
    const root = rootRef.current;
    if (!active || !root || typeof root.animate !== "function") return;
    const rect = root.getBoundingClientRect();
    let x = event.clientX - rect.left;
    let y = event.clientY - rect.top;
    // Keyboard clicks report detail 0 and no useful coordinates: spark from the clicked element.
    if (event.detail === 0 && event.target instanceof Element) {
      const target = event.target.getBoundingClientRect();
      x = target.left + target.width / 2 - rect.left;
      y = target.top + target.height / 2 - rect.top;
    }
    const palette = colors?.length ? colors : [color];
    const doc = root.ownerDocument;
    const duration = Math.max(durationMs, 1);
    if (ring) {
      const node = doc.createElement("span");
      node.setAttribute("aria-hidden", "true");
      Object.assign(node.style, {
        position: "absolute",
        left: `${x}px`,
        top: `${y}px`,
        width: `${radius * 2.4}px`,
        height: `${radius * 2.4}px`,
        borderRadius: "9999px",
        border: `${thickness}px solid ${palette[0]}`,
        pointerEvents: "none",
      });
      root.appendChild(node);
      const animation = node.animate(
        [
          { transform: "translate(-50%, -50%) scale(0.2)", opacity: 0.7 },
          { transform: "translate(-50%, -50%) scale(1)", opacity: 0 },
        ],
        { duration: duration * 1.1, easing: `cubic-bezier(${easings.outExpo.join(", ")})`, fill: "forwards" },
      );
      animation.onfinish = () => node.remove();
    }
    if (variant !== "lines") {
      burst(root, {
        x,
        y,
        count,
        colors: palette,
        distance: [radius * 0.9, radius * 1.6],
        size: variant === "stars" ? [4, 6] : [3, 5],
        duration: duration / 1000,
        shape: variant === "stars" ? "star" : "circle",
      });
      return;
    }
    for (let i = 0; i < count; i++) {
      const angle = (360 / count) * i;
      const node = doc.createElement("span");
      node.setAttribute("aria-hidden", "true");
      Object.assign(node.style, {
        position: "absolute",
        left: `${x - thickness / 2}px`,
        top: `${y - length}px`,
        width: `${thickness}px`,
        height: `${length}px`,
        borderRadius: "9999px",
        background: palette[i % palette.length] ?? color,
        transformOrigin: "50% 100%",
        pointerEvents: "none",
      });
      root.appendChild(node);
      // Each line starts at the click point, flies out to `radius` and shrinks to nothing.
      const animation = node.animate(
        [
          { transform: `rotate(${angle}deg) translateY(${-radius * 0.15}px) scaleY(1)`, opacity: 1 },
          { transform: `rotate(${angle}deg) translateY(${-radius}px) scaleY(0)`, opacity: 0.6 },
        ],
        { duration, easing: `cubic-bezier(${easings.outExpo.join(", ")})`, fill: "forwards" },
      );
      animation.onfinish = () => node.remove();
    }
  };

  return (
    <div
      ref={mergeRefs(rootRef, ref)}
      data-state={active ? "active" : "static"}
      {...props}
      onClick={composeEventHandlers(onClick, spark)}
      className={cn(blockReset, "relative isolate", className)}
    />
  );
});
