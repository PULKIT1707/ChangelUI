"use client";
import { motion, useScroll, useSpring, useTransform, type MotionValue } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { mergeRefs } from "../lib/compose";
import { sceneHeight, useContainerHeight } from "../lib/scroll-linked";
import { blockReset } from "../lib/styles";
import type { MotionSafeHTMLProps } from "../lib/types";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export interface ZoomParallaxImage {
  src: string;
  alt: string;
}

export interface ZoomParallaxProps extends MotionSafeHTMLProps<HTMLDivElement> {
  /** Up to 7 images. The first is the center one that grows to fill the scene. */
  images: ZoomParallaxImage[];
  /** Scroll box the scene lives in. Default: the window. */
  container?: React.RefObject<HTMLElement | null>;
  /** Total scroll length as a CSS length. Default "300vh" (three sticky heights inside a container). */
  height?: string;
  /** Height of the sticky viewport. Default: the container height, else 100vh. */
  viewportHeight?: string;
  /** Zoom multiplier: 1 is the standard 4x center zoom, higher flies further. Default 1. */
  intensity?: number;
  /** Ease the zoom with a spring. Default true. */
  smooth?: boolean;
  /** Optional overlay (a headline, a CTA) that fades in once the center image fills the scene. */
  children?: React.ReactNode;
}

// Box (percent of the scene) and final scale of each slot. Slot 0 is the center image.
const SLOTS = [
  { w: 25, h: 25, top: 37.5, left: 37.5, scale: 4 },
  { w: 35, h: 30, top: 5, left: 5, scale: 5 },
  { w: 20, h: 45, top: 10, left: 66, scale: 6 },
  { w: 25, h: 25, top: 66, left: 72, scale: 5 },
  { w: 20, h: 25, top: 68, left: 12, scale: 6 },
  { w: 30, h: 25, top: 70, left: 38, scale: 8 },
  { w: 15, h: 15, top: 38, left: 16, scale: 9 },
] as const;

function ZoomSlot({
  image,
  slot,
  progress,
  intensity,
  index,
}: {
  image: ZoomParallaxImage;
  slot: (typeof SLOTS)[number];
  progress: MotionValue<number>;
  intensity: number;
  index: number;
}) {
  const scale = useTransform(progress, [0, 1], [1, 1 + (slot.scale - 1) * intensity]);
  // Satellites fade a touch at the very end so the center image owns the frame.
  const opacity = useTransform(progress, [0, 0.75, 1], index === 0 ? [1, 1, 1] : [1, 1, 0.6]);
  return (
    <motion.div
      style={{ scale, opacity }}
      className={cn(blockReset, "absolute inset-0 flex items-center justify-center will-change-transform")}
    >
      <div
        style={{
          width: `${slot.w}%`,
          height: `${slot.h}%`,
          top: `${slot.top}%`,
          left: `${slot.left}%`,
        }}
        className={cn(blockReset, "absolute overflow-hidden rounded-pui-lg bg-pui-muted shadow-pui-lg")}
      >
        <img
          src={image.src}
          alt={image.alt}
          loading="lazy"
          decoding="async"
          draggable={false}
          className={cn(blockReset, "block size-full object-cover select-none")}
        />
      </div>
    </motion.div>
  );
}

/**
 * Scroll-driven zoom for hero transitions: the center image scales up until it fills the scene while
 * the satellite images fly outward past the edges. Under reduced motion it is a static image grid.
 */
export const ZoomParallax = React.forwardRef<HTMLDivElement, ZoomParallaxProps>(function ZoomParallax(
  {
    images,
    container,
    height = "300vh",
    viewportHeight,
    intensity = 1,
    smooth = true,
    className,
    style,
    children,
    ...props
  },
  ref,
) {
  const sceneRef = React.useRef<HTMLDivElement>(null);
  const mergedRef = React.useMemo(() => mergeRefs(sceneRef, ref), [ref]);
  const reduced = usePrefersReducedMotion();
  const measured = useContainerHeight(container);
  const stickyHeight = sceneHeight(measured, viewportHeight);
  const { scrollYProgress } = useScroll({ target: sceneRef, container, offset: ["start start", "end end"] });
  const eased = useSpring(scrollYProgress, { stiffness: 160, damping: 30, restDelta: 0.0005 });
  const progress = smooth ? eased : scrollYProgress;
  const overlayOpacity = useTransform(progress, [0.62, 0.9], [0, 1]);
  const overlayY = useTransform(progress, [0.62, 0.9], [16, 0]);
  const shown = images.slice(0, SLOTS.length);

  if (reduced) {
    return (
      <div ref={mergedRef} data-state="static" {...props} style={style} className={cn(blockReset, "relative", className)}>
        <div className={cn(blockReset, "grid grid-cols-2 gap-3 sm:grid-cols-3")}>
          {shown.map((image, index) => (
            <div
              key={`${image.src}-${index}`}
              className={cn(
                blockReset,
                "aspect-[4/3] overflow-hidden rounded-pui-lg bg-pui-muted",
                index === 0 && "col-span-2 row-span-2 aspect-auto sm:col-span-2",
              )}
            >
              <img src={image.src} alt={image.alt} loading="lazy" className={cn(blockReset, "block size-full object-cover")} />
            </div>
          ))}
        </div>
        {children ? <div className={cn(blockReset, "mt-6")}>{children}</div> : null}
      </div>
    );
  }

  return (
    <div
      ref={mergedRef}
      data-state="animated"
      {...props}
      style={{ height, ...style }}
      className={cn(blockReset, "relative", className)}
    >
      <div style={{ height: stickyHeight }} className={cn(blockReset, "sticky top-0 overflow-hidden")}>
        {shown.map((image, index) => (
          <ZoomSlot
            key={`${image.src}-${index}`}
            image={image}
            slot={SLOTS[index] ?? SLOTS[0]}
            progress={progress}
            intensity={intensity}
            index={index}
          />
        ))}
        {children ? (
          <motion.div
            style={{ opacity: overlayOpacity, y: overlayY }}
            className={cn(blockReset, "pointer-events-none absolute inset-0 flex items-center justify-center p-6 [&>*]:pointer-events-auto")}
          >
            {children}
          </motion.div>
        ) : null}
      </div>
    </div>
  );
});
