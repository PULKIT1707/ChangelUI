import { DonutChart, PieChart, type PieChartProps } from "changelui";
import { useMemo, useState } from "react";
import { ChartDemo } from "../../components/chart-demo";
import { budget, deviceShare, planRevenue, trafficSources, useSeed, type ShareNode } from "../../lib/chart-data";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  variant: "donut" | "pie" | "half donut";
  labels: "none" | "inside" | "outside";
  labelContent: "percent" | "value" | "label";
  legend: "right" | "bottom" | "none";
  sort: "none" | "descending" | "ascending";
  padAngle: number;
  cornerRadius: number;
  explode: number;
  otherThreshold: number;
  height: number;
};
const defaults: DemoProps = {
  variant: "donut",
  labels: "none",
  labelContent: "percent",
  legend: "right",
  sort: "descending",
  padAngle: 1.4,
  cornerRadius: 5,
  explode: 8,
  otherThreshold: 0,
  height: 280,
};
const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "variant", label: "Variant", options: ["donut", "pie", "half donut"] },
  { type: "select", prop: "labels", label: "Labels", options: ["none", "inside", "outside"] },
  { type: "select", prop: "labelContent", label: "Label shows", options: ["percent", "value", "label"] },
  { type: "select", prop: "legend", label: "Legend", options: ["right", "bottom", "none"] },
  { type: "select", prop: "sort", label: "Sort", options: ["none", "descending", "ascending"] },
  { type: "number", prop: "padAngle", label: "Pad angle (deg)", min: 0, max: 6, step: 0.2 },
  { type: "number", prop: "cornerRadius", label: "Corner radius", min: 0, max: 16, step: 1 },
  { type: "number", prop: "explode", label: "Hover explode", min: 0, max: 16, step: 1 },
  { type: "number", prop: "otherThreshold", label: "Merge below (share)", min: 0, max: 0.2, step: 0.01 },
  { type: "number", prop: "height", label: "Size (px)", min: 180, max: 400, step: 20 },
];

const visits: Intl.NumberFormatOptions = { notation: "compact", maximumFractionDigits: 1 };
const usd: Intl.NumberFormatOptions = { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 };
const usd0: Intl.NumberFormatOptions = { style: "currency", currency: "USD", maximumFractionDigits: 0 };

function Preview({ props }: { props: DemoProps }) {
  const [seed, randomize] = useSeed(2);
  const data = useMemo(() => trafficSources(seed, 8), [seed]);
  const { variant, ...rest } = props;
  const angles = variant === "half donut" ? { startAngle: -90, endAngle: 90 } : {};
  return (
    <ChartDemo onRandomize={randomize} hint="Hover a slice, use the arrow keys, or toggle the legend (Alt+click isolates).">
      <PieChart
        {...rest}
        {...angles}
        innerRadius={variant === "pie" ? 0 : 0.62}
        title="Sessions by source"
        description="Last 30 days"
        data={data}
        value="value"
        label="name"
        format={visits}
        centerTitle="Sessions"
        className="w-full"
      />
    </ChartDemo>
  );
}

function Mini() {
  const data = useMemo(() => trafficSources(4, 5), []);
  return <DonutChart data={data} value="value" label="name" height={110} legend="none" animation="never" centerLabel={false} tooltip={false} className="w-28" />;
}

function PlanRevenue() {
  const [seed, randomize] = useSeed(7);
  const data = useMemo(() => planRevenue(seed), [seed]);
  return (
    <ChartDemo onRandomize={randomize} hint="Randomize: the angles tween, they never re-sweep.">
      <DonutChart data={data} value="value" label="name" format={usd} legend="bottom" height={240} centerTitle="ARR" />
    </ChartDemo>
  );
}

function Budget() {
  const [seed, randomize] = useSeed(3);
  const data = useMemo(() => budget(seed), [seed]);
  return (
    <ChartDemo onRandomize={randomize} hint="Small categories merge into Other (hover it to see which).">
      <PieChart data={data} value="spent" label="name" format={usd0} labels="outside" legend="none" otherThreshold={0.04} sort="descending" padAngle={0.8} height={240} />
    </ChartDemo>
  );
}

function Gauge() {
  const [seed, randomize] = useSeed(5);
  const used = 40 + ((seed * 37) % 55);
  const data = useMemo(
    () => [
      { name: "Used", value: used, color: used > 85 ? "var(--pui-danger)" : used > 70 ? "var(--pui-warning)" : "var(--pui-chart-1)" },
      { name: "Free", value: 100 - used, color: "var(--pui-muted)" },
    ],
    [used],
  );
  return (
    <ChartDemo onRandomize={randomize} hint="A half donut makes a quick capacity gauge.">
      <DonutChart
        data={data}
        value="value"
        label="name"
        color="color"
        startAngle={-90}
        endAngle={90}
        innerRadius={0.72}
        legend="none"
        height={220}
        explode={0}
        centerLabel={({ total }) => (
          <span className="flex translate-y-6 flex-col items-center">
            <span className="text-2xl font-semibold tabular-nums">{Math.round((used / total) * 100)}%</span>
            <span className="text-xs text-pui-muted-foreground">storage used</span>
          </span>
        )}
      />
    </ChartDemo>
  );
}

function Selection() {
  const data = useMemo(() => trafficSources(9, 5), []);
  const [selected, setSelected] = useState<number | null>(1);
  const pick = selected !== null ? data[selected] : undefined;
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-pui-muted-foreground">Click or press Enter on a slice: the selection is controlled from outside.</p>
      <DonutChart data={data} value="value" label="name" format={visits} selected={selected} onSelectedChange={setSelected} legend="none" height={220} />
      <p className="text-sm" aria-live="polite">
        {pick ? (
          <>
            Selected <strong>{pick.name}</strong>: {pick.value.toLocaleString("en-US")} sessions
          </>
        ) : (
          "Nothing selected"
        )}
      </p>
    </div>
  );
}

const shareChildren = (d: ShareNode) => d.children;

function Drill() {
  const [seed, randomize] = useSeed(3);
  const data = useMemo(() => deviceShare(seed), [seed]);
  return (
    <ChartDemo onRandomize={randomize} hint="Click a slice (or Enter) to open it: device, then OS, then version. Escape or the breadcrumb goes back.">
      <DonutChart<ShareNode>
        data={data}
        value="value"
        label="name"
        drill={{ children: shareChildren, rootLabel: "All sessions" }}
        centerTitle="Sessions"
        legend="bottom"
        title="Sessions by device"
        className="w-full"
      />
    </ChartDemo>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: ({ variant, height, ...props }) => {
    const component = variant === "pie" ? "PieChart" : "DonutChart";
    const pie = variant === "pie";
    const libDefaults: Record<string, unknown> = {
      labels: pie ? "inside" : "none",
      labelContent: "percent",
      legend: "right",
      sort: "none",
      padAngle: pie ? 0 : 1.4,
      cornerRadius: pie ? 0 : 5,
      explode: 8,
      otherThreshold: 0,
    };
    const lines = Object.entries(props)
      .filter(([k, v]) => v !== libDefaults[k])
      .map(([k, v]) => (typeof v === "string" ? `  ${k}="${v}"` : `  ${k}={${String(v)}}`));
    if (variant === "half donut") lines.push("  startAngle={-90}", "  endAngle={90}");
    if (height !== 280) lines.push(`  height={${height}}`);
    return [`<${component}`, `  data={sources}`, `  value="value"`, `  label="name"`, `  format={{ notation: "compact" }}`, ...lines, `/>`].join("\n");
  },
  propsTable: propDocs<PieChartProps<unknown>>()([
    { name: "data", type: "readonly T[]", required: true, description: "Rows, one per slice." },
    { name: "value", type: "keyof T | (row, i) => number", required: true, description: "Slice value; negative values count as 0." },
    { name: "label", type: "keyof T | (row, i) => string", required: true, description: "Slice name (legend, tooltip, key)." },
    { name: "color", type: "keyof T | (row, i) => string", description: "Per-slice color. Default: the chart palette." },
    { name: "innerRadius", type: "number", default: "0 (Donut 0.62)", description: "Hole as a fraction of the radius." },
    { name: "padAngle", type: "number", default: "0 (Donut 1.4)", description: "Gap between slices in degrees (constant width)." },
    { name: "cornerRadius", type: "number", default: "0 (Donut 5)", description: "Rounded slice corners in px." },
    { name: "startAngle", type: "number", default: "0", description: "Degrees, 0 = 12 o'clock; with endAngle makes half donuts and gauges." },
    { name: "endAngle", type: "number", default: "360", description: "End of the sweep in degrees." },
    { name: "sort", type: '"none" | "descending" | "ascending"', default: '"none"', description: "Slice order." },
    { name: "otherThreshold", type: "number", default: "0", description: 'Merge slices below this share into "Other".' },
    { name: "labels", type: '"none" | "inside" | "outside"', default: '"inside" (Donut "none")', description: "Outside labels use collision-free leader lines." },
    { name: "labelContent", type: '"percent" | "value" | "label"', default: '"percent"', description: "What the labels print." },
    { name: "centerLabel", type: "false | ReactNode | (ctx) => ReactNode", description: "Donut center. Default: rolling total, or the active slice." },
    { name: "legend", type: '"right" | "bottom" | "none"', default: '"right"', description: "Toggle buttons with share and value (Alt+click isolates)." },
    { name: "explode", type: "number", default: "8", description: "Hover push-out in px." },
    { name: "tooltip", type: "boolean", default: "pie: true, donut: false", description: "Hover tooltip; donuts show the active slice in the center instead." },
    { name: "selected", type: "number | null", description: "Controlled selection (with onSelectedChange)." },
    { name: "hiddenSlices", type: "string[]", description: "Controlled hidden slices by label (with onHiddenSlicesChange)." },
    { name: "format", type: "Intl.NumberFormatOptions | (v) => string", description: "Value format." },
    { name: "height", type: "number", default: "280", description: "Size in px; scales down with the container." },
    { name: "drill", type: "{ children, rootLabel?, onDrillChange? }", description: "Drill-down: click or Enter opens a slice's children, Escape goes up, with a breadcrumb." },
    { name: "toolbar", type: "ReactNode", description: "Content between the caption and the chart." },
  ]),
  keyboard: [
    { keys: "Tab", action: "Focus the chart, then the legend" },
    { keys: "← / → / ↑ / ↓", action: "Previous / next slice (announced with its share)" },
    { keys: "Home / End", action: "First / last slice" },
    { keys: "Enter / Space", action: "Select the focused slice" },
    { keys: "Escape", action: "Clear the selection" },
    { keys: "T", action: "Show or hide the data table" },
  ],
  a11y: [
    'A figure (aria-roledescription="chart") described by a generated summary: slice count, total and the largest slice.',
    'One tab stop (role="application"); the focused slice is announced with its value, share and position.',
    "A screen-reader data table lists every slice with its share (T makes it visible).",
    "Legend items are toggle buttons (aria-pressed) with 24px targets; labels and the center text never rely on color alone.",
  ],
  reducedMotion: "No sweep, explode spring or angle tween: slices and the center total update instantly.",
  examples: [
    { title: "Revenue by plan", description: "Donut with a bottom legend and a rolling center total.", Demo: PlanRevenue },
    { title: "Budget with Other", description: "Outside labels with leader lines; the long tail is merged.", Demo: Budget },
    { title: "Half-donut gauge", description: "startAngle -90 and endAngle 90, with a custom center.", Demo: Gauge },
    { title: "Controlled selection", description: "selected / onSelectedChange drive outside UI.", Demo: Selection },
    { title: "Drill-down", description: "drill={{ children }}: slices open into their parts and sweep back in.", Demo: Drill },
  ],
};
export default item;
