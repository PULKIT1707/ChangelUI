"use client";

import { AnimatePresence, motion, useIsPresent, type Variants } from "motion/react";
import * as React from "react";
import { useControllableState } from "../hooks/use-controllable-state";
import { cn } from "../lib/cn";
import { composeEventHandlers, mergeRefs } from "../lib/compose";
import {
  addDays,
  addMonths,
  addMonthsToMonth,
  clampISO,
  daysInMonth,
  endOfWeek,
  formatISO,
  monthDelta,
  monthMatrix,
  monthNames,
  monthParts,
  startOfWeek,
  todayISO,
  toISOMonth,
  weekdayNames,
  type MonthDay,
  type WeekDay,
} from "../lib/date";
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from "../lib/icons";
import { durations, easings, springs } from "../lib/motion";
import { blockReset, controlReset, disabledStyles, focusRing } from "../lib/styles";
import type { MotionSafeHTMLProps } from "../lib/types";
import { useIsClient } from "../lib/use-is-client";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export type { WeekDay } from "../lib/date";

export type CalendarMode = "single" | "range" | "multiple";

/** A date range of ISO dates. `end` is null while the second date is still being picked. */
export interface DateRange {
  start: string;
  end: string | null;
}

export interface CalendarBaseProps
  extends Omit<MotionSafeHTMLProps<HTMLDivElement>, "defaultValue" | "onChange"> {
  /** Displayed (first) month as "YYYY-MM" (controlled). Use it for SSR when there is no value. */
  month?: string;
  /** Initial month; defaults to the month of the value, else the current month. */
  defaultMonth?: string;
  onMonthChange?: (month: string) => void;
  /** BCP 47 tag for labels. Fix it for SSR so server and client match. Default "en-US". */
  locale?: string;
  /** 0 = Sunday. Default 0. */
  weekStartsOn?: WeekDay;
  /** Earliest selectable ISO date. */
  min?: string;
  /** Latest selectable ISO date. */
  max?: string;
  /** Disable every day (true) or the days the function returns true for. */
  disabled?: boolean | ((date: string) => boolean);
  /** Months shown side by side. Default 1. */
  numberOfMonths?: number;
  /** Show the days of the neighbouring months (single-month view only). Default true. */
  showOutsideDays?: boolean;
  /** Always render 6 weeks so the height never jumps. Default true. */
  fixedWeeks?: boolean;
  /** Click the month heading to pick a month and year (single-month view). Default true. */
  monthPicker?: boolean;
  /** Override "today" (ISO). Default: the viewer's local date, after mount. */
  today?: string;
  /** Extra content under each day number, such as prices or event dots. */
  dayContent?: (date: string) => React.ReactNode;
  /** Text appended to a day's accessible name, e.g. "3 events" or "$129" to match dayContent. */
  dayLabel?: (date: string) => string | null | undefined;
  /** Weekday header width. Default "short". */
  weekdayFormat?: "narrow" | "short";
  previousLabel?: string;
  nextLabel?: string;
  /** Footer content under the grid. */
  children?: React.ReactNode;
}

export interface CalendarSingleProps {
  mode?: "single";
  /** ISO date or null. */
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (value: string | null) => void;
  /** Clicking the selected day keeps it selected instead of clearing it. Default false. */
  required?: boolean;
}

export interface CalendarRangeProps {
  mode: "range";
  value?: DateRange | null;
  defaultValue?: DateRange | null;
  onValueChange?: (value: DateRange | null) => void;
  required?: boolean;
}

export interface CalendarMultipleProps {
  mode: "multiple";
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
  /** Most days that can be selected. */
  maxSelected?: number;
  required?: boolean;
}

export type CalendarProps = CalendarBaseProps & (CalendarSingleProps | CalendarRangeProps | CalendarMultipleProps);

type AnyValue = string | null | DateRange | string[];

const EMPTY: string[] = [];

function isRange(value: AnyValue): value is DateRange {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const daysVariants: Variants = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 28 }),
  center: {
    opacity: 1,
    x: 0,
    transition: { x: springs.layout, opacity: { duration: durations.base, ease: easings.out } },
  },
  exit: (dir: number) => ({ opacity: 0, x: dir * -28, transition: { duration: durations.fast, ease: easings.inQuint } }),
};

const reducedFade: Variants = {
  enter: { opacity: 0 },
  center: { opacity: 1, transition: { duration: 0.15 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

const navButton = cn(
  controlReset,
  focusRing,
  disabledStyles,
  "inline-flex size-8 cursor-pointer items-center justify-center rounded-pui-md text-pui-muted-foreground transition-colors duration-(--pui-duration-fast) hover:bg-pui-muted hover:text-pui-foreground",
);

interface MonthBlockProps {
  dir: number;
  reduced: boolean;
  blockKey: string;
  children: React.ReactNode;
}

/** One slide of the month carousel; an exiting slide is hidden from AT and pointer input. */
const MonthBlock = React.forwardRef<HTMLDivElement, MonthBlockProps>(function MonthBlock(
  { dir, reduced, blockKey, children },
  ref,
) {
  const isPresent = useIsPresent();
  return (
    <motion.div
      ref={ref}
      custom={dir}
      variants={reduced ? reducedFade : daysVariants}
      initial="enter"
      animate="center"
      exit="exit"
      data-pui-calendar-block={isPresent ? blockKey : undefined}
      aria-hidden={isPresent ? undefined : true}
      className={cn(blockReset, "flex gap-6", !isPresent && "pointer-events-none")}
    >
      {children}
    </motion.div>
  );
});

/**
 * Month grid with single, range and multiple selection on ISO date strings, a directional month
 * slide, a month/year picker, min/max and disabled days (roadmap W3). Dates are formatted with Intl
 * only, no date library. APG date grid keyboard model.
 */
export const Calendar = React.forwardRef<HTMLDivElement, CalendarProps>(function Calendar(props, ref) {
  const {
    mode = "single",
    value: valueProp,
    defaultValue,
    onValueChange,
    required = false,
    month: monthProp,
    defaultMonth,
    onMonthChange,
    locale = "en-US",
    weekStartsOn = 0,
    min,
    max,
    disabled = false,
    numberOfMonths = 1,
    showOutsideDays = true,
    fixedWeeks = true,
    monthPicker = true,
    today: todayProp,
    dayContent,
    dayLabel,
    weekdayFormat = "short",
    previousLabel,
    nextLabel,
    className,
    children,
    onPointerLeave,
    ...rest
  } = props;
  const maxSelected = props.mode === "multiple" ? props.maxSelected : undefined;
  const domProps = { ...rest } as Record<string, unknown>;
  delete domProps.maxSelected;

  const uid = React.useId();
  const reduced = usePrefersReducedMotion();
  const isClient = useIsClient();
  const rootRef = React.useRef<HTMLDivElement>(null);
  const mergedRef = React.useMemo(() => mergeRefs(rootRef, ref), [ref]);
  const pendingFocus = React.useRef<"day" | "month" | null>(null);

  const [value, setValue] = useControllableState<AnyValue>({
    value: valueProp as AnyValue | undefined,
    defaultValue: () => (defaultValue as AnyValue | undefined) ?? (mode === "multiple" ? [] : null),
    onChange: (next) => (onValueChange as ((next: AnyValue) => void) | undefined)?.(next),
  });
  const single = mode === "single" && typeof value === "string" ? value : null;
  const range = mode === "range" && isRange(value) ? value : null;
  const multiple = mode === "multiple" && Array.isArray(value) ? value : EMPTY;
  const multipleSet = React.useMemo(() => new Set(multiple), [multiple]);
  const firstSelected = single ?? range?.start ?? multiple[0] ?? null;

  const count = Math.max(1, Math.floor(numberOfMonths));
  const minMonth = toISOMonth(min);
  const maxMonth = toISOMonth(max);
  const [month, setMonthState] = useControllableState<string>({
    value: toISOMonth(monthProp) ?? undefined,
    defaultValue: () => toISOMonth(defaultMonth) ?? toISOMonth(firstSelected) ?? todayISO().slice(0, 7),
    onChange: onMonthChange,
    name: "month",
  });

  // Slide direction comes from the month delta (derived state, updated during render).
  const [shown, setShown] = React.useState({ month, dir: 0 });
  let dir = shown.dir;
  if (shown.month !== month) {
    dir = Math.sign(monthDelta(shown.month, month));
    setShown({ month, dir });
  }

  const visible = React.useMemo(
    () => Array.from({ length: count }, (_, index) => addMonthsToMonth(month, index)),
    [month, count],
  );
  const lastMonth = visible[visible.length - 1] as string;
  const today = todayProp ?? (isClient ? todayISO() : null);

  const [view, setView] = React.useState<"days" | "months">("days");
  const [pickerYear, setPickerYear] = React.useState(() => monthParts(month).year);
  const [monthFocus, setMonthFocus] = React.useState(() => monthParts(month).month - 1);
  const [focusISO, setFocusISO] = React.useState<string | null>(null);
  const [hoverISO, setHoverISO] = React.useState<string | null>(null);
  const pickerEnabled = monthPicker && count === 1;
  const showMonths = pickerEnabled && view === "months";

  const isDisabled = (iso: string): boolean =>
    (min !== undefined && iso < min) ||
    (max !== undefined && iso > max) ||
    disabled === true ||
    (typeof disabled === "function" && disabled(iso));

  const inView = (iso: string) => visible.includes(iso.slice(0, 7));

  const tabTarget = (() => {
    if (focusISO && inView(focusISO)) return focusISO;
    const selected = single ?? range?.start ?? multiple.find(inView) ?? null;
    if (selected && inView(selected)) return selected;
    if (today && inView(today)) return today;
    return `${month}-01`;
  })();

  React.useEffect(() => {
    const kind = pendingFocus.current;
    const root = rootRef.current;
    if (!kind || !root) return;
    pendingFocus.current = null;
    const selector =
      kind === "day"
        ? `[data-pui-calendar-block="${month}"] [data-iso="${tabTarget}"]:not([data-outside])`
        : `[data-pui-calendar-month-option][tabindex="0"]`;
    root.querySelector<HTMLElement>(selector)?.focus({ preventScroll: true });
  });

  const goToMonth = (next: string) => {
    let target = next;
    if (minMonth && monthDelta(minMonth, target) < 0) target = minMonth;
    if (maxMonth) {
      const lastStart = addMonthsToMonth(maxMonth, -(count - 1));
      if (monthDelta(target, lastStart) < 0) target = minMonth && monthDelta(minMonth, lastStart) < 0 ? minMonth : lastStart;
    }
    setMonthState(target);
  };

  const moveFocus = (iso: string) => {
    const target = clampISO(iso, min, max);
    setFocusISO(target);
    if (range && range.end === null) setHoverISO(target);
    const targetMonth = target.slice(0, 7);
    if (monthDelta(month, targetMonth) < 0) goToMonth(targetMonth);
    else if (monthDelta(lastMonth, targetMonth) > 0) goToMonth(addMonthsToMonth(targetMonth, -(count - 1)));
    pendingFocus.current = "day";
  };

  const select = (iso: string) => {
    if (isDisabled(iso)) return;
    setFocusISO(iso);
    if (!inView(iso)) goToMonth(iso.slice(0, 7));
    if (mode === "single") {
      setValue((prev) => (prev === iso && !required ? null : iso));
    } else if (mode === "multiple") {
      setValue((prev) => {
        const list = Array.isArray(prev) ? prev : [];
        if (list.includes(iso)) return required && list.length === 1 ? list : list.filter((d) => d !== iso);
        if (maxSelected !== undefined && list.length >= maxSelected) return list;
        return [...list, iso].sort();
      });
    } else {
      setValue((prev) => {
        if (!isRange(prev) || prev.end !== null) return { start: iso, end: null };
        return iso < prev.start ? { start: iso, end: prev.start } : { start: prev.start, end: iso };
      });
      setHoverISO(null);
    }
  };

  const onDayKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const iso = (event.target as HTMLElement).closest?.("[data-iso]")?.getAttribute("data-iso");
    if (!iso) return;
    let next: string | null = null;
    switch (event.key) {
      case "ArrowLeft":
        next = addDays(iso, -1);
        break;
      case "ArrowRight":
        next = addDays(iso, 1);
        break;
      case "ArrowUp":
        next = addDays(iso, -7);
        break;
      case "ArrowDown":
        next = addDays(iso, 7);
        break;
      case "Home":
        next = startOfWeek(iso, weekStartsOn);
        break;
      case "End":
        next = endOfWeek(iso, weekStartsOn);
        break;
      case "PageUp":
        next = addMonths(iso, event.shiftKey ? -12 : -1);
        break;
      case "PageDown":
        next = addMonths(iso, event.shiftKey ? 12 : 1);
        break;
      default:
        return;
    }
    event.preventDefault();
    moveFocus(next);
  };

  const openMonths = () => {
    const parts = monthParts(month);
    setPickerYear(parts.year);
    setMonthFocus(parts.month - 1);
    setView("months");
    pendingFocus.current = "month";
  };

  const closeMonths = (focus: boolean) => {
    setView("days");
    if (focus) pendingFocus.current = "day";
  };

  const monthDisabled = (year: number, index: number) => {
    const iso = `${String(year).padStart(4, "0")}-${String(index + 1).padStart(2, "0")}`;
    return (minMonth !== null && monthDelta(minMonth, iso) < 0) || (maxMonth !== null && monthDelta(iso, maxMonth) < 0);
  };

  const pickMonth = (index: number) => {
    if (monthDisabled(pickerYear, index)) return;
    goToMonth(`${String(pickerYear).padStart(4, "0")}-${String(index + 1).padStart(2, "0")}`);
    closeMonths(true);
  };

  const onMonthKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    let next = monthFocus;
    let year = pickerYear;
    switch (event.key) {
      case "ArrowLeft":
        next -= 1;
        break;
      case "ArrowRight":
        next += 1;
        break;
      case "ArrowUp":
        next -= 3;
        break;
      case "ArrowDown":
        next += 3;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = 11;
        break;
      case "PageUp":
        year -= 1;
        break;
      case "PageDown":
        year += 1;
        break;
      case "Escape":
        event.preventDefault();
        closeMonths(true);
        return;
      default:
        return;
    }
    event.preventDefault();
    if (next < 0) {
      next += 12;
      year -= 1;
    } else if (next > 11) {
      next -= 12;
      year += 1;
    }
    setPickerYear(year);
    setMonthFocus(next);
    pendingFocus.current = "month";
  };

  const prevDisabled = showMonths
    ? minMonth !== null && monthParts(minMonth).year >= pickerYear
    : minMonth !== null && monthDelta(minMonth, month) <= 0;
  const nextDisabled = showMonths
    ? maxMonth !== null && monthParts(maxMonth).year <= pickerYear
    : maxMonth !== null && monthDelta(lastMonth, maxMonth) <= 0;
  const step = (delta: number) => {
    if (showMonths) setPickerYear((year) => year + delta);
    else goToMonth(addMonthsToMonth(month, delta));
  };

  // Range band: committed range, or the live preview while the end is being picked.
  const pickEnd = range && range.end === null ? hoverISO : null;
  const bandA = range?.start ?? null;
  const bandB = range ? (range.end ?? pickEnd ?? range.start) : null;
  const lo = bandA && bandB ? (bandA < bandB ? bandA : bandB) : null;
  const hi = bandA && bandB ? (bandA < bandB ? bandB : bandA) : null;
  const anchorAtStart = range ? range.start === lo : true;
  const previewing = range !== null && range.end === null;

  const weekdaysShort = weekdayNames(locale, weekStartsOn, weekdayFormat);
  const weekdaysLong = weekdayNames(locale, weekStartsOn, "long");
  const shortMonths = monthNames(locale, "short");
  const monthLabel = (isoMonth: string) => formatISO(`${isoMonth}-01`, locale, { month: "long", year: "numeric" });
  const liveText = showMonths ? String(pickerYear) : visible.map(monthLabel).join(" – ");
  const roomy = dayContent !== undefined;
  const cellSize = roomy ? "h-12 w-11" : "size-9";

  const renderDay = (day: MonthDay, col: number, isoMonth: string) => {
    const { iso, outside } = day;
    const key = `${isoMonth}-${iso}`;
    if (outside && (!showOutsideDays || count > 1)) {
      return <div key={key} role="gridcell" className={cn(blockReset, cellSize)} />;
    }
    const off = isDisabled(iso);
    const isToday = today === iso;
    const selected =
      mode === "single"
        ? single === iso
        : mode === "multiple"
          ? multipleSet.has(iso)
          : range !== null && (range.start === iso || range.end === iso);
    const endpoint = mode === "range" && !outside && (iso === lo || iso === hi) && lo !== null;
    const filled = !outside && (selected || endpoint);
    const inBand = !outside && lo !== null && hi !== null && lo !== hi && iso >= lo && iso <= hi;
    const lastDay = day.day === daysInMonth(monthParts(isoMonth).year, monthParts(isoMonth).month);
    const roundStart = (col === 0 || day.day === 1) && iso !== lo;
    const roundEnd = (col === 6 || lastDay) && iso !== hi;
    const dateLabel = formatISO(iso, locale, { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    const suffix = dayLabel?.(iso);
    const label = suffix ? `${dateLabel}, ${suffix}` : dateLabel;
    const extra = dayContent?.(iso);

    return (
      <div
        key={key}
        role="gridcell"
        aria-selected={selected || endpoint || (mode === "range" && inBand && !previewing) ? true : false}
        className={cn(blockReset, "relative flex items-center justify-center", cellSize)}
      >
        {inBand ? (
          <motion.span
            aria-hidden="true"
            initial={reduced ? false : { scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: durations.base, ease: easings.out }}
            style={{ originX: anchorAtStart ? 0 : 1 }}
            className={cn(
              blockReset,
              "absolute inset-y-0.5",
              previewing ? "bg-pui-primary/8" : "bg-pui-primary/14",
              iso === lo ? "start-1/2 end-0" : iso === hi ? "start-0 end-1/2" : "inset-x-0",
              roundStart && "rounded-s-full",
              roundEnd && "rounded-e-full",
            )}
          />
        ) : null}
        {filled ? (
          mode === "single" ? (
            <motion.span
              aria-hidden="true"
              layoutId={reduced ? undefined : `${uid}-selected`}
              transition={springs.snappy}
              className={cn(
                blockReset,
                "absolute inset-0.5 bg-pui-primary shadow-[0_4px_14px_-4px_color-mix(in_oklab,var(--pui-primary)_70%,transparent)]",
                roomy ? "rounded-pui-lg" : "rounded-full",
              )}
            />
          ) : (
            <motion.span
              aria-hidden="true"
              initial={reduced ? false : { scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: previewing && iso !== range?.start ? 0.75 : 1 }}
              transition={springs.bouncy}
              className={cn(
                blockReset,
                "absolute inset-0.5 bg-pui-primary shadow-[0_4px_14px_-4px_color-mix(in_oklab,var(--pui-primary)_70%,transparent)]",
                roomy ? "rounded-pui-lg" : "rounded-full",
              )}
            />
          )
        ) : null}
        <button
          type="button"
          data-iso={iso}
          data-outside={outside ? "" : undefined}
          data-today={isToday ? "" : undefined}
          data-selected={filled ? "" : undefined}
          data-disabled={off ? "" : undefined}
          tabIndex={!outside && iso === tabTarget ? 0 : -1}
          aria-label={label}
          aria-current={isToday ? "date" : undefined}
          aria-disabled={off || undefined}
          onClick={() => select(iso)}
          onFocus={() => {
            if (!outside) setFocusISO(iso);
            if (previewing) setHoverISO(iso);
          }}
          onPointerEnter={previewing ? () => setHoverISO(iso) : undefined}
          className={cn(
            controlReset,
            focusRing,
            "relative z-1 flex cursor-pointer flex-col items-center justify-center gap-0.5 text-sm tabular-nums transition-[color,background-color] duration-(--pui-duration-fast)",
            cellSize,
            roomy ? "rounded-pui-lg" : "rounded-full",
            filled
              ? "font-semibold text-pui-primary-foreground"
              : inBand
                ? "text-pui-foreground hover:bg-pui-primary/12"
                : "text-pui-foreground hover:bg-pui-muted",
            outside && !filled && "text-pui-muted-foreground/55",
            isToday && !filled && "font-semibold text-pui-primary-text",
            off &&
              "cursor-not-allowed text-pui-muted-foreground/45 line-through decoration-pui-muted-foreground/40 hover:bg-transparent",
          )}
        >
          <span className={cn(blockReset, "leading-none")}>{day.day}</span>
          {extra !== undefined && extra !== null ? (
            <span
              className={cn(
                blockReset,
                "text-[0.625rem] leading-none font-medium",
                filled ? "text-pui-primary-foreground/85" : "text-pui-muted-foreground",
              )}
            >
              {extra}
            </span>
          ) : null}
          {isToday && !roomy ? (
            <span
              aria-hidden="true"
              className={cn(blockReset, "absolute bottom-1 size-1 rounded-full", filled ? "bg-pui-primary-foreground" : "bg-pui-primary")}
            />
          ) : null}
        </button>
      </div>
    );
  };

  const renderMonth = (isoMonth: string, index: number) => {
    const label = monthLabel(isoMonth);
    const weeks = monthMatrix(isoMonth, weekStartsOn, fixedWeeks);
    return (
      <div key={isoMonth} className={cn(blockReset, "flex flex-col gap-1.5")}>
        <div className={cn(blockReset, "flex h-8 items-center justify-center px-9")}>
          {pickerEnabled && index === 0 ? (
            <button
              type="button"
              aria-label={`${label}, choose month and year`}
              aria-expanded={false}
              onClick={openMonths}
              className={cn(
                controlReset,
                focusRing,
                "inline-flex h-8 cursor-pointer items-center gap-1 rounded-pui-md px-2 text-sm font-semibold text-pui-foreground transition-colors duration-(--pui-duration-fast) hover:bg-pui-muted",
              )}
            >
              {label}
              <ChevronDownIcon className="size-3.5 text-pui-muted-foreground" />
            </button>
          ) : (
            <span className={cn(blockReset, "text-sm font-semibold text-pui-foreground")}>{label}</span>
          )}
        </div>
        <div
          role="grid"
          aria-label={label}
          aria-multiselectable={mode !== "single" || undefined}
          onKeyDown={onDayKeyDown}
          className={cn(blockReset, "flex flex-col")}
        >
          <div role="row" className={cn(blockReset, "grid grid-cols-7")}>
            {weekdaysShort.map((name, col) => (
              <span
                key={name + col}
                role="columnheader"
                aria-label={weekdaysLong[col]}
                className={cn(
                  blockReset,
                  "flex h-7 items-center justify-center text-[0.6875rem] font-medium text-pui-muted-foreground",
                  roomy ? "w-11" : "w-9",
                )}
              >
                {name}
              </span>
            ))}
          </div>
          {weeks.map((week) => (
            <div key={week[0]?.iso} role="row" className={cn(blockReset, "grid grid-cols-7")}>
              {week.map((day, col) => renderDay(day, col, isoMonth))}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div
      ref={mergedRef}
      role="group"
      aria-label={(domProps["aria-label"] as string | undefined) ?? (domProps["aria-labelledby"] ? undefined : "Calendar")}
      data-mode={mode}
      data-view={showMonths ? "months" : "days"}
      {...domProps}
      onPointerLeave={composeEventHandlers(onPointerLeave, () => {
        if (previewing) setHoverISO(null);
      })}
      className={cn(
        blockReset,
        "relative inline-flex flex-col gap-3 rounded-pui-xl border border-pui-border bg-pui-surface p-3 text-pui-surface-foreground shadow-pui-sm select-none",
        className,
      )}
    >
      <span className={cn(blockReset, "sr-only")} aria-live="polite">
        {liveText}
      </span>
      <div className={cn(blockReset, "relative")}>
        <div className={cn(blockReset, "absolute inset-x-0 top-0 z-2 flex justify-between pointer-events-none")}>
          <button
            type="button"
            aria-label={previousLabel ?? (showMonths ? "Previous year" : "Previous month")}
            disabled={prevDisabled}
            onClick={() => step(-1)}
            className={cn(navButton, "pointer-events-auto")}
          >
            <ChevronLeftIcon className="size-4" />
          </button>
          <button
            type="button"
            aria-label={nextLabel ?? (showMonths ? "Next year" : "Next month")}
            disabled={nextDisabled}
            onClick={() => step(1)}
            className={cn(navButton, "pointer-events-auto")}
          >
            <ChevronRightIcon className="size-4" />
          </button>
        </div>
        <motion.div
          animate={showMonths ? { opacity: 0, scale: reduced ? 1 : 0.94 } : { opacity: 1, scale: 1 }}
          transition={reduced ? { duration: 0.15 } : springs.layout}
          aria-hidden={showMonths || undefined}
          className={cn(blockReset, "relative", showMonths && "pointer-events-none")}
        >
          <AnimatePresence initial={false} mode="popLayout" custom={dir}>
            <MonthBlock key={month} blockKey={month} dir={dir} reduced={reduced}>
              {visible.map(renderMonth)}
            </MonthBlock>
          </AnimatePresence>
        </motion.div>
        <AnimatePresence>
          {showMonths ? (
            <motion.div
              key="months"
              initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 1.08 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 1.08, transition: { duration: durations.fast } }}
              transition={reduced ? { duration: 0.15 } : springs.layout}
              className={cn(blockReset, "absolute inset-0 z-1 flex flex-col gap-2")}
            >
              <div className={cn(blockReset, "flex h-8 items-center justify-center px-9")}>
                <button
                  type="button"
                  aria-label={`${pickerYear}, back to days`}
                  aria-expanded={true}
                  onClick={() => closeMonths(true)}
                  className={cn(
                    controlReset,
                    focusRing,
                    "inline-flex h-8 cursor-pointer items-center gap-1 rounded-pui-md px-2 text-sm font-semibold tabular-nums text-pui-foreground transition-colors duration-(--pui-duration-fast) hover:bg-pui-muted",
                  )}
                >
                  {pickerYear}
                  <ChevronDownIcon className="size-3.5 rotate-180 text-pui-muted-foreground" />
                </button>
              </div>
              <div
                role="group"
                aria-label={`Months of ${pickerYear}`}
                onKeyDown={onMonthKeyDown}
                className={cn(blockReset, "grid flex-1 grid-cols-3 gap-1.5")}
              >
                {shortMonths.map((name, index) => {
                  const isoMonth = `${String(pickerYear).padStart(4, "0")}-${String(index + 1).padStart(2, "0")}`;
                  const current = isoMonth === month;
                  const off = monthDisabled(pickerYear, index);
                  return (
                    <button
                      key={name}
                      type="button"
                      data-pui-calendar-month-option=""
                      tabIndex={index === monthFocus ? 0 : -1}
                      aria-pressed={current}
                      aria-label={monthLabel(isoMonth)}
                      disabled={off}
                      onClick={() => pickMonth(index)}
                      onFocus={() => setMonthFocus(index)}
                      className={cn(
                        controlReset,
                        focusRing,
                        disabledStyles,
                        "relative cursor-pointer rounded-pui-lg text-sm font-medium transition-colors duration-(--pui-duration-fast)",
                        current
                          ? "bg-pui-primary text-pui-primary-foreground shadow-pui-sm"
                          : "text-pui-foreground hover:bg-pui-muted",
                        today?.startsWith(isoMonth) && !current && "text-pui-primary-text ring-1 ring-pui-primary/40 ring-inset",
                      )}
                    >
                      {name}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
      {children}
    </div>
  );
});
