"use client";
import { AnimatePresence, motion } from "motion/react";
import * as React from "react";
import { useControllableState } from "../hooks/use-controllable-state";
import { burst } from "../lib/burst";
import { cn } from "../lib/cn";
import { mergeRefs } from "../lib/compose";
import { observeTheme, resolveCssColors } from "../lib/css-color";
import { mulberry32 } from "../lib/random";
import { blockReset, controlReset, focusRing } from "../lib/styles";
import type { MotionSafeHTMLProps } from "../lib/types";
import { useIsomorphicLayoutEffect, useLatestRef } from "../lib/use-latest-ref";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export interface ScratchRevealProps extends Omit<MotionSafeHTMLProps<HTMLDivElement>, "children"> {
  /** The hidden content (a promo code, a reward, a spoiler). */
  children: React.ReactNode;
  /** Share of the cover (0..1) that must be scratched before it clears itself. Default 0.5. */
  threshold?: number;
  /** Brush diameter, px. Default 36. */
  brushSize?: number;
  /** Text printed on the cover. Default "Scratch to reveal". */
  coverText?: string;
  /** "foil": metallic sheen with speckles; "plain": a flat muted cover. Default "foil". */
  cover?: "foil" | "plain";
  /** Label of the button that reveals without scratching. Default "Reveal". */
  revealLabel?: string;
  /** Controlled revealed state. Setting it back to false repaints the cover. */
  revealed?: boolean;
  defaultRevealed?: boolean;
  onRevealedChange?: (revealed: boolean) => void;
  /** Called once each time the content is revealed (by scratching or the button). */
  onReveal?: () => void;
  /** Sparkle burst when it clears. Default true. */
  celebrate?: boolean;
}

const COVER_TOKENS = [
  "var(--pui-muted)",
  "color-mix(in oklab, var(--pui-muted-foreground) 35%, var(--pui-muted))",
  "var(--pui-surface)",
  "var(--pui-muted-foreground)",
  "var(--pui-foreground)",
] as const;

/** Share of transparent pixels in `data`, sampling every `stride`-th pixel. */
export function clearedShare(data: Uint8ClampedArray, stride = 16): number {
  let clear = 0;
  let total = 0;
  for (let i = 3; i < data.length; i += 4 * stride) {
    total += 1;
    if ((data[i] ?? 255) < 128) clear += 1;
  }
  return total === 0 ? 0 : clear / total;
}

/**
 * A scratch-off cover over any content. Drag to scratch; once enough is cleared the cover dissolves.
 * A real Reveal button gives keyboard and screen reader users the same result, and the content stays
 * out of the tab order and the accessibility tree until it is revealed.
 */
export const ScratchReveal = React.forwardRef<HTMLDivElement, ScratchRevealProps>(function ScratchReveal(
  {
    children,
    threshold = 0.5,
    brushSize = 36,
    coverText = "Scratch to reveal",
    cover = "foil",
    revealLabel = "Reveal",
    revealed: revealedProp,
    defaultRevealed = false,
    onRevealedChange,
    onReveal,
    celebrate = true,
    className,
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const rootRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const rootRefs = React.useMemo(() => mergeRefs(rootRef, ref), [ref]);
  const [revealed, setRevealed] = useControllableState({
    value: revealedProp,
    defaultValue: defaultRevealed,
    onChange: onRevealedChange,
    name: "revealed",
  });
  // false until the canvas has painted, so the CSS cover hides the content on the server and first paint.
  const [painted, setPainted] = React.useState(false);
  const [scratching, setScratching] = React.useState(false);
  const strokes = React.useRef(0);
  const last = React.useRef<{ x: number; y: number } | null>(null);
  const latest = useLatestRef({ threshold, brushSize, coverText, cover, onReveal, celebrate, reduced, revealed });

  const paint = React.useCallback(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!root || !canvas || !ctx) return;
    const { width, height } = root.getBoundingClientRect();
    if (width <= 0 || height <= 0) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // One computed color per token, in order (resolveCssColors falls back to the host text color).
    const [base, deep, light, ink, strong] = resolveCssColors(root, COVER_TOKENS) as [string, string, string, string, string];
    const { cover: kind, coverText: text } = latest.current;
    ctx.globalCompositeOperation = "source-over";
    if (kind === "foil") {
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, deep);
      gradient.addColorStop(0.35, base);
      gradient.addColorStop(0.5, light);
      gradient.addColorStop(0.65, base);
      gradient.addColorStop(1, deep);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
      // Fine speckles and diagonal brushed lines give the foil its grain.
      const random = mulberry32(7);
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = strong;
      for (let i = 0; i < (width * height) / 90; i += 1) ctx.fillRect(random() * width, random() * height, 1, 1);
      ctx.globalAlpha = 0.08;
      ctx.strokeStyle = light;
      ctx.lineWidth = 1;
      for (let x = -height; x < width; x += 6) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + height, height);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    } else {
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, width, height);
    }
    if (text) {
      const font = window.getComputedStyle(root).fontFamily || "sans-serif";
      const size = Math.max(12, Math.min(18, width / 18));
      ctx.font = `600 ${size}px ${font}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = ink;
      ctx.fillText(text, width / 2, height / 2, width - 32);
    }
    strokes.current = 0;
    setPainted(true);
  }, [latest]);

  const reveal = React.useCallback(
    (point?: { x: number; y: number }) => {
      if (latest.current.revealed) return;
      setRevealed(true);
      latest.current.onReveal?.();
      const root = rootRef.current;
      if (root && latest.current.celebrate && !latest.current.reduced) {
        const box = root.getBoundingClientRect();
        burst(root, {
          x: point?.x ?? box.width / 2,
          y: point?.y ?? box.height / 2,
          count: 14,
          shape: "star",
          distance: [30, 70],
          size: [5, 8],
          duration: 0.7,
          gravity: 18,
          colors: ["var(--pui-beam-from)", "var(--pui-beam-to)", "var(--pui-warning)"],
        });
      }
    },
    [latest, setRevealed],
  );

  // Paint on mount and whenever the cover is reset. Size changes keep the scratches, scaled.
  useIsomorphicLayoutEffect(() => {
    if (revealed) return;
    paint();
    const root = rootRef.current;
    if (!root || typeof ResizeObserver === "undefined") return;
    let size = `${root.clientWidth}x${root.clientHeight}`;
    const observer = new ResizeObserver(() => {
      const next = `${root.clientWidth}x${root.clientHeight}`;
      if (next === size) return;
      size = next;
      const canvas = canvasRef.current;
      if (!canvas || strokes.current === 0) return paint();
      const copy = document.createElement("canvas");
      copy.width = canvas.width;
      copy.height = canvas.height;
      copy.getContext("2d")?.drawImage(canvas, 0, 0);
      paint();
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = "destination-in";
      ctx.drawImage(copy, 0, 0, canvas.width, canvas.height);
      ctx.restore();
      strokes.current = 1;
    });
    observer.observe(root);
    const stopTheme = observeTheme(() => {
      if (strokes.current === 0) paint();
    });
    return () => {
      observer.disconnect();
      stopTheme();
    };
  }, [revealed, paint, cover, coverText]);

  // Keep covered content out of the tab order and the accessibility tree (no inert prop: React 18).
  useIsomorphicLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    if (revealed) el.removeAttribute("inert");
    else el.setAttribute("inert", "");
  }, [revealed]);

  const check = (point: { x: number; y: number }) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d", { willReadFrequently: true });
    if (!canvas || !ctx || canvas.width === 0) return;
    const share = clearedShare(ctx.getImageData(0, 0, canvas.width, canvas.height).data);
    if (share >= latest.current.threshold) reveal(point);
  };

  const scratch = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const box = canvas.getBoundingClientRect();
    const point = { x: event.clientX - box.left, y: event.clientY - box.top };
    const from = last.current ?? point;
    ctx.globalCompositeOperation = "destination-out";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = latest.current.brushSize;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(point.x + 0.01, point.y + 0.01);
    ctx.stroke();
    last.current = point;
    strokes.current += 1;
    if (strokes.current % 10 === 0) check(point);
  };

  const end = () => {
    if (!scratching) return;
    setScratching(false);
    const point = last.current;
    last.current = null;
    if (point) check(point);
  };

  return (
    <div
      ref={rootRefs}
      data-state={revealed ? "revealed" : "covered"}
      {...props}
      className={cn(blockReset, "relative isolate overflow-hidden rounded-pui-xl", className)}
    >
      <motion.div
        ref={contentRef}
        aria-hidden={revealed ? undefined : true}
        tabIndex={-1}
        className={cn(blockReset, "outline-hidden")}
        initial={false}
        animate={reduced ? { opacity: 1 } : { scale: revealed ? 1 : 0.98, opacity: revealed ? 1 : 0.9 }}
        transition={{ type: "spring", stiffness: 260, damping: 30 }}
      >
        {children}
      </motion.div>
      <AnimatePresence>
        {revealed ? null : (
          <motion.div
            key="cover"
            className={cn(blockReset, "absolute inset-0")}
            initial={false}
            exit={reduced ? { opacity: 0, transition: { duration: 0.12 } } : { opacity: 0, scale: 1.04, filter: "blur(6px)" }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* CSS stand-in for the canvas until it paints (server render and first frame). */}
            {painted ? null : (
              <div
                aria-hidden="true"
                className={cn(
                  blockReset,
                  "absolute inset-0 grid place-items-center text-sm font-semibold text-pui-muted-foreground",
                  cover === "foil"
                    ? "bg-linear-135 from-pui-muted via-pui-surface to-pui-muted"
                    : "bg-pui-muted",
                )}
              >
                {coverText}
              </div>
            )}
            <canvas
              ref={canvasRef}
              aria-hidden="true"
              className={cn(blockReset, "absolute inset-0 size-full touch-none", scratching ? "cursor-grabbing" : "cursor-grab")}
              onPointerDown={(event) => {
                if (event.button !== 0) return;
                event.currentTarget.setPointerCapture?.(event.pointerId);
                setScratching(true);
                last.current = null;
                scratch(event);
              }}
              onPointerMove={(event) => {
                if (scratching) scratch(event);
              }}
              onPointerUp={end}
              onPointerCancel={end}
              onLostPointerCapture={end}
            />
            <button
              type="button"
              onClick={() => {
                reveal();
                // Move focus into the revealed content so keyboard users land on it.
                requestAnimationFrame(() => contentRef.current?.focus({ preventScroll: true }));
              }}
              className={cn(
                controlReset,
                "absolute right-2 bottom-2 inline-flex h-7 cursor-pointer items-center rounded-pui-full border border-pui-border bg-pui-background/85 px-3 text-xs font-medium text-pui-foreground shadow-pui-sm backdrop-blur-sm transition-colors duration-(--pui-duration-fast) hover:bg-pui-background",
                focusRing,
              )}
            >
              {revealLabel}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      <span role="status" className={cn(blockReset, "sr-only")}>
        {revealed ? "Revealed" : ""}
      </span>
    </div>
  );
});
