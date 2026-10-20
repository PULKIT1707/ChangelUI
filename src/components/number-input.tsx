"use client";

import { animate, motion } from "motion/react";
import * as React from "react";
import { useControllableState } from "../hooks/use-controllable-state";
import { RollingNumber } from "../text/rolling-number";
import { cn } from "../lib/cn";
import { mergeRefs } from "../lib/compose";
import { toIdPart } from "../lib/ids";
import { invalidClasses } from "../lib/field-styles";
import { useFormReset } from "../lib/form";
import { ChevronDownIcon, ChevronUpIcon, MinusIcon, PlusIcon } from "../lib/icons";
import { springs } from "../lib/motion";
import { blockReset, controlReset, textSize } from "../lib/styles";
import type { Size } from "../lib/types";
import { useLatestRef } from "../lib/use-latest-ref";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export type NumberInputLayout = "split" | "stacked";

export interface NumberInputProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange" | "children"> {
  value?: number;
  /** Default: min, or 0 when 0 is in range. */
  defaultValue?: number;
  onValueChange?: (value: number) => void;
  min?: number;
  max?: number;
  /** Arrow keys, buttons and wheel. Default 1. */
  step?: number;
  /** PageUp / PageDown. Default step * 10. */
  largeStep?: number;
  /** Decimal places the value is rounded to. Default: the decimals of `step`. */
  precision?: number;
  /** Intl.NumberFormat options for the display: currency, percent, unit, ... */
  format?: Intl.NumberFormatOptions;
  /** Fixed so server and client agree. Default "en-US". */
  locale?: string;
  /** Holding a button repeats faster and faster. false repeats at a steady rate. Default true. */
  holdAccelerate?: boolean;
  /** Mouse wheel steps the value while the field is focused. Default true. */
  allowWheel?: boolean;
  /** Show the value as rolling odometer digits while not typing. Default true. */
  roll?: boolean;
  /** "split": − value +. "stacked": value with up/down chevrons on the end. Default "split". */
  layout?: NumberInputLayout;
  /** Default "md". */
  size?: Size;
  disabled?: boolean;
  readOnly?: boolean;
  invalid?: boolean;
  /** Hidden form input with this name; form reset restores defaultValue. */
  name?: string;
  /** Default "Increase". */
  incrementLabel?: string;
  /** Default "Decrease". */
  decrementLabel?: string;
  /** Props for the spinbutton input (id for a <label htmlFor>, aria-describedby, ...). */
  inputProps?: Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "defaultValue" | "onChange" | "size" | "type">;
}

const heights: Record<Size, string> = { sm: "h-8", md: "h-9", lg: "h-11" };
const squares: Record<Size, string> = { sm: "w-8", md: "w-9", lg: "w-11" };
const icons: Record<Size, string> = { sm: "size-3.5", md: "size-4", lg: "size-5" };
const pads: Record<Size, string> = { sm: "px-2", md: "px-2.5", lg: "px-3" };

const HOLD_DELAY_MS = 400;
const REPEAT_MS = 120;
const FASTEST_MS = 35;
const WHEEL_THRESHOLD = 40;

function decimalsOf(n: number): number {
  if (!Number.isFinite(n)) return 0;
  const text = String(n);
  const exp = /e-(\d+)$/.exec(text);
  if (exp) return Number(exp[1]);
  return (text.split(".")[1] ?? "").length;
}

function roundTo(n: number, precision: number): number {
  const f = 10 ** precision;
  return Math.round(n * f) / f;
}

/** Parses typed text in the formatter's locale: strips grouping, currency and unit text. */
function parseNumber(text: string, locale: string, percent: boolean): number | null {
  const parts = new Intl.NumberFormat(locale).formatToParts(-12345.6);
  const group = parts.find((p) => p.type === "group")?.value ?? ",";
  const decimal = parts.find((p) => p.type === "decimal")?.value ?? ".";
  let s = text.replace(/[\u2212\u2012\u2013]/g, "-").replace(/\s/g, "");
  if (group.trim() !== "") s = s.split(group).join("");
  s = s.split(decimal).join(".").replace(/[^\d.-]/g, "");
  if (!/\d/.test(s)) return null;
  const negative = s.startsWith("-");
  const n = Number.parseFloat(s.replace(/-/g, ""));
  if (!Number.isFinite(n)) return null;
  const signed = negative ? -n : n;
  return percent ? signed / 100 : signed;
}

/**
 * Stepper field (roadmap W2): −/+ buttons with press-and-hold acceleration, arrow keys, PageUp/Down,
 * Home/End and the wheel. While you are not typing, the value shows as rolling odometer digits, and
 * stepping past min or max gives the field a small springy bump.
 */
export const NumberInput = React.forwardRef<HTMLDivElement, NumberInputProps>(function NumberInput(
  {
    value: valueProp,
    defaultValue,
    onValueChange,
    min,
    max,
    step = 1,
    largeStep,
    precision: precisionProp,
    format,
    locale = "en-US",
    holdAccelerate = true,
    allowWheel = true,
    roll = true,
    layout = "split",
    size = "md",
    disabled = false,
    readOnly = false,
    invalid = false,
    name,
    incrementLabel = "Increase",
    decrementLabel = "Decrease",
    inputProps,
    className,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledBy,
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const rootRef = React.useRef<HTMLDivElement>(null);
  const mergedRef = React.useMemo(() => mergeRefs(rootRef, ref), [ref]);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const autoId = React.useId();
  const inputId = inputProps?.id ?? `pui-num-${toIdPart(autoId)}`;
  const valueRef = React.useRef<HTMLDivElement>(null);
  const precision = precisionProp ?? decimalsOf(step);
  const lo = min ?? Number.NEGATIVE_INFINITY;
  const hi = max ?? Number.POSITIVE_INFINITY;
  const fallback = defaultValue ?? (min !== undefined && min > 0 ? min : max !== undefined && max < 0 ? max : 0);
  const [value, setValue] = useControllableState<number>({ value: valueProp, defaultValue: fallback, onChange: onValueChange });
  const [draft, setDraft] = React.useState<string | null>(null);
  const [pressed, setPressed] = React.useState<-1 | 0 | 1>(0);
  const [focused, setFocused] = React.useState(false);
  useFormReset(rootRef, () => setValue(fallback));

  const percent = format?.style === "percent";
  const formatOptions = React.useMemo(() => {
    const options: Intl.NumberFormatOptions = { ...format };
    if (format?.minimumFractionDigits === undefined && format?.maximumFractionDigits === undefined) {
      const digits = percent ? Math.max(0, precision - 2) : precision;
      options.minimumFractionDigits = digits;
      options.maximumFractionDigits = digits;
    }
    return options;
  }, [format, precision, percent]);
  const formatter = React.useMemo(() => new Intl.NumberFormat(locale, formatOptions), [locale, formatOptions]);

  const safe = Number.isFinite(value) ? value : 0;
  const text = formatter.format(safe);
  const atMin = safe <= lo;
  const atMax = safe >= hi;
  const interactive = !disabled && !readOnly;

  const clamp = (n: number) => roundTo(Math.min(hi, Math.max(lo, n)), precision);

  const bump = (direction: 1 | -1) => {
    const el = valueRef.current;
    if (!el || reduced) return;
    void animate(el, { x: direction * 4 }, { duration: 0.05 }).then(() => animate(el, { x: 0 }, springs.wobbly));
  };

  const latest = useLatestRef({ safe, draft, interactive, step, largeStep, locale, percent });

  /** Steps from the typed draft (if any) or the value; returns false at a limit. */
  const stepBy = (direction: 1 | -1, size: "small" | "large" = "small"): boolean => {
    const { safe: current, draft: typed, step: s, largeStep: ls } = latest.current;
    const base = typed !== null ? (parseNumber(typed, locale, percent) ?? current) : current;
    const amount = size === "large" ? (ls ?? s * 10) : s;
    const next = clamp(base + direction * amount);
    setDraft(null);
    if (next === current && clamp(base) === current) {
      bump(direction);
      return false;
    }
    setValue(next);
    return direction > 0 ? next < hi : next > lo;
  };

  const commit = () => {
    if (draft === null) return;
    const parsed = parseNumber(draft, locale, percent);
    setDraft(null);
    if (parsed === null) return;
    const next = clamp(parsed);
    if (next !== parsed) bump(parsed > next ? 1 : -1);
    setValue(next);
  };

  // Press and hold: one step now, then repeats that speed up (or stay steady).
  const timer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const stopHold = React.useCallback(() => {
    if (timer.current !== undefined) clearTimeout(timer.current);
    timer.current = undefined;
    setPressed(0);
  }, []);
  React.useEffect(() => stopHold, [stopHold]);
  const stepRef = useLatestRef(stepBy);
  const startHold = (direction: 1 | -1) => {
    stopHold();
    if (!interactive) return;
    setPressed(direction);
    if (!stepRef.current(direction)) return;
    let count = 0;
    const tick = () => {
      count++;
      if (!latest.current.interactive || !stepRef.current(direction)) {
        stopHold();
        return;
      }
      const delay = holdAccelerate ? Math.max(FASTEST_MS, REPEAT_MS * 0.9 ** count) : REPEAT_MS;
      timer.current = setTimeout(tick, delay);
    };
    timer.current = setTimeout(tick, HOLD_DELAY_MS);
  };

  // Wheel while focused, with a non-passive listener so the page does not scroll.
  React.useEffect(() => {
    const input = inputRef.current;
    if (!input || !focused || !allowWheel || !interactive) return;
    let acc = 0;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      acc += event.deltaMode === 1 ? event.deltaY * WHEEL_THRESHOLD : event.deltaY;
      if (Math.abs(acc) < WHEEL_THRESHOLD) return;
      stepRef.current(acc < 0 ? 1 : -1);
      acc = 0;
    };
    input.addEventListener("wheel", onWheel, { passive: false });
    return () => input.removeEventListener("wheel", onWheel);
  }, [focused, allowWheel, interactive, stepRef]);

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    inputProps?.onKeyDown?.(event);
    if (event.defaultPrevented || !interactive) return;
    switch (event.key) {
      case "ArrowUp":
        event.preventDefault();
        stepBy(1);
        break;
      case "ArrowDown":
        event.preventDefault();
        stepBy(-1);
        break;
      case "PageUp":
        event.preventDefault();
        stepBy(1, "large");
        break;
      case "PageDown":
        event.preventDefault();
        stepBy(-1, "large");
        break;
      case "Home":
        if (min === undefined) return;
        event.preventDefault();
        setDraft(null);
        setValue(min);
        break;
      case "End":
        if (max === undefined) return;
        event.preventDefault();
        setDraft(null);
        setValue(max);
        break;
      case "Enter":
        commit();
        break;
      case "Escape":
        if (draft === null) return;
        event.preventDefault();
        setDraft(null);
        break;
    }
  };

  const showRoll = roll && draft === null;

  const stepButton = (direction: 1 | -1, stacked: boolean) => {
    const limit = direction > 0 ? atMax : atMin;
    const Icon = stacked ? (direction > 0 ? ChevronUpIcon : ChevronDownIcon) : direction > 0 ? PlusIcon : MinusIcon;
    return (
      <button
        type="button"
        tabIndex={-1}
        aria-label={direction > 0 ? incrementLabel : decrementLabel}
        aria-controls={inputId}
        aria-disabled={limit || !interactive || undefined}
        disabled={disabled}
        data-limit={limit ? "" : undefined}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          // Keep focus (and the caret) where it is.
          event.preventDefault();
          event.currentTarget.setPointerCapture?.(event.pointerId);
          startHold(direction);
        }}
        onMouseDown={(event) => event.preventDefault()}
        onPointerUp={stopHold}
        onPointerCancel={stopHold}
        onLostPointerCapture={stopHold}
        onClick={(event) => {
          // Keyboard-triggered clicks (detail 0) step once; pointer clicks already stepped on press.
          if (event.detail === 0) stepBy(direction);
        }}
        className={cn(
          controlReset,
          "inline-flex shrink-0 cursor-pointer items-center justify-center text-pui-muted-foreground outline-hidden transition-colors duration-(--pui-duration-fast)",
          "hover:bg-pui-muted hover:text-pui-foreground active:bg-pui-muted",
          "data-[limit]:cursor-default data-[limit]:text-pui-muted-foreground/45 data-[limit]:hover:bg-transparent",
          "disabled:cursor-not-allowed",
          stacked ? "h-1/2 w-full" : cn(squares[size], "h-full"),
        )}
      >
        <motion.span
          aria-hidden="true"
          className={cn(blockReset, "inline-flex")}
          animate={{ scale: pressed === direction && !reduced ? 0.78 : 1 }}
          transition={springs.press}
        >
          <Icon className={stacked ? "size-3.5" : icons[size]} />
        </motion.span>
      </button>
    );
  };

  const stacked = layout === "stacked";

  return (
    <div
      ref={mergedRef}
      role="group"
      data-size={size}
      data-layout={layout}
      data-disabled={disabled ? "" : undefined}
      data-invalid={invalid ? "" : undefined}
      {...props}
      className={cn(
        blockReset,
        "relative inline-flex w-full min-w-0 items-stretch overflow-hidden rounded-pui-md border border-pui-input bg-transparent text-pui-foreground shadow-pui-xs",
        "transition-[border-color,box-shadow] duration-(--pui-duration-base) ease-pui-out",
        "focus-within:border-pui-ring focus-within:shadow-[0_0_0_3px_color-mix(in_oklab,var(--pui-ring)_25%,transparent)]",
        heights[size],
        textSize[size],
        disabled && "pointer-events-none opacity-50",
        invalid && invalidClasses,
        className,
      )}
    >
      {!stacked ? <span className={cn(blockReset, "flex border-e border-pui-input")}>{stepButton(-1, false)}</span> : null}
      <div ref={valueRef} className={cn(blockReset, "relative flex min-w-0 flex-1 items-stretch")}>
        <input
          ref={inputRef}
          type="text"
          role="spinbutton"
          inputMode={precision > 0 || lo < 0 ? "decimal" : "numeric"}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledBy}
          aria-valuenow={safe}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuetext={text}
          aria-invalid={invalid || undefined}
          disabled={disabled}
          readOnly={readOnly}
          {...inputProps}
          id={inputId}
          value={draft ?? text}
          onChange={(event) => {
            if (interactive) setDraft(event.target.value);
          }}
          onFocus={(event) => {
            inputProps?.onFocus?.(event);
            setFocused(true);
          }}
          onBlur={(event) => {
            inputProps?.onBlur?.(event);
            setFocused(false);
            commit();
          }}
          onKeyDown={onKeyDown}
          className={cn(
            controlReset,
            "h-full w-full min-w-0 bg-transparent tabular-nums outline-hidden",
            pads[size],
            stacked ? "text-start" : "text-center",
            showRoll ? "text-transparent caret-pui-foreground selection:bg-pui-primary/25" : "text-pui-foreground",
            inputProps?.className,
          )}
        />
        {roll ? (
          <span
            aria-hidden="true"
            className={cn(
              blockReset,
              "pointer-events-none absolute inset-0 flex items-center tabular-nums transition-opacity duration-(--pui-duration-instant)",
              pads[size],
              stacked ? "justify-start" : "justify-center",
              showRoll ? "opacity-100" : "opacity-0",
            )}
          >
            <RollingNumber value={safe} format={formatOptions} locale={locale} />
          </span>
        ) : null}
      </div>
      {stacked ? (
        <span className={cn(blockReset, "flex w-7 shrink-0 flex-col border-s border-pui-input [&>button+button]:border-t [&>button+button]:border-pui-input")}>
          {stepButton(1, true)}
          {stepButton(-1, true)}
        </span>
      ) : (
        <span className={cn(blockReset, "flex border-s border-pui-input")}>{stepButton(1, false)}</span>
      )}
      {name !== undefined ? <input type="hidden" name={name} value={String(safe)} disabled={disabled} /> : null}
    </div>
  );
});
