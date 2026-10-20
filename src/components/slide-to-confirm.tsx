"use client";
import { AnimatePresence, animate, motion, useMotionValue, useMotionValueEvent, useTransform } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { mergeRefs } from "../lib/compose";
import { useDrag } from "../lib/drag";
import { CheckIcon, ChevronRightIcon } from "../lib/icons";
import { easings, springs } from "../lib/motion";
import { blockReset, focusRing } from "../lib/styles";
import { toneClasses } from "../lib/tone";
import type { MotionSafeHTMLProps, Tone } from "../lib/types";
import { useLatestRef } from "../lib/use-latest-ref";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export type SlideToConfirmState = "idle" | "dragging" | "confirmed";

export interface SlideToConfirmProps extends Omit<MotionSafeHTMLProps<HTMLDivElement>, "children"> {
  /** Called once the thumb reaches the end. */
  onConfirm: () => void;
  /** Track label while idle. Default "Slide to confirm". */
  children?: React.ReactNode;
  /** Track label after confirming. Default "Confirmed". */
  confirmedLabel?: React.ReactNode;
  /** Fraction of the track (0-1) that counts as a confirm on release. Default 0.9. */
  threshold?: number;
  /** Slide back to idle this long after confirming, ms. 0 stays confirmed. Default 2000. */
  resetAfterMs?: number;
  /** Default "primary". */
  tone?: Tone;
  /** Track height 48 / 56 px. Default "md". */
  size?: "md" | "lg";
  /** Thumb icon while idle. Default a chevron. */
  icon?: React.ReactNode;
  /** Accessible name of the thumb (a slider). Default "Slide to confirm". */
  thumbLabel?: string;
  /** Screen reader hint. Default "Drag right, use the arrow keys, or press Enter to confirm". */
  hintLabel?: string;
  /** Polite announcement after confirming. Default "Confirmed". */
  confirmedAnnouncement?: string;
  disabled?: boolean;
  /** Called whenever the state changes. */
  onStateChange?: (state: SlideToConfirmState) => void;
}

const heights = { md: "h-12", lg: "h-14" } as const;
const thumbs = { md: "size-10", lg: "size-12" } as const;
const INSET = 4;
const STEP = 0.1;

const shimmer =
  "bg-clip-text text-transparent [--pui-text-shimmer-spread:3rem] [background-repeat:no-repeat,padding-box] [background-size:250%_100%,auto] [background-image:linear-gradient(90deg,transparent_calc(50%_-_var(--pui-text-shimmer-spread)),var(--pui-foreground),transparent_calc(50%_+_var(--pui-text-shimmer-spread))),linear-gradient(var(--pui-muted-foreground),var(--pui-muted-foreground))] animate-pui-text-shimmer [animation-duration:2.4s]";

/**
 * The "slide to unlock" track for checkout, payouts and other deliberate actions on touch-first UIs.
 * Drag the thumb past the threshold to confirm; an early release springs it back. The thumb is a
 * real slider, so arrow keys move it and Enter or End confirms.
 */
export const SlideToConfirm = React.forwardRef<HTMLDivElement, SlideToConfirmProps>(function SlideToConfirm(
  {
    onConfirm,
    children = "Slide to confirm",
    confirmedLabel = "Confirmed",
    threshold = 0.9,
    resetAfterMs = 2000,
    tone = "primary",
    size = "md",
    icon,
    thumbLabel = "Slide to confirm",
    hintLabel = "Drag right, use the arrow keys, or press Enter to confirm",
    confirmedAnnouncement = "Confirmed",
    disabled = false,
    onStateChange,
    className,
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const hintId = React.useId();
  const trackRef = React.useRef<HTMLDivElement>(null);
  const thumbRef = React.useRef<HTMLDivElement>(null);
  const rootRef = React.useMemo(() => mergeRefs(trackRef, ref), [ref]);
  const [state, setState] = React.useState<SlideToConfirmState>("idle");
  const [percent, setPercent] = React.useState(0);
  const x = useMotionValue(0);
  const progress = useMotionValue(0);
  const stateRef = React.useRef<SlideToConfirmState>("idle");
  const dragStart = React.useRef(0);
  const resetTimer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const latest = useLatestRef({ onConfirm, onStateChange, threshold, resetAfterMs, reduced, disabled });

  const maxX = React.useCallback(() => {
    const track = trackRef.current;
    const thumb = thumbRef.current;
    if (!track || !thumb) return 0;
    return Math.max(0, track.clientWidth - thumb.offsetWidth - INSET * 2);
  }, []);

  useMotionValueEvent(x, "change", (value) => {
    const max = maxX();
    const p = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
    progress.set(p);
    // aria-valuenow in 5% steps keeps re-renders low while dragging.
    const rounded = Math.round((p * 100) / 5) * 5;
    setPercent((prev) => (prev === rounded ? prev : rounded));
  });

  const fillWidth = useTransform(x, (value) => {
    const full = value + (thumbRef.current?.offsetWidth ?? 40) + INSET * 2;
    const track = trackRef.current?.clientWidth;
    return track ? Math.min(track, Math.max(0, full)) : full;
  });
  const labelOpacity = useTransform(progress, [0, 0.6], [1, 0]);
  const labelX = useTransform(progress, [0, 1], [0, 24]);

  const update = React.useCallback(
    (next: SlideToConfirmState) => {
      stateRef.current = next;
      setState(next);
      latest.current.onStateChange?.(next);
    },
    [latest],
  );

  React.useEffect(() => () => clearTimeout(resetTimer.current), []);

  // Keep a confirmed thumb pinned to the end when the track resizes.
  React.useEffect(() => {
    const track = trackRef.current;
    if (!track || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      if (stateRef.current === "confirmed") x.set(maxX());
      else if (stateRef.current === "idle") x.set(0);
    });
    observer.observe(track);
    return () => observer.disconnect();
  }, [maxX, x]);

  const springBack = React.useCallback(() => {
    animate(x, 0, latest.current.reduced ? { duration: 0.15 } : springs.bouncy);
  }, [latest, x]);

  const confirm = React.useCallback(() => {
    if (stateRef.current === "confirmed") return;
    animate(x, maxX(), latest.current.reduced ? { duration: 0.15 } : springs.snappy);
    update("confirmed");
    if (typeof navigator !== "undefined") navigator.vibrate?.(14);
    latest.current.onConfirm();
    const wait = latest.current.resetAfterMs;
    clearTimeout(resetTimer.current);
    if (wait > 0) {
      resetTimer.current = setTimeout(() => {
        update("idle");
        springBack();
      }, wait);
    }
  }, [latest, maxX, springBack, update, x]);

  useDrag(
    thumbRef,
    {
      onStart: () => {
        if (latest.current.disabled || stateRef.current === "confirmed") return false;
        x.stop();
        dragStart.current = x.get();
        update("dragging");
      },
      onMove: ({ dx }) => {
        const max = maxX();
        const next = dragStart.current + dx;
        // Rubber band past either end.
        x.set(next < 0 ? next * 0.15 : next > max ? max + (next - max) * 0.15 : next);
      },
      onEnd: ({ vx }) => {
        const p = progress.get();
        if (p >= latest.current.threshold || (vx > 900 && p > 0.5)) confirm();
        else {
          update("idle");
          springBack();
        }
      },
    },
    { axis: "x", enabled: !disabled },
  );

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled || stateRef.current === "confirmed") return;
    const max = maxX();
    const current = progress.get();
    let next: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowUp") next = current + STEP;
    else if (event.key === "ArrowLeft" || event.key === "ArrowDown") next = current - STEP;
    else if (event.key === "PageUp") next = current + STEP * 3;
    else if (event.key === "PageDown") next = current - STEP * 3;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End" || event.key === "Enter") next = 1;
    if (next === null) return;
    event.preventDefault();
    const clamped = Math.min(1, Math.max(0, next));
    if (clamped >= latest.current.threshold) {
      confirm();
      return;
    }
    animate(x, clamped * max, latest.current.reduced ? { duration: 0 } : springs.snappy);
  };

  const confirmed = state === "confirmed";
  const labelTransition = reduced ? { duration: 0.15 } : springs.snappy;
  const enter = reduced ? { opacity: 0 } : { opacity: 0, y: 8, filter: "blur(4px)" };
  const leave = reduced ? { opacity: 0 } : { opacity: 0, y: -8, filter: "blur(4px)" };

  return (
    <div
      ref={rootRef}
      data-state={state}
      data-tone={tone}
      data-size={size}
      data-disabled={disabled ? "" : undefined}
      {...props}
      className={cn(
        blockReset,
        "relative isolate flex w-full max-w-sm select-none items-center rounded-full border border-pui-border bg-pui-muted text-sm font-medium text-pui-foreground shadow-[inset_0_1px_2px_var(--pui-overlay)]",
        heights[size],
        toneClasses[tone],
        disabled && "pointer-events-none opacity-50",
        className,
      )}
    >
      {/* Fill that trails the thumb, then floods the track on confirm. */}
      <motion.span
        aria-hidden="true"
        style={{ width: confirmed ? "100%" : fillWidth }}
        className={cn(
          blockReset,
          "pointer-events-none absolute inset-y-0 left-0 -z-10 rounded-full transition-colors duration-(--pui-duration-base)",
          confirmed ? "bg-(--pui-tone)" : "bg-(--pui-tone)/18",
        )}
      />
      <span className={cn(blockReset, "pointer-events-none grid flex-1 place-items-center ps-12 pe-4 text-center")}>
        <AnimatePresence initial={false} mode="popLayout">
          {confirmed ? (
            <motion.span
              key="done"
              className={cn(blockReset, "inline-flex items-center gap-2 text-(--pui-tone-fg) [grid-area:1/1]")}
              initial={enter}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={leave}
              transition={labelTransition}
            >
              {confirmedLabel}
            </motion.span>
          ) : (
            <motion.span
              key="idle"
              className={cn(blockReset, "inline-flex [grid-area:1/1]")}
              initial={enter}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={leave}
              transition={labelTransition}
            >
              <motion.span
                style={{ opacity: labelOpacity, x: reduced ? 0 : labelX }}
                className={cn(blockReset, "inline-flex items-center gap-2")}
              >
                <span className={cn(blockReset, reduced || disabled ? "text-pui-muted-foreground" : shimmer)}>
                  {children}
                </span>
              </motion.span>
            </motion.span>
          )}
        </AnimatePresence>
      </span>
      <motion.div
        ref={thumbRef}
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label={thumbLabel}
        aria-describedby={hintId}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={confirmed ? 100 : percent}
        aria-valuetext={confirmed ? confirmedAnnouncement : `${percent}%`}
        aria-orientation="horizontal"
        aria-disabled={disabled || undefined}
        onKeyDown={onKeyDown}
        onBlur={() => {
          if (stateRef.current === "idle" && progress.get() > 0) springBack();
        }}
        style={{ x }}
        whileTap={reduced || confirmed ? undefined : { scale: 0.94 }}
        transition={springs.press}
        className={cn(
          blockReset,
          "absolute top-1 left-1 z-10 grid cursor-grab touch-none place-items-center rounded-full bg-(--pui-tone) text-(--pui-tone-fg) shadow-pui-md active:cursor-grabbing",
          "[&_svg]:size-5",
          thumbs[size],
          confirmed && "cursor-default",
          focusRing,
        )}
      >
        <AnimatePresence initial={false} mode="popLayout">
          {confirmed ? (
            <motion.span
              key="check"
              className={cn(blockReset, "grid place-items-center")}
              initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.4, rotate: -45 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={reduced ? { duration: 0.15 } : springs.bouncy}
            >
              <CheckIcon aria-hidden="true" />
            </motion.span>
          ) : (
            <motion.span
              key="arrow"
              className={cn(blockReset, "grid place-items-center")}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={reduced || state === "dragging" ? { opacity: 1, scale: 1, x: 0 } : { opacity: 1, scale: 1, x: [0, 3, 0] }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={
                reduced || state === "dragging"
                  ? { duration: 0.15 }
                  : { x: { duration: 1.4, ease: easings.inOut, repeat: Infinity, repeatDelay: 0.6 }, default: springs.snappy }
              }
            >
              {icon ?? <ChevronRightIcon aria-hidden="true" />}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>
      <AnimatePresence>
        {confirmed && !reduced ? (
          <motion.span
            key="pulse"
            aria-hidden="true"
            className={cn(blockReset, "pointer-events-none absolute -inset-px rounded-[inherit] ring-2 ring-(--pui-tone)")}
            initial={{ opacity: 0.55, scale: 1 }}
            animate={{ opacity: 0, scale: 1.08 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: easings.out }}
          />
        ) : null}
      </AnimatePresence>
      <span id={hintId} className={cn(blockReset, "sr-only")}>
        {hintLabel}
      </span>
      <span role="status" className={cn(blockReset, "sr-only")}>
        {confirmed ? confirmedAnnouncement : ""}
      </span>
    </div>
  );
});
