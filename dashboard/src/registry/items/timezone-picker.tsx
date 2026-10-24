import { formatOffset, TimezonePicker, timeZoneOffset, type TimezonePickerProps } from "changelui";
import { useState } from "react";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";
type DemoProps = {
  pinTeam: boolean;
  showLocal: boolean;
  clock: string;
  size: NonNullable<TimezonePickerProps["size"]>;
};
const defaults: DemoProps = { pinTeam: true, showLocal: true, clock: "locale", size: "md" };
const controls: ControlSpec<DemoProps>[] = [
  { type: "boolean", prop: "pinTeam", label: "Pin team zones" },
  { type: "boolean", prop: "showLocal", label: "Your time zone first" },
  { type: "select", prop: "clock", label: "Clock", options: ["locale", "12h", "24h"] },
  { type: "select", prop: "size", label: "Size", options: ["sm", "md", "lg"] },
];
const team = ["America/New_York", "Europe/London", "Asia/Kolkata"];
const hour12Of = (clock: string) => (clock === "12h" ? true : clock === "24h" ? false : undefined);
function Preview({ props }: { props: DemoProps }) {
  const [zone, setZone] = useState<string | null>("Europe/Berlin");
  return (
    <div className="flex w-full max-w-sm flex-col gap-2">
      <label htmlFor="tz-preview" className="text-sm font-medium text-pui-foreground">
        Meeting time zone
      </label>
      <TimezonePicker
        id="tz-preview"
        value={zone}
        onValueChange={setZone}
        pinned={props.pinTeam ? team : undefined}
        showLocal={props.showLocal}
        hour12={hour12Of(props.clock)}
        size={props.size}
        openOnFocus
      />
      <p className="m-0 text-xs text-pui-muted-foreground">Try “Seattle”, “IST”, “+5:30” or “UTC-3”.</p>
      <TeamClocks zones={zone ? [zone, ...team.filter((z) => z !== zone)] : team} hour12={hour12Of(props.clock)} />
    </div>
  );
}
/** What the picked zone means for the team: everyone's local time right now. */
function TeamClocks({ zones, hour12 }: { zones: readonly string[]; hour12?: boolean }) {
  const [now] = useState(Date.now);
  return (
    <ul className="m-0 mt-3 flex list-none flex-col divide-y divide-pui-border rounded-pui-lg border border-pui-border bg-pui-surface p-0 text-pui-surface-foreground">
      {zones.map((z, i) => (
        <li key={z} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
          <span className="flex min-w-0 flex-col">
            <span className="truncate font-medium">{(z.split("/").pop() ?? z).replace(/_/g, " ")}</span>
            <span className="text-xs text-pui-muted-foreground">{i === 0 ? "Meeting zone" : "Teammate"}</span>
          </span>
          <span className="flex flex-col items-end tabular-nums">
            <span>{new Intl.DateTimeFormat(undefined, { timeZone: z, hour: "numeric", minute: "2-digit", hour12 }).format(now)}</span>
            <span className="text-xs text-pui-muted-foreground">{formatOffset(timeZoneOffset(z, now))}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
function Mini() {
  return (
    <div aria-hidden="true" className="pointer-events-none w-60">
      <TimezonePicker aria-label="Time zone" defaultValue="Asia/Tokyo" showLocal={false} />
    </div>
  );
}
/** Profile settings row with the chosen zone summarized. */
function ProfileDemo() {
  const [zone, setZone] = useState<string | null>("America/Los_Angeles");
  const now = new Date();
  const time = zone ? new Intl.DateTimeFormat(undefined, { timeZone: zone, weekday: "short", hour: "numeric", minute: "2-digit" }).format(now) : "—";
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-3 rounded-pui-xl border border-pui-border bg-pui-surface p-5 text-pui-surface-foreground">
      <div>
        <h3 className="m-0 text-sm font-semibold">Time zone</h3>
        <p className="m-0 text-xs text-pui-muted-foreground">Used for reminders, digests and due dates.</p>
      </div>
      <TimezonePicker aria-label="Profile time zone" value={zone} onValueChange={setZone} />
      <p className="m-0 text-xs text-pui-muted-foreground">
        It's <span className="font-medium text-pui-foreground tabular-nums">{time}</span> there now.
      </p>
    </div>
  );
}
/** A curated list: only the offices a company has. */
function OfficesDemo() {
  return (
    <div className="mx-auto flex w-full max-w-xs flex-col gap-2">
      <label htmlFor="tz-offices" className="text-sm font-medium text-pui-foreground">
        Office
      </label>
      <TimezonePicker
        id="tz-offices"
        size="sm"
        showLocal={false}
        timeZones={["America/Los_Angeles", "America/New_York", "Europe/Dublin", "Europe/Berlin", "Asia/Singapore", "Australia/Sydney"]}
        defaultValue="Europe/Dublin"
        hour12={false}
      />
    </div>
  );
}
const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) => {
    const attrs = ["value={zone}", "onValueChange={setZone}"];
    if (props.pinTeam) attrs.push(`pinned={${JSON.stringify(team)}}`);
    if (!props.showLocal) attrs.push("showLocal={false}");
    if (props.clock !== "locale") attrs.push(`hour12={${props.clock === "12h"}}`);
    if (props.size !== "md") attrs.push(`size="${props.size}"`);
    return `const [zone, setZone] = useState<string | null>("Europe/Berlin");\n\n<TimezonePicker\n  ${attrs.join("\n  ")}\n/>`;
  },
  propsTable: propDocs<TimezonePickerProps>()([
    { name: "value", type: "string | null", description: "Selected IANA zone (controlled; with defaultValue for uncontrolled)." },
    { name: "onValueChange", type: "(zone) => void", description: "Called with the picked zone, or null when cleared." },
    { name: "timeZones", type: "string[]", default: "about 60 major cities", description: "Zones to offer." },
    { name: "pinned", type: "string[]", description: 'Shown first under "Pinned".' },
    { name: "showLocal", type: "boolean", default: "true", description: "Pin the browser's zone first." },
    { name: "now", type: "Date | number", default: "client clock", description: "Reference time for the clocks and offsets." },
    { name: "hour12", type: "boolean", default: "locale", description: "12- or 24-hour clocks." },
    { name: "locale", type: "string", description: "Formatting locale." },
    { name: "size", type: '"sm" | "md" | "lg"', default: '"md"', description: "Field size. Other Combobox props pass through." },
  ]),
  keyboard: [
    { keys: "Type", action: "Filter by city, alias, IANA id, abbreviation or offset" },
    { keys: "↑ ↓", action: "Move through zones" },
    { keys: "Enter", action: "Pick the active zone" },
    { keys: "Esc", action: "Close, then clear" },
  ],
  a11y: [
    "An APG combobox: focus stays in the field and the active zone is announced through aria-activedescendant.",
    "Each option reads its city, IANA id, local time and offset; the day/night icon is decorative and \"Tomorrow\"/\"Yesterday\" are text.",
  ],
  reducedMotion: "The list opens and filters without the height spring and stagger.",
  examples: [
    { title: "Profile setting", description: "Shows what time it is in the chosen zone.", Demo: ProfileDemo },
    { title: "Offices only", description: "A curated timeZones list with 24-hour clocks.", Demo: OfficesDemo },
  ],
};
export default item;
