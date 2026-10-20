"use client";
import { animate, motion, useMotionValue, useTransform } from "motion/react";
import * as React from "react";
import { useControllableState } from "../hooks/use-controllable-state";
import { cn } from "../lib/cn";
import { springs } from "../lib/motion";
import { blockReset, focusRing } from "../lib/styles";
import type { MotionSafeHTMLProps, Orientation } from "../lib/types";
import { useLatestRef } from "../lib/use-latest-ref";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export interface ImageCompareProps extends Omit<MotionSafeHTMLProps<HTMLDivElement>, "defaultValue"> {
  /** Image URL (rendered as an img with `beforeLabel` as alt) or any node. Shown on the start side. */
  before: React.ReactNode;
  /** Image URL or any node. Shown on the end side. */
  after: React.ReactNode;
  /** Default "Before". */
  beforeLabel?: string;
  /** Default "After". */
  afterLabel?: string;
  /** Divider position in percent (0-100). */
  position?: number;
  /** Default 50. */
  defaultPosition?: number;
  onPositionChange?: (position: number) => void;
  /** "drag" moves on press and drag (and click to jump); "hover" follows the pointer. Default "drag". */
  mode?: "drag" | "hover";
  /** "horizontal" splits left/right, "vertical" splits top/bottom. Default "horizontal". */
  orientation?: Orientation;
  /** Show the corner labels. They fade as the divider approaches. Default true. */
  showLabels?: boolean;
  /** Accessible name of the divider (a slider). Default "Comparison divider". */
  handleLabel?: string;
}

function media(node: React.ReactNode, alt: string) {
  if (typeof node === "string") {
    return (
      <img
        src={node}
        alt={alt}
        draggable={false}
        className={cn(blockReset, "block size-full object-cover select-none")}
      />
    );
  }
  return node;
}

const clamp = (n: number) => Math.min(100, Math.max(0, n));

/**
 * Before/after slider for redesigns, photo edits and A/B results. Drag the divider, click to jump,
 * hover-follow, or use the arrow keys on the handle. The split is a clip-path on a motion value,
 * so moving it never re-renders the images.
 */
export const ImageCompare = React.forwardRef<HTMLDivElement, ImageCompareProps>(function ImageCompare(
  {
    before,
    after,
    beforeLabel = "Before",
    afterLabel = "After",
    position: positionProp,
    defaultPosition = 50,
    onPositionChange,
    mode = "drag",
    orientation = "horizontal",
    showLabels = true,
    handleLabel = "Comparison divider",
    className,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerLeave,
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const horizontal = orientation === "horizontal";
  const [position, setPosition] = useControllableState({
    value: positionProp,
    defaultValue: defaultPosition,
    onChange: onPositionChange,
    name: "position",
  });
  const [active, setActive] = React.useState(false);
  const pos = useMotionValue(clamp(position));
  const dragging = React.useRef(false);
  const latest = useLatestRef({ reduced, mode, setPosition });

  // Follow controlled or keyboard updates. Pointer moves set the motion value directly.
  React.useEffect(() => {
    if (dragging.current) return;
    const target = clamp(position);
    if (Math.abs(pos.get() - target) < 0.01) return;
    if (latest.current.reduced || latest.current.mode === "drag") pos.set(target);
    else {
      const controls = animate(pos, target, springs.snappy);
      return () => controls.stop();
    }
  }, [position, pos, latest]);

  const clipPath = useTransform(pos, (p) => (horizontal ? `inset(0 ${100 - p}% 0 0)` : `inset(0 0 ${100 - p}% 0)`));
  const offset = useTransform(pos, (p) => `${p}%`);
  const beforeOpacity = useTransform(pos, [0, 18], [0, 1]);
  const afterOpacity = useTransform(pos, [82, 100], [1, 0]);

  const fromPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const raw = horizontal ? (event.clientX - rect.left) / rect.width : (event.clientY - rect.top) / rect.height;
    return clamp(Math.round(raw * 1000) / 10);
  };

  const moveTo = (next: number, smooth: boolean) => {
    if (smooth && !latest.current.reduced) animate(pos, next, springs.snappy);
    else pos.set(next);
    setPosition(Math.round(next));
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 10 : 1;
    const current = Math.round(pos.get());
    let next: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") next = current + step;
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = current - step;
    else if (event.key === "PageUp") next = current + 10;
    else if (event.key === "PageDown") next = current - 10;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = 100;
    if (next === null) return;
    event.preventDefault();
    moveTo(clamp(next), false);
  };

  const rounded = Math.round(clamp(position));

  return (
    <div
      ref={ref}
      data-orientation={orientation}
      data-mode={mode}
      data-state={active ? "active" : "idle"}
      {...props}
      onPointerDown={(event) => {
        onPointerDown?.(event);
        if (event.defaultPrevented || mode !== "drag" || (event.pointerType === "mouse" && event.button !== 0)) return;
        dragging.current = true;
        setActive(true);
        event.currentTarget.setPointerCapture?.(event.pointerId);
        moveTo(fromPointer(event), true);
      }}
      onPointerMove={(event) => {
        onPointerMove?.(event);
        if (mode === "hover" && event.pointerType !== "touch") {
          const next = fromPointer(event);
          if (reduced) pos.set(next);
          else animate(pos, next, springs.snappy);
          setPosition(Math.round(next));
          return;
        }
        if (!dragging.current) return;
        const next = fromPointer(event);
        pos.set(next);
        setPosition(Math.round(next));
      }}
      onPointerUp={(event) => {
        onPointerUp?.(event);
        dragging.current = false;
        setActive(false);
      }}
      onPointerCancel={() => {
        dragging.current = false;
        setActive(false);
      }}
      onPointerLeave={onPointerLeave}
      className={cn(
        blockReset,
        "group/compare relative isolate aspect-video w-full select-none overflow-hidden rounded-pui-xl border border-pui-border bg-pui-muted",
        mode === "drag" && (horizontal ? "cursor-ew-resize touch-pan-y" : "cursor-ns-resize touch-pan-x"),
        className,
      )}
    >
      <div className={cn(blockReset, "absolute inset-0")}>{media(after, afterLabel)}</div>
      <motion.div className={cn(blockReset, "absolute inset-0")} style={{ clipPath }}>
        {media(before, beforeLabel)}
      </motion.div>
      {showLabels ? (
        <>
          <motion.span
            aria-hidden="true"
            style={{ opacity: beforeOpacity }}
            className={cn(
              blockReset,
              "pointer-events-none absolute top-3 left-3 rounded-full bg-pui-surface/80 px-2.5 py-1 text-xs font-medium text-pui-surface-foreground shadow-pui-sm backdrop-blur-sm",
            )}
          >
            {beforeLabel}
          </motion.span>
          <motion.span
            aria-hidden="true"
            style={{ opacity: afterOpacity }}
            className={cn(
              blockReset,
              "pointer-events-none absolute rounded-full bg-pui-surface/80 px-2.5 py-1 text-xs font-medium text-pui-surface-foreground shadow-pui-sm backdrop-blur-sm",
              horizontal ? "top-3 right-3" : "bottom-3 left-3",
            )}
          >
            {afterLabel}
          </motion.span>
        </>
      ) : null}
      <motion.div
        aria-hidden="true"
        style={horizontal ? { left: offset } : { top: offset }}
        className={cn(
          blockReset,
          "pointer-events-none absolute bg-pui-surface shadow-[0_0_0_1px_var(--pui-overlay),0_0_12px_var(--pui-overlay)]",
          horizontal ? "inset-y-0 w-0.5 -translate-x-1/2" : "inset-x-0 h-0.5 -translate-y-1/2",
        )}
      />
      <motion.div
        role="slider"
        tabIndex={0}
        aria-label={handleLabel}
        aria-orientation={orientation}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={rounded}
        aria-valuetext={`${rounded}% ${beforeLabel}, ${100 - rounded}% ${afterLabel}`}
        onKeyDown={onKeyDown}
        style={horizontal ? { left: offset } : { top: offset }}
        animate={{ scale: active && !reduced ? 1.12 : 1 }}
        transition={springs.press}
        className={cn(
          blockReset,
          "absolute grid size-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-pui-border bg-pui-surface text-pui-surface-foreground shadow-pui-lg",
          horizontal ? "top-1/2" : "left-1/2",
          focusRing,
        )}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={cn("size-4", !horizontal && "rotate-90")}
        >
          <path d="m9 7-5 5 5 5M15 7l5 5-5 5" />
        </svg>
      </motion.div>
    </div>
  );
});
