import {
  Badge,
  Button,
  Calendar,
  type CalendarBaseProps,
  type CalendarMultipleProps,
  type CalendarProps,
  type CalendarSingleProps,
  type DateRange,
  type WeekDay,
} from "changelui";
import { useMemo, useState } from "react";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type Mode = "single" | "range" | "multiple";
type WeekStart = "Sunday" | "Monday" | "Saturday";

type DemoProps = {
  mode: Mode;
  numberOfMonths: number;
  locale: string;
  weekStart: WeekStart;
  showOutsideDays: boolean;
  monthPicker: boolean;
  disableWeekends: boolean;
  disablePast: boolean;
};

const defaults: DemoProps = {
  mode: "range",
  numberOfMonths: 1,
  locale: "en-US",
  weekStart: "Sunday",
  showOutsideDays: true,
  monthPicker: true,
  disableWeekends: false,
  disablePast: false,
};

const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "mode", label: "Mode", options: ["single", "range", "multiple"] },
  { type: "number", prop: "numberOfMonths", label: "Months", min: 1, max: 3, step: 1 },
  { type: "select", prop: "locale", label: "Locale", options: ["en-US", "en-GB", "de-DE", "fr-FR", "es-ES", "ja-JP", "hi-IN"] },
  { type: "select", prop: "weekStart", label: "Week starts on", options: ["Sunday", "Monday", "Saturday"] },
  { type: "boolean", prop: "showOutsideDays", label: "Outside days" },
  { type: "boolean", prop: "monthPicker", label: "Month picker" },
  { type: "boolean", prop: "disableWeekends", label: "Disable weekends" },
  { type: "boolean", prop: "disablePast", label: "Disable past days" },
];

const WEEK_START: Record<WeekStart, WeekDay> = { Sunday: 0, Monday: 1, Saturday: 6 };

// Small local date helpers for the demos (the library keeps its date math internal).
function iso(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function shift(base: string, days: number): string {
  const [y, m, d] = base.split("-").map(Number) as [number, number, number];
  return iso(new Date(y, m - 1, d + days));
}
function weekday(value: string): number {
  const [y, m, d] = value.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}
function pretty(value: string, options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }): string {
  const [y, m, d] = value.split("-").map(Number) as [number, number, number];
  return new Intl.DateTimeFormat("en-US", { ...options, timeZone: "UTC" }).format(Date.UTC(y, m - 1, d));
}
function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967295;
}
function useToday(): string {
  return useMemo(() => iso(new Date()), []);
}

function Readout({ children }: { children: React.ReactNode }) {
  return (
    <p className="m-0 min-h-5 text-center text-xs text-pui-muted-foreground tabular-nums" aria-live="polite">
      {children}
    </p>
  );
}

function Preview({ props }: { props: DemoProps }) {
  const today = useToday();
  const [single, setSingle] = useState<string | null>(() => shift(today, 2));
  const [range, setRange] = useState<DateRange | null>(() => ({ start: shift(today, 3), end: shift(today, 9) }));
  const [multiple, setMultiple] = useState<string[]>(() => [shift(today, 1), shift(today, 4), shift(today, 8)]);
  const disabled = (date: string) =>
    (props.disableWeekends && (weekday(date) === 0 || weekday(date) === 6)) || (props.disablePast && date < today);
  const shared = {
    numberOfMonths: props.numberOfMonths,
    locale: props.locale,
    weekStartsOn: WEEK_START[props.weekStart],
    showOutsideDays: props.showOutsideDays,
    monthPicker: props.monthPicker,
    disabled,
  } satisfies Partial<CalendarProps>;

  let readout: string;
  let calendar: React.ReactNode;
  if (props.mode === "single") {
    readout = single ? `Selected ${pretty(single, { weekday: "long", month: "long", day: "numeric" })}` : "Nothing selected";
    calendar = <Calendar key="single" {...shared} mode="single" value={single} onValueChange={setSingle} />;
  } else if (props.mode === "range") {
    readout = !range
      ? "Pick a start date"
      : range.end
        ? `${pretty(range.start)} → ${pretty(range.end)}`
        : `${pretty(range.start)} → pick an end date`;
    calendar = <Calendar key="range" {...shared} mode="range" value={range} onValueChange={setRange} />;
  } else {
    readout = multiple.length ? `${multiple.length} days: ${multiple.map((d) => pretty(d)).join(", ")}` : "Pick any days";
    calendar = <Calendar key="multiple" {...shared} mode="multiple" value={multiple} onValueChange={setMultiple} />;
  }

  return (
    <div className="flex w-full max-w-full flex-col items-center gap-3 overflow-x-auto">
      {calendar}
      <Readout>{readout}</Readout>
    </div>
  );
}

function Mini() {
  return (
    <div aria-hidden="true" className="pointer-events-none origin-top scale-[0.82]">
      <Calendar
        mode="range"
        month="2025-06"
        defaultValue={{ start: "2025-06-10", end: "2025-06-17" }}
        today="2025-06-05"
        monthPicker={false}
      />
    </div>
  );
}

/** Fares per day from a seeded hash, with the cheapest days in the success tone. */
function FlightDemo() {
  const today = useToday();
  const [range, setRange] = useState<DateRange | null>(null);
  const fare = (date: string) => 89 + Math.round(hash(date) * 230) + (weekday(date) === 5 || weekday(date) === 0 ? 60 : 0);
  return (
    <div className="flex flex-col items-center gap-3 overflow-x-auto">
      <Calendar
        mode="range"
        numberOfMonths={2}
        min={today}
        value={range}
        onValueChange={setRange}
        monthPicker={false}
        dayLabel={(date) => (date < today ? null : `$${fare(date)}`)}
        dayContent={(date) =>
          date < today ? null : (
            <span className={fare(date) < 140 ? "text-pui-success-text" : undefined}>${fare(date)}</span>
          )
        }
      />
      <Readout>
        {range?.end
          ? `Round trip ${pretty(range.start)} – ${pretty(range.end)} · from $${fare(range.start) + fare(range.end)}`
          : "Green fares are the cheapest days to fly"}
      </Readout>
    </div>
  );
}

/** A stay: booked nights are disabled, the footer summarises the selection. */
function BookingDemo() {
  const today = useToday();
  const booked = useMemo(() => new Set([3, 4, 5, 12, 13, 21, 22, 23, 24].map((n) => shift(today, n))), [today]);
  const [range, setRange] = useState<DateRange | null>(null);
  const nights = range?.end ? Math.round((Date.parse(range.end) - Date.parse(range.start)) / 86_400_000) : 0;
  return (
    <Calendar
      mode="range"
      min={today}
      max={shift(today, 120)}
      value={range}
      onValueChange={setRange}
      disabled={(date) => booked.has(date)}
      className="mx-auto"
    >
      <div className="flex items-center justify-between gap-3 border-t border-pui-border pt-3">
        <div className="flex flex-col">
          <span className="text-sm font-semibold tabular-nums">
            {nights > 0 ? `${nights} night${nights === 1 ? "" : "s"} · $${nights * 148}` : "Select dates"}
          </span>
          <span className="text-xs text-pui-muted-foreground">Struck-out days are booked</span>
        </div>
        <Button size="sm" disabled={nights === 0}>
          Reserve
        </Button>
      </div>
    </Calendar>
  );
}

const EVENTS: { offset: number; title: string; tone: "primary" | "success" | "warning" | "info" }[] = [
  { offset: 0, title: "Design review", tone: "primary" },
  { offset: 0, title: "1:1 with Sam", tone: "info" },
  { offset: 2, title: "Launch prep", tone: "warning" },
  { offset: 5, title: "Team lunch", tone: "success" },
  { offset: 9, title: "Quarterly planning", tone: "primary" },
  { offset: 9, title: "Retro", tone: "info" },
  { offset: 9, title: "Release v2.4", tone: "warning" },
  { offset: 14, title: "Offsite", tone: "success" },
];

const DOT: Record<(typeof EVENTS)[number]["tone"], string> = {
  primary: "bg-pui-primary",
  success: "bg-pui-success",
  warning: "bg-pui-warning",
  info: "bg-pui-info",
};

/** Agenda: event dots under each day and the selected day's events beside the grid. */
function AgendaDemo() {
  const today = useToday();
  const [day, setDay] = useState<string | null>(today);
  const byDay = useMemo(() => {
    const map = new Map<string, typeof EVENTS>();
    for (const event of EVENTS) {
      const key = shift(today, event.offset);
      map.set(key, [...(map.get(key) ?? []), event]);
    }
    return map;
  }, [today]);
  const events = day ? (byDay.get(day) ?? []) : [];
  return (
    <div className="flex flex-col items-center gap-4 md:flex-row md:items-start">
      <Calendar
        mode="single"
        required
        value={day}
        onValueChange={setDay}
        weekStartsOn={1}
        dayLabel={(date) => {
          const count = byDay.get(date)?.length;
          return count ? `${count} event${count === 1 ? "" : "s"}` : null;
        }}
        dayContent={(date) => {
          const list = byDay.get(date);
          if (!list) return null;
          return (
            <span className="flex gap-0.5">
              {list.slice(0, 3).map((event) => (
                <span key={event.title} className={`size-1 rounded-full ${DOT[event.tone]}`} />
              ))}
            </span>
          );
        }}
      />
      <div className="flex w-full max-w-60 flex-col gap-2">
        <p className="m-0 text-sm font-semibold">{day ? pretty(day, { weekday: "long", month: "long", day: "numeric" }) : "Pick a day"}</p>
        {events.length === 0 ? (
          <p className="m-0 text-xs text-pui-muted-foreground">Nothing scheduled.</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
            {events.map((event) => (
              <li key={event.title} className="flex items-center gap-2 rounded-pui-md border border-pui-border bg-pui-surface px-2.5 py-2 text-sm">
                <span className={`size-2 rounded-full ${DOT[event.tone]}`} aria-hidden="true" />
                {event.title}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/** Multiple mode with a cap: pick up to 3 interview slots. */
function SlotsDemo() {
  const today = useToday();
  const [days, setDays] = useState<string[]>([]);
  return (
    <div className="flex flex-col items-center gap-3">
      <Calendar
        mode="multiple"
        maxSelected={3}
        min={shift(today, 1)}
        max={shift(today, 30)}
        disabled={(date) => weekday(date) === 0 || weekday(date) === 6}
        value={days}
        onValueChange={setDays}
        locale="en-GB"
        weekStartsOn={1}
        weekdayFormat="narrow"
      />
      <div className="flex flex-wrap justify-center gap-1.5" aria-live="polite">
        {days.length === 0 ? (
          <span className="text-xs text-pui-muted-foreground">Pick up to 3 weekdays for your interview</span>
        ) : (
          days.map((d) => (
            <Badge key={d} tone="primary" variant="soft">
              {pretty(d, { weekday: "short", day: "numeric", month: "short" })}
            </Badge>
          ))
        )}
      </div>
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
    if (props.mode !== "single") attrs.push(`mode="${props.mode}"`);
    attrs.push("value={value}", "onValueChange={setValue}");
    if (props.numberOfMonths !== 1) attrs.push(`numberOfMonths={${props.numberOfMonths}}`);
    if (props.locale !== "en-US") attrs.push(`locale="${props.locale}"`);
    if (props.weekStart !== "Sunday") attrs.push(`weekStartsOn={${WEEK_START[props.weekStart]}}`);
    if (!props.showOutsideDays) attrs.push("showOutsideDays={false}");
    if (!props.monthPicker) attrs.push("monthPicker={false}");
    if (props.disablePast) attrs.push("min={today}");
    if (props.disableWeekends) attrs.push("disabled={isWeekend}");
    const state =
      props.mode === "range"
        ? "const [value, setValue] = useState<DateRange | null>(null);"
        : props.mode === "multiple"
          ? "const [value, setValue] = useState<string[]>([]);"
          : "const [value, setValue] = useState<string | null>(null); // ISO \"YYYY-MM-DD\"";
    return `${state}\n\n<Calendar\n  ${attrs.join("\n  ")}\n/>`;
  },
  propsTable: propDocs<CalendarBaseProps & CalendarSingleProps & Pick<CalendarMultipleProps, "maxSelected">>()([
    { name: "mode", type: '"single" | "range" | "multiple"', default: '"single"', description: "Selection model; it sets the value type." },
    { name: "value", type: "string | null · DateRange | null · string[]", description: "ISO dates. Ranges are { start, end } with end null mid-pick (defaultValue, onValueChange)." },
    { name: "month", type: "string", description: 'Shown month "YYYY-MM" (defaultMonth, onMonthChange). Set it for SSR without a value.' },
    { name: "numberOfMonths", type: "number", default: "1", description: "Months side by side; they slide together." },
    { name: "locale", type: "string", default: '"en-US"', description: "Intl locale for month, weekday and day labels." },
    { name: "weekStartsOn", type: "0-6", default: "0", description: "First column; 0 is Sunday." },
    { name: "min", type: "string", description: "Earliest selectable ISO date; also stops navigation." },
    { name: "max", type: "string", description: "Latest selectable ISO date; also stops navigation." },
    { name: "disabled", type: "boolean | (date) => boolean", description: "Disable every day or specific days (struck out, still focusable)." },
    { name: "required", type: "boolean", default: "false", description: "Clicking the selected day keeps it instead of clearing." },
    { name: "maxSelected", type: "number", description: "multiple mode: most days that can be picked." },
    { name: "dayContent", type: "(date) => ReactNode", description: "Small content under each number: prices, event dots." },
    { name: "dayLabel", type: "(date) => string | null", description: "Appended to each day's accessible name to match dayContent." },
    { name: "monthPicker", type: "boolean", default: "true", description: "Heading opens a month grid with year paging (single-month view)." },
    { name: "showOutsideDays", type: "boolean", default: "true", description: "Faded days of the neighbouring months." },
    { name: "fixedWeeks", type: "boolean", default: "true", description: "Always 6 rows, so the height never jumps." },
    { name: "weekdayFormat", type: '"narrow" | "short"', default: '"short"', description: "Weekday header width." },
    { name: "today", type: "string", description: "Override today's ISO date (defaults to the viewer's, after mount)." },
    { name: "children", type: "ReactNode", description: "Footer under the grid." },
  ]),
  keyboard: [
    { keys: "Arrow keys", action: "Previous / next day and week" },
    { keys: "Home / End", action: "Start / end of the week" },
    { keys: "PageUp / PageDown", action: "Previous / next month" },
    { keys: "Shift + PageUp / PageDown", action: "Previous / next year" },
    { keys: "Enter / Space", action: "Select the focused day" },
    { keys: "Month picker: arrows, PageUp/Down, Escape", action: "Move between months, change year, back to days" },
  ],
  a11y: [
    "Each month is a role=grid labelled with its name; days are gridcells with aria-selected and full-date button labels.",
    "One roving tab stop per calendar; moving past the edge changes month and keeps focus on the new day.",
    "Today has aria-current=date; disabled days are aria-disabled and stay focusable so the grid is never broken.",
    "Month changes are announced through a polite live region.",
  ],
  reducedMotion: "Months crossfade in 150ms instead of sliding; the selection jumps and the range band appears without growing.",
  examples: [
    { title: "Flight fares", description: "Range over two months with dayContent prices; cheapest days in green.", Demo: FlightDemo, wide: true },
    { title: "Booking", description: "Booked nights disabled, min/max window and a footer summary.", Demo: BookingDemo },
    { title: "Agenda", description: "Event dots per day with the selected day's events beside the grid.", Demo: AgendaDemo },
    { title: "Interview slots", description: "Multiple mode capped at 3 weekdays, en-GB with Monday first.", Demo: SlotsDemo },
  ],
};

export default item;
