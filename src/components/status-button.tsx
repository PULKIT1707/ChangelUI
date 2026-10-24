"use client";
import { motion } from "motion/react";
import * as React from "react";
import { useControllableState } from "../hooks/use-controllable-state";
import { cn } from "../lib/cn";
import { mergeRefs } from "../lib/compose";
import { easings } from "../lib/motion";
import { blockReset, iconSize } from "../lib/styles";
import type { Tone } from "../lib/types";
import { useLatestRef } from "../lib/use-latest-ref";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";
import { playKeyframes } from "../lib/waapi";
import { Button, type ButtonProps } from "./button";
import { Spinner } from "./spinner";

export type ActionStatus = "idle" | "pending" | "success" | "error";

export interface StatusButtonProps extends Omit<ButtonProps, "loading" | "loadingText" | "leadingIcon" | "asChild"> {
  /**
   * Runs on click (after onClick, unless it called preventDefault). A returned promise drives the
   * pending, success and error states; a sync return counts as success, a throw as an error.
   */
  action?: (event: React.MouseEvent<HTMLButtonElement>) => unknown;
  /** Controlled status. Pair with onStatusChange. */
  status?: ActionStatus;
  /** Default "idle". */
  defaultStatus?: ActionStatus;
  onStatusChange?: (status: ActionStatus) => void;
  /** Shown while pending. Default "Working…". */
  pendingLabel?: React.ReactNode;
  /** Default "Done". */
  successLabel?: React.ReactNode;
  /** Default "Try again". */
  errorLabel?: React.ReactNode;
  /** Text read to screen readers on success / error. Defaults to the labels when they are strings. */
  successMessage?: string;
  errorMessage?: string;
  /** Milliseconds before success / error settle back to idle; 0 keeps them. Default 2200. */
  resetAfter?: number;
  /** Icon shown next to the idle label. */
  icon?: React.ReactNode;
  onSuccess?: (result: unknown) => void;
  onError?: (error: unknown) => void;
}

const sizeIcon = { sm: iconSize.sm, md: iconSize.md, lg: iconSize.lg } as const;

function DrawnCheck({ active, reduced, className }: { active: boolean; reduced: boolean; className: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={cn(blockReset, className)}>
      <motion.path
        d="M5 12.5l4.5 4.5L19 7.5"
        initial={false}
        animate={{ pathLength: active || reduced ? 1 : 0 }}
        transition={reduced ? { duration: 0 } : { duration: active ? 0.32 : 0, ease: easings.out, delay: active ? 0.08 : 0 }}
      />
    </svg>
  );
}

function AlertGlyph({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden="true" className={cn(blockReset, className)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5.5M12 16.5h.01" />
    </svg>
  );
}

/**
 * A button that owns the whole async lifecycle: idle -> pending -> success or error. Every label is
 * laid out in the same grid cell, so the button keeps the width of its longest state and never
 * jumps. Clicks are ignored while pending (no double submits), the result is announced politely,
 * success pops and error shakes.
 */
export const StatusButton = React.forwardRef<HTMLButtonElement, StatusButtonProps>(function StatusButton(
  {
    action,
    status: statusProp,
    defaultStatus = "idle",
    onStatusChange,
    pendingLabel = "Working…",
    successLabel = "Done",
    errorLabel = "Try again",
    successMessage,
    errorMessage,
    resetAfter = 2200,
    icon,
    onSuccess,
    onError,
    onClick,
    tone = "primary",
    size = "md",
    variant = "solid",
    className,
    children,
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const [status, setStatus] = useControllableState<ActionStatus>({
    value: statusProp,
    defaultValue: defaultStatus,
    onChange: onStatusChange,
    name: "status",
  });
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const refs = React.useMemo(() => mergeRefs(buttonRef, ref), [ref]);
  const run = React.useRef(0);
  const callbacks = useLatestRef({ action, onSuccess, onError });

  // Settle back to idle after a result; any new run or a controlled change cancels the timer.
  React.useEffect(() => {
    if ((status !== "success" && status !== "error") || resetAfter <= 0) return;
    const t = setTimeout(() => setStatus((s) => (s === status ? "idle" : s)), resetAfter);
    return () => clearTimeout(t);
  }, [status, resetAfter, setStatus]);

  // Result feedback: a small pop for success, a shake for errors. Skipped under reduced motion.
  const previous = React.useRef(status);
  React.useEffect(() => {
    if (previous.current === status) return;
    previous.current = status;
    if (reduced) return;
    if (status === "success") {
      playKeyframes(buttonRef.current, [{ transform: "scale(1)" }, { transform: "scale(1.045)" }, { transform: "scale(1)" }], {
        duration: 320,
        easing: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      });
    } else if (status === "error") {
      playKeyframes(
        buttonRef.current,
        [0, -6, 6, -4, 4, -2, 0].map((x) => ({ transform: `translateX(${x}px)` })),
        { duration: 420, easing: "ease-in-out" },
      );
    }
  }, [status, reduced]);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (status === "pending") {
      event.preventDefault();
      return;
    }
    onClick?.(event);
    if (event.defaultPrevented) return;
    const current = callbacks.current;
    if (!current.action) return;
    const id = ++run.current;
    let result: unknown;
    try {
      result = current.action(event);
    } catch (error) {
      setStatus("error");
      current.onError?.(error);
      return;
    }
    if (!(result instanceof Promise) && !(typeof result === "object" && result !== null && "then" in result)) {
      setStatus("success");
      current.onSuccess?.(result);
      return;
    }
    setStatus("pending");
    Promise.resolve(result).then(
      (value) => {
        if (run.current !== id) return;
        setStatus("success");
        callbacks.current.onSuccess?.(value);
      },
      (error: unknown) => {
        if (run.current !== id) return;
        setStatus("error");
        callbacks.current.onError?.(error);
      },
    );
  };

  const stateTone: Tone = status === "success" ? "success" : status === "error" ? "danger" : tone;
  const ic = sizeIcon[size];
  const layers: { key: ActionStatus; icon: React.ReactNode; label: React.ReactNode }[] = [
    { key: "idle", icon, label: children },
    { key: "pending", icon: <Spinner decorative size={size} variant="ring" className={ic} />, label: pendingLabel },
    { key: "success", icon: <DrawnCheck active={status === "success"} reduced={reduced} className={ic} />, label: successLabel },
    { key: "error", icon: <AlertGlyph className={ic} />, label: errorLabel },
  ];
  const announce =
    status === "success"
      ? (successMessage ?? (typeof successLabel === "string" ? successLabel : "Done"))
      : status === "error"
        ? (errorMessage ?? (typeof errorLabel === "string" ? errorLabel : "Failed"))
        : "";

  return (
    <>
      <Button
        ref={refs}
        variant={variant}
        tone={stateTone}
        size={size}
        data-status={status}
        aria-busy={status === "pending" ? true : undefined}
        aria-disabled={status === "pending" ? true : undefined}
        {...props}
        onClick={handleClick}
        className={cn(status === "pending" && "cursor-progress aria-disabled:pointer-events-auto aria-disabled:opacity-100", className)}
      >
        {/* All four states share one grid cell: the widest sets the width, so nothing jumps. */}
        <span className={cn(blockReset, "grid place-items-center")}>
          {layers.map((layer) => {
            const active = layer.key === status;
            return (
              <motion.span
                key={layer.key}
                aria-hidden={active ? undefined : true}
                data-layer={layer.key}
                className={cn(blockReset, "inline-flex items-center gap-2 whitespace-nowrap [grid-area:1/1]", !active && "pointer-events-none")}
                initial={false}
                animate={
                  reduced
                    ? { opacity: active ? 1 : 0 }
                    : { opacity: active ? 1 : 0, y: active ? 0 : layer.key === "idle" ? -8 : 8, filter: active ? "blur(0px)" : "blur(3px)" }
                }
                transition={reduced ? { duration: 0 } : { duration: 0.22, ease: easings.out }}
              >
                {layer.icon}
                {layer.label}
              </motion.span>
            );
          })}
        </span>
      </Button>
      <span role="status" className={cn(blockReset, "sr-only")}>
        {announce}
      </span>
    </>
  );
});
