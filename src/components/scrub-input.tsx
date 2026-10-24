"use client";
import { motion, useAnimate } from "motion/react";
import * as React from "react";
import { useControllableState } from "../hooks/use-controllable-state";
import { cn } from "../lib/cn";
import { mergeRefs } from "../lib/compose";
import { springs } from "../lib/motion";
import { blockReset, controlReset } from "../lib/styles";
import { useLatestRef } from "../lib/use-latest-ref";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";
export interface ScrubInputProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange" | "defaultValue" | "children"> {
  /** Visible label. Dragging it (or the value) scrubs. */
  label: React.ReactNode;
  /** Optional icon shown before the label. */
  icon?: React.ReactNode;
  value?: number;
  defaultValue?: number;
  /** Called on every change, including each scrub step. */
  onValueChange?: (value: number) => void;
  /** Called once when a drag ends, a typed value is committed or a key step lands. */
  onValueCommit?: (value: number) => void;
  /** Default -Infinity. With a finite min and max the field shows a fill track. */
  min?: number;
  /** Default Infinity. */
  max?: number;
  /** Default 1. Shift multiplies it by 10, Alt divides it by 10. */
  step?: number;
  /** Fixed decimals. Default: the decimals of `step`, plus one more only when an Alt step needs it. */
  precision?: number;
  /** Suffix shown after the value, e.g. "px", "%", "ms". */
  unit?: string;
  /** Pointer pixels per step. Default 4. */
  sensitivity?: number;
  /** Custom value text (display and aria-valuetext). */
  format?: (value: number) => string;
  /** Default "md". */
  size?: "sm" | "md";
  disabled?: boolean;
  /** Renders a hidden input so the value posts with a form. */
  name?: string;
}
const heights = { sm: "h-8 text-xs", md: "h-9 text-sm" } as const;
const DRAG_SLOP = 3;
function decimalsOf(n: number): number {
  if (!Number.isFinite(n)) return 0;
  const text = String(n);
  const exp = /e-(\d+)$/.exec(text);
  if (exp) return Number(exp[1]);
  const dot = text.indexOf(".");
  return dot === -1 ? 0 : text.length - dot - 1;
}
function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
/** Fixed to `max` decimals, then trailing zeros trimmed down to `min` decimals. */
function trimDecimals(n: number, min: number, max: number): string {
  let text = n.toFixed(Math.min(max, 10));
  if (max > min && text.includes(".")) {
    const keep = text.indexOf(".") + min;
    let end = text.length;
    while (end - 1 > keep && text[end - 1] === "0") end--;
    if (min === 0 && text[end - 1] === ".") end--;
    text = text.slice(0, end);
  }
  return text;
}
function roundTo(n: number, decimals: number): number {
  const f = 10 ** Math.min(decimals, 10);
  return Math.round(n * f) / f;
}
/**
 * Parses what people type into a number field: plain numbers, units ("24px") and simple arithmetic
 * ("16*2", "100 / 3", "(4 + 2) * 8"). Returns null when the text is not a number. No eval.
 */
export function parseScrubValue(text: string): number | null {
  const src = text.replace(/[a-z%]+\s*$/i, "").replace(/,/g, "").trim();
  if (src === "") return null;
  let i = 0;
  const peek = () => src[i];
  const skip = () => {
    while (src[i] === " ") i++;
  };
  const num = (): number | null => {
    skip();
    if (peek() === "(") {
      i++;
      const v = expr();
      skip();
      if (peek() !== ")") return null;
      i++;
      return v;
    }
    if (peek() === "-" || peek() === "+") {
      const sign = peek() === "-" ? -1 : 1;
      i++;
      const v = num();
      return v === null ? null : sign * v;
    }
    const m = /^\d*\.?\d+(?:e[+-]?\d+)?|^\d+\./i.exec(src.slice(i));
    if (!m) return null;
    i += m[0].length;
    return Number(m[0]);
  };
  const term = (): number | null => {
    let left = num();
    for (;;) {
      if (left === null) return null;
      skip();
      const op = peek();
      if (op !== "*" && op !== "/") return left;
      i++;
      const right = num();
      if (right === null) return null;
      left = op === "*" ? left * right : left / right;
    }
  };
  const expr = (): number | null => {
    let left = term();
    for (;;) {
      if (left === null) return null;
      skip();
      const op = peek();
      if (op !== "+" && op !== "-") return left;
      i++;
      const right = term();
      if (right === null) return null;
      left = op === "+" ? left + right : left - right;
    }
  };
  const result = expr();
  skip();
  if (result === null || i !== src.length || !Number.isFinite(result)) return null;
  return result;
}
/**
 * A design-tool style number field: drag it sideways to scrub the value (Shift for big steps,
 * Alt for fine ones), click or press Enter to type, including units and arithmetic like "16*2".
 * It is a spinbutton for assistive tech with arrow, Page, Home and End keys, shows a fill track
 * when min and max are finite, and gives a small rubber-band nudge when you hit a limit.
 */
export const ScrubInput = React.forwardRef<HTMLDivElement, ScrubInputProps>(function ScrubInput(
  {
    label,
    icon,
    value: valueProp,
    defaultValue,
    onValueChange,
    onValueCommit,
    min = -Infinity,
    max = Infinity,
    step = 1,
    precision,
    unit,
    sensitivity = 4,
    format,
    size = "md",
    disabled = false,
    name,
    className,
    id: idProp,
    onPointerDown: onPointerDownProp,
    onPointerMove: onPointerMoveProp,
    ...rest
  },
  ref,
) {
  const autoId = React.useId();
  const id = idProp ?? autoId;
  const labelId = `${id}-label`;
  const reduced = usePrefersReducedMotion();
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const refs = React.useMemo(() => mergeRefs(ref, scope), [ref, scope]);
  const fallback = Number.isFinite(min) ? min : 0;
  const [value, setValue] = useControllableState<number>({
    value: valueProp,
    defaultValue: defaultValue ?? fallback,
    onChange: onValueChange,
    name: "value",
  });
  // Values keep one decimal more than `step` so Alt (fine) steps are not rounded away.
  const minDecimals = precision ?? decimalsOf(step);
  const decimals = precision ?? decimalsOf(step) + 1;
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const [scrubbing, setScrubbing] = React.useState(false);
  const spinRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const drag = React.useRef<{ pointerId: number; lastX: number; moved: number; acc: number; value: number } | null>(null);
  const latest = useLatestRef({ value, min, max, step, decimals, sensitivity, onValueCommit, reduced });
  const display = (v: number) => (format ? format(v) : `${trimDecimals(v, minDecimals, decimals)}${unit ?? ""}`);
  const bounded = Number.isFinite(min) && Number.isFinite(max) && max > min;
  const ratio = bounded ? (clamp(value, min, max) - min) / (max - min) : 0;
  const lastNudge = React.useRef(0);
  const nudge = (direction: 1 | -1) => {
    if (latest.current.reduced || !scope.current) return;
    const now = performance.now();
    if (now - lastNudge.current < 300) return;
    lastNudge.current = now;
    animate(scope.current, { x: [0, direction * 4, 0] }, springs.bouncy);
  };
  /** Sets a new value (clamped, rounded) and returns it; nudges when the request went past a limit. */
  const apply = (requested: number): number => {
    const { min: lo, max: hi, decimals: d } = latest.current;
    const next = roundTo(clamp(requested, lo, hi), d);
    if (requested > hi + 1e-9 && latest.current.value >= hi) nudge(1);
    else if (requested < lo - 1e-9 && latest.current.value <= lo) nudge(-1);
    latest.current.value = next;
    setValue(next);
    return next;
  };
  // Never `onValueCommit?.(apply(...))`: an optional call skips evaluating its arguments.
  const notifyCommit = (next: number) => latest.current.onValueCommit?.(next);
  const multiplier = (event: { shiftKey: boolean; altKey: boolean }) => (event.shiftKey ? 10 : event.altKey ? 0.1 : 1);
  const startEditing = (seed?: string) => {
    if (disabled) return;
    setDraft(seed ?? String(roundTo(value, decimals)));
    setEditing(true);
  };
  React.useEffect(() => {
    if (!editing) return;
    const input = inputRef.current;
    if (!input) return;
    input.focus();
    if (input.value.length > 1) input.select();
    else input.setSelectionRange(input.value.length, input.value.length);
  }, [editing]);
  const finishEditing = (commit: boolean, refocus: boolean) => {
    if (commit) {
      const parsed = parseScrubValue(draft);
      if (parsed !== null) notifyCommit(apply(parsed));
    }
    setEditing(false);
    if (refocus) requestAnimationFrame(() => spinRef.current?.focus());
  };
  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    onPointerDownProp?.(event);
    if (disabled || editing || event.button !== 0 || event.defaultPrevented) return;
    event.preventDefault();
    spinRef.current?.focus();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    drag.current = { pointerId: event.pointerId, lastX: event.clientX, moved: 0, acc: 0, value };
  };
  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    onPointerMoveProp?.(event);
    const d = drag.current;
    if (!d || d.pointerId !== event.pointerId) return;
    const dx = event.clientX - d.lastX;
    d.lastX = event.clientX;
    d.moved += Math.abs(dx);
    if (d.moved < DRAG_SLOP) return;
    if (!scrubbing) setScrubbing(true);
    const { sensitivity: px, step: s } = latest.current;
    d.acc += dx;
    const steps = Math.trunc(d.acc / px);
    if (steps === 0) return;
    d.acc -= steps * px;
    d.value = apply(d.value + steps * s * multiplier(event));
  };
  const endDrag = (event: React.PointerEvent<HTMLDivElement>, cancelled: boolean) => {
    const d = drag.current;
    if (!d || d.pointerId !== event.pointerId) return;
    drag.current = null;
    setScrubbing(false);
    if (d.moved >= DRAG_SLOP) notifyCommit(d.value);
    else if (!cancelled) startEditing();
  };
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled || editing) return;
    const { step: s } = latest.current;
    const by = (n: number) => {
      event.preventDefault();
      notifyCommit(apply(latest.current.value + n));
    };
    switch (event.key) {
      case "ArrowUp":
      case "ArrowRight":
        return by(s * multiplier(event));
      case "ArrowDown":
      case "ArrowLeft":
        return by(-s * multiplier(event));
      case "PageUp":
        return by(s * 10);
      case "PageDown":
        return by(-s * 10);
      case "Home":
        if (Number.isFinite(min)) {
          event.preventDefault();
          notifyCommit(apply(min));
        }
        return;
      case "End":
        if (Number.isFinite(max)) {
          event.preventDefault();
          notifyCommit(apply(max));
        }
        return;
      case "Enter":
      case "F2":
        event.preventDefault();
        return startEditing();
      default:
        if (/^[\d.\-+(]$/.test(event.key) && !event.metaKey && !event.ctrlKey) {
          event.preventDefault();
          startEditing(event.key);
        }
    }
  };
  return (
    <div
      ref={refs}
      data-size={size}
      data-state={editing ? "editing" : scrubbing ? "scrubbing" : "idle"}
      data-disabled={disabled ? "" : undefined}
      {...rest}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={(event) => endDrag(event, false)}
      onPointerCancel={(event) => endDrag(event, true)}
      onLostPointerCapture={(event) => endDrag(event, true)}
      className={cn(
        blockReset,
        "group/scrub relative isolate flex w-full min-w-0 touch-pan-y select-none items-stretch overflow-hidden rounded-pui-md border border-pui-input bg-pui-surface text-pui-surface-foreground transition-[border-color,box-shadow] duration-(--pui-duration-base)",
        "has-focus-visible:border-pui-ring has-focus-visible:shadow-[0_0_0_3px_color-mix(in_oklab,var(--pui-ring)_25%,transparent)]",
        editing ? "cursor-text border-pui-ring" : disabled ? "cursor-not-allowed opacity-50" : "cursor-ew-resize hover:border-pui-ring/60",
        heights[size],
        className,
      )}
    >
      {bounded ? (
        <motion.span
          aria-hidden="true"
          className={cn(
            blockReset,
            "pointer-events-none absolute inset-y-0 left-0 -z-10 w-full origin-left transition-colors duration-(--pui-duration-base)",
            scrubbing ? "bg-pui-primary/22" : "bg-pui-primary/10 group-hover/scrub:bg-pui-primary/14",
          )}
          initial={false}
          animate={{ scaleX: ratio }}
          style={{ scaleX: ratio }}
          transition={reduced || scrubbing ? { duration: 0 } : springs.snappy}
        />
      ) : null}
      <span
        id={labelId}
        className={cn(blockReset, "flex shrink-0 items-center gap-1.5 ps-2.5 pe-2 font-medium text-pui-muted-foreground [&_svg]:size-3.5")}
      >
        {icon ? <span aria-hidden="true" className={cn(blockReset, "flex")}>{icon}</span> : null}
        {label}
      </span>
      {editing ? (
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          role="spinbutton"
          aria-labelledby={labelId}
          aria-valuenow={value}
          aria-valuemin={Number.isFinite(min) ? min : undefined}
          aria-valuemax={Number.isFinite(max) ? max : undefined}
          value={draft}
          spellCheck={false}
          autoComplete="off"
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => finishEditing(true, false)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              finishEditing(true, true);
            } else if (event.key === "Escape") {
              event.preventDefault();
              event.stopPropagation();
              finishEditing(false, true);
            } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
              event.preventDefault();
              const base = parseScrubValue(draft) ?? value;
              const next = apply(base + (event.key === "ArrowUp" ? 1 : -1) * step * multiplier(event));
              setDraft(String(next));
            }
          }}
          className={cn(
            controlReset,
            "min-w-0 flex-1 select-text pe-2.5 text-end font-medium tabular-nums text-pui-foreground outline-hidden",
          )}
        />
      ) : (
        <div
          ref={spinRef}
          role="spinbutton"
          tabIndex={disabled ? -1 : 0}
          aria-labelledby={labelId}
          aria-valuenow={value}
          aria-valuemin={Number.isFinite(min) ? min : undefined}
          aria-valuemax={Number.isFinite(max) ? max : undefined}
          aria-valuetext={display(value)}
          aria-disabled={disabled || undefined}
          onKeyDown={onKeyDown}
          className={cn(
            blockReset,
            "flex min-w-0 flex-1 items-center justify-end pe-2.5 font-medium tabular-nums text-pui-foreground outline-hidden",
          )}
        >
          <span className={cn(blockReset, "truncate")}>{display(value)}</span>
        </div>
      )}
      {name ? <input type="hidden" name={name} value={value} /> : null}
    </div>
  );
});
