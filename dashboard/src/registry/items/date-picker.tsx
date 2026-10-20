import {
  Button,
  DatePicker,
  Kbd,
  type DatePickerPreset,
  type DatePickerProps,
  type DateRange,
} from "changelui";
import { useId, useMemo, useState } from "react";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  mode: "single" | "range";
  size: NonNullable<DatePickerProps["size"]>;
  numberOfMonths: number;
  presets: boolean;
  clearable: boolean;
  closeOnSelect: boolean;
  locale: string;
  placeholder: string;
};

const defaults: DemoProps = {
  mode: "single",
  size: "md",
  numberOfMonths: 1,
  presets: true,
  clearable: true,
  closeOnSelect: true,
  locale: "en-US",
  placeholder: "",
};

const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "mode", label: "Mode", options: ["single", "range"] },
  { type: "select", prop: "size", label: "Size", options: ["sm", "md", "lg"] },
  { type: "number", prop: "numberOfMonths", label: "Months", min: 1, max: 2, step: 1 },
  { type: "boolean", prop: "presets", label: "Presets" },
  { type: "boolean", prop: "clearable", label: "Clearable" },
  { type: "boolean", prop: "closeOnSelect", label: "Close on select" },
  { type: "select", prop: "locale", label: "Locale", options: ["en-US", "en-GB", "de-DE", "fr-FR", "ja-JP"] },
  { type: "text", prop: "placeholder", label: "Placeholder", maxLength: 40 },
];

function shift(base: string, days: number): string {
  const [y, m, d] = base.split("-").map(Number) as [number, number, number];
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
}
function startOfMonth(base: string): string {
  return `${base.slice(0, 7)}-01`;
}
function nextWeekday(base: string, target: number): string {
  const [y, m, d] = base.split("-").map(Number) as [number, number, number];
  const day = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return shift(base, ((target - day + 7) % 7) || 7);
}

const singlePresets: DatePickerPreset[] = [
  { label: "Today", value: (today) => today },
  { label: "Tomorrow", value: (today) => shift(today, 1) },
  { label: "Next Monday", value: (today) => nextWeekday(today, 1) },
  { label: "In 2 weeks", value: (today) => shift(today, 14) },
  { label: "In a month", value: (today) => shift(today, 30) },
];

const rangePresets: DatePickerPreset[] = [
  { label: "Last 7 days", value: (today) => ({ start: shift(today, -6), end: today }) },
  { label: "Last 30 days", value: (today) => ({ start: shift(today, -29), end: today }) },
  { label: "Last 90 days", value: (today) => ({ start: shift(today, -89), end: today }) },
  { label: "This month", value: (today) => ({ start: startOfMonth(today), end: today }) },
  { label: "Next weekend", value: (today) => ({ start: nextWeekday(today, 6), end: shift(nextWeekday(today, 6), 1) }) },
];

function Field({ label, hint, children, id }: { label: string; hint?: React.ReactNode; children: React.ReactNode; id: string }) {
  return (
    <div className="flex w-full flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-pui-foreground">
        {label}
      </label>
      {children}
      {hint ? <p className="m-0 text-xs text-pui-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function Preview({ props }: { props: DemoProps }) {
  const id = useId();
  const [single, setSingle] = useState<string | null>(null);
  const [range, setRange] = useState<DateRange | null>(null);
  const shared = {
    id,
    size: props.size,
    numberOfMonths: props.numberOfMonths,
    clearable: props.clearable,
    closeOnSelect: props.closeOnSelect,
    locale: props.locale,
    placeholder: props.placeholder || undefined,
  };
  const value = props.mode === "range" ? (range ? `${range.start} → ${range.end ?? "…"}` : "null") : (single ?? "null");
  return (
    <div className="flex w-full max-w-xs flex-col gap-3">
      <Field
        id={id}
        label={props.mode === "range" ? "Reporting period" : "Due date"}
        hint={
          <>
            Type “tomorrow”, “Mar 9”, “+2w” or press <Kbd>↓</Kbd> to open the calendar.
          </>
        }
      >
        {props.mode === "range" ? (
          <DatePicker
            key="range"
            {...shared}
            mode="range"
            value={range}
            onValueChange={setRange}
            presets={props.presets ? rangePresets : undefined}
          />
        ) : (
          <DatePicker
            key="single"
            {...shared}
            value={single}
            onValueChange={setSingle}
            presets={props.presets ? singlePresets : undefined}
          />
        )}
      </Field>
      <p className="m-0 font-mono text-xs text-pui-muted-foreground" aria-live="polite">
        value: {value}
      </p>
    </div>
  );
}

function Mini() {
  return (
    <div aria-hidden="true" className="pointer-events-none flex w-56 flex-col gap-1.5">
      <span className="text-xs font-medium text-pui-foreground">Check-in</span>
      <DatePicker mode="range" defaultValue={{ start: "2025-06-12", end: "2025-06-16" }} aria-label="Stay" />
    </div>
  );
}

/** Two-month stay picker inside a booking form; the hidden input posts ISO dates. */
function BookingDemo() {
  const id = useId();
  const [stay, setStay] = useState<DateRange | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const nights = stay?.end ? Math.round((Date.parse(stay.end) - Date.parse(stay.start)) / 86_400_000) : 0;
  return (
    <form
      className="mx-auto flex w-full max-w-md flex-col gap-4 rounded-pui-xl border border-pui-border bg-pui-surface p-5 text-pui-surface-foreground shadow-pui-sm"
      onSubmit={(event) => {
        event.preventDefault();
        setSent(String(new FormData(event.currentTarget).get("stay")));
      }}
    >
      <div>
        <p className="m-0 text-base font-semibold">Cabin by the lake</p>
        <p className="m-0 text-xs text-pui-muted-foreground">$148 per night · 2 night minimum</p>
      </div>
      <Field id={id} label="Dates" hint={nights > 0 ? `${nights} nights · $${nights * 148} total` : "Choose check-in and check-out"}>
        <DatePicker
          id={id}
          mode="range"
          name="stay"
          numberOfMonths={2}
          min={today}
          value={stay}
          onValueChange={setStay}
          placeholder="Check-in – check-out"
          invalid={nights === 1}
        />
      </Field>
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-xs text-pui-muted-foreground" aria-live="polite">
          {sent ? `stay=${sent}` : "Submits stay=start/end"}
        </span>
        <Button type="submit" disabled={nights < 2}>
          Book
        </Button>
      </div>
    </form>
  );
}

/** Analytics toolbar: range presets drive the period label and a fake trend. */
function FilterDemo() {
  const id = useId();
  const [period, setPeriod] = useState<DateRange | null>(() => {
    const today = new Date().toISOString().slice(0, 10);
    return { start: shift(today, -29), end: today };
  });
  const days = period?.end ? Math.round((Date.parse(period.end) - Date.parse(period.start)) / 86_400_000) + 1 : 0;
  const bars = useMemo(
    () => Array.from({ length: Math.min(Math.max(days, 1), 30) }, (_, i) => 30 + Math.round(40 * Math.abs(Math.sin(i * 0.7 + days)))),
    [days],
  );
  return (
    <div className="flex w-full flex-col gap-4 rounded-pui-xl border border-pui-border bg-pui-surface p-4 text-pui-surface-foreground">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="m-0 text-xs text-pui-muted-foreground">Active users</p>
          <p className="m-0 text-2xl font-semibold tabular-nums">{(days * 1284).toLocaleString("en-US")}</p>
        </div>
        <div className="w-64">
          <label htmlFor={id} className="sr-only">
            Period
          </label>
          <DatePicker id={id} mode="range" size="sm" value={period} onValueChange={setPeriod} presets={rangePresets} clearable={false} />
        </div>
      </div>
      <div className="flex h-20 items-end gap-1" aria-hidden="true">
        {bars.map((h, i) => (
          <span key={i} className="flex-1 rounded-t-sm bg-pui-primary/70 transition-[height] duration-300" style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  );
}

/** Typed input in other locales: numeric order follows the locale, month names work in both languages. */
function LocalesDemo() {
  const deId = useId();
  const jaId = useId();
  return (
    <div className="flex w-full flex-col gap-4">
      <Field id={deId} label="Liefertermin (de-DE)" hint="Try 9.3.25, 9 März or 2025-03-09">
        <DatePicker id={deId} locale="de-DE" weekStartsOn={1} defaultValue="2025-03-09" format={{ dateStyle: "long" }} />
      </Field>
      <Field id={jaId} label="予約日 (ja-JP)" hint="Year-first numbers: 2025/3/9">
        <DatePicker id={jaId} locale="ja-JP" defaultValue="2025-03-09" format={{ dateStyle: "medium" }} />
      </Field>
    </div>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) => {
    const attrs: string[] = [];
    if (props.mode === "range") attrs.push('mode="range"');
    attrs.push("value={value}", "onValueChange={setValue}");
    if (props.presets) attrs.push("presets={presets}");
    if (props.size !== "md") attrs.push(`size="${props.size}"`);
    if (props.numberOfMonths !== 1) attrs.push(`numberOfMonths={${props.numberOfMonths}}`);
    if (!props.clearable) attrs.push("clearable={false}");
    if (!props.closeOnSelect) attrs.push("closeOnSelect={false}");
    if (props.locale !== "en-US") attrs.push(`locale="${props.locale}"`);
    if (props.placeholder) attrs.push(`placeholder="${props.placeholder}"`);
    const presets = props.presets
      ? props.mode === "range"
        ? `const presets = [\n  { label: "Last 7 days", value: (today) => ({ start: addDays(today, -6), end: today }) },\n  { label: "This month", value: (today) => ({ start: today.slice(0, 8) + "01", end: today }) },\n];\n\n`
        : `const presets = [\n  { label: "Today", value: (today) => today },\n  { label: "Tomorrow", value: (today) => addDays(today, 1) },\n];\n\n`
      : "";
    const state =
      props.mode === "range"
        ? "const [value, setValue] = useState<DateRange | null>(null);"
        : "const [value, setValue] = useState<string | null>(null);";
    return `${presets}${state}\n\n<DatePicker\n  ${attrs.join("\n  ")}\n/>`;
  },
  propsTable: propDocs<DatePickerProps>()([
    { name: "mode", type: '"single" | "range"', default: '"single"', description: "One date or a { start, end } range." },
    { name: "value", type: "string | null · DateRange | null", description: "ISO value (defaultValue, onValueChange)." },
    { name: "presets", type: "{ label, value }[]", description: "Quick picks; value is ISO, a range, or (today) => either." },
    { name: "format", type: "Intl.DateTimeFormatOptions | (date) => string", default: "{ month: 'short', day: 'numeric', year: 'numeric' }", description: "Field text; ranges use Intl formatRange." },
    { name: "locale", type: "string", default: '"en-US"', description: "Labels and typed-input order (3/9 vs 9.3)." },
    { name: "min", type: "string", description: "Earliest ISO date; typed dates outside are rejected." },
    { name: "max", type: "string", description: "Latest ISO date." },
    { name: "disabledDates", type: "(date) => boolean", description: "Days that cannot be picked or typed." },
    { name: "numberOfMonths", type: "number", default: "1", description: "Months in the popover." },
    { name: "closeOnSelect", type: "boolean", default: "true", description: "Close after a date or a full range." },
    { name: "clearable", type: "boolean", default: "true", description: "Clear button while there is a value." },
    { name: "size", type: '"sm" | "md" | "lg"', default: '"md"', description: "Field height 32 / 36 / 44 px." },
    { name: "invalid", type: "boolean", default: "false", description: "Danger boundary; typed text that fails to parse sets it too." },
    { name: "name", type: "string", description: "Adds a hidden input with the ISO value (start/end for ranges)." },
    { name: "open", type: "boolean", description: "Controlled popover (defaultOpen, onOpenChange)." },
    { name: "calendarProps", type: "Pick<CalendarProps, …>", description: "dayContent, dayLabel, monthPicker, showOutsideDays, fixedWeeks, weekdayFormat." },
    { name: "today", type: "string", description: "Override today's ISO date for presets and parsing." },
  ]),
  keyboard: [
    { keys: "ArrowDown / Alt + ArrowDown", action: "Open the calendar from the field" },
    { keys: "Enter", action: "Parse the typed text" },
    { keys: "Escape (field)", action: "Discard typed text" },
    { keys: "Calendar keys", action: "Arrows, PageUp/Down, Home/End as in Calendar" },
    { keys: "Escape (popover)", action: "Close and return focus to the field" },
  ],
  a11y: [
    "The field is a labelled text input with aria-haspopup=dialog; the calendar button has its own label.",
    "Opening moves focus straight into the day grid; Escape closes and returns focus.",
    "Unparseable text sets aria-invalid until it is fixed or discarded.",
    "Range mode announces progress (pick start, pick end, N days) in a polite live region.",
  ],
  reducedMotion: "The popover and months fade without movement; the preset highlight and clear button appear instantly.",
  examples: [
    { title: "Booking form", description: "Two months, min today, form submit with the hidden ISO input.", Demo: BookingDemo, wide: true },
    { title: "Report filter", description: "Range presets in a dashboard toolbar.", Demo: FilterDemo },
    { title: "Locales", description: "German and Japanese formats; typed input follows each locale.", Demo: LocalesDemo },
  ],
};

export default item;
