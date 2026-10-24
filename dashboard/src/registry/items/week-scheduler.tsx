import { weekStart, WeekScheduler, type ScheduleEvent, type WeekSchedulerProps } from "changelui";
import { useEffect, useRef, useState } from "react";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  days: "auto" | "7" | "5" | "3" | "1";
  weekStartsOn: "1" | "0";
  step: "15" | "30" | "60";
  dayStart: number;
  dayEnd: number;
  hourHeight: number;
  readOnly: boolean;
};

const defaults: DemoProps = { days: "auto", weekStartsOn: "1", step: "15", dayStart: 7, dayEnd: 20, hourHeight: 48, readOnly: false };

const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "days", label: "Days", options: ["auto", "7", "5", "3", "1"] },
  { type: "select", prop: "weekStartsOn", label: "Week starts", options: ["1", "0"] },
  { type: "select", prop: "step", label: "Snap (min)", options: ["15", "30", "60"] },
  { type: "number", prop: "dayStart", label: "First hour", min: 0, max: 10, step: 1 },
  { type: "number", prop: "dayEnd", label: "Last hour", min: 14, max: 24, step: 1 },
  { type: "number", prop: "hourHeight", label: "Hour height", min: 32, max: 80, step: 4 },
  { type: "boolean", prop: "readOnly", label: "Read only" },
];

/** Events relative to the current week so the demo never looks stale. */
function at(week: Date, day: number, h: number, m = 0) {
  return new Date(week.getFullYear(), week.getMonth(), week.getDate() + day, h, m);
}

function teamWeek(): ScheduleEvent[] {
  const w = weekStart(new Date(), 1);
  return [
    { id: "standup-0", title: "Standup", start: at(w, 0, 9, 30), end: at(w, 0, 9, 45), tone: "info" },
    { id: "plan", title: "Sprint planning", start: at(w, 0, 10), end: at(w, 0, 11, 30), description: "Room Atlas", tone: "primary" },
    { id: "standup-1", title: "Standup", start: at(w, 1, 9, 30), end: at(w, 1, 9, 45), tone: "info" },
    { id: "design", title: "Design review", start: at(w, 1, 13), end: at(w, 1, 14, 30), description: "Checkout flow v3", tone: "warning" },
    { id: "interview", title: "Interview: frontend", start: at(w, 1, 13, 30), end: at(w, 1, 14, 30), tone: "success" },
    { id: "focus", title: "Focus time", start: at(w, 2, 8), end: at(w, 2, 11), tone: "neutral" },
    { id: "lunch", title: "Team lunch", start: at(w, 2, 12), end: at(w, 2, 13, 15), description: "Noodle bar", tone: "success" },
    { id: "1on1", title: "1:1 with Omar", start: at(w, 3, 15), end: at(w, 3, 15, 30), tone: "primary" },
    { id: "incident", title: "Incident review", start: at(w, 3, 15, 15), end: at(w, 3, 16), tone: "danger", readOnly: true },
    { id: "demo", title: "Friday demo", start: at(w, 4, 16), end: at(w, 4, 17), description: "Main stage", tone: "warning" },
    { id: "run", title: "Long run", start: at(w, 5, 8), end: at(w, 5, 9, 30), tone: "neutral" },
  ];
}

/** "auto": as many days as the stage fits at ~100px or more each (7, 5, 3 or 1). */
function useAutoDays(choice: DemoProps["days"]) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry?.contentRect.width ?? 0));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const fit: 1 | 3 | 5 | 7 = width === 0 || width >= 900 ? 7 : width >= 540 ? 5 : width >= 300 ? 3 : 1;
  return { ref, days: choice === "auto" ? fit : (Number(choice) as 1 | 3 | 5 | 7) };
}
function Preview({ props }: { props: DemoProps }) {
  const [events, setEvents] = useState(teamWeek);
  const { ref, days } = useAutoDays(props.days);
  return (
    <div ref={ref} className="w-full max-w-5xl">
      <WeekScheduler
        key={days}
        events={events}
        onEventsChange={setEvents}
        days={days}
        // Short ranges start on Tuesday, where the overlaps are.
        defaultDate={days < 5 ? at(weekStart(new Date(), 1), 1, 9) : undefined}
        weekStartsOn={Number(props.weekStartsOn) as 0 | 1}
        step={Number(props.step)}
        dayStart={props.dayStart}
        dayEnd={Math.max(props.dayEnd, props.dayStart + 4)}
        hourHeight={props.hourHeight}
        readOnly={props.readOnly}
        height={460}
      />
    </div>
  );
}

function Mini() {
  const [events] = useState(teamWeek);
  return (
    <div aria-hidden="true" className="pointer-events-none w-96 origin-top scale-75">
      <WeekScheduler events={events} days={5} dayStart={8} dayEnd={17} hourHeight={28} height={260} readOnly showNav={false} tabIndex={-1} />
    </div>
  );
}

/** Booking: 30-minute slots, Mon–Fri, new bookings named for the guest and blocked over lunch. */
function BookingDemo() {
  const [events, setEvents] = useState<ScheduleEvent[]>(() => {
    const w = weekStart(new Date(), 1);
    return [
      { id: "lunch-1", title: "Lunch", start: at(w, 0, 12), end: at(w, 0, 13), tone: "neutral", readOnly: true },
      { id: "lunch-2", title: "Lunch", start: at(w, 1, 12), end: at(w, 1, 13), tone: "neutral", readOnly: true },
      { id: "lunch-3", title: "Lunch", start: at(w, 2, 12), end: at(w, 2, 13), tone: "neutral", readOnly: true },
      { id: "lunch-4", title: "Lunch", start: at(w, 3, 12), end: at(w, 3, 13), tone: "neutral", readOnly: true },
      { id: "lunch-5", title: "Lunch", start: at(w, 4, 12), end: at(w, 4, 13), tone: "neutral", readOnly: true },
      { id: "b1", title: "Ana R. · haircut", start: at(w, 1, 10), end: at(w, 1, 10, 30), tone: "success" },
    ];
  });
  const [note, setNote] = useState("Drag across a free slot to book.");
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-2">
      <WeekScheduler
        events={events}
        onEventsChange={setEvents}
        days={5}
        step={30}
        defaultDuration={30}
        dayStart={9}
        dayEnd={17}
        hourHeight={40}
        height={340}
        newEventTitle="New booking"
        onEventCreate={(ev) => {
          const sh = ev.start.getHours() * 60 + ev.start.getMinutes();
          const eh = ev.end.getHours() * 60 + ev.end.getMinutes();
          if (sh < 13 * 60 && eh > 12 * 60) {
            setNote("That overlaps lunch. Pick another slot.");
            return false;
          }
          setNote("Booked. Type the guest's name, then Enter.");
          return { ...ev, tone: "success" };
        }}
      />
      <p role="status" className="min-h-4 text-xs text-pui-muted-foreground">
        {note}
      </p>
    </div>
  );
}

/** On-call rota, read only: Enter or a click reports the event instead of editing it. */
function RotaDemo() {
  const [picked, setPicked] = useState<string>("Click a shift.");
  const [events] = useState<ScheduleEvent[]>(() => {
    const w = weekStart(new Date(), 1);
    const people = ["Maya", "Omar", "Lena", "Sam", "Ivy", "Maya", "Omar"];
    return people.flatMap((p, d) => [
      { id: `d${d}`, title: `${p} · primary`, start: at(w, d, 6), end: at(w, d, 14), tone: "primary" as const },
      { id: `n${d}`, title: `${people[(d + 2) % 7]} · primary`, start: at(w, d, 14), end: at(w, d, 22), tone: "info" as const },
    ]);
  });
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-2">
      <WeekScheduler events={events} readOnly dayStart={6} dayEnd={22} hourHeight={20} height={340} onEventClick={(e) => setPicked(e.title)} />
      <p role="status" className="min-h-4 text-xs text-pui-muted-foreground">
        {picked}
      </p>
    </div>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) =>
    `const [events, setEvents] = useState<ScheduleEvent[]>([]);\n\n<WeekScheduler\n  events={events}\n  onEventsChange={setEvents}${props.days !== "7" && props.days !== "auto" ? `\n  days={${props.days}}` : props.days === "auto" ? "\n  days={isNarrow ? 3 : 7}" : ""}${props.weekStartsOn !== "1" ? `\n  weekStartsOn={${props.weekStartsOn}}` : ""}${props.step !== "15" ? `\n  step={${props.step}}` : ""}${props.dayStart !== 7 ? `\n  dayStart={${props.dayStart}}` : ""}${props.dayEnd !== 20 ? `\n  dayEnd={${props.dayEnd}}` : ""}${props.hourHeight !== 48 ? `\n  hourHeight={${props.hourHeight}}` : ""}${props.readOnly ? "\n  readOnly" : ""}\n/>\n\n// events: [{ id, title, start: Date, end: Date, tone: "primary", description?, readOnly? }]`,
  propsTable: propDocs<WeekSchedulerProps>()([
    { name: "events", type: "ScheduleEvent[]", description: "Controlled events (defaultEvents, onEventsChange)." },
    { name: "date", type: "Date", description: "Any day of the week shown (defaultDate, onDateChange). Default: today." },
    { name: "weekStartsOn", type: "0 | 1", default: "1", description: "Sunday or Monday." },
    { name: "days", type: "1 | 3 | 5 | 7", default: "7", description: "Full or work week; 3 or 1 shows a short range from `date` for narrow screens." },
    { name: "dayStart", type: "number", default: "7", description: "First visible hour." },
    { name: "dayEnd", type: "number", default: "20", description: "Last visible hour (exclusive)." },
    { name: "step", type: "number", default: "15", description: "Snap and keyboard step, minutes." },
    { name: "defaultDuration", type: "number", default: "30", description: "Length of a clicked new event, minutes." },
    { name: "hourHeight", type: "number", default: "48", description: "px per hour." },
    { name: "height", type: "number", default: "520", description: "Max height of the scrolling grid, px." },
    { name: "onEventCreate", type: "(event) => ScheduleEvent | false | void", description: "Adjust a new event, or return false to cancel it." },
    { name: "onEventClick", type: "(event) => void", description: "Click without dragging, or Enter." },
    { name: "newEventTitle", type: "string", default: '"New event"', description: "Title a new event starts with." },
    { name: "readOnly", type: "boolean", default: "false", description: "No editing; events still report clicks." },
    { name: "showNav", type: "boolean", default: "true", description: "Today, prev / next and the range label." },
    { name: "now", type: "number", description: "Reference time for the now line. Default: the client clock." },
    { name: "locale", type: "string", description: "Day and time formatting." },
  ]),
  keyboard: [
    { keys: "Add event", action: "Create one at the next free slot and name it" },
    { keys: "Tab to an event", action: "Shows a card with its full title, time and notes (also on hover)" },
    { keys: "↑ / ↓", action: "Move the focused event by one step" },
    { keys: "← / →", action: "Move it to the previous / next day" },
    { keys: "Shift + ↑ / ↓", action: "Shorten / lengthen it" },
    { keys: "Enter or F2", action: "Rename (Enter saves, Escape keeps the old title)" },
    { keys: "Delete / Backspace", action: "Remove it" },
  ],
  a11y: [
    "Each event is a button whose name reads its title, day and times; a hidden hint lists the keys.",
    "Every change (create, move, resize, rename, delete) is announced in a polite status.",
    "Day columns are labelled groups; the week range is a polite live heading when you page weeks.",
    "Drawing with the pointer has a keyboard equal: Add event plus arrow keys.",
    "Overlaps cascade with an inset and a minimum width in narrow days; the hover / focus card repeats what the button name already says, so it is hidden from screen readers.",
  ],
  reducedMotion: "Events fade in and out without scaling; a dragged event doesn't lift.",
  examples: [
    { title: "Booking slots", description: "30-minute snap, Mon–Fri, lunch can't be booked over.", Demo: BookingDemo, wide: true },
    { title: "On-call rota (read only)", description: "Compact hours; clicks report the shift.", Demo: RotaDemo, wide: true },
  ],
};

export default item;
