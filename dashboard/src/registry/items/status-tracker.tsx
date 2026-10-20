import { StatusTracker, type StatusTrackerProps } from "changelui";
import { useMemo, useState } from "react";
import { ChartDemo } from "../../components/chart-demo";
import { ciRuns, uptimeDays, useSeed } from "../../lib/chart-data";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = { days: number; height: number; gap: number; radius: number; header: boolean; legend: boolean; footer: boolean };
const defaults: DemoProps = { days: 90, height: 34, gap: 2, radius: 3, header: true, legend: false, footer: true };
const controls: ControlSpec<DemoProps>[] = [
  { type: "number", prop: "days", label: "Days", min: 14, max: 120, step: 1 },
  { type: "number", prop: "height", label: "Height", min: 12, max: 56, step: 2 },
  { type: "number", prop: "gap", label: "Gap", min: 0, max: 6, step: 1 },
  { type: "number", prop: "radius", label: "Radius", min: 0, max: 8, step: 1 },
  { type: "boolean", prop: "header", label: "Header" },
  { type: "boolean", prop: "legend", label: "Legend" },
  { type: "boolean", prop: "footer", label: "Footer" },
];

function Preview({ props }: { props: DemoProps }) {
  const [seed, randomize] = useSeed(3);
  const items = useMemo(() => uptimeDays(seed, props.days), [seed, props.days]);
  return (
    <ChartDemo onRandomize={randomize} hint="Hover or arrow through the days; incidents show their downtime and title.">
      <StatusTracker
        items={items}
        label="Public API"
        height={props.height}
        gap={props.gap}
        radius={props.radius}
        header={props.header}
        legend={props.legend}
        footer={props.footer}
        startLabel={`${props.days} days ago`}
        endLabel="Today"
        className="w-full"
      />
    </ChartDemo>
  );
}

function Mini() {
  const items = useMemo(() => uptimeDays(8, 40), []);
  return <StatusTracker items={items} header={false} footer={false} height={26} initialWidth={220} animation="never" className="w-56" />;
}

const SERVICES = ["Dashboard", "Public API", "Webhooks", "Search", "Payments"];
function StatusPage() {
  const [seed, randomize] = useSeed(11);
  const rows = useMemo(() => SERVICES.map((name, k) => ({ name, items: uptimeDays(seed * 7 + k, 90, "2026-06-30", 0.9 + k * 0.015) })), [seed]);
  const anyDown = rows.some((r) => r.items[r.items.length - 1]?.status === "down");
  return (
    <ChartDemo onRandomize={randomize} hint="A status page: one tracker per service, the dot pulses in the latest day's tone.">
      <div className="flex w-full flex-col gap-4 rounded-pui-lg border border-pui-border p-4">
        <p className={anyDown ? "text-sm font-semibold text-pui-danger-text" : "text-sm font-semibold text-pui-success-text"}>{anyDown ? "Some systems are having trouble" : "All systems operational"}</p>
        {rows.map((r) => (
          <StatusTracker key={r.name} items={r.items} label={r.name} height={28} startLabel="90 days ago" endLabel="Today" className="w-full" />
        ))}
      </div>
    </ChartDemo>
  );
}

function CiHistory() {
  const [seed, randomize] = useSeed(5);
  const runs = useMemo(() => ciRuns(seed), [seed]);
  const [picked, setPicked] = useState<string | null>(null);
  return (
    <ChartDemo onRandomize={randomize} hint="Custom statuses and tones for CI history; click (or Enter on) a run.">
      <StatusTracker
        items={runs}
        label={"main \u00b7 CI"}
        statusTones={{ passed: "success", failed: "danger", flaky: "warning", cancelled: "neutral" }}
        statusLabels={{ passed: "Passed", failed: "Failed", flaky: "Flaky (passed on retry)", cancelled: "Cancelled" }}
        upStatuses={["passed", "flaky"]}
        dateFormat={{ month: "short", day: "numeric" }}
        legend
        height={22}
        gap={3}
        radius={11}
        startLabel="60 runs ago"
        endLabel="Latest"
        onItemClick={(item) => setPicked(`${item.detail} \u2192 ${item.status}`)}
        className="w-full"
      />
      <p className="text-sm text-pui-muted-foreground" aria-live="polite">
        {picked ?? "Pick a run"}
      </p>
    </ChartDemo>
  );
}

function Compact() {
  const items = useMemo(() => uptimeDays(21, 30), []);
  return (
    <div className="flex w-full items-center gap-3 text-sm">
      <span className="w-24 shrink-0 font-medium">Edge CDN</span>
      <StatusTracker items={items} header={false} footer={false} height={18} gap={1.5} radius={2} chartLabel="Edge CDN, last 30 days" className="min-w-0 flex-1" />
    </div>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (p) =>
    [
      "<StatusTracker",
      "  items={days} // [{ date, status, downtimeMinutes?, detail? }]",
      '  label="Public API"',
      p.height !== 34 ? `  height={${p.height}}` : null,
      p.gap !== 2 ? `  gap={${p.gap}}` : null,
      p.radius !== 3 ? `  radius={${p.radius}}` : null,
      p.header ? null : "  header={false}",
      p.legend ? "  legend" : null,
      p.footer ? null : "  footer={false}",
      `  startLabel="${p.days} days ago"`,
      '  endLabel="Today"',
      "/>",
    ]
      .filter(Boolean)
      .join("\n"),
  propsTable: propDocs<StatusTrackerProps>()([
    { name: "items", type: "StatusTrackerItem[]", required: true, description: "{ date, status, label?, detail?, downtimeMinutes? } per block." },
    { name: "statusTones", type: "Record<string, StatusTone>", description: 'Status to tone. Default up, degraded, down, maintenance, none.' },
    { name: "statusLabels", type: "Record<string, string>", description: "Status to label for tooltips and the list." },
    { name: "upStatuses", type: "string[]", default: '["up", "maintenance"]', description: "Statuses that count as available." },
    { name: "uptime", type: "number", description: "Overrides the computed uptime (time-weighted when downtimeMinutes is set)." },
    { name: "label", type: "string", description: "Service name in the header." },
    { name: "header", type: "boolean", default: "true", description: "Label, pulsing status dot and uptime." },
    { name: "height", type: "number", default: "34", description: "Block height in px." },
    { name: "legend", type: "boolean", default: "false", description: "Counts per status." },
    { name: "onItemClick", type: "(item, index, event) => void", description: "Click or Enter on a block." },
    { name: "onActiveItemChange", type: "(item | null, index | null) => void", description: "Block under the pointer or keyboard focus." },
  ]),
  keyboard: [
    { keys: "Tab", action: "Focus the tracker" },
    { keys: "← / →", action: "Previous / next day (announced)" },
    { keys: "Page Up / Page Down", action: "Jump a week" },
    { keys: "Home / End", action: "First / last day" },
    { keys: "Enter / Space", action: "Activate (onItemClick)" },
  ],
  a11y: [
    "The blocks are an ordered list with a text status per day, so the history reads without the colors.",
    "The summary states the uptime and how many days had incidents.",
    "One tab stop with arrow-key navigation and a debounced live region.",
  ],
  reducedMotion: "Blocks render in place with no fade-in, lift or pulsing dot.",
  examples: [
    { title: "Status page", description: "One tracker per service.", Demo: StatusPage, wide: true },
    { title: "CI history", description: "Custom statuses, tones and pills.", Demo: CiHistory },
    { title: "Inline row", description: "Headerless and compact, in a table row.", Demo: Compact },
  ],
};
export default item;
