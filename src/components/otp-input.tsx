"use client";

import { animate, AnimatePresence, motion } from "motion/react";
import * as React from "react";
import { useControllableState } from "../hooks/use-controllable-state";
import { cn } from "../lib/cn";
import { mergeRefs } from "../lib/compose";
import { useFormReset } from "../lib/form";
import { toIdPart } from "../lib/ids";
import { springs } from "../lib/motion";
import { blockReset, controlReset } from "../lib/styles";
import type { Size } from "../lib/types";
import { useIsClient } from "../lib/use-is-client";
import { useLatestRef } from "../lib/use-latest-ref";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export type OtpInputPattern = "digits" | "alnum" | "alpha";
export type OtpInputStatus = "idle" | "success" | "error";

export interface OtpInputProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange" | "children"> {
  /** Number of characters. Default 6. */
  length?: number;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Called once each time the code becomes complete (typed, pasted or autofilled). */
  onComplete?: (code: string) => void;
  /** Allowed characters. Default "digits". */
  pattern?: OtpInputPattern;
  /** Uppercase letters as they are typed (alnum / alpha). Default true. */
  uppercase?: boolean;
  /** Show dots instead of the characters. Default false. */
  mask?: boolean;
  /** "error" shakes and tints the boxes; "success" fills them in sequence. Default "idle". */
  status?: OtpInputStatus;
  /** Visual gap after every N boxes, e.g. 3 for "123 456". */
  groupSize?: number;
  /** Shown in empty boxes. Default none. */
  placeholder?: string;
  /** Default "md". */
  size?: Size;
  disabled?: boolean;
  autoFocus?: boolean;
  /** Form field name for the code. */
  name?: string;
  /** Accessible name of the field. Default "Verification code". */
  label?: string;
  /** Props for the real input (id for a <label htmlFor>, aria-describedby, ...). */
  inputProps?: Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "value" | "defaultValue" | "onChange" | "size" | "type" | "maxLength" | "pattern"
  >;
}

const boxSizes: Record<Size, string> = {
  sm: "h-9 w-8 rounded-pui-sm text-base",
  md: "h-12 w-10 rounded-pui-md text-xl",
  lg: "h-14 w-12 rounded-pui-lg text-2xl",
};
const gaps: Record<Size, string> = { sm: "gap-1.5", md: "gap-2", lg: "gap-2.5" };
const groupGaps: Record<Size, string> = { sm: "w-2", md: "w-3", lg: "w-4" };

const filters: Record<OtpInputPattern, RegExp> = {
  digits: /[^0-9]/g,
  alnum: /[^A-Za-z0-9]/g,
  alpha: /[^A-Za-z]/g,
};

const statusBox: Record<OtpInputStatus, string> = {
  idle: "",
  success: "border-pui-success bg-pui-success/12 text-pui-success-text",
  error: "border-pui-danger bg-pui-danger/8 text-pui-danger-text",
};

/**
 * One-time code field (roadmap W2): a single real input (autofill and paste friendly) under a
 * segmented overlay. The active ring slides between boxes, characters pop in, an error shakes the
 * row and success fills the boxes one after another.
 */
export const OtpInput = React.forwardRef<HTMLDivElement, OtpInputProps>(function OtpInput(
  {
    length = 6,
    value: valueProp,
    defaultValue = "",
    onValueChange,
    onComplete,
    pattern = "digits",
    uppercase = true,
    mask = false,
    status = "idle",
    groupSize,
    placeholder,
    size = "md",
    disabled = false,
    autoFocus = false,
    name,
    label = "Verification code",
    inputProps,
    className,
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const isClient = useIsClient();
  const rootRef = React.useRef<HTMLDivElement>(null);
  const rowRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const mergedRef = React.useMemo(() => mergeRefs(rootRef, ref), [ref]);
  const ringId = `pui-otp-${toIdPart(React.useId())}`;
  const [value, setValue] = useControllableState({ value: valueProp, defaultValue, onChange: onValueChange });
  const [focused, setFocused] = React.useState(false);
  useFormReset(rootRef, () => setValue(defaultValue));

  const clean = (raw: string) => {
    const kept = raw.replace(filters[pattern], "");
    return (uppercase && pattern !== "digits" ? kept.toUpperCase() : kept).slice(0, length);
  };
  const code = clean(value);
  const complete = code.length === length;

  // Shake on every switch into "error".
  const statusRef = useLatestRef(status);
  const [shakes, setShakes] = React.useState(0);
  const [previousStatus, setPreviousStatus] = React.useState(status);
  if (previousStatus !== status) {
    setPreviousStatus(status);
    if (status === "error") setShakes((n) => n + 1);
  }
  React.useEffect(() => {
    const row = rowRef.current;
    if (shakes === 0 || !row || reduced) return;
    const controls = animate(row, { x: [0, -6, 6, -4, 4, 0] }, { duration: 0.35, ease: "easeInOut" });
    return () => controls.stop();
  }, [shakes, reduced]);

  const update = (raw: string) => {
    const next = clean(raw);
    if (next === code) return;
    setValue(next);
    if (next.length === length && code.length !== length) onComplete?.(next);
  };

  // Keep the caret at the end so typing always fills the next box.
  const pinCaret = () => {
    const input = inputRef.current;
    if (!input) return;
    const end = input.value.length;
    if (input.selectionStart !== end || input.selectionEnd !== end) input.setSelectionRange(end, end);
  };

  const active = focused && !disabled ? Math.min(code.length, length - 1) : -1;
  const chars = Array.from({ length }, (_, i) => code[i] ?? "");

  const boxes: React.ReactNode[] = [];
  chars.forEach((char, i) => {
    if (groupSize && i > 0 && i % groupSize === 0) {
      boxes.push(
        <span key={`sep-${i}`} aria-hidden="true" className={cn(blockReset, "flex items-center justify-center", groupGaps[size])}>
          <span className={cn(blockReset, "h-0.5 w-full rounded-pui-full bg-pui-border")} />
        </span>,
      );
    }
    const isActive = i === active;
    const filled = char !== "";
    boxes.push(
      <span
        key={i}
        data-state={isActive ? "active" : filled ? "filled" : "empty"}
        className={cn(
          blockReset,
          "relative flex shrink-0 items-center justify-center border border-pui-input bg-pui-background font-semibold tabular-nums text-pui-foreground shadow-pui-xs",
          "transition-[background-color,border-color,color] duration-(--pui-duration-base) ease-pui-out",
          boxSizes[size],
          filled && status === "idle" && "border-pui-foreground/25",
          statusBox[status],
        )}
        style={status === "success" && !reduced ? { transitionDelay: `${i * 30}ms` } : undefined}
      >
        {isActive && status === "idle" ? (
          <motion.span
            layoutId={reduced ? undefined : ringId}
            transition={springs.snappy}
            className={cn(
              blockReset,
              "pointer-events-none absolute -inset-px rounded-[inherit] border-2 border-pui-ring shadow-[0_0_0_3px_color-mix(in_oklab,var(--pui-ring)_22%,transparent)]",
            )}
          />
        ) : null}
        <AnimatePresence initial={false} mode="popLayout">
          {filled ? (
            <motion.span
              key={`${i}-${char}`}
              initial={isClient && !reduced ? { scale: 0.6, opacity: 0 } : false}
              animate={{ scale: 1, opacity: 1 }}
              exit={reduced ? { opacity: 0, transition: { duration: 0 } } : { scale: 0.6, opacity: 0, transition: { duration: 0.1 } }}
              transition={springs.bouncy}
              className={cn(blockReset, "inline-flex leading-none")}
            >
              {mask ? <span className={cn(blockReset, "size-2.5 rounded-pui-full bg-current")} /> : char}
            </motion.span>
          ) : isActive ? (
            <motion.span
              key="caret"
              className={cn(blockReset, "h-[1.1em] w-0.5 rounded-pui-full bg-pui-foreground")}
              animate={reduced ? { opacity: 1 } : { opacity: [1, 1, 0, 0] }}
              transition={reduced ? { duration: 0 } : { duration: 1.05, repeat: Number.POSITIVE_INFINITY, times: [0, 0.5, 0.55, 1] }}
            />
          ) : placeholder ? (
            <span key="ph" className={cn(blockReset, "text-pui-muted-foreground/60")}>
              {placeholder}
            </span>
          ) : null}
        </AnimatePresence>
      </span>,
    );
  });

  return (
    <div
      ref={mergedRef}
      data-status={status}
      data-complete={complete ? "" : undefined}
      data-disabled={disabled ? "" : undefined}
      {...props}
      className={cn(blockReset, "relative inline-flex", disabled && "opacity-50", className)}
    >
      <div ref={rowRef} aria-hidden="true" className={cn(blockReset, "flex items-center", gaps[size])}>
        {boxes}
      </div>
      <input
        ref={inputRef}
        type="text"
        inputMode={pattern === "digits" ? "numeric" : "text"}
        autoComplete="one-time-code"
        autoCapitalize={pattern === "digits" ? "off" : "characters"}
        autoCorrect="off"
        spellCheck={false}
        pattern={pattern === "digits" ? "[0-9]*" : undefined}
        maxLength={length}
        aria-label={inputProps?.["aria-labelledby"] ? undefined : label}
        aria-invalid={status === "error" || undefined}
        disabled={disabled}
        autoFocus={autoFocus}
        name={name}
        {...inputProps}
        value={code}
        onChange={(event) => update(event.target.value)}
        onPaste={(event) => {
          inputProps?.onPaste?.(event);
          if (event.defaultPrevented) return;
          // Pasting replaces the whole code ("Your code is 123-456" works too).
          const text = event.clipboardData.getData("text");
          const pasted = clean(text);
          if (!pasted) return;
          event.preventDefault();
          update(pasted);
        }}
        onFocus={(event) => {
          inputProps?.onFocus?.(event);
          setFocused(true);
          requestAnimationFrame(pinCaret);
        }}
        onBlur={(event) => {
          inputProps?.onBlur?.(event);
          setFocused(false);
        }}
        onSelect={pinCaret}
        onKeyDown={(event) => {
          inputProps?.onKeyDown?.(event);
          if (event.key === "ArrowLeft" || event.key === "ArrowRight" || event.key === "Home" || event.key === "End") {
            event.preventDefault();
          }
          if (event.key === "Escape" && code !== "" && statusRef.current !== "success") {
            event.preventDefault();
            update("");
          }
        }}
        className={cn(
          controlReset,
          "absolute inset-0 h-full w-full cursor-text bg-transparent text-transparent caret-transparent outline-hidden selection:bg-transparent",
          "disabled:cursor-not-allowed [-webkit-text-fill-color:transparent]",
          inputProps?.className,
        )}
      />
    </div>
  );
});
