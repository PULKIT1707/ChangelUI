"use client";
import { AnimatePresence, motion } from "motion/react";
import * as React from "react";
import { useControllableState } from "../hooks/use-controllable-state";
import { cn } from "../lib/cn";
import { fieldClasses, invalidClasses } from "../lib/field-styles";
import { CalendarIcon, ClockIcon, TriangleAlertIcon } from "../lib/icons";
import { easings } from "../lib/motion";
import { blockReset, controlReset, focusRing, listReset } from "../lib/styles";
import { useIsClient } from "../lib/use-is-client";
import { useMinuteClock } from "../lib/use-minute-clock";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";
import { NumberInput } from "./number-input";
import { Select, SelectContent, SelectItem, SelectTrigger } from "./select";
import { ToggleGroup, ToggleGroupItem } from "./toggle-group";

// ---------------------------------------------------------------------------------------------
// Cron logic (5 fields: minute hour day-of-month month day-of-week). Pure and exported.
// ---------------------------------------------------------------------------------------------

export interface CronSchedule {
  minutes: number[];
  hours: number[];
  days: number[];
  months: number[];
  /** 0 = Sunday … 6 = Saturday. */
  weekdays: number[];
  /** Day-of-month field was "*" (or "?"). */
  anyDay: boolean;
  /** Day-of-week field was "*" (or "?"). */
  anyWeekday: boolean;
}

const MONTH_NAMES = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const DAY_NAMES = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const FIELD_SPECS = [
  { label: "minute", min: 0, max: 59 },
  { label: "hour", min: 0, max: 23 },
  { label: "day of month", min: 1, max: 31 },
  { label: "month", min: 1, max: 12, names: MONTH_NAMES, offset: 1 },
  { label: "day of week", min: 0, max: 7, names: DAY_NAMES, offset: 0 },
] as const;

type FieldResult = { values: number[]; any: boolean } | { error: string };

function parseNumber(token: string, spec: (typeof FIELD_SPECS)[number]): number | null {
  if (/^\d+$/.test(token)) return Number(token);
  if ("names" in spec) {
    const index = (spec.names as readonly string[]).indexOf(token.toUpperCase());
    if (index >= 0) return index + spec.offset;
  }
  return null;
}

function parseField(text: string, spec: (typeof FIELD_SPECS)[number]): FieldResult {
  if (text === "*" || text === "?") {
    const values: number[] = [];
    for (let v = spec.min; v <= Math.min(spec.max, spec.label === "day of week" ? 6 : spec.max); v++) values.push(v);
    return { values, any: true };
  }
  const set = new Set<number>();
  for (const part of text.split(",")) {
    const match = /^([^/]+)(?:\/(\d+))?$/.exec(part);
    if (!match) return { error: `"${part}" is not valid in the ${spec.label} field` };
    const [, range = "", stepText] = match;
    const step = stepText === undefined ? 1 : Number(stepText);
    if (step < 1) return { error: `Step must be 1 or more in the ${spec.label} field` };
    let from: number;
    let to: number;
    if (range === "*") {
      from = spec.min;
      to = spec.label === "day of week" ? 6 : spec.max;
    } else {
      const bounds = range.split("-");
      if (bounds.length > 2) return { error: `"${range}" is not a valid range` };
      const a = parseNumber(bounds[0] ?? "", spec);
      const b = bounds.length === 2 ? parseNumber(bounds[1] ?? "", spec) : stepText !== undefined ? spec.max : a;
      if (a === null || b === null) return { error: `"${range}" is not valid in the ${spec.label} field` };
      from = a;
      to = b;
    }
    if (from < spec.min || to > spec.max || from > to) {
      return { error: `The ${spec.label} must be between ${spec.min} and ${spec.max === 7 ? 6 : spec.max}` };
    }
    for (let v = from; v <= to; v += step) set.add(spec.label === "day of week" && v === 7 ? 0 : v);
  }
  return { values: [...set].sort((x, y) => x - y), any: false };
}

/** Parses a 5-field cron expression; returns an error message when it is invalid. */
export function parseCron(expression: string): { schedule: CronSchedule } | { error: string } {
  const fields = expression.trim().split(/\s+/);
  if (fields.length !== 5 || fields[0] === "") {
    return { error: `Expected 5 fields (minute hour day month weekday), got ${fields[0] === "" ? 0 : fields.length}` };
  }
  const results: { values: number[]; any: boolean }[] = [];
  for (let i = 0; i < 5; i++) {
    const spec = FIELD_SPECS[i];
    if (!spec) break;
    const result = parseField(fields[i] ?? "", spec);
    if ("error" in result) return { error: result.error };
    results.push(result);
  }
  const [minutes, hours, days, months, weekdays] = results as [
    FieldResult & { values: number[]; any: boolean },
    FieldResult & { values: number[]; any: boolean },
    FieldResult & { values: number[]; any: boolean },
    FieldResult & { values: number[]; any: boolean },
    FieldResult & { values: number[]; any: boolean },
  ];
  return {
    schedule: {
      minutes: minutes.values,
      hours: hours.values,
      days: days.values,
      months: months.values,
      weekdays: weekdays.values,
      anyDay: days.any,
      anyWeekday: weekdays.any,
    },
  };
}

function dayMatches(s: CronSchedule, date: Date): boolean {
  const dom = s.days.includes(date.getDate());
  const dow = s.weekdays.includes(date.getDay());
  // Standard cron: when both day fields are restricted, either one matching is enough.
  if (s.anyDay && s.anyWeekday) return true;
  if (s.anyDay) return dow;
  if (s.anyWeekday) return dom;
  return dom || dow;
}

/** The next `count` run times after `from` (local time). Returns [] for invalid expressions. */
export function nextCronRuns(expression: string, from: Date, count = 5): Date[] {
  const parsed = parseCron(expression);
  if ("error" in parsed) return [];
  const s = parsed.schedule;
  const runs: Date[] = [];
  const d = new Date(from.getTime());
  d.setSeconds(0, 0);
  d.setMinutes(d.getMinutes() + 1);
  // Bounded search: about 5 years of day skips is plenty for any satisfiable schedule.
  for (let guard = 0; guard < 200_000 && runs.length < count; guard++) {
    if (!s.months.includes(d.getMonth() + 1)) {
      d.setMonth(d.getMonth() + 1, 1);
      d.setHours(0, 0, 0, 0);
      continue;
    }
    if (!dayMatches(s, d)) {
      d.setDate(d.getDate() + 1);
      d.setHours(0, 0, 0, 0);
      continue;
    }
    if (!s.hours.includes(d.getHours())) {
      d.setHours(d.getHours() + 1, 0, 0, 0);
      continue;
    }
    if (!s.minutes.includes(d.getMinutes())) {
      d.setMinutes(d.getMinutes() + 1, 0, 0);
      continue;
    }
    runs.push(new Date(d.getTime()));
    d.setMinutes(d.getMinutes() + 1, 0, 0);
  }
  return runs;
}

const LONG_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const LONG_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function joinList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/** Collapses consecutive values into ranges: [1,2,3,5] → ["1 through 3", "5"]. */
function describeValues(values: number[], name: (v: number) => string, through = " through "): string {
  const parts: string[] = [];
  let k = 0;
  while (k < values.length) {
    const start = values[k] ?? 0;
    let end = start;
    while (values[k + 1] === end + 1) {
      end++;
      k++;
    }
    parts.push(end - start >= 2 ? `${name(start)}${through}${name(end)}` : end === start ? name(start) : `${name(start)} and ${name(end)}`);
    k++;
  }
  return joinList(parts);
}

const pad = (n: number) => String(n).padStart(2, "0");
const ordinal = (n: number) => {
  const rem = n % 100;
  if (rem >= 11 && rem <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
};

function stepOf(values: number[], min: number, max: number): number | null {
  if (values.length < 2 || values[0] !== min) return null;
  const step = (values[1] ?? 0) - (values[0] ?? 0);
  for (let k = 1; k < values.length; k++) if ((values[k] ?? 0) - (values[k - 1] ?? 0) !== step) return null;
  return (values[values.length - 1] ?? 0) + step > max ? step : null;
}

/** A plain-English sentence for a cron expression, e.g. "At 09:00, Monday through Friday". */
export function describeCron(expression: string): string {
  const parsed = parseCron(expression);
  if ("error" in parsed) return parsed.error;
  const s = parsed.schedule;
  const allMinutes = s.minutes.length === 60;
  const allHours = s.hours.length === 24;
  let time: string;
  const minuteStep = stepOf(s.minutes, 0, 59);
  if (allMinutes && allHours) time = "Every minute";
  else if (allHours && minuteStep) time = `Every ${minuteStep} minutes`;
  else if (allHours && s.minutes.length === 1) time = s.minutes[0] === 0 ? "Every hour" : `Every hour at minute ${s.minutes[0]}`;
  else if (s.minutes.length === 1 && s.hours.length <= 4) time = `At ${joinList(s.hours.map((h) => `${pad(h)}:${pad(s.minutes[0] ?? 0)}`))}`;
  else {
    const hourStep = stepOf(s.hours, 0, 23);
    const firstHour = s.hours[0] ?? 0;
    const lastHour = s.hours[s.hours.length - 1] ?? 0;
    const oneRun = s.hours.length > 1 && lastHour - firstHour === s.hours.length - 1;
    const hours = hourStep
      ? `every ${hourStep} hours`
      : oneRun
        ? `between ${pad(firstHour)}:00 and ${pad(lastHour)}:59`
        : `hour ${describeValues(s.hours, String)}`;
    if (allMinutes || minuteStep) {
      const minutePart = allMinutes ? "Every minute" : `Every ${minuteStep} minutes`;
      time = allHours ? minutePart : `${minutePart}, ${hours}`;
    } else {
      const past = allHours ? "every hour" : oneRun && !hourStep ? `every hour ${hours}` : hours;
      time = `At minute ${describeValues(s.minutes, String)} past ${past}`;
    }
  }
  const parts = [time];
  const dayText = s.anyDay ? "" : `on the ${describeValues(s.days, ordinal)}`;
  const weekdayText = s.anyWeekday ? "" : s.weekdays.length === 7 ? "" : describeValues(s.weekdays, (d) => LONG_DAYS[d] ?? "");
  if (dayText && weekdayText) parts.push(`${dayText} or on ${weekdayText}`);
  else if (dayText) parts.push(dayText);
  else if (weekdayText) parts.push(weekdayText);
  if (s.months.length < 12) parts.push(`in ${describeValues(s.months, (m) => LONG_MONTHS[m - 1] ?? "")}`);
  return parts.join(", ");
}

// ---------------------------------------------------------------------------------------------
// Friendly builder modes
// ---------------------------------------------------------------------------------------------

export type CronFrequency = "minute" | "hour" | "day" | "week" | "month" | "custom";

interface Fields {
  interval: number;
  minute: number;
  hour: number;
  weekdays: number[];
  day: number;
}

const INTERVALS = [1, 2, 5, 10, 15, 20, 30];
const NUM = /^\d+$/;

function detect(expression: string): { mode: CronFrequency; fields: Fields } {
  const fallback: Fields = { interval: 15, minute: 0, hour: 9, weekdays: [1, 2, 3, 4, 5], day: 1 };
  const parsed = parseCron(expression);
  if ("error" in parsed) return { mode: "custom", fields: fallback };
  const s = parsed.schedule;
  const fields: Fields = {
    interval: fallback.interval,
    minute: s.minutes[0] ?? 0,
    hour: s.minutes.length === 60 || s.hours.length === 24 ? fallback.hour : (s.hours[0] ?? 9),
    weekdays: s.anyWeekday ? fallback.weekdays : s.weekdays,
    day: s.anyDay ? 1 : (s.days[0] ?? 1),
  };
  if (s.minutes.length === 60 && s.hours.length === 24) fields.minute = 0;
  const [m = "", h = "", dom = "", mon = "", dow = ""] = expression.trim().split(/\s+/);
  const minuteStep = /^\*(?:\/(\d+))?$/.exec(m);
  if (minuteStep && h === "*" && dom === "*" && mon === "*" && dow === "*") {
    const interval = minuteStep[1] === undefined ? 1 : Number(minuteStep[1]);
    if (INTERVALS.includes(interval)) return { mode: "minute", fields: { ...fields, interval, minute: 0 } };
  }
  if (!NUM.test(m) || mon !== "*") return { mode: "custom", fields };
  if (h === "*" && dom === "*" && dow === "*") return { mode: "hour", fields };
  if (!NUM.test(h)) return { mode: "custom", fields };
  if (dom === "*" && dow === "*") return { mode: "day", fields };
  if (dom === "*" && /^[\d,-]+$/.test(dow) && s.weekdays.length > 0) return { mode: "week", fields };
  if (NUM.test(dom) && dow === "*") return { mode: "month", fields };
  return { mode: "custom", fields };
}

/** Collapses sorted weekdays into the shortest cron list: [1,2,3,4,5] → "1-5". */
function weekdayField(days: number[]): string {
  const sorted = [...new Set(days)].sort((a, b) => a - b);
  const parts: string[] = [];
  let k = 0;
  while (k < sorted.length) {
    const start = sorted[k] ?? 0;
    let end = start;
    while (sorted[k + 1] === end + 1) {
      end++;
      k++;
    }
    parts.push(end - start >= 2 ? `${start}-${end}` : end === start ? String(start) : `${start},${end}`);
    k++;
  }
  return parts.join(",");
}

function build(mode: CronFrequency, f: Fields): string {
  switch (mode) {
    case "minute":
      return f.interval === 1 ? "* * * * *" : `*/${f.interval} * * * *`;
    case "hour":
      return `${f.minute} * * * *`;
    case "day":
      return `${f.minute} ${f.hour} * * *`;
    case "week":
      return `${f.minute} ${f.hour} * * ${weekdayField(f.weekdays.length ? f.weekdays : [1])}`;
    case "month":
      return `${f.minute} ${f.hour} ${f.day} * *`;
    default:
      return `${f.minute} ${f.hour} * * *`;
  }
}

// ---------------------------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------------------------

export interface CronPreset {
  label: string;
  value: string;
}

export interface CronEditorProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange"> {
  value?: string;
  /** Default "0 9 * * 1-5" (weekdays at 09:00). */
  defaultValue?: string;
  /** Called with valid expressions only; typing an invalid expression shows an error instead. */
  onValueChange?: (value: string) => void;
  /** Quick picks above the builder. Pass [] to hide them. */
  presets?: readonly CronPreset[];
  /** Upcoming runs listed under the sentence. 0 hides the list. Default 5. */
  nextRuns?: number;
  /** Reference time for upcoming runs. Default: the client clock after hydration (no runs on the server). */
  now?: Date;
  /** Locale for upcoming run dates. Default "en-US" (fixed so server and client agree). */
  locale?: string;
  /** Label shown on the run list, e.g. the user's timezone. Default: the browser's timezone. */
  timeZoneLabel?: string;
  /** Show the raw expression field. Default true. */
  showExpression?: boolean;
  disabled?: boolean;
}

export const defaultCronPresets: readonly CronPreset[] = [
  { label: "Weekdays at 9:00", value: "0 9 * * 1-5" },
  { label: "Every 15 minutes", value: "*/15 * * * *" },
  { label: "Hourly", value: "0 * * * *" },
  { label: "Daily at midnight", value: "0 0 * * *" },
  { label: "Mondays at 8:30", value: "30 8 * * 1" },
  { label: "1st of the month", value: "0 9 1 * *" },
];

const FREQUENCY_LABELS: Record<CronFrequency, string> = {
  minute: "Every few minutes",
  hour: "Every hour",
  day: "Every day",
  week: "Every week",
  month: "Every month",
  custom: "Custom",
};
const WEEK = [
  { value: 1, short: "Mo", label: "Monday" },
  { value: 2, short: "Tu", label: "Tuesday" },
  { value: 3, short: "We", label: "Wednesday" },
  { value: 4, short: "Th", label: "Thursday" },
  { value: 5, short: "Fr", label: "Friday" },
  { value: 6, short: "Sa", label: "Saturday" },
  { value: 0, short: "Su", label: "Sunday" },
];
const FIELD_LABELS = ["minute", "hour", "day", "month", "weekday"];

/** Index of the cron field the caret sits in (0–4), or -1. */
function fieldAt(text: string, caret: number): number {
  const before = text.slice(0, caret).replace(/^\s+/, "");
  if (before === "" && text.trim() === "") return -1;
  const index = before.split(/\s+/).length - 1;
  return Math.min(index, 4);
}

/**
 * Schedule builder that writes cron for you: pick a frequency and time (or a preset) and it writes
 * the expression, or type an expression and the friendly fields follow. A plain-English sentence
 * and the next runs confirm what will happen; the field under the caret is labeled as you type.
 */
export const CronEditor = React.forwardRef<HTMLDivElement, CronEditorProps>(function CronEditor(
  {
    value: valueProp,
    defaultValue = "0 9 * * 1-5",
    onValueChange,
    presets = defaultCronPresets,
    nextRuns = 5,
    now: nowProp,
    locale = "en-US",
    timeZoneLabel,
    showExpression = true,
    disabled = false,
    className,
    ...props
  },
  ref,
) {
  const id = React.useId();
  const reduced = usePrefersReducedMotion();
  const isClient = useIsClient();
  const clock = useMinuteClock();
  const [value, setValue] = useControllableState<string>({
    value: valueProp,
    defaultValue,
    onChange: onValueChange,
    name: "value",
  });
  const [draft, setDraft] = React.useState(value);
  const [synced, setSynced] = React.useState(value);
  // External value changes (builder, presets, a controlled parent) overwrite the draft.
  if (synced !== value) {
    setSynced(value);
    if (draft.trim() !== value) setDraft(value);
  }
  const [caretField, setCaretField] = React.useState(-1);
  const [forcedCustom, setForcedCustom] = React.useState(false);

  const draftError = (() => {
    const result = parseCron(draft);
    return "error" in result ? result.error : null;
  })();
  const detected = detect(value);
  const mode: CronFrequency = forcedCustom ? "custom" : detected.mode;
  const fields = detected.fields;

  const commit = (next: string) => {
    setForcedCustom(false);
    setValue(next);
  };
  const update = (patch: Partial<Fields>, nextMode: CronFrequency = mode) => commit(build(nextMode, { ...fields, ...patch }));
  const onDraft = (text: string) => {
    setDraft(text);
    const result = parseCron(text);
    if (!("error" in result)) {
      const normalized = text.trim().split(/\s+/).join(" ");
      setForcedCustom(false);
      setSynced(normalized);
      setValue(normalized);
    }
  };

  const sentence = describeCron(value);
  const nowMinute = nowProp ? Math.floor(nowProp.getTime() / 60_000) : clock === null ? null : clock / 60_000;
  const runs = React.useMemo(
    () => (nowMinute === null || nextRuns <= 0 ? [] : nextCronRuns(value, new Date(nowMinute * 60_000), nextRuns)),
    [value, nowMinute, nextRuns],
  );
  const runFormat = React.useMemo(
    () => new Intl.DateTimeFormat(locale, { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }),
    [locale],
  );
  const zone = timeZoneLabel ?? (isClient ? Intl.DateTimeFormat().resolvedOptions().timeZone : "");
  const timeValue = `${pad(fields.hour)}:${pad(fields.minute)}`;

  const labelClass = cn(blockReset, "text-xs font-medium text-pui-muted-foreground");
  const label = (text: string, htmlFor?: string) =>
    htmlFor ? (
      <label htmlFor={htmlFor} className={labelClass}>
        {text}
      </label>
    ) : (
      <span aria-hidden="true" className={labelClass}>
        {text}
      </span>
    );

  return (
    <div
      ref={ref}
      {...props}
      aria-disabled={disabled || undefined}
      className={cn(
        blockReset,
        "flex w-full min-w-0 flex-col gap-4 rounded-pui-lg border border-pui-border bg-pui-surface p-4 text-sm text-pui-surface-foreground shadow-pui-xs",
        disabled && "pointer-events-none opacity-60",
        className,
      )}
    >
      {presets.length > 0 ? (
        <div role="group" aria-label="Quick picks" className={cn(blockReset, "flex flex-wrap gap-1.5")}>
          {presets.map((preset) => {
            const active = preset.value === value;
            return (
              <button
                key={preset.value}
                type="button"
                aria-pressed={active}
                disabled={disabled}
                onClick={() => commit(preset.value)}
                className={cn(
                  controlReset,
                  focusRing,
                  "h-7 cursor-pointer rounded-pui-full border px-3 text-xs font-medium transition-colors duration-(--pui-duration-fast)",
                  active
                    ? "border-pui-primary/40 bg-pui-primary/12 text-pui-primary-text"
                    : "border-pui-border text-pui-muted-foreground hover:border-pui-foreground/25 hover:text-pui-foreground",
                )}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      ) : null}

      <div className={cn(blockReset, "flex flex-wrap items-end gap-3")}>
        <div className={cn(blockReset, "flex min-w-44 flex-col gap-1.5")}>
          {label("Repeat", `${id}-freq`)}
          <Select
            value={mode}
            disabled={disabled}
            onValueChange={(next) => {
              if (next === "custom") {
                setForcedCustom(true);
                return;
              }
              update({}, next as CronFrequency);
            }}
          >
            <SelectTrigger id={`${id}-freq`} className="w-full" />
            <SelectContent>
              {(Object.keys(FREQUENCY_LABELS) as CronFrequency[]).map((key) => (
                <SelectItem key={key} value={key}>
                  {FREQUENCY_LABELS[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {mode === "minute" ? (
          <div className={cn(blockReset, "flex min-w-32 flex-col gap-1.5")}>
            {label("Every", `${id}-interval`)}
            <Select value={String(fields.interval)} disabled={disabled} onValueChange={(next) => update({ interval: Number(next) })}>
              <SelectTrigger id={`${id}-interval`} className="w-full" />
              <SelectContent>
                {INTERVALS.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n === 1 ? "1 minute" : `${n} minutes`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
        {mode === "hour" ? (
          <div className={cn(blockReset, "flex flex-col gap-1.5")}>
            {label("At minute")}
            <NumberInput
              aria-label="Minute past the hour"
              min={0}
              max={59}
              value={fields.minute}
              roll={false}
              disabled={disabled}
              onValueChange={(minute) => update({ minute })}
              className="w-32"
            />
          </div>
        ) : null}
        {mode === "month" ? (
          <div className={cn(blockReset, "flex min-w-28 flex-col gap-1.5")}>
            {label("On day", `${id}-day`)}
            <Select value={String(fields.day)} disabled={disabled} onValueChange={(next) => update({ day: Number(next) })}>
              <SelectTrigger id={`${id}-day`} className="w-full" />
              <SelectContent listClassName="max-h-64">
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                  <SelectItem key={d} value={String(d)}>
                    {ordinal(d)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
        {mode === "day" || mode === "week" || mode === "month" ? (
          <div className={cn(blockReset, "flex flex-col gap-1.5")}>
            {label("At", `${id}-time`)}
            <input
              id={`${id}-time`}
              type="time"
              value={timeValue}
              disabled={disabled}
              onChange={(event) => {
                const [h, m] = event.target.value.split(":").map(Number);
                if (h === undefined || m === undefined || Number.isNaN(h) || Number.isNaN(m)) return;
                update({ hour: h, minute: m });
              }}
              className={cn(controlReset, fieldClasses, "h-9 w-32 px-3 tabular-nums [color-scheme:light] dark:[color-scheme:dark]")}
            />
          </div>
        ) : null}
        {mode === "custom" ? (
          <p className={cn(blockReset, "pb-2 text-xs text-pui-muted-foreground")}>Edit the expression below for schedules the builder can't express.</p>
        ) : null}
      </div>

      {mode === "week" ? (
        <div className={cn(blockReset, "flex flex-col gap-1.5")}>
          <span id={`${id}-days`} className={cn(blockReset, "text-xs font-medium text-pui-muted-foreground")}>
            On
          </span>
          <ToggleGroup
            type="multiple"
            variant="outline"
            size="sm"
            aria-labelledby={`${id}-days`}
            disabled={disabled}
            value={fields.weekdays.map(String)}
            onValueChange={(next) => {
              if (next.length === 0) return;
              update({ weekdays: next.map(Number) });
            }}
          >
            {WEEK.map((day) => (
              <ToggleGroupItem key={day.value} value={String(day.value)} aria-label={day.label} className="w-9">
                {day.short}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      ) : null}

      {showExpression ? (
        <div className={cn(blockReset, "flex flex-col gap-1.5")}>
          {label("Cron expression", `${id}-expr`)}
          <input
            id={`${id}-expr`}
            value={draft}
            disabled={disabled}
            spellCheck={false}
            autoComplete="off"
            aria-invalid={draftError ? true : undefined}
            aria-describedby={`${id}-fields${draftError ? ` ${id}-error` : ""}`}
            onChange={(event) => {
              onDraft(event.target.value);
              setCaretField(fieldAt(event.target.value, event.target.selectionStart ?? 0));
            }}
            onSelect={(event) => setCaretField(fieldAt(event.currentTarget.value, event.currentTarget.selectionStart ?? 0))}
            onBlur={() => setCaretField(-1)}
            className={cn(controlReset, fieldClasses, "h-9 px-3 font-pui-mono text-[0.85rem] tracking-wide", draftError && invalidClasses)}
          />
          <div id={`${id}-fields`} className={cn(blockReset, "flex gap-1")} aria-label="Fields: minute, hour, day, month, weekday">
            {FIELD_LABELS.map((name, i) => (
              <span
                key={name}
                aria-hidden="true"
                className={cn(
                  blockReset,
                  "relative rounded-pui-sm px-1.5 py-0.5 text-[0.7rem] transition-colors duration-(--pui-duration-fast)",
                  caretField === i ? "font-medium text-pui-primary-text" : "text-pui-muted-foreground",
                )}
              >
                {caretField === i ? (
                  <motion.span
                    layoutId={reduced ? undefined : `${id}-caret`}
                    transition={{ duration: 0.18, ease: easings.out }}
                    className={cn(blockReset, "absolute inset-0 rounded-pui-sm bg-pui-primary/12")}
                  />
                ) : null}
                <span className={cn(blockReset, "relative")}>{name}</span>
              </span>
            ))}
          </div>
          {draftError ? (
            <p id={`${id}-error`} className={cn(blockReset, "flex items-center gap-1.5 text-xs text-pui-danger-text")}>
              <TriangleAlertIcon className="size-3.5" />
              {draftError}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className={cn(blockReset, "flex flex-col gap-3 rounded-pui-md border border-pui-border bg-pui-muted/40 p-3")}>
        <p aria-live="polite" className={cn(blockReset, "flex items-start gap-2 font-medium text-pui-foreground")}>
          <ClockIcon className="mt-0.5 size-4 text-pui-primary-text" />
          <span>{sentence}</span>
        </p>
        {nextRuns > 0 ? (
          <div className={cn(blockReset, "flex flex-col gap-1.5")}>
            <span className={cn(blockReset, "flex items-center justify-between gap-2 text-[0.7rem] font-medium tracking-wide text-pui-muted-foreground uppercase")}>
              <span id={`${id}-runs`}>Next runs</span>
              {zone ? <span className={cn(blockReset, "truncate normal-case tracking-normal")}>{zone}</span> : null}
            </span>
            <ol aria-labelledby={`${id}-runs`} className={cn(listReset, "flex min-h-[7.5rem] flex-col gap-0.5")}>
              <AnimatePresence initial={false} mode="popLayout">
                {runs.map((run, i) => (
                  <motion.li
                    key={`${value}-${run.getTime()}`}
                    initial={reduced ? false : { opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={reduced ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0 }}
                    transition={{ duration: 0.2, ease: easings.out, delay: reduced ? 0 : i * 0.03 }}
                    className={cn(blockReset, "flex items-center gap-2 text-xs tabular-nums text-pui-foreground")}
                  >
                    <CalendarIcon className="size-3.5 text-pui-muted-foreground" />
                    <time dateTime={run.toISOString()}>{runFormat.format(run)}</time>
                  </motion.li>
                ))}
              </AnimatePresence>
              {nowMinute !== null && runs.length === 0 && !("error" in parseCron(value)) ? (
                <li className={cn(blockReset, "text-xs text-pui-muted-foreground")}>This schedule never runs (for example, February 30th).</li>
              ) : null}
            </ol>
          </div>
        ) : null}
      </div>
    </div>
  );
});
