"use client";

import { AnimatePresence, motion } from "motion/react";
import * as React from "react";
import { useControllableState } from "../hooks/use-controllable-state";
import { cn } from "../lib/cn";
import { mergeRefs } from "../lib/compose";
import { devWarn } from "../lib/dev";
import { hiddenInputClasses, useFormReset } from "../lib/form";
import { blockReset, controlReset, focusRing } from "../lib/styles";
import { toneClasses } from "../lib/tone";
import type { Size, Tone } from "../lib/types";

/** A tick on the track: a value, or a value with a label shown below the track. */
export type SliderMark = number | { value: number; label?: React.ReactNode };

export interface SliderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange" | "defaultValue"> {
  value?: number;
  /** Default min. */
  defaultValue?: number;
  onValueChange?: (value: number) => void;
  /** Fires on pointerup and on a keydown that changes the value. */
  onValueCommit?: (value: number) => void;
  /** Default 0. */
  min?: number;
  /** Default 100. */
  max?: number;
  /** Default 1 (values <= 0 become 1). */
  step?: number;
  /** PageUp/PageDown step. Default 10 * step. */
  largeStep?: number;
  disabled?: boolean;
  /** Default "md". */
  size?: Size;
  /** Default "primary". */
  tone?: Tone;
  /** Renders a hidden input for native form submission. */
  name?: string;
  /** Value bubble: "active" shows it while dragging or focused. Default "active". */
  showValue?: "never" | "active" | "always";
  /** Bubble text and aria-valuetext. */
  formatValue?: (value: number) => string;
  /** Decorative tick dots on the track; labelled marks also show their label below it. */
  marks?: SliderMark[];
  /** Pointer values snap to the nearest mark; arrow and page keys move mark to mark. Needs marks. */
  snapToMarks?: boolean;
}

export interface RangeSliderProps
  extends Omit<SliderProps, "value" | "defaultValue" | "onValueChange" | "onValueCommit"> {
  value?: [number, number];
  /** Default [min, max]. */
  defaultValue?: [number, number];
  onValueChange?: (value: [number, number]) => void;
  /** Fires on pointerup and on a keydown that changes a value. */
  onValueCommit?: (value: [number, number]) => void;
  /** Minimum distance between the thumbs, in steps. Default 0. */
  minStepsBetweenThumbs?: number;
  /** Thumb names. Default ["Minimum", "Maximum"]. */
  thumbLabels?: [string, string];
}

const heights: Record<Size, string> = { sm: "h-4", md: "h-5", lg: "h-6" };
const tracks: Record<Size, string> = { sm: "h-1", md: "h-1.5", lg: "h-2" };
const thumbs: Record<Size, string> = { sm: "size-4", md: "size-5", lg: "size-6" };

const INCREASE = new Set(["ArrowRight", "ArrowUp"]);
const DECREASE = new Set(["ArrowLeft", "ArrowDown"]);
const DEFAULT_THUMB_LABELS: [string, string] = ["Minimum", "Maximum"];

function decimals(n: number): number {
  const text = String(n);
  const dot = text.indexOf(".");
  return dot === -1 ? 0 : text.length - dot - 1;
}

type BaseProps = Omit<SliderProps, "value" | "defaultValue" | "onValueChange" | "onValueCommit"> & {
  /** One value (Slider) or two (RangeSlider), in thumb order. */
  values: readonly number[];
  setValues: (values: number[]) => void;
  onCommit?: (values: number[]) => void;
  onReset: () => void;
  /** Range only: minimum gap between the thumbs, in steps. */
  minSteps?: number;
  /** Range only: per-thumb names; the root becomes role="group". */
  thumbLabels?: readonly [string, string];
  forwardedRef: React.Ref<HTMLDivElement>;
};

/** Shared body of Slider (one thumb) and RangeSlider (two thumbs that never cross). */
function SliderBase({
  values: rawValues,
  setValues,
  onCommit,
  onReset,
  minSteps = 0,
  thumbLabels,
  min = 0,
  max = 100,
  step: stepProp = 1,
  largeStep,
  disabled = false,
  size = "md",
  tone = "primary",
  name,
  showValue = "active",
  formatValue,
  marks,
  snapToMarks = false,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  "aria-describedby": ariaDescribedBy,
  className,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  forwardedRef,
  ...props
}: BaseProps) {
  const range = thumbLabels !== undefined;
  const step = Number.isFinite(stepProp) && stepProp > 0 ? stepProp : 1;
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  const bigStep = largeStep !== undefined && largeStep > 0 ? largeStep : step * 10;
  const gap = range ? Math.max(0, minSteps) * step : 0;
  const clamp = (v: number) => Math.min(Math.max(v, lo), hi);
  const values = rawValues.map((v) => clamp(Number.isFinite(v) ? v : lo));
  if (range && values.length === 2 && (values[0] as number) > (values[1] as number)) values.reverse();
  const percentOf = (v: number) => (hi === lo ? 0 : ((v - lo) / (hi - lo)) * 100);

  const markList = React.useMemo(
    () =>
      (marks ?? [])
        .map((mark) => (typeof mark === "number" ? { value: mark } : mark))
        .filter((mark) => Number.isFinite(mark.value) && mark.value >= lo && mark.value <= hi)
        .sort((a, b) => a.value - b.value),
    [marks, lo, hi],
  );
  const snapping = snapToMarks && markList.length > 0;
  const labelled = markList.some((mark) => mark.label !== undefined && mark.label !== null);

  const [dragging, setDragging] = React.useState<number | null>(null);
  const [focused, setFocused] = React.useState<number | null>(null);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const trackRef = React.useRef<HTMLSpanElement>(null);
  const thumbRefs = React.useRef<Array<HTMLSpanElement | null>>([]);
  const drag = React.useRef<{ index: number; values: number[] } | null>(null);
  const mergedRef = React.useMemo(() => mergeRefs(rootRef, forwardedRef), [forwardedRef]);
  const id = React.useId();

  React.useEffect(() => {
    if (!(Number.isFinite(stepProp) && stepProp > 0)) devWarn("slider:step", "Slider step must be > 0; using 1.");
  }, [stepProp]);
  React.useEffect(() => {
    if (!ariaLabel && !ariaLabelledBy) devWarn("slider:label", "Slider needs an aria-label or aria-labelledby.");
  }, [ariaLabel, ariaLabelledBy]);

  useFormReset(rootRef, onReset);

  const snap = (v: number) => {
    if (snapping) {
      let best = markList[0]?.value ?? v;
      for (const mark of markList) if (Math.abs(mark.value - v) < Math.abs(best - v)) best = mark.value;
      return best;
    }
    const snapped = Math.round((v - lo) / step) * step + lo;
    return clamp(Number(snapped.toFixed(Math.max(decimals(step), decimals(lo)))));
  };

  /** Bounds of thumb `index`: a range thumb never passes the other one (minus the gap). */
  const boundsOf = (index: number, current: readonly number[]): [number, number] => {
    if (!range) return [lo, hi];
    return index === 0 ? [lo, (current[1] ?? hi) - gap] : [(current[0] ?? lo) + gap, hi];
  };

  const withValue = (current: readonly number[], index: number, v: number): number[] => {
    const [low, high] = boundsOf(index, current);
    const next = [...current];
    next[index] = Math.min(Math.max(v, low), Math.max(low, high));
    return next;
  };

  const fromPointer = (clientX: number): number | null => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0) return null;
    const ratio = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
    return snap(lo + ratio * (hi - lo));
  };

  /** Nearest thumb to `v`; on a tie the click side decides (upper thumb when to the right). */
  const nearest = (v: number): number => {
    if (!range) return 0;
    const [a = lo, b = hi] = values;
    const da = Math.abs(v - a);
    const db = Math.abs(v - b);
    if (da === db) return v > a ? 1 : 0;
    return da < db ? 0 : 1;
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (current === null) return;
    drag.current = null;
    setDragging(null);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    onCommit?.(current.values);
  };

  /** Next value for a key, or null for keys the slider ignores. */
  const keyTarget = (key: string, v: number): number | null => {
    if (snapping) {
      const above = markList.find((mark) => mark.value > v)?.value;
      const below = [...markList].reverse().find((mark) => mark.value < v)?.value;
      if (INCREASE.has(key) || key === "PageUp") return above ?? v;
      if (DECREASE.has(key) || key === "PageDown") return below ?? v;
      if (key === "Home") return markList[0]?.value ?? lo;
      if (key === "End") return markList[markList.length - 1]?.value ?? hi;
      return null;
    }
    if (INCREASE.has(key)) return snap(v + step);
    if (DECREASE.has(key)) return snap(v - step);
    if (key === "PageUp") return snap(v + bigStep);
    if (key === "PageDown") return snap(v - bigStep);
    if (key === "Home") return lo;
    if (key === "End") return hi;
    return null;
  };

  const onKeyDown = (index: number) => (event: React.KeyboardEvent<HTMLSpanElement>) => {
    if (disabled) return;
    const v = values[index] ?? lo;
    const target = keyTarget(event.key, v);
    if (target === null) return;
    event.preventDefault();
    const next = withValue(values, index, target);
    if (next[index] === v) return;
    setValues(next);
    onCommit?.(next);
  };

  const bubbleShown = (index: number) =>
    showValue === "always" || (showValue === "active" && (dragging === index || focused === index));
  const texts = values.map((v) => (formatValue ? formatValue(v) : String(v)));
  const start = range ? percentOf(values[0] ?? lo) : 0;
  const end = percentOf(values[values.length - 1] ?? lo);
  const inRange = (v: number) => (range ? v >= (values[0] ?? lo) && v <= (values[1] ?? hi) : v <= (values[0] ?? lo));

  return (
    <>
      <div
        ref={mergedRef}
        role={range ? "group" : undefined}
        aria-label={range ? ariaLabel : undefined}
        aria-labelledby={range ? ariaLabelledBy : undefined}
        data-size={size}
        data-tone={tone}
        data-disabled={disabled ? "" : undefined}
        data-dragging={dragging !== null ? "" : undefined}
        {...props}
        onPointerDown={(event) => {
          onPointerDown?.(event);
          if (disabled || event.defaultPrevented || event.button !== 0) return;
          event.preventDefault();
          const v = fromPointer(event.clientX);
          const index = v === null ? 0 : nearest(v);
          event.currentTarget.setPointerCapture(event.pointerId);
          const next = v === null ? values : withValue(values, index, v);
          drag.current = { index, values: next };
          setDragging(index);
          if (v !== null) setValues(next);
          thumbRefs.current[index]?.focus();
        }}
        onPointerMove={(event) => {
          onPointerMove?.(event);
          const current = drag.current;
          if (current === null) return;
          const v = fromPointer(event.clientX);
          if (v === null) return;
          const next = withValue(current.values, current.index, v);
          drag.current = { index: current.index, values: next };
          setValues(next);
        }}
        onPointerUp={(event) => {
          onPointerUp?.(event);
          endDrag(event);
        }}
        onPointerCancel={(event) => {
          onPointerCancel?.(event);
          endDrag(event);
        }}
        className={cn(
          blockReset,
          "relative flex w-full touch-none select-none items-center",
          disabled ? "pointer-events-none opacity-50" : "cursor-pointer",
          heights[size],
          labelled && "mb-6",
          toneClasses[tone],
          className,
        )}
      >
        <span
          ref={trackRef}
          className={cn(blockReset, "relative block w-full grow rounded-pui-full bg-(--pui-tone)/20", tracks[size])}
        >
          <span
            data-pui-slider-range=""
            className={cn(blockReset, "absolute inset-y-0 left-0 block rounded-pui-full bg-(--pui-tone)")}
            style={range ? { left: `${start}%`, width: `${end - start}%` } : { width: `${end}%` }}
          />
          {markList.length > 0 ? (
            <span aria-hidden="true" data-pui-slider-marks="" className={cn(blockReset, "absolute inset-0 block")}>
              {markList.map((mark) => (
                <React.Fragment key={mark.value}>
                  <span
                    data-pui-slider-mark=""
                    data-in-range={inRange(mark.value) ? "" : undefined}
                    style={{ left: `${percentOf(mark.value)}%` }}
                    className={cn(
                      blockReset,
                      "absolute top-1/2 block size-1 -translate-x-1/2 -translate-y-1/2 rounded-pui-full",
                      inRange(mark.value) ? "bg-(--pui-tone-fg)" : "bg-(--pui-tone)/40",
                    )}
                  />
                  {mark.label !== undefined && mark.label !== null ? (
                    <span
                      data-pui-slider-mark-label=""
                      style={{ left: `${percentOf(mark.value)}%` }}
                      className={cn(
                        blockReset,
                        "absolute top-full mt-3 block -translate-x-1/2 whitespace-nowrap text-xs text-pui-muted-foreground",
                      )}
                    >
                      {mark.label}
                    </span>
                  ) : null}
                </React.Fragment>
              ))}
            </span>
          ) : null}
          {values.map((v, index) => {
            const [low, high] = boundsOf(index, values);
            const thumbLabel = thumbLabels?.[index];
            const labelId = `${id}-thumb-${index}`;
            return (
              <span
                key={index}
                ref={(el) => {
                  thumbRefs.current[index] = el;
                }}
                role="slider"
                tabIndex={disabled ? -1 : 0}
                aria-label={range ? (ariaLabelledBy ? undefined : thumbLabel) : ariaLabel}
                aria-labelledby={range ? (ariaLabelledBy ? `${ariaLabelledBy} ${labelId}` : undefined) : ariaLabelledBy}
                aria-describedby={ariaDescribedBy}
                aria-valuemin={range ? Math.max(lo, low) : lo}
                aria-valuemax={range ? Math.min(hi, high) : hi}
                aria-valuenow={v}
                aria-valuetext={formatValue ? texts[index] : undefined}
                aria-orientation="horizontal"
                aria-disabled={disabled || undefined}
                data-index={range ? index : undefined}
                data-state={dragging === index ? "active" : "inactive"}
                onKeyDown={onKeyDown(index)}
                onFocus={() => setFocused(index)}
                onBlur={() => setFocused(null)}
                style={{ left: `${percentOf(v)}%` }}
                className={cn(
                  blockReset,
                  // Press is quick (ease-out); release settles on the spring curve.
                  "absolute top-1/2 block -translate-x-1/2 -translate-y-1/2 rounded-pui-full border-2 border-(--pui-tone) bg-pui-background shadow-pui-sm transition-[scale,box-shadow]",
                  focusRing,
                  thumbs[size],
                  dragging === index
                    ? "z-10 scale-115 duration-(--pui-duration-fast) ease-pui-out"
                    : "duration-(--pui-duration-base) ease-pui-spring hover:scale-105",
                )}
              >
                {range && ariaLabelledBy ? (
                  <span id={labelId} className={cn(blockReset, "sr-only")}>
                    {thumbLabel}
                  </span>
                ) : null}
                {/* initial={false}: an always-on bubble is visible on the first render; later appearances animate. */}
                <AnimatePresence initial={false}>
                  {bubbleShown(index) ? (
                    <motion.span
                      key="bubble"
                      aria-hidden="true"
                      data-pui-slider-value=""
                      initial={{ opacity: 0, y: 4, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 4, scale: 0.9 }}
                      transition={{ duration: 0.12 }}
                      className={cn(
                        blockReset,
                        "pointer-events-none absolute bottom-full left-1/2 mb-2 block -translate-x-1/2 whitespace-nowrap rounded-pui-sm bg-pui-foreground px-1.5 py-0.5 text-xs font-medium tabular-nums text-pui-background",
                      )}
                    >
                      {texts[index]}
                    </motion.span>
                  ) : null}
                </AnimatePresence>
              </span>
            );
          })}
        </span>
      </div>
      {name !== undefined
        ? values.map((v, index) => (
            <input
              key={index}
              type="hidden"
              aria-hidden="true"
              tabIndex={-1}
              readOnly
              name={name}
              value={String(v)}
              className={cn(controlReset, hiddenInputClasses)}
            />
          ))
        : null}
    </>
  );
}

/**
 * Single-thumb range input (design 7.1 #19). The thumb is role="slider" and receives
 * aria-label / aria-labelledby / aria-describedby; the ref goes to the root.
 */
export const Slider = React.forwardRef<HTMLDivElement, SliderProps>(function Slider(
  { value: valueProp, defaultValue, onValueChange, onValueCommit, min = 0, ...props },
  ref,
) {
  const [value, setValue] = useControllableState({
    value: valueProp,
    defaultValue: defaultValue ?? min,
    onChange: onValueChange,
  });
  return (
    <SliderBase
      {...props}
      min={min}
      values={[value]}
      setValues={(next) => setValue(next[0] ?? min)}
      onCommit={onValueCommit ? (next) => onValueCommit(next[0] ?? min) : undefined}
      onReset={() => setValue(defaultValue ?? min)}
      forwardedRef={ref}
    />
  );
});

/**
 * Two-thumb range (APG multi-thumb slider). The root is role="group" named by aria-label or
 * aria-labelledby; each thumb is a role="slider" whose bounds stop at the other thumb.
 */
export const RangeSlider = React.forwardRef<HTMLDivElement, RangeSliderProps>(function RangeSlider(
  {
    value: valueProp,
    defaultValue,
    onValueChange,
    onValueCommit,
    min = 0,
    max = 100,
    minStepsBetweenThumbs = 0,
    thumbLabels = DEFAULT_THUMB_LABELS,
    ...props
  },
  ref,
) {
  const fallback: [number, number] = [Math.min(min, max), Math.max(min, max)];
  const [value, setValue] = useControllableState<[number, number]>({
    value: valueProp,
    defaultValue: defaultValue ?? fallback,
    onChange: onValueChange,
  });
  const pair = (next: number[]): [number, number] => [next[0] ?? fallback[0], next[1] ?? fallback[1]];
  return (
    <SliderBase
      {...props}
      min={min}
      max={max}
      values={value}
      setValues={(next) => setValue(pair(next))}
      onCommit={onValueCommit ? (next) => onValueCommit(pair(next)) : undefined}
      onReset={() => setValue(defaultValue ?? fallback)}
      minSteps={minStepsBetweenThumbs}
      thumbLabels={thumbLabels}
      forwardedRef={ref}
    />
  );
});
