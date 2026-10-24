"use client";
import * as React from "react";
import { useControllableState } from "../hooks/use-controllable-state";
import { cn } from "../lib/cn";
import { mergeRefs } from "../lib/compose";
import { blockReset, focusRing } from "../lib/styles";
import { useIsomorphicLayoutEffect } from "../lib/use-latest-ref";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export interface WheelPickerOption {
  value: string;
  label: React.ReactNode;
  /** Plain text for type-ahead and the accessible name when the label is not a string. */
  textValue?: string;
  disabled?: boolean;
}

export type WheelPickerOptionInput = string | number | WheelPickerOption;

export interface WheelPickerProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange"> {
  /** Strings, numbers or { value, label, textValue?, disabled? }. */
  options: readonly WheelPickerOptionInput[];
  value?: string;
  defaultValue?: string;
  /** Fires once the wheel settles on a new option, not on every frame of a scroll. */
  onValueChange?: (value: string) => void;
  /** Rows shown; even numbers round up. Default 5. */
  visibleCount?: number;
  /** Row height in px. Default 36. */
  itemHeight?: number;
  /** Row text alignment. Default "center". */
  align?: "start" | "center" | "end";
  /** Show the selection band. Turn it off when several wheels share one band. Default true. */
  band?: boolean;
  disabled?: boolean;
}

const STEP_DEG = 18;

function normalize(option: WheelPickerOptionInput): WheelPickerOption {
  return typeof option === "object" ? option : { value: String(option), label: String(option) };
}

function textOf(option: WheelPickerOption): string {
  if (option.textValue !== undefined) return option.textValue;
  return typeof option.label === "string" || typeof option.label === "number" ? String(option.label) : option.value;
}

function nearestEnabled(options: readonly WheelPickerOption[], index: number): number {
  const max = options.length - 1;
  const start = Math.min(Math.max(index, 0), Math.max(max, 0));
  for (let d = 0; d <= max; d++) {
    if (options[start + d] && !options[start + d]?.disabled) return start + d;
    if (options[start - d] && !options[start - d]?.disabled) return start - d;
  }
  return start;
}

/**
 * A scroll-snapping 3D wheel, like the time pickers on a phone. Native scrolling keeps touch and
 * trackpad momentum, rows bend around a cylinder as they pass, the value commits only once the
 * wheel settles, and the wheel is a listbox with arrow keys, Page keys and type-ahead.
 */
export const WheelPicker = React.forwardRef<HTMLDivElement, WheelPickerProps>(function WheelPicker(
  {
    options: rawOptions,
    value: valueProp,
    defaultValue,
    onValueChange,
    visibleCount = 5,
    itemHeight = 36,
    align = "center",
    band = true,
    disabled = false,
    className,
    style,
    onKeyDown,
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const id = React.useId();
  const options = React.useMemo(() => rawOptions.map(normalize), [rawOptions]);
  const [value, setValue] = useControllableState<string | undefined>({
    value: valueProp,
    defaultValue: defaultValue ?? options.find((o) => !o.disabled)?.value,
    onChange: (next) => next !== undefined && onValueChange?.(next),
    name: "WheelPicker value",
  });
  const rows = visibleCount % 2 === 0 ? visibleCount + 1 : Math.max(1, visibleCount);
  const pad = ((rows - 1) / 2) * itemHeight;
  const selected = Math.max(0, options.findIndex((o) => o.value === value));
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const rowRefs = React.useRef<(HTMLDivElement | null)[]>([]);
  const refs = React.useMemo(() => mergeRefs(scrollRef, ref), [ref]);
  const settleTimer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const frame = React.useRef(0);
  const typed = React.useRef({ text: "", at: 0 });

  // Bend each row around the cylinder from the live scroll offset. Direct style writes: no re-render per frame.
  const paint = React.useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const center = el.scrollTop / itemHeight;
    rowRefs.current.forEach((row, i) => {
      if (!row) return;
      const offset = i - center;
      const dist = Math.min(Math.abs(offset), rows);
      row.style.opacity = String(Math.max(0.12, 1 - dist * (0.6 / Math.max(1, (rows - 1) / 2))));
      row.style.transform = reduced ? "" : `perspective(${itemHeight * 9}px) rotateX(${(-offset * STEP_DEG).toFixed(2)}deg)`;
    });
  }, [itemHeight, reduced, rows]);

  const scrollToIndex = React.useCallback(
    (index: number, smooth: boolean) => {
      const el = scrollRef.current;
      if (!el) return;
      if (smooth && !reduced && typeof el.scrollTo === "function") el.scrollTo({ top: index * itemHeight, behavior: "smooth" });
      else el.scrollTop = index * itemHeight;
    },
    [itemHeight, reduced],
  );

  // Keep the wheel on the value (initial render and controlled changes) unless the user is mid-scroll.
  useIsomorphicLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (Math.round(el.scrollTop / itemHeight) !== selected && settleTimer.current === undefined) scrollToIndex(selected, false);
    paint();
  }, [selected, itemHeight, paint, scrollToIndex]);

  React.useEffect(
    () => () => {
      cancelAnimationFrame(frame.current);
      clearTimeout(settleTimer.current);
    },
    [],
  );

  const settle = () => {
    settleTimer.current = undefined;
    const el = scrollRef.current;
    if (!el || options.length === 0) return;
    const index = nearestEnabled(options, Math.round(el.scrollTop / itemHeight));
    if (Math.abs(el.scrollTop - index * itemHeight) > 1) scrollToIndex(index, true);
    const next = options[index]?.value;
    if (next !== undefined && next !== value) setValue(next);
  };

  const onScroll = () => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(paint);
    clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(settle, 110);
  };

  const pick = (index: number) => {
    const target = nearestEnabled(options, index);
    const next = options[target]?.value;
    if (next === undefined) return;
    scrollToIndex(target, true);
    if (next !== value) setValue(next);
  };

  const handleKey = (event: React.KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented || disabled) return;
    const page = rows - 1;
    const moves: Record<string, number> = { ArrowDown: 1, ArrowUp: -1, PageDown: page, PageUp: -page };
    let target: number | undefined;
    if (event.key in moves) {
      const dir = Math.sign(moves[event.key] ?? 0);
      target = selected + (moves[event.key] ?? 0);
      while (options[target]?.disabled) target += dir;
      if (target < 0 || target >= options.length) target = undefined;
    } else if (event.key === "Home") target = 0;
    else if (event.key === "End") target = options.length - 1;
    else if (event.key.length === 1 && /\S/.test(event.key) && !event.metaKey && !event.ctrlKey && !event.altKey) {
      const now = Date.now();
      typed.current = { text: (now - typed.current.at < 700 ? typed.current.text : "") + event.key.toLowerCase(), at: now };
      const found = options.findIndex((o) => !o.disabled && textOf(o).toLowerCase().startsWith(typed.current.text));
      if (found >= 0) target = found;
    }
    if (target === undefined) return;
    event.preventDefault();
    pick(target);
  };

  const justify = align === "start" ? "justify-start ps-4" : align === "end" ? "justify-end pe-4" : "justify-center";

  return (
    <div
      className={cn(blockReset, "relative isolate select-none", disabled && "pointer-events-none opacity-50", className)}
      style={{ height: rows * itemHeight, ...style }}
      data-disabled={disabled ? "" : undefined}
    >
      {band ? (
        <div
          aria-hidden="true"
          className={cn(blockReset, "pointer-events-none absolute inset-x-0 -z-10 rounded-pui-md bg-pui-muted")}
          style={{ top: pad, height: itemHeight }}
        />
      ) : null}
      <div
        ref={refs}
        role="listbox"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled || undefined}
        aria-activedescendant={options.length ? `${id}-${selected}` : undefined}
        {...props}
        onScroll={onScroll}
        onKeyDown={handleKey}
        onClick={(event) => {
          const row = (event.target as HTMLElement).closest<HTMLElement>("[data-index]");
          const i = Number(row?.dataset.index);
          if (row && !options[i]?.disabled) pick(i);
        }}
        className={cn(
          blockReset,
          focusRing,
          "h-full snap-y snap-mandatory overflow-y-auto overscroll-contain rounded-pui-md [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        )}
        style={{ maskImage: `linear-gradient(to bottom, transparent, black ${pad * 0.85}px, black calc(100% - ${pad * 0.85}px), transparent)` }}
      >
        <div aria-hidden="true" style={{ height: pad }} />
        {options.map((option, i) => (
          <div
            key={option.value}
            id={`${id}-${i}`}
            ref={(el) => {
              rowRefs.current[i] = el;
            }}
            role="option"
            aria-selected={i === selected}
            aria-disabled={option.disabled || undefined}
            aria-label={typeof option.label === "string" ? undefined : textOf(option)}
            data-index={i}
            className={cn(
              blockReset,
              "flex snap-center items-center px-3 text-base whitespace-nowrap tabular-nums text-pui-foreground [backface-visibility:hidden]",
              justify,
              i === selected ? "font-semibold" : "cursor-pointer text-pui-muted-foreground",
              option.disabled && "cursor-not-allowed line-through opacity-40",
            )}
            style={{ height: itemHeight }}
          >
            {option.label}
          </div>
        ))}
        <div aria-hidden="true" style={{ height: pad }} />
      </div>
    </div>
  );
});
