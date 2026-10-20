"use client";

import { AnimatePresence, motion } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { composeEventHandlers } from "../lib/compose";
import { easings, springs } from "../lib/motion";
import { blockReset } from "../lib/styles";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export interface ImageTrailProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Image URLs, used in order and cycled. */
  images: readonly string[];
  /** Pointer travel in px between two images. Default 80. */
  threshold?: number;
  /** How long each image stays before it falls away. Default 900. */
  lifetimeMs?: number;
  /** Most images on screen at once. Default 8. */
  maxActive?: number;
  /** Image width in px. Default 150. */
  imageWidth?: number;
  /** CSS aspect-ratio of each image. Default "4 / 5". */
  aspectRatio?: string;
  /** Random tilt range in degrees (±). Default 8. */
  rotate?: number;
  /** Draw the trail behind or in front of the children. Default "behind". */
  layer?: "behind" | "front";
  /** Class for each image. */
  imageClassName?: string;
  /** Shown instead of the trail under reduced motion (e.g. a static collage). Default nothing. */
  fallback?: React.ReactNode;
  disabled?: boolean;
}

interface TrailImage {
  id: number;
  src: string;
  x: number;
  y: number;
  rotate: number;
}

/**
 * Moving the pointer leaves a trail of images that pop in on a bouncy spring, then drop and fade.
 * Images are decorative (alt="", aria-hidden); touch and reduced motion get no trail.
 */
export const ImageTrail = React.forwardRef<HTMLDivElement, ImageTrailProps>(function ImageTrail(
  {
    images,
    threshold = 80,
    lifetimeMs = 900,
    maxActive = 8,
    imageWidth = 150,
    aspectRatio = "4 / 5",
    rotate = 8,
    layer = "behind",
    imageClassName,
    fallback,
    disabled = false,
    onPointerMove,
    onPointerLeave,
    className,
    children,
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const active = !reduced && !disabled && images.length > 0;
  const [trail, setTrail] = React.useState<TrailImage[]>([]);
  const travel = React.useRef<{ x: number; y: number; distance: number } | null>(null);
  const counter = React.useRef(0);
  const timers = React.useRef(new Set<ReturnType<typeof setTimeout>>());

  React.useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const timer of pending) clearTimeout(timer);
      pending.clear();
    };
  }, []);

  const spawn = (x: number, y: number) => {
    const id = counter.current++;
    const src = images[id % images.length]!;
    const tilt = (Math.random() * 2 - 1) * rotate;
    setTrail((current) => [...current, { id, src, x, y, rotate: tilt }].slice(-Math.max(1, maxActive)));
    const timer = setTimeout(() => {
      timers.current.delete(timer);
      setTrail((current) => current.filter((image) => image.id !== id));
    }, lifetimeMs);
    timers.current.add(timer);
  };

  const handleMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!active || event.pointerType === "touch") return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const last = travel.current;
    if (!last) {
      travel.current = { x, y, distance: 0 };
      spawn(x, y);
      return;
    }
    last.distance += Math.hypot(x - last.x, y - last.y);
    last.x = x;
    last.y = y;
    if (last.distance >= threshold) {
      last.distance = 0;
      spawn(x, y);
    }
  };

  return (
    <div
      ref={ref}
      data-state={active ? "active" : "static"}
      {...props}
      onPointerMove={composeEventHandlers(onPointerMove, handleMove)}
      onPointerLeave={composeEventHandlers(onPointerLeave, () => {
        travel.current = null;
      })}
      className={cn(blockReset, "relative isolate overflow-hidden", className)}
    >
      {reduced && fallback ? fallback : null}
      <div className={cn(blockReset, "relative", layer === "behind" ? "z-10" : "z-0")}>{children}</div>
      <div
        aria-hidden="true"
        data-pui-image-trail=""
        className={cn(blockReset, "pointer-events-none absolute inset-0", layer === "behind" ? "z-0" : "z-20")}
      >
        <AnimatePresence>
          {trail.map((image) => (
            <motion.img
              key={image.id}
              src={image.src}
              alt=""
              draggable={false}
              decoding="async"
              className={cn(
                blockReset,
                // The CSS `translate` property centers the image; Motion animates `transform` on top.
                "absolute block -translate-x-1/2 -translate-y-1/2 rounded-pui-md object-cover shadow-pui-lg ring-1 ring-pui-border/60",
                imageClassName,
              )}
              style={{
                width: imageWidth,
                aspectRatio,
                left: image.x,
                top: image.y,
              }}
              initial={{ scale: 0.6, opacity: 0, rotate: image.rotate * 0.4 }}
              animate={{ scale: 1, opacity: 1, rotate: image.rotate, transition: springs.bouncy }}
              exit={{ opacity: 0, y: 20, scale: 0.92, transition: { duration: 0.35, ease: easings.inQuint } }}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
});
