"use client";

import { AnimatePresence, animate, motion, useMotionValue, useTransform, type AnimationPlaybackControls } from "motion/react";
import * as React from "react";
import { buttonBase, buttonSizes } from "../lib/button-styles";
import { cn } from "../lib/cn";
import { CheckIcon } from "../lib/icons";
import { easings, springs } from "../lib/motion";
import { blockReset, controlReset, disabledStyles, focusRing } from "../lib/styles";
import { toneClasses } from "../lib/tone";
import type { MotionSafeHTMLProps, Size, Tone } from "../lib/types";
import { useLatestRef } from "../lib/use-latest-ref";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export type HoldToConfirmState = "idle" | "holding" | "confirmed";

export interface HoldToConfirmProps
  extends Omit<MotionSafeHTMLProps<HTMLButtonElement>, "children" | "onClick"> {
  /** Called once the hold completes. */
  onConfirm: () => void;
  /** Label while idle or holding. Default "Hold to delete". */
  children?: React.ReactNode;
  /** Label after confirming. Default "Deleted". */
  confirmedLabel?: React.ReactNode;
  /** How long the press must last, ms. Default 1200. */
  holdMs?: number;
  /** Return to idle this long after confirming, ms. 0 stays confirmed. Default 1800. */
  resetMs?: number;
  /** Default "danger". */
  tone?: Tone;
  /** Default "md". */
  size?: Size;
  /** Default "soft". */
  variant?: "soft" | "outline";
  /** Leading icon shown while idle. */
  icon?: React.ReactNode;
  /** Screen reader hint. Default "Press and hold to confirm". */
  hintLabel?: string;
  disabled?: boolean;
  /** Called whenever the state changes. */
  onStateChange?: (state: HoldToConfirmState) => void;
}

const variants = {
  soft: "border border-(--pui-tone)/25 bg-(--pui-tone)/12 text-(--pui-tone-text)",
  outline: "border border-(--pui-tone)/45 bg-transparent text-(--pui-tone-text)",
} as const;

/**
 * Destructive action that needs a press-and-hold: a fill sweeps across while the label flips to the
 * tone's foreground color under it, then a check confirms. Releasing early springs the fill back.
 * Space and Enter hold works the same as a pointer press.
 */
export const HoldToConfirm = React.forwardRef<HTMLButtonElement, HoldToConfirmProps>(function HoldToConfirm(
  {
    onConfirm,
    children = "Hold to delete",
    confirmedLabel = "Deleted",
    holdMs = 1200,
    resetMs = 1800,
    tone = "danger",
    size = "md",
    variant = "soft",
    icon,
    hintLabel = "Press and hold to confirm",
    disabled = false,
    onStateChange,
    className,
    onPointerDown,
    onKeyDown,
    onKeyUp,
    onBlur,
    onContextMenu,
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const hintId = React.useId();
  const [state, setState] = React.useState<HoldToConfirmState>("idle");
  const [confirmCount, setConfirmCount] = React.useState(0);
  const progress = useMotionValue(0);
  const clipPath = useTransform(progress, (p) => `inset(0 ${(1 - p) * 100}% 0 0)`);
  const controls = React.useRef<AnimationPlaybackControls | null>(null);
  const resetTimer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const latest = useLatestRef({ onConfirm, onStateChange, holdMs, resetMs, reduced });
  // Read by the handlers; set together with the state so a quick release always sees "holding".
  const stateRef = React.useRef<HoldToConfirmState>("idle");

  const update = React.useCallback(
    (next: HoldToConfirmState) => {
      stateRef.current = next;
      setState(next);
      latest.current.onStateChange?.(next);
    },
    [latest],
  );

  React.useEffect(
    () => () => {
      controls.current?.stop();
      clearTimeout(resetTimer.current);
    },
    [],
  );

  const start = React.useCallback(() => {
    if (stateRef.current === "confirmed") return;
    controls.current?.stop();
    const remaining = (1 - progress.get()) * latest.current.holdMs;
    update("holding");
    controls.current = animate(progress, 1, {
      duration: remaining / 1000,
      ease: "linear",
      onComplete: () => {
        update("confirmed");
        setConfirmCount((n) => n + 1);
        if (typeof navigator !== "undefined") navigator.vibrate?.(12);
        latest.current.onConfirm();
        const wait = latest.current.resetMs;
        if (wait > 0) {
          resetTimer.current = setTimeout(() => {
            progress.set(0);
            update("idle");
          }, wait);
        }
      },
    });
  }, [latest, progress, update]);

  const cancel = React.useCallback(() => {
    if (stateRef.current !== "holding") return;
    controls.current?.stop();
    controls.current = animate(progress, 0, latest.current.reduced ? { duration: 0.15 } : springs.smooth);
    update("idle");
  }, [latest, progress, update]);

  const confirmed = state === "confirmed";
  const content = (fill: boolean) => (
    <span className={cn(blockReset, "grid place-items-center")}>
      <AnimatePresence initial={false} mode="popLayout">
        {confirmed ? (
          <motion.span
            key="done"
            className={cn(blockReset, "inline-flex items-center gap-2 [grid-area:1/1]")}
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: -8, filter: "blur(4px)" }}
            transition={reduced ? { duration: 0.15 } : springs.snappy}
          >
            <CheckIcon aria-hidden="true" className="size-4" />
            {confirmedLabel}
          </motion.span>
        ) : (
          <motion.span
            key="idle"
            className={cn(blockReset, "inline-flex items-center gap-2 [grid-area:1/1]")}
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: -8, filter: "blur(4px)" }}
            transition={reduced ? { duration: 0.15 } : springs.snappy}
          >
            {icon ? (
              <span aria-hidden="true" className={cn(blockReset, "inline-flex [&_svg]:size-4")}>
                {icon}
              </span>
            ) : null}
            {children}
          </motion.span>
        )}
      </AnimatePresence>
      {/* Width reserve: both labels share one grid cell so the button never changes size. */}
      <span aria-hidden="true" className={cn(blockReset, "invisible inline-flex items-center gap-2 [grid-area:1/1]")}>
        <CheckIcon className="size-4" />
        {confirmedLabel}
      </span>
      {fill ? null : (
        <span aria-hidden="true" className={cn(blockReset, "invisible inline-flex items-center gap-2 [grid-area:1/1]")}>
          {icon ? <span className={cn(blockReset, "inline-flex [&_svg]:size-4")}>{icon}</span> : null}
          {children}
        </span>
      )}
    </span>
  );

  return (
    <motion.button
      ref={ref}
      type="button"
      disabled={disabled}
      aria-describedby={hintId}
      data-state={state}
      data-tone={tone}
      animate={reduced ? undefined : { scale: state === "holding" ? 0.97 : 1 }}
      transition={springs.press}
      {...props}
      onPointerDown={(event) => {
        onPointerDown?.(event);
        if (event.defaultPrevented || event.button !== 0 || disabled) return;
        event.currentTarget.setPointerCapture?.(event.pointerId);
        start();
      }}
      onPointerUp={cancel}
      onPointerCancel={cancel}
      onLostPointerCapture={cancel}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (event.defaultPrevented || (event.key !== " " && event.key !== "Enter")) return;
        event.preventDefault();
        if (!event.repeat) start();
      }}
      onKeyUp={(event) => {
        onKeyUp?.(event);
        if (event.key === " " || event.key === "Enter") cancel();
      }}
      onBlur={(event) => {
        onBlur?.(event);
        cancel();
      }}
      onContextMenu={(event) => {
        onContextMenu?.(event);
        // Long presses on touch would otherwise open the system menu mid-hold.
        event.preventDefault();
      }}
      className={cn(
        controlReset,
        buttonBase,
        "isolate touch-manipulation [-webkit-touch-callout:none]",
        buttonSizes[size],
        variants[variant],
        toneClasses[tone],
        focusRing,
        disabledStyles,
        className,
      )}
    >
      {content(false)}
      <motion.span
        aria-hidden="true"
        style={{ clipPath }}
        className={cn(
          blockReset,
          "pointer-events-none absolute inset-0 flex items-center justify-center rounded-[inherit] bg-(--pui-tone) text-(--pui-tone-fg)",
        )}
      >
        {content(true)}
      </motion.span>
      <AnimatePresence>
        {confirmed && !reduced ? (
          <motion.span
            key={confirmCount}
            aria-hidden="true"
            className={cn(blockReset, "pointer-events-none absolute -inset-px rounded-[inherit] ring-2 ring-(--pui-tone)")}
            initial={{ opacity: 0.6, scale: 1 }}
            animate={{ opacity: 0, scale: 1.35 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: easings.out }}
          />
        ) : null}
      </AnimatePresence>
      <span id={hintId} className={cn(blockReset, "sr-only")}>
        {hintLabel}
      </span>
    </motion.button>
  );
});
