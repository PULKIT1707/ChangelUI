"use client";

import { motion, useSpring } from "motion/react";
import * as React from "react";
import { Button, type ButtonProps } from "../components/button";
import { cn } from "../lib/cn";
import { composeEventHandlers } from "../lib/compose";
import { springs } from "../lib/motion";
import { blockReset } from "../lib/styles";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export interface GooeyButtonProps extends Omit<ButtonProps, "asChild" | "variant"> {
  /** Liquid droplets. Default 3. */
  blobs?: number;
  /** Blur radius of the gooey filter: higher melts more. Default 10. */
  intensity?: number;
  /** How far droplets pull away from the edge, as a share of the button height. Default 0.7. */
  stretch?: number;
}

const wobbly = { stiffness: springs.wobbly.stiffness, damping: springs.wobbly.damping };

function Blob({ index, count, size, target }: { index: number; count: number; size: number; target: { x: number; y: number } | null }) {
  const x = useSpring(0, wobbly);
  const y = useSpring(0, wobbly);
  const scale = useSpring(0.6, wobbly);
  React.useEffect(() => {
    if (!target) {
      x.set(0);
      y.set(0);
      scale.set(0.6);
      return;
    }
    // Droplets fan out around the pointer, alternating above and below the edge nearest to it.
    const spread = (index - (count - 1) / 2) * size * 0.9;
    const side = index % 2 === 0 ? Math.sign(target.y) || -1 : -(Math.sign(target.y) || -1);
    x.set(target.x + spread * 0.6);
    y.set(side * size * (0.55 + (index % 3) * 0.18));
    scale.set(0.75 + ((index * 37) % 5) * 0.06);
  }, [target, index, count, size, x, y, scale]);
  return (
    <motion.span
      aria-hidden="true"
      className={cn(blockReset, "absolute left-1/2 top-1/2 block rounded-pui-full bg-(--pui-tone)")}
      style={{ width: size, height: size, marginLeft: -size / 2, marginTop: -size / 2, x, y, scale }}
    />
  );
}

/**
 * Liquid button: droplets bubble out toward the pointer and melt back into the body through an SVG
 * gooey filter (blur + alpha threshold). The real Button sits on top; the filter only touches the
 * decorative layer. Reduced motion renders a plain solid Button.
 */
export const GooeyButton = React.forwardRef<HTMLButtonElement, GooeyButtonProps>(function GooeyButton(
  { blobs = 3, intensity = 10, stretch = 0.7, size = "md", onPointerMove, onPointerLeave, onPointerDown, className, children, ...props },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const uid = React.useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const [target, setTarget] = React.useState<{ x: number; y: number } | null>(null);
  const [pressed, setPressed] = React.useState(false);
  const height = size === "sm" ? 32 : size === "lg" ? 44 : 36;
  const blobSize = Math.round(height * stretch);
  const count = Math.min(Math.max(Math.round(blobs), 0), 8);

  if (reduced) {
    return (
      <Button ref={ref} size={size} {...props} className={className}>
        {children}
      </Button>
    );
  }

  const blur = Math.max(1, intensity);
  return (
    <Button
      ref={ref}
      size={size}
      {...props}
      data-gooey=""
      onPointerMove={composeEventHandlers(onPointerMove, (event) => {
        if (event.pointerType === "touch") return;
        const rect = event.currentTarget.getBoundingClientRect();
        setTarget({ x: event.clientX - rect.left - rect.width / 2, y: event.clientY - rect.top - rect.height / 2 });
      })}
      onPointerLeave={composeEventHandlers(onPointerLeave, () => {
        setTarget(null);
        setPressed(false);
      })}
      onPointerDown={composeEventHandlers(onPointerDown, () => {
        setPressed(true);
        const release = () => {
          setPressed(false);
          window.removeEventListener("pointerup", release);
        };
        window.addEventListener("pointerup", release);
      })}
      className={cn(
        "isolate overflow-visible bg-transparent shadow-none hover:bg-transparent active:shadow-none",
        className,
      )}
    >
      <svg aria-hidden="true" focusable="false" className={cn(blockReset, "pointer-events-none absolute size-0")}>
        <defs>
          <filter id={`${uid}-goo`} x="-50%" y="-100%" width="200%" height="300%" colorInterpolationFilters="sRGB">
            <feGaussianBlur in="SourceGraphic" stdDeviation={blur} result="blur" />
            <feColorMatrix in="blur" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -10" result="goo" />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
      </svg>
      <span
        aria-hidden="true"
        data-pui-gooey=""
        className={cn(blockReset, "pointer-events-none absolute inset-0 -z-10 block rounded-[inherit]")}
        style={{ filter: `url(#${uid}-goo)` }}
      >
        <motion.span
          className={cn(blockReset, "absolute inset-0 block rounded-[inherit] bg-(--pui-tone)")}
          animate={{ scaleX: pressed ? 0.96 : target ? 1.03 : 1, scaleY: pressed ? 0.9 : 1 }}
          transition={springs.wobbly}
        />
        {Array.from({ length: count }, (_, i) => (
          <Blob key={i} index={i} count={count} size={blobSize} target={target} />
        ))}
      </span>
      {children}
    </Button>
  );
});
