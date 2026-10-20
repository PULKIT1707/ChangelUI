"use client";

import { motion } from "motion/react";
import * as React from "react";
import { useControllableState } from "../hooks/use-controllable-state";
import { cn } from "../lib/cn";
import { composeEventHandlers, mergeRefs } from "../lib/compose";
import { dateFormatter, dayDelta, formatISO, parseDateInput, parseISODate, todayISO } from "../lib/date";
import { CalendarIcon, XIcon } from "../lib/icons";
import { springs } from "../lib/motion";
import { fieldClasses, invalidClasses } from "../lib/field-styles";
import { blockReset, controlReset, focusRing, textSize } from "../lib/styles";
import type { Align, Size } from "../lib/types";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";
import { Calendar, type CalendarBaseProps, type DateRange } from "./calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

export interface DatePickerPreset {
  label: string;
  /** An ISO date (single), a range, or a function of today's ISO date that returns one. */
  value: string | DateRange | ((today: string) => string | DateRange);
}

export interface DatePickerBaseProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "value" | "defaultValue" | "onChange" | "size" | "min" | "max" | "type" | "children"
  > {
  /** BCP 47 tag for labels and typed-input parsing. Default "en-US". */
  locale?: string;
  weekStartsOn?: CalendarBaseProps["weekStartsOn"];
  min?: string;
  max?: string;
  /** Days that cannot be picked. */
  disabledDates?: (date: string) => boolean;
  /** Quick picks shown beside the calendar. */
  presets?: DatePickerPreset[];
  /** Display format: Intl options or a function of the ISO date. Default { month: "short", day: "numeric", year: "numeric" }. */
  format?: Intl.DateTimeFormatOptions | ((date: string) => string);
  /** Default "md". */
  size?: Size;
  invalid?: boolean;
  /** Show a clear button when there is a value. Default true. */
  clearable?: boolean;
  /** Months in the popover. Default 1. */
  numberOfMonths?: number;
  /** Close once a date (or a full range) is picked. Default true. */
  closeOnSelect?: boolean;
  /** Popover alignment against the calendar button. Default "end". */
  align?: Align;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Override "today" (ISO) for presets, parsing and the calendar. */
  today?: string;
  /** Passed to the Calendar (dayContent, showOutsideDays, monthPicker, ...). */
  calendarProps?: Pick<CalendarBaseProps, "dayContent" | "dayLabel" | "showOutsideDays" | "monthPicker" | "fixedWeeks" | "weekdayFormat">;
  /** Classes for the field wrapper. */
  wrapperClassName?: string;
  /** Accessible name of the calendar button. Default "Choose date". */
  triggerLabel?: string;
  clearLabel?: string;
}

export interface DatePickerSingleProps {
  mode?: "single";
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (value: string | null) => void;
}

export interface DatePickerRangeProps {
  mode: "range";
  value?: DateRange | null;
  defaultValue?: DateRange | null;
  onValueChange?: (value: DateRange | null) => void;
}

export type DatePickerProps = DatePickerBaseProps & (DatePickerSingleProps | DatePickerRangeProps);

type AnyValue = string | DateRange | null;

const heights: Record<Size, string> = { sm: "h-8 ps-2.5 pe-16", md: "h-9 ps-3 pe-16", lg: "h-11 ps-3.5 pe-[4.5rem]" };
const buttonSize: Record<Size, string> = { sm: "size-6", md: "size-7", lg: "size-8" };
const DEFAULT_FORMAT: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" };
const RANGE_SPLIT = /\s+(?:-|–|—|to|until)\s+|\s*[–—]\s*/i;

function sameValue(a: AnyValue, b: AnyValue): boolean {
  if (a === b) return true;
  if (typeof a === "object" && a !== null && typeof b === "object" && b !== null) {
    return a.start === b.start && a.end === b.end;
  }
  return false;
}

/**
 * Text field + popover calendar (roadmap W3). Type a date ("Mar 9", "3/9/2024", "tomorrow", "+2w")
 * or pick one; presets cover common choices, and range mode picks a start and end. Values are ISO
 * strings. Focus goes into the day grid on open, and Escape returns it to the field.
 */
export const DatePicker = React.forwardRef<HTMLInputElement, DatePickerProps>(function DatePicker(props, ref) {
  const {
    mode = "single",
    value: valueProp,
    defaultValue,
    onValueChange,
    locale = "en-US",
    weekStartsOn = 0,
    min,
    max,
    disabledDates,
    presets,
    format = DEFAULT_FORMAT,
    size = "md",
    invalid = false,
    clearable = true,
    numberOfMonths = 1,
    closeOnSelect = true,
    align = "end",
    open: openProp,
    defaultOpen = false,
    onOpenChange,
    today: todayProp,
    calendarProps,
    wrapperClassName,
    triggerLabel = "Choose date",
    clearLabel = "Clear date",
    placeholder,
    disabled = false,
    name,
    className,
    onBlur,
    onFocus,
    onKeyDown,
    ...inputProps
  } = props;

  const reduced = usePrefersReducedMotion();
  const uid = React.useId();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const mergedRef = React.useMemo(() => mergeRefs(inputRef, ref), [ref]);

  const [value, setValue] = useControllableState<AnyValue>({
    value: valueProp as AnyValue | undefined,
    defaultValue: (defaultValue as AnyValue | undefined) ?? null,
    onChange: (next) => (onValueChange as ((next: AnyValue) => void) | undefined)?.(next),
  });
  const [open, setOpen] = useControllableState({ value: openProp, defaultValue: defaultOpen, onChange: onOpenChange });
  const range = mode === "range" && typeof value === "object" ? value : null;
  const single = mode === "single" && typeof value === "string" ? value : null;
  const anchorDate = single ?? range?.start ?? null;
  // Always controlled, so presets and typed dates can move the calendar (popover only: never in SSR output).
  const [month, setMonth] = React.useState<string>(() => (anchorDate ?? todayProp ?? todayISO()).slice(0, 7));
  const [draft, setDraft] = React.useState<string | null>(null);
  const [error, setError] = React.useState(false);

  const reference = () => todayProp ?? todayISO();

  const formatDate = (iso: string) =>
    typeof format === "function" ? format(iso) : formatISO(iso, locale, format);

  const displayText = (() => {
    if (single) return formatDate(single);
    if (!range) return "";
    if (range.end === null) return `${formatDate(range.start)} – …`;
    if (typeof format === "function") return `${format(range.start)} – ${format(range.end)}`;
    const a = parseISODate(range.start);
    const b = parseISODate(range.end);
    if (!a || !b) return "";
    return dateFormatter(locale, format).formatRange(
      Date.UTC(a.year, a.month - 1, a.day),
      Date.UTC(b.year, b.month - 1, b.day),
    );
  })();

  // While focused, ranges show both full dates so the text round-trips through the parser.
  const editableText = (() => {
    if (range && range.end !== null) return `${formatDate(range.start)} – ${formatDate(range.end)}`;
    return displayText;
  })();

  const inBounds = (iso: string) =>
    (min === undefined || iso >= min) && (max === undefined || iso <= max) && !disabledDates?.(iso);

  const parse = (text: string): AnyValue | undefined => {
    const trimmed = text.trim();
    if (!trimmed) return null;
    const today = reference();
    if (mode === "single") {
      const iso = parseDateInput(trimmed, locale, today);
      return iso && inBounds(iso) ? iso : undefined;
    }
    const parts = trimmed.split(RANGE_SPLIT).filter(Boolean);
    if (parts.length > 2) return undefined;
    const start = parseDateInput(parts[0] as string, locale, today);
    const end = parts[1] ? parseDateInput(parts[1], locale, start ?? today) : start;
    if (!start || !end || !inBounds(start) || !inBounds(end)) return undefined;
    return start <= end ? { start, end } : { start: end, end: start };
  };

  const commit = (): boolean => {
    if (draft === null) return true;
    const next = parse(draft);
    if (next === undefined) {
      setError(true);
      return false;
    }
    if (next === null && !clearable) {
      setDraft(null);
      setError(false);
      return true;
    }
    if (!sameValue(next, value)) setValue(next);
    const nextAnchor = typeof next === "string" ? next : next?.start;
    if (nextAnchor) setMonth(nextAnchor.slice(0, 7));
    setDraft(null);
    setError(false);
    return true;
  };

  const openCalendar = () => {
    if (disabled) return;
    if (anchorDate) setMonth(anchorDate.slice(0, 7));
    setOpen(true);
  };

  const closeToField = () => {
    setOpen(false);
    inputRef.current?.focus();
  };

  const onCalendarChange = (next: AnyValue) => {
    setValue(next);
    setDraft(null);
    setError(false);
    if (!closeOnSelect) return;
    if (mode === "single" && next !== null) closeToField();
    if (mode === "range" && typeof next === "object" && next !== null && next.end !== null) closeToField();
  };

  const applyPreset = (preset: DatePickerPreset) => {
    const resolved = typeof preset.value === "function" ? preset.value(reference()) : preset.value;
    const next: AnyValue =
      mode === "single"
        ? typeof resolved === "string"
          ? resolved
          : resolved.start
        : typeof resolved === "string"
          ? { start: resolved, end: resolved }
          : resolved;
    setValue(next);
    setDraft(null);
    setError(false);
    const nextAnchor = typeof next === "string" ? next : next?.start;
    if (nextAnchor) setMonth(nextAnchor.slice(0, 7));
    if (closeOnSelect) closeToField();
  };

  const presetValue = (preset: DatePickerPreset): AnyValue => {
    const resolved = typeof preset.value === "function" ? preset.value(todayProp ?? todayISO()) : preset.value;
    if (mode === "single") return typeof resolved === "string" ? resolved : resolved.start;
    return typeof resolved === "string" ? { start: resolved, end: resolved } : resolved;
  };

  const clear = () => {
    setValue(null);
    setDraft(null);
    setError(false);
    inputRef.current?.focus();
  };

  const showInvalid = invalid || error;
  const hasValue = value !== null;
  const hiddenValue = single ?? (range ? `${range.start}/${range.end ?? ""}` : "");
  const nights = range && range.end ? dayDelta(range.start, range.end) + 1 : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div
        data-size={size}
        data-state={open ? "open" : "closed"}
        className={cn(blockReset, "relative flex w-full items-center", wrapperClassName)}
      >
        <input
          ref={mergedRef}
          type="text"
          autoComplete="off"
          spellCheck={false}
          placeholder={placeholder ?? (mode === "range" ? "Start – end date" : "Pick a date")}
          disabled={disabled}
          aria-invalid={showInvalid || undefined}
          aria-haspopup="dialog"
          data-invalid={showInvalid ? "" : undefined}
          {...inputProps}
          value={draft ?? displayText}
          onChange={(event) => {
            setDraft(event.target.value);
            setError(false);
          }}
          onFocus={composeEventHandlers(onFocus, () => {
            if (draft === null && editableText !== displayText) setDraft(editableText);
          })}
          onBlur={composeEventHandlers(onBlur, () => {
            if (draft === null) return;
            if (draft === editableText) {
              setDraft(null);
              return;
            }
            if (!commit()) {
              setDraft(null);
              setError(false);
            }
          })}
          onKeyDown={composeEventHandlers(onKeyDown, (event: React.KeyboardEvent<HTMLInputElement>) => {
            if (event.key === "Enter") {
              if (draft !== null && draft !== editableText) {
                event.preventDefault();
                commit();
              }
            } else if (event.key === "ArrowDown" && (event.altKey || !open)) {
              event.preventDefault();
              if (commit()) openCalendar();
            } else if (event.key === "Escape" && draft !== null) {
              event.preventDefault();
              setDraft(null);
              setError(false);
            }
          })}
          className={cn(
            controlReset,
            fieldClasses,
            heights[size],
            textSize[size],
            "tabular-nums",
            showInvalid && invalidClasses,
            className,
          )}
        />
        {name ? <input type="hidden" name={name} value={hiddenValue} /> : null}
        <div className={cn(blockReset, "absolute end-1 flex items-center gap-0.5")}>
          {clearable && hasValue && !disabled ? (
            <motion.button
              type="button"
              aria-label={clearLabel}
              onClick={clear}
              initial={reduced ? false : { opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={springs.snappy}
              className={cn(
                controlReset,
                focusRing,
                "inline-flex cursor-pointer items-center justify-center rounded-pui-md text-pui-muted-foreground transition-colors duration-(--pui-duration-fast) hover:bg-pui-muted hover:text-pui-foreground",
                buttonSize[size],
              )}
            >
              <XIcon className="size-3.5" />
            </motion.button>
          ) : null}
          <PopoverTrigger
            aria-label={triggerLabel}
            disabled={disabled}
            onClick={(event) => {
              // The trigger toggles on its own; refresh the shown month before opening.
              if (!open && anchorDate) setMonth(anchorDate.slice(0, 7));
              if (!open && draft !== null && !commit()) event.preventDefault();
            }}
            className={cn(
              focusRing,
              "inline-flex cursor-pointer items-center justify-center rounded-pui-md text-pui-muted-foreground transition-colors duration-(--pui-duration-fast) hover:bg-pui-muted hover:text-pui-foreground data-[state=open]:bg-pui-muted data-[state=open]:text-pui-foreground disabled:cursor-not-allowed disabled:opacity-50",
              buttonSize[size],
            )}
          >
            <CalendarIcon className={size === "lg" ? "size-4.5" : "size-4"} />
          </PopoverTrigger>
        </div>
      </div>
      <PopoverContent
        align={align}
        side="bottom"
        initialFocus="content"
        aria-label={mode === "range" ? "Choose dates" : "Choose a date"}
        onFocus={(event) => {
          if (event.target !== event.currentTarget) return;
          event.currentTarget
            .querySelector<HTMLElement>('[data-pui-calendar-block] [data-iso][tabindex="0"]')
            ?.focus({ preventScroll: true });
        }}
        className="w-auto p-0"
      >
        <div className={cn(blockReset, "flex flex-col sm:flex-row")}>
          {presets && presets.length > 0 ? (
            <div
              role="group"
              aria-label="Presets"
              className={cn(
                blockReset,
                "flex gap-1 overflow-x-auto border-b border-pui-border p-2 sm:w-40 sm:flex-col sm:overflow-visible sm:border-e sm:border-b-0",
              )}
            >
              {presets.map((preset) => {
                const active = sameValue(presetValue(preset), value);
                return (
                  <button
                    key={preset.label}
                    type="button"
                    aria-pressed={active}
                    onClick={() => applyPreset(preset)}
                    className={cn(
                      controlReset,
                      focusRing,
                      "relative shrink-0 cursor-pointer rounded-pui-md px-2.5 py-1.5 text-start text-sm whitespace-nowrap transition-colors duration-(--pui-duration-fast)",
                      active ? "font-medium text-pui-primary-text" : "text-pui-foreground hover:bg-pui-muted",
                    )}
                  >
                    {active ? (
                      <motion.span
                        aria-hidden="true"
                        layoutId={reduced ? undefined : `${uid}-preset`}
                        transition={springs.snappy}
                        className={cn(blockReset, "absolute inset-0 rounded-pui-md bg-pui-primary/12")}
                      />
                    ) : null}
                    <span className={cn(blockReset, "relative")}>{preset.label}</span>
                  </button>
                );
              })}
            </div>
          ) : null}
          <div className={cn(blockReset, "flex flex-col")}>
            <Calendar
              {...calendarProps}
              {...(mode === "range"
                ? { mode: "range" as const, value: range, onValueChange: onCalendarChange }
                : { mode: "single" as const, value: single, onValueChange: onCalendarChange })}
              month={month}
              onMonthChange={setMonth}
              locale={locale}
              weekStartsOn={weekStartsOn}
              min={min}
              max={max}
              disabled={disabledDates}
              numberOfMonths={numberOfMonths}
              today={todayProp}
              className="border-0 bg-transparent shadow-none"
            />
            {mode === "range" ? (
              <div
                className={cn(
                  blockReset,
                  "flex items-center justify-between gap-3 border-t border-pui-border px-3 py-2 text-xs text-pui-muted-foreground",
                )}
              >
                <span className={cn(blockReset, "tabular-nums")} aria-live="polite">
                  {range === null
                    ? "Pick a start date"
                    : range.end === null
                      ? "Now pick an end date"
                      : `${nights} ${nights === 1 ? "day" : "days"} selected`}
                </span>
                {range ? (
                  <button
                    type="button"
                    onClick={() => setValue(null)}
                    className={cn(
                      controlReset,
                      focusRing,
                      "cursor-pointer rounded-pui-sm px-1.5 py-0.5 font-medium text-pui-foreground hover:bg-pui-muted",
                    )}
                  >
                    Reset
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
});
