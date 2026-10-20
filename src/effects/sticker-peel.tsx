"use client";

import { animate, motion, useMotionValue, useTransform } from "motion/react";
import * as React from "react";
import { useElementSize } from "../hooks/use-element-size";
import { cn } from "../lib/cn";
import { composeEventHandlers, mergeRefs } from "../lib/compose";
import { useDrag } from "../lib/drag";
import { springs } from "../lib/motion";
import { blockReset } from "../lib/styles";
import type { MotionSafeHTMLProps } from "../lib/types";
import { useLatestRef } from "../lib/use-latest-ref";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export type StickerPeelCorner = "top-left" | "top-right" | "bottom-left" | "bottom-right";

export interface StickerPeelProps extends MotionSafeHTMLProps<HTMLDivElement> {
  /** How far it peels on hover, as a share of the shorter side (0-1). Default 0.3. */
  peel?: number;
  /** Peel at rest, as a share of the shorter side. Also the reduced-motion state. Default 0.06. */
  rest?: number;
  /** Corner that lifts. Default "bottom-right". */
  direction?: StickerPeelCorner;
  /** Grab the corner and pull it; it snaps back on release. Default true. */
  draggable?: boolean;
  /** Peel on hover and keyboard focus within. Default true. */
  hover?: boolean;
  /** Back of the flap: plain sticker paper, or a lighter mirrored copy of the front. Default "paper". */
  back?: "paper" | "mirror";
  /** Called once the corner is pulled past ~85% of the shorter side. */
  onPeeled?: () => void;
  disabled?: boolean;
}

interface Geometry {
  sx: 1 | -1;
  sy: 1 | -1;
}

const corners: Record<StickerPeelCorner, Geometry> = {
  "top-left": { sx: -1, sy: -1 },
  "top-right": { sx: 1, sy: -1 },
  "bottom-left": { sx: -1, sy: 1 },
  "bottom-right": { sx: 1, sy: 1 },
};

/** Clip polygon of the front: the rectangle with the peeled corner cut along a 45° fold. */
function frontClip(corner: StickerPeelCorner, p: number): string {
  const q = `${p}px`;
  const r = `calc(100% - ${q})`;
  const pts: Record<StickerPeelCorner, string[]> = {
    "top-left": [`0 ${q}`, `${q} 0`],
    "top-right": [`${r} 0`, `100% ${q}`],
    "bottom-right": [`100% ${r}`, `${r} 100%`],
    "bottom-left": [`${q} 100%`, `0 ${r}`],
  };
  const order: StickerPeelCorner[] = ["top-left", "top-right", "bottom-right", "bottom-left"];
  const plain: Record<StickerPeelCorner, string> = {
    "top-left": "0 0",
    "top-right": "100% 0",
    "bottom-right": "100% 100%",
    "bottom-left": "0 100%",
  };
  return `polygon(${order.map((c) => (c === corner ? pts[c].join(", ") : plain[c])).join(", ")})`;
}

/** Clip of the lifted triangle in the element's own coordinates (before the fold reflection). */
function flapClip(corner: StickerPeelCorner, p: number): string {
  const q = `${p}px`;
  const r = `calc(100% - ${q})`;
  const tri: Record<StickerPeelCorner, string> = {
    "top-left": `0 0, ${q} 0, 0 ${q}`,
    "top-right": `100% 0, 100% ${q}, ${r} 0`,
    "bottom-right": `100% 100%, ${r} 100%, 100% ${r}`,
    "bottom-left": `0 100%, 0 ${r}, ${q} 100%`,
  };
  return `polygon(${tri[corner]})`;
}

/** Reflection across the fold line x·sx + y·sy = k, as a CSS matrix with origin 0 0. */
function foldMatrix({ sx, sy }: Geometry, width: number, height: number, p: number): string {
  const cx = sx > 0 ? width : 0;
  const cy = sy > 0 ? height : 0;
  const k = sx * cx + sy * cy - p;
  const m = -sx * sy;
  return `matrix(0, ${m}, ${m}, 0, ${k * sx}, ${k * sy})`;
}

/**
 * A sticker whose corner peels back on hover or drag, with a paper back, a curl shade and a cast
 * shadow, then snaps back on a wobbly spring. Wrap any badge, avatar, logo or CTA. The front stays
 * the real content; the flap is decorative.
 */
export const StickerPeel = React.forwardRef<HTMLDivElement, StickerPeelProps>(function StickerPeel(
  {
    peel = 0.3,
    rest = 0.06,
    direction = "bottom-right",
    draggable = true,
    hover = true,
    back = "paper",
    onPeeled,
    disabled = false,
    onPointerEnter,
    onPointerLeave,
    onFocus,
    onBlur,
    className,
    children,
    ...props
  },
  ref,
) {
  const rootRef = React.useRef<HTMLDivElement>(null);
  const mirrorRef = React.useRef<HTMLDivElement>(null);
  const mergedRef = React.useMemo(() => mergeRefs(rootRef, ref), [ref]);
  const reduced = usePrefersReducedMotion();
  const enabled = !disabled && !reduced;
  const { width, height } = useElementSize(rootRef, { box: "border-box" });
  const short = Math.min(width, height);
  const geometry = corners[direction];
  const restPx = Math.max(0, rest) * short;
  const peelPx = Math.min(Math.max(peel, 0), 1) * short;
  const amount = useMotionValue(0);
  const state = React.useRef({ hovered: false, dragging: false, peeled: false });
  const [dragging, setDragging] = React.useState(false);

  const settle = React.useCallback(
    (target: number) => {
      animate(amount, target, enabled ? springs.wobbly : { duration: 0 });
    },
    [amount, enabled],
  );

  // Rest whenever the size, rest share or motion setting changes.
  React.useEffect(() => {
    if (!state.current.dragging) settle(state.current.hovered && enabled && hover ? peelPx : restPx);
  }, [restPx, peelPx, enabled, hover, settle]);

  // The mirrored copy must never take focus or clicks.
  React.useEffect(() => {
    mirrorRef.current?.setAttribute("inert", "");
  }, [back]);

  const onPeeledRef = useLatestRef(onPeeled);

  useDrag(
    rootRef,
    {
      onStart: ({ x, y, event }) => {
        const target = event.target as Element | null;
        if (target?.closest("button, a, input, textarea, select, [role='button']")) return false;
        const cx = geometry.sx > 0 ? width : 0;
        const cy = geometry.sy > 0 ? height : 0;
        // Only presses near the lifted corner grab the sticker.
        if (Math.hypot(x - cx, y - cy) > Math.max(short * 0.55, 48)) return false;
        state.current.dragging = true;
        setDragging(true);
      },
      onMove: ({ x, y }) => {
        const cx = geometry.sx > 0 ? width : 0;
        const cy = geometry.sy > 0 ? height : 0;
        const pulled = ((cx - x) * geometry.sx + (cy - y) * geometry.sy) / 2;
        const max = short * 0.95;
        const next = Math.min(Math.max(pulled, restPx), max);
        amount.set(next);
        if (!state.current.peeled && next > short * 0.85) {
          state.current.peeled = true;
          onPeeledRef.current?.();
        }
      },
      onEnd: () => {
        state.current.dragging = false;
        state.current.peeled = false;
        setDragging(false);
        settle(state.current.hovered && hover ? peelPx : restPx);
      },
    },
    { enabled: enabled && draggable && short > 0, threshold: 2 },
  );

  const front = useTransform(amount, (p) => frontClip(direction, Math.max(p, 0)));
  const flap = useTransform(amount, (p) => flapClip(direction, Math.max(p, 0)));
  const fold = useTransform(amount, (p) => foldMatrix(geometry, width, height, Math.max(p, 0)));
  const flapSize = useTransform(amount, (p) => `${Math.max(p, 0)}px ${Math.max(p, 0)}px`);
  const flapVisible = useTransform(amount, (p) => (p > 0.5 ? 1 : 0));
  const shadeDir = `to ${geometry.sy > 0 ? "top" : "bottom"} ${geometry.sx > 0 ? "left" : "right"}`;
  const cornerPos = `${geometry.sx > 0 ? "right" : "left"} ${geometry.sy > 0 ? "bottom" : "top"}`;
  // Tip is lit, the crease is shaded: the gradient's 50% line is exactly the fold.
  const curl = `linear-gradient(${shadeDir}, color-mix(in oklab, var(--pui-shimmer) 85%, transparent) 0%, color-mix(in oklab, var(--pui-shimmer) 35%, transparent) 30%, color-mix(in oklab, var(--pui-overlay) 45%, transparent) 50%, transparent 50%)`;

  const setHover = (next: boolean) => {
    state.current.hovered = next;
    if (!enabled || !hover || state.current.dragging) return;
    settle(next ? peelPx : restPx);
  };

  return (
    <div
      ref={mergedRef}
      data-state={enabled ? "interactive" : "static"}
      data-direction={direction}
      data-dragging={dragging ? "" : undefined}
      {...props}
      onPointerEnter={composeEventHandlers(onPointerEnter, (event) => {
        if (event.pointerType !== "touch") setHover(true);
      })}
      onPointerLeave={composeEventHandlers(onPointerLeave, () => setHover(false))}
      onFocus={composeEventHandlers(onFocus, () => setHover(true))}
      onBlur={composeEventHandlers(onBlur, (event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setHover(false);
      })}
      className={cn(
        blockReset,
        "relative inline-block",
        enabled && draggable ? (dragging ? "cursor-grabbing touch-none select-none" : "cursor-grab") : "",
        className,
      )}
    >
      {/* Cast shadow on the surface under the lifted corner. */}
      <motion.div
        aria-hidden="true"
        className={cn(blockReset, "pointer-events-none absolute inset-0")}
        style={{
          clipPath: flap,
          opacity: flapVisible,
          backgroundImage: `radial-gradient(circle at ${cornerPos}, color-mix(in oklab, var(--pui-overlay) 8%, transparent), color-mix(in oklab, var(--pui-overlay) 35%, transparent))`,
        }}
      />
      <motion.div className={cn(blockReset, "relative")} style={{ clipPath: front, WebkitClipPath: front }}>
        {children}
      </motion.div>
      <motion.div
        aria-hidden="true"
        className={cn(
          blockReset,
          "pointer-events-none absolute inset-0 drop-shadow-[0_2px_3px_color-mix(in_oklab,var(--pui-overlay)_70%,transparent)]",
        )}
        style={{ opacity: flapVisible }}
      >
        <motion.div
          className={cn(blockReset, "absolute top-0 left-0 overflow-hidden")}
          style={{ width, height, transform: fold, transformOrigin: "0 0", clipPath: flap, WebkitClipPath: flap }}
        >
          {back === "mirror" ? (
            <div ref={mirrorRef} className={cn(blockReset, "absolute inset-0 opacity-60 saturate-50")}>
              {children}
            </div>
          ) : null}
          <motion.div
            className={cn(blockReset, "absolute inset-0")}
            style={{
              backgroundColor:
                back === "paper" ? "color-mix(in oklab, var(--pui-surface) 82%, var(--pui-muted-foreground))" : "transparent",
              backgroundImage: curl,
              backgroundSize: flapSize,
              backgroundPosition: cornerPos,
              backgroundRepeat: "no-repeat",
            }}
          />
        </motion.div>
      </motion.div>
    </div>
  );
});
