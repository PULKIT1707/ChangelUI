"use client";

import { motion, useMotionTemplate, useSpring, useTransform } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { composeEventHandlers, mergeRefs } from "../lib/compose";
import { springs } from "../lib/motion";
import { blockReset, focusRing } from "../lib/styles";
import type { MotionSafeHTMLProps } from "../lib/types";
import { useIsomorphicLayoutEffect } from "../lib/use-latest-ref";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export type LensShape = "circle" | "rounded";

export interface LensProps extends MotionSafeHTMLProps<HTMLDivElement> {
  /** Magnification. Default 2. */
  zoom?: number;
  /** Lens diameter in px. Default 160. */
  size?: number;
  /** Default "circle". */
  shape?: LensShape;
  /** Show and drag the lens with a finger (sets touch-action: none). Default false. */
  followOnTouch?: boolean;
  /** Keep the lens visible (controlled). Default: visible while hovered or focused. */
  active?: boolean;
  /** Lens center as fractions of the content box, used while `active` without a pointer. Default { x: 0.5, y: 0.5 }. */
  position?: { x: number; y: number };
  /** Accessible name of the focusable magnifier. Default "Magnifier". */
  label?: string;
  /** Keyboard step in px (Shift moves 4×). Default 12. */
  step?: number;
  /** Class for the lens ring. */
  lensClassName?: string;
  disabled?: boolean;
}

/**
 * Magnifier lens over an image or any content. A second, scaled copy of the children is clipped to
 * a circle (or rounded square) at the pointer. Focus it and use the arrow keys to move the lens.
 */
export const Lens = React.forwardRef<HTMLDivElement, LensProps>(function Lens(
  {
    zoom = 2,
    size = 160,
    shape = "circle",
    followOnTouch = false,
    active,
    position,
    label = "Magnifier",
    step = 12,
    lensClassName,
    disabled = false,
    onPointerEnter,
    onPointerMove,
    onPointerLeave,
    onPointerDown,
    onFocus,
    onBlur,
    onKeyDown,
    className,
    style,
    children,
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const copyRef = React.useRef<HTMLDivElement | null>(null);
  const [engaged, setEngaged] = React.useState(false);
  const shown = !disabled && (active ?? engaged);
  const radius = size / 2;

  const spring = reduced ? { stiffness: 10000, damping: 1000, mass: 0.1 } : springs.snappy;
  const x = useSpring(0, spring);
  const y = useSpring(0, spring);
  const width = useSpring(0, { stiffness: 10000, damping: 1000 });
  const height = useSpring(0, { stiffness: 10000, damping: 1000 });
  const open = useSpring(0, reduced ? { stiffness: 10000, damping: 1000 } : springs.smooth);
  const r = useTransform(open, (o) => o * radius);
  const corner = shape === "circle" ? radius : Math.min(radius, 18);
  const posX = position?.x ?? 0.5;
  const posY = position?.y ?? 0.5;
  const visibility = useTransform(open, (o) => (o > 0.01 ? "visible" : "hidden"));

  const clip = useTransform([x, y, r, width, height], ([cx, cy, rr, w, h]) => {
    const R = rr as number;
    if (shape === "circle") return `circle(${R}px at ${cx}px ${cy}px)`;
    const top = (cy as number) - R;
    const left = (cx as number) - R;
    const right = (w as number) - ((cx as number) + R);
    const bottom = (h as number) - ((cy as number) + R);
    return `inset(${top}px ${right}px ${bottom}px ${left}px round ${Math.min(corner, R)}px)`;
  });
  const origin = useMotionTemplate`${x}px ${y}px`;
  const ringX = useTransform(x, (v) => v - radius);
  const ringY = useTransform(y, (v) => v - radius);
  const ringScale = useTransform(open, (o) => 0.4 + o * 0.6);

  // Keep the copy out of the accessibility tree and the tab order (no `inert` prop: React 18 safe).
  useIsomorphicLayoutEffect(() => {
    copyRef.current?.setAttribute("inert", "");
  }, []);

  const measure = () => {
    const root = rootRef.current;
    if (!root) return null;
    width.set(root.clientWidth);
    height.set(root.clientHeight);
    return root;
  };

  useIsomorphicLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    measure();
    if (active) {
      x.jump(posX * root.clientWidth);
      y.jump(posY * root.clientHeight);
    }
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => measure());
    observer.observe(root);
    return () => observer.disconnect();
  }, [active, posX, posY]);

  React.useEffect(() => {
    open.set(shown ? 1 : 0);
  }, [shown, open]);

  const follow = (event: React.PointerEvent<HTMLDivElement>, jump = false) => {
    const root = measure();
    if (!root) return;
    const rect = root.getBoundingClientRect();
    const px = event.clientX - rect.left;
    const py = event.clientY - rect.top;
    if (jump) {
      x.jump(px);
      y.jump(py);
    } else {
      x.set(px);
      y.set(py);
    }
  };
  const allowed = (event: React.PointerEvent) => !disabled && (event.pointerType !== "touch" || followOnTouch);

  const move = (dx: number, dy: number) => {
    const root = measure();
    if (!root) return;
    x.set(Math.min(Math.max(x.get() + dx, 0), root.clientWidth));
    y.set(Math.min(Math.max(y.get() + dy, 0), root.clientHeight));
  };

  return (
    <div
      ref={mergeRefs(rootRef, ref)}
      role="group"
      aria-label={label}
      aria-roledescription="magnifier"
      tabIndex={disabled ? undefined : 0}
      data-state={shown ? "active" : "idle"}
      data-shape={shape}
      {...props}
      onPointerEnter={composeEventHandlers(onPointerEnter, (event) => {
        if (!allowed(event)) return;
        follow(event, true);
        setEngaged(true);
      })}
      onPointerMove={composeEventHandlers(onPointerMove, (event) => {
        if (!allowed(event)) return;
        follow(event);
        if (!engaged) setEngaged(true);
      })}
      onPointerDown={composeEventHandlers(onPointerDown, (event) => {
        if (!allowed(event) || event.pointerType !== "touch") return;
        follow(event, true);
        setEngaged(true);
      })}
      onPointerLeave={composeEventHandlers(onPointerLeave, (event) => {
        if (event.currentTarget.matches(":focus-visible")) return;
        setEngaged(false);
      })}
      onFocus={composeEventHandlers(onFocus, (event) => {
        if (disabled || event.target !== event.currentTarget) return;
        // Pointer clicks also focus the group; only keyboard focus opens the lens here.
        if (!event.currentTarget.matches(":focus-visible")) return;
        const root = measure();
        if (root && !engaged) {
          x.jump(root.clientWidth / 2);
          y.jump(root.clientHeight / 2);
        }
        setEngaged(true);
      })}
      onBlur={composeEventHandlers(onBlur, () => setEngaged(false))}
      onKeyDown={composeEventHandlers(onKeyDown, (event) => {
        if (disabled) return;
        const d = event.shiftKey ? step * 4 : step;
        const keys: Record<string, [number, number]> = {
          ArrowLeft: [-d, 0],
          ArrowRight: [d, 0],
          ArrowUp: [0, -d],
          ArrowDown: [0, d],
        };
        const delta = keys[event.key];
        if (delta) {
          event.preventDefault();
          if (!engaged) setEngaged(true);
          move(delta[0], delta[1]);
        } else if (event.key === "Escape" && engaged) {
          event.preventDefault();
          setEngaged(false);
        }
      })}
      style={{ ...(followOnTouch ? { touchAction: "none" } : null), ...style }}
      className={cn(blockReset, "relative isolate block overflow-hidden", focusRing, className)}
    >
      {children}
      <motion.div
        ref={copyRef}
        aria-hidden="true"
        data-pui-lens-copy=""
        className={cn(blockReset, "pointer-events-none absolute inset-0 z-10 bg-pui-background")}
        style={{ clipPath: clip, WebkitClipPath: clip, visibility }}
      >
        <motion.div
          className={cn(blockReset, "size-full")}
          style={{ scale: zoom, transformOrigin: origin }}
        >
          {children}
        </motion.div>
      </motion.div>
      <motion.div
        aria-hidden="true"
        data-pui-lens=""
        className={cn(
          blockReset,
          "pointer-events-none absolute left-0 top-0 z-20 border-2 border-pui-background/80 shadow-[0_0_0_1px_var(--pui-border),var(--pui-shadow-lg),inset_0_0_24px_color-mix(in_oklab,var(--pui-background)_35%,transparent)]",
          shape === "circle" ? "rounded-pui-full" : "rounded-pui-lg",
          lensClassName,
        )}
        style={{
          width: size,
          height: size,
          x: ringX,
          y: ringY,
          scale: ringScale,
          opacity: open,
          visibility,
        }}
      />
    </div>
  );
});
