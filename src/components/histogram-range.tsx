"use client";
import * as React from "react";
import { useControllableState } from "../hooks/use-controllable-state";
import { cn } from "../lib/cn";
import { fieldClasses } from "../lib/field-styles";
import { blockReset, controlReset } from "../lib/styles";
import { toneClasses } from "../lib/tone";
import type { Size, Tone } from "../lib/types";
import { RangeSlider } from "./slider";
export interface HistogramRangeProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange" | "defaultValue"> {
  /** The values being filtered (prices, durations, sizes). Non-finite entries are ignored. */
  data: readonly number[];
  /** Number of bars. Default 32. */
  bins?: number;
  /** Lower bound. Default: the smallest value, rounded down to a step. */
  min?: number;
  /** Upper bound. Default: the largest value, rounded up to a step. */
  max?: number;
  /** Default 1. */
  step?: number;
  value?: [number, number];
  /** Default [min, max]. */
  defaultValue?: [number, number];
  onValueChange?: (value: [number, number]) => void;
  /** Fires when a drag ends, a key moves a thumb or a typed value is applied. */
  onValueCommit?: (value: [number, number]) => void;
  /** Visible label, also the slider's name. */
  label?: React.ReactNode;
  /** Value text for the fields, tooltips and screen readers. Default en-US grouping. */
  formatValue?: (value: number) => string;
  /** Matching-count text. Default "{count} of {total}". */
  countLabel?: (count: number, total: number) => React.ReactNode;
  /** Screen-reader summary after a change. Default "{count} of {total} match". */
  countMessage?: (count: number, total: number) => string;
  /** Histogram height in px. Default 72. */
  height?: number;
  /** Show the minimum and maximum fields. Default true. */
  inputs?: boolean;
  /** Thumb and field names. Default ["Minimum", "Maximum"]. */
  thumbLabels?: [string, string];
  /** Default "primary". */
  tone?: Tone;
  /** Default "md". */
  size?: Size;
  disabled?: boolean;
  /** Renders hidden inputs `${name}-min` and `${name}-max`. */
  name?: string;
}
const DEFAULT_LABELS: [string, string] = ["Minimum", "Maximum"];
const enUS = (v: number) => v.toLocaleString("en-US", { maximumFractionDigits: 2 });
function decimals(n: number): number {
  const text = String(n);
  const dot = text.indexOf(".");
  return dot === -1 ? 0 : text.length - dot - 1;
}
/** First index with sorted[i] >= v (or > v when `after`). */
function bound(sorted: readonly number[], v: number, after: boolean): number {
  let lo = 0;
  let hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    const x = sorted[mid] as number;
    if (after ? x <= v : x < v) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}
function parseNumber(text: string): number | null {
  const cleaned = text.replace(/[^\d.-]/g, "");
  if (cleaned === "" || cleaned === "-" || cleaned === ".") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}
interface FieldProps {
  label: string;
  value: number;
  format: (v: number) => string;
  disabled: boolean;
  size: Size;
  onCommit: (v: number) => void;
}
const dashOffset: Record<Size, string> = { sm: "mb-4", md: "mb-[1.125rem]", lg: "mb-[1.375rem]" };
const fieldSizes: Record<Size, string> = { sm: "h-8 px-2.5 text-xs", md: "h-9 px-3 text-sm", lg: "h-11 px-3.5 text-base" };
/** A typed min or max: shows the formatted value, edits the raw number, applies on Enter or blur. */
function ValueField({ label, value, format, disabled, size, onCommit }: FieldProps) {
  const [draft, setDraft] = React.useState<string | null>(null);
  const id = React.useId();
  const apply = () => {
    if (draft === null) return;
    const n = parseNumber(draft);
    setDraft(null);
    if (n !== null && n !== value) onCommit(n);
  };
  return (
    <label htmlFor={id} className={cn(blockReset, "flex min-w-0 flex-1 flex-col gap-1")}>
      <span className={cn(blockReset, "text-xs text-pui-muted-foreground")}>{label}</span>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        disabled={disabled}
        value={draft ?? format(value)}
        onFocus={(e) => {
          setDraft(String(value));
          const el = e.currentTarget;
          requestAnimationFrame(() => el.select());
        }}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={apply}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            apply();
          } else if (e.key === "Escape" && draft !== null) {
            e.preventDefault();
            setDraft(String(value));
          }
        }}
        className={cn(controlReset, fieldClasses, "tabular-nums", fieldSizes[size])}
      />
    </label>
  );
}
/**
 * A two-thumb range filter that shows where the items are. The histogram above the track dims what
 * falls outside the range (bars cut by a thumb are filled only up to it), the matching count
 * updates while you drag and typed min / max fields cover exact values.
 */
export const HistogramRange = React.forwardRef<HTMLDivElement, HistogramRangeProps>(function HistogramRange(
  {
    data,
    bins: binsProp = 32,
    min: minProp,
    max: maxProp,
    step: stepProp = 1,
    value: valueProp,
    defaultValue,
    onValueChange,
    onValueCommit,
    label,
    formatValue = enUS,
    countLabel,
    countMessage,
    height = 72,
    inputs = true,
    thumbLabels = DEFAULT_LABELS,
    tone = "primary",
    size = "md",
    disabled = false,
    name,
    className,
    "aria-label": ariaLabel,
    ...props
  },
  ref,
) {
  const step = Number.isFinite(stepProp) && stepProp > 0 ? stepProp : 1;
  const bins = Math.max(1, Math.round(binsProp));
  const sorted = React.useMemo(() => data.filter((v) => Number.isFinite(v)).sort((a, b) => a - b), [data]);
  const places = decimals(step);
  const roundTo = (v: number) => Number(v.toFixed(places));
  const dataLo = sorted[0];
  const dataHi = sorted[sorted.length - 1];
  const lo = minProp ?? (dataLo === undefined ? 0 : roundTo(Math.floor(dataLo / step) * step));
  const rawHi = maxProp ?? (dataHi === undefined ? 100 : roundTo(Math.ceil(dataHi / step) * step));
  const hi = rawHi > lo ? rawHi : lo + step;
  const [value, setValue] = useControllableState<[number, number]>({
    value: valueProp,
    defaultValue: defaultValue ?? [lo, hi],
    onChange: onValueChange,
    name: "value",
  });
  const a = Math.min(Math.max(Math.min(value[0], value[1]), lo), hi);
  const b = Math.min(Math.max(Math.max(value[0], value[1]), lo), hi);
  const width = (hi - lo) / bins;
  const counts = React.useMemo(() => {
    const out = new Array<number>(bins).fill(0);
    for (const v of sorted) {
      if (v < lo || v > hi) continue;
      const i = Math.min(bins - 1, Math.floor((v - lo) / width));
      out[i] = (out[i] ?? 0) + 1;
    }
    return out;
  }, [sorted, bins, lo, hi, width]);
  const peak = Math.max(1, ...counts);
  const total = sorted.length;
  const count = bound(sorted, b, true) - bound(sorted, a, false);
  const [hover, setHover] = React.useState<number | null>(null);
  const [message, setMessage] = React.useState("");
  const labelId = React.useId();
  const summary = countMessage ?? ((c: number, t: number) => `${enUS(c)} of ${enUS(t)} match`);
  const commit = (next: [number, number]) => {
    const s = sorted;
    setMessage(summary(bound(s, next[1], true) - bound(s, next[0], false), s.length));
    onValueCommit?.(next);
  };
  const setFromField = (index: 0 | 1, typed: number) => {
    const snapped = roundTo(Math.round((typed - lo) / step) * step + lo);
    const clamped = Math.min(Math.max(snapped, index === 0 ? lo : a), index === 0 ? b : hi);
    const next: [number, number] = index === 0 ? [clamped, b] : [a, clamped];
    setValue(next);
    commit(next);
  };
  const onBarsMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width <= 0) return;
    const i = Math.min(bins - 1, Math.max(0, Math.floor(((event.clientX - rect.left) / rect.width) * bins)));
    setHover(i);
  };
  const tipIndex = hover;
  const tipStart = tipIndex === null ? 0 : lo + tipIndex * width;
  const tipCount = tipIndex === null ? 0 : (counts[tipIndex] ?? 0);
  const tipBottom = (tipCount === 0 ? 0 : Math.max(3, (tipCount / peak) * height)) + 6;
  const tipLeft = tipIndex === null ? 50 : Math.min(90, Math.max(10, ((tipIndex + 0.5) / bins) * 100));
  return (
    <div
      ref={ref}
      data-tone={tone}
      data-size={size}
      data-disabled={disabled ? "" : undefined}
      {...props}
      className={cn(blockReset, "flex w-full flex-col", toneClasses[tone], disabled && "opacity-60", className)}
    >
      <div className={cn(blockReset, "mb-3 flex items-baseline justify-between gap-3")}>
        {label !== undefined ? (
          <span id={labelId} className={cn(blockReset, "text-sm font-medium text-pui-foreground")}>
            {label}
          </span>
        ) : (
          <span />
        )}
        <span aria-hidden="true" data-pui-histogram-count="" className={cn(blockReset, "text-xs tabular-nums text-pui-muted-foreground")}>
          {countLabel ? (
            countLabel(count, total)
          ) : (
            <>
              <span className={cn(blockReset, "font-semibold text-pui-foreground")}>{enUS(count)}</span> of {enUS(total)}
            </>
          )}
        </span>
      </div>
      <div
        aria-hidden="true"
        data-pui-histogram=""
        className={cn(blockReset, "relative flex items-end gap-[2px] px-0")}
        style={{ height }}
        onPointerMove={onBarsMove}
        onPointerLeave={() => setHover(null)}
      >
        {counts.map((c, i) => {
          const start = lo + i * width;
          const left = Math.min(Math.max((a - start) / width, 0), 1);
          const right = Math.min(Math.max((start + width - b) / width, 0), 1);
          const filled = left + right < 1;
          const h = c === 0 ? 0 : Math.max(3, (c / peak) * height);
          return (
            <span
              key={i}
              data-in-range={filled ? "" : undefined}
              className={cn(
                blockReset,
                "relative block min-w-0 flex-1 overflow-hidden rounded-t-[3px] bg-(--pui-tone)/18 transition-[height] duration-(--pui-duration-slow) ease-pui-out motion-reduce:transition-none",
                hover === i && "bg-(--pui-tone)/30",
              )}
              style={{ height: h }}
            >
              {filled ? (
                <span
                  className={cn(blockReset, "absolute inset-0 block bg-(--pui-tone)")}
                  style={left > 0 || right > 0 ? { clipPath: `inset(0 ${right * 100}% 0 ${left * 100}%)` } : undefined}
                />
              ) : null}
            </span>
          );
        })}
        {tipIndex !== null ? (
          <span
            className={cn(
              blockReset,
              "pointer-events-none absolute z-10 block -translate-x-1/2 whitespace-nowrap rounded-pui-sm bg-pui-foreground px-2 py-1 text-xs font-medium tabular-nums text-pui-background shadow-pui-md",
            )}
            // Anchored just above the hovered bar, so it points at what it describes.
            style={{ left: `${tipLeft}%`, bottom: tipBottom }}
          >
            {formatValue(roundTo(tipStart))}–{formatValue(roundTo(tipStart + width))} · {enUS(counts[tipIndex] ?? 0)}
          </span>
        ) : null}
      </div>
      <span aria-hidden="true" className={cn(blockReset, "block h-px w-full bg-pui-border")} />
      <RangeSlider
        min={lo}
        max={hi}
        step={step}
        value={[a, b]}
        onValueChange={setValue}
        onValueCommit={commit}
        thumbLabels={thumbLabels}
        formatValue={formatValue}
        showValue="never"
        tone={tone}
        size={size}
        disabled={disabled}
        aria-label={label === undefined ? (ariaLabel ?? "Range") : undefined}
        aria-labelledby={label !== undefined ? labelId : undefined}
        className={cn(size === "lg" ? "-mt-3" : size === "sm" ? "-mt-2" : "-mt-2.5")}
      />
      {inputs ? (
        <div className={cn(blockReset, "mt-4 flex items-end gap-3")}>
          <ValueField label={thumbLabels[0]} value={a} format={formatValue} disabled={disabled} size={size} onCommit={(v) => setFromField(0, v)} />
          <span aria-hidden="true" className={cn(blockReset, "h-px w-3 shrink-0 bg-pui-muted-foreground/60", dashOffset[size])} />
          <ValueField label={thumbLabels[1]} value={b} format={formatValue} disabled={disabled} size={size} onCommit={(v) => setFromField(1, v)} />
        </div>
      ) : null}
      {name ? (
        <>
          <input type="hidden" name={`${name}-min`} value={a} />
          <input type="hidden" name={`${name}-max`} value={b} />
        </>
      ) : null}
      <span role="status" className={cn(blockReset, "sr-only")}>
        {message}
      </span>
    </div>
  );
});
