import { Avatar, Badge, SlotPicker, type BookingSlot, type SlotPickerProps } from "changelui";
import { useMemo, useState } from "react";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";
type DemoProps = {
  timeZone: string;
  duration: number;
  hour12: boolean;
  height: number;
  tone: NonNullable<SlotPickerProps["tone"]>;
  disabled: boolean;
};
const defaults: DemoProps = { timeZone: "America/New_York", duration: 30, hour12: true, height: 232, tone: "primary", disabled: false };
const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "timeZone", label: "Time zone", options: ["America/New_York", "America/Los_Angeles", "Europe/Lisbon", "Asia/Tokyo", "UTC"] },
  { type: "number", prop: "duration", label: "Duration (min)", min: 15, max: 90, step: 15 },
  { type: "boolean", prop: "hour12", label: "12-hour clock" },
  { type: "number", prop: "height", label: "Times height (px)", min: 160, max: 360, step: 8 },
  { type: "select", prop: "tone", label: "Tone", options: ["primary", "neutral", "info", "success"] },
  { type: "boolean", prop: "disabled", label: "Disabled" },
];
/** Deterministic availability for a host working 9:00-17:30 in New York (UTC-4 in late October). */
function hostSlots(seed: number, step = 30): BookingSlot[] {
  let s = seed;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const out: BookingSlot[] = [];
  for (let d = 26; d <= 31; d++) {
    if (d === 31) continue; // Saturday off
    const busyDay = d === 28; // offsite: fully booked
    for (let m = 9 * 60; m < 17.5 * 60; m += step) {
      if (m >= 12 * 60 && m < 13 * 60) continue; // lunch
      const roll = r();
      if (roll < 0.35 && !busyDay) continue;
      const hh = Math.floor(m / 60) + 4;
      out.push({ start: `2026-10-${d}T${String(hh).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}:00Z`, available: !busyDay && roll > 0.5 });
    }
  }
  return out;
}
const WEEK = ["2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30", "2026-11-02"];
function Preview({ props }: { props: DemoProps }) {
  const slots = useMemo(() => hostSlots(7), []);
  const [value, setValue] = useState<string | null>(null);
  return (
    <div className="grid w-full max-w-3xl gap-6 rounded-pui-xl border border-pui-border bg-pui-surface p-5 text-pui-surface-foreground shadow-pui-md md:grid-cols-[minmax(0,13rem)_minmax(0,1fr)]">
      <div className="flex flex-col gap-3 border-pui-border md:border-r md:pr-5">
        <Avatar name="Maya Rivera" size="lg" />
        <div>
          <p className="m-0 text-sm text-pui-muted-foreground">Maya Rivera</p>
          <p className="m-0 text-lg leading-snug font-semibold">Product walkthrough</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge size="sm">{props.duration} min</Badge>
          <Badge size="sm">Video call</Badge>
        </div>
        <p className="m-0 text-xs leading-5 text-pui-muted-foreground">A guided tour of your workspace with time for questions. Times follow your zone.</p>
      </div>
      <SlotPicker
        {...props}
        slots={slots}
        days={WEEK}
        value={value}
        onValueChange={setValue}
        onConfirm={() => new Promise((resolve) => setTimeout(resolve, 900))}
      />
    </div>
  );
}
function CompactDemo() {
  const slots = useMemo(() => hostSlots(31, 60), []);
  return (
    <div className="w-full max-w-sm rounded-pui-xl border border-pui-border bg-pui-surface p-4 text-pui-surface-foreground">
      <p className="m-0 mb-3 text-sm font-medium">Pick a delivery window</p>
      <SlotPicker slots={slots} days={WEEK} timeZone="Europe/Lisbon" hour12={false} duration={60} height={176} tone="success" confirmLabel="Reserve" confirmedLabel="Reserved" periodLabels={{ morning: "Before noon", afternoon: "Afternoon", evening: "After 5 pm" }} />
    </div>
  );
}
function EmptyDayDemo() {
  const slots = useMemo(() => hostSlots(7).filter((s) => s.start >= "2026-10-29"), []);
  return (
    <div className="w-full max-w-sm rounded-pui-xl border border-pui-border bg-pui-surface p-4 text-pui-surface-foreground">
      <p className="m-0 mb-3 text-sm font-medium">Fully booked this week? Jump ahead.</p>
      <SlotPicker slots={slots} days={WEEK} defaultDay="2026-10-26" timeZone="America/New_York" height={176} tone="info" />
    </div>
  );
}
function Mini() {
  const slots = useMemo(() => hostSlots(3), []);
  return (
    <div aria-hidden="true" inert className="pointer-events-none w-64">
      <SlotPicker slots={slots} days={WEEK} timeZone="America/New_York" defaultValue={slots.find((s) => s.available)?.start} height={120} />
    </div>
  );
}
const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) =>
    toJsx("SlotPicker", props, defaults, undefined, controls).replace(
      "<SlotPicker",
      "<SlotPicker slots={slots} value={value} onValueChange={setValue} onConfirm={(start) => book(start)}",
    ),
  propsTable: propDocs<SlotPickerProps>()([
    { name: "slots", type: "(string | { start, available? })[]", required: true, description: "ISO instants; available: false shows a taken time." },
    { name: "days", type: "string[]", description: "Extra YYYY-MM-DD days to show even with no slots (shown as Full)." },
    { name: "value", type: "string | null", description: "Picked slot start (controlled)." },
    { name: "defaultValue", type: "string | null", default: "null", description: "Starting pick when uncontrolled." },
    { name: "onValueChange", type: "(start | null) => void", description: "Every pick or un-pick." },
    { name: "day", type: "string", description: "Shown day (YYYY-MM-DD, controlled). Default the picked slot's day, else the first open day." },
    { name: "defaultDay", type: "string", description: "Starting day when uncontrolled." },
    { name: "onDayChange", type: "(day) => void", description: "Day tab changes." },
    { name: "timeZone", type: "string", description: "IANA zone for labels and day grouping. Default the visitor's zone (UTC on the server)." },
    { name: "locale", type: "string", default: '"en-US"', description: "Date and time formatting." },
    { name: "hour12", type: "boolean", description: "12-hour clock. Default the locale's preference." },
    { name: "duration", type: "number", description: "Minutes; adds the end time to the summary." },
    { name: "onConfirm", type: "(start) => void | Promise", description: "Confirm button; a promise shows Booking, then the confirmed state." },
    { name: "confirmLabel", type: "string", default: '"Confirm"', description: "Confirm button text." },
    { name: "confirmedLabel", type: "string", default: '"Booked"', description: "Text after a successful confirm." },
    { name: "height", type: "number", default: "232", description: "Times area height; it scrolls so the card never resizes between days." },
    { name: "periodLabels", type: "Partial<Record<period, string>>", description: "Morning / Afternoon / Evening headings." },
    { name: "tone", type: "Tone", default: '"primary"', description: "Selection color." },
    { name: "disabled", type: "boolean", default: "false", description: "Locks the picker." },
  ]),
  keyboard: [
    { keys: "← / →", action: "Previous or next day (day tabs)" },
    { keys: "Home / End", action: "First or last day, or first or last time" },
    { keys: "Arrow keys (in times)", action: "Move across and down the time grid" },
    { keys: "Enter / Space", action: "Pick a time; again to un-pick" },
  ],
  a11y: [
    "Days are a tablist; each tab names the full date and how many times are open, the times are its tabpanel.",
    "Times are toggle buttons (aria-pressed) under Morning / Afternoon / Evening headings; taken times are disabled and say so.",
    "A polite status announces picks and the booking result; the time zone is always shown beside the summary.",
  ],
  reducedMotion: "Day changes and the confirm morph cross-fade instantly; the selection highlight jumps.",
  examples: [
    { title: "Delivery windows", description: "24-hour clock, hour-long windows and custom period names.", Demo: CompactDemo },
    { title: "Empty days", description: "A full day offers a jump to the next open one.", Demo: EmptyDayDemo },
  ],
};
export default item;
