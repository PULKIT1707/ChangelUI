import { AreaChart, ChartDataTable, LineSeries, type AreaChartProps, type Curve } from "changelui";
import { useMemo } from "react";
import { ChartDemo } from "../../components/chart-demo";
import { channels, dailyTraffic, monthlyRevenue, temperatures, useSeed } from "../../lib/chart-data";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  stack: NonNullable<AreaChartProps<unknown>["stack"]>;
  fill: NonNullable<AreaChartProps<unknown>["fill"]>;
  curve: Curve;
  legend: "top" | "bottom" | "none";
  strokeWidth: number;
  showDelta: boolean;
  patterns: boolean;
  height: number;
};

const defaults: DemoProps = { stack: "stack", fill: "gradient", curve: "monotone", legend: "top", strokeWidth: 2, showDelta: false, patterns: false, height: 320 };

const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "stack", label: "Stack", options: ["none", "stack", "expand"] },
  { type: "select", prop: "fill", label: "Fill", options: ["gradient", "solid"] },
  { type: "select", prop: "curve", label: "Curve", options: ["monotone", "linear", "natural", "step", "bump"] },
  { type: "select", prop: "legend", label: "Legend", options: ["top", "bottom", "none"] },
  { type: "number", prop: "strokeWidth", label: "Outline", min: 0, max: 4, step: 0.5 },
  { type: "boolean", prop: "showDelta", label: "Tooltip deltas" },
  { type: "boolean", prop: "patterns", label: "Pattern fills" },
  { type: "number", prop: "height", label: "Height (px)", min: 200, max: 480, step: 20 },
];

const SERIES = [
  { id: "organic", y: "organic", label: "Organic" },
  { id: "paid", y: "paid", label: "Paid" },
  { id: "referral", y: "referral", label: "Referral" },
  { id: "social", y: "social", label: "Social" },
] as const;

function Preview({ props }: { props: DemoProps }) {
  const [seed, randomize] = useSeed(2);
  const data = useMemo(() => channels(seed), [seed]);
  return (
    <ChartDemo onRandomize={randomize} hint="Hover a layer to isolate it; toggle channels in the legend.">
      <AreaChart {...props} title="Signups by channel" description="Monthly, 2026" data={data} x="month" series={SERIES} />
    </ChartDemo>
  );
}

const deg = (v: number) => `${v.toFixed(1)}\u00b0C`;

function Temperature() {
  const [seed, randomize] = useSeed(3);
  const data = useMemo(() => temperatures(seed), [seed]);
  return (
    <ChartDemo onRandomize={randomize} hint="The band runs from each day's low to its high (y0 to y); the line is the mean.">
      <AreaChart
        data={data}
        x="date"
        height={280}
        title="Daily temperature range"
        description="Low to high, with the daily mean"
        fill="solid"
        xAxis={{ format: { month: "short" } }}
        yAxis={{ format: (v: number) => `${Math.round(v)}\u00b0` }}
        series={[{ id: "range", y: "max", y0: "min", label: "Low to high", format: deg, color: "var(--pui-chart-3)" }]}
        annotations={[{ x: data.reduce((a, b) => (b.max > a.max ? b : a)).date, y: data.reduce((a, b) => (b.max > a.max ? b : a)).max, label: "Hottest day", tone: "danger" }]}
      >
        <LineSeries id="avg" y="avg" label="Mean" format={deg} color="var(--pui-chart-1)" strokeWidth={1.5} markers={false} />
      </AreaChart>
    </ChartDemo>
  );
}

function Patterned() {
  const [seed, randomize] = useSeed(12);
  const data = useMemo(() => channels(seed), [seed]);
  return (
    <ChartDemo onRandomize={randomize} hint="Pattern fills sit over each layer's color (colorblind-friendly and print-safe).">
      <AreaChart data={data} x="month" height={260} stack="stack" fill="solid" patterns series={SERIES}>
        <ChartDataTable />
      </AreaChart>
    </ChartDemo>
  );
}

function Mini() {
  const data = useMemo(() => channels(7), []);
  return (
    <AreaChart
      className="w-48"
      data={data}
      x="month"
      height={96}
      stack="stack"
      interactive={false}
      animation="never"
      legend="none"
      grid={false}
      strokeWidth={1}
      xAxis={{ hide: true }}
      yAxis={{ hide: true }}
      series={SERIES.slice(0, 3)}
    />
  );
}

function Expand() {
  const [seed, randomize] = useSeed(8);
  const data = useMemo(() => channels(seed), [seed]);
  return (
    <ChartDemo onRandomize={randomize} hint="Shares of 100%: the tooltip shows each channel's share.">
      <AreaChart data={data} x="month" height={240} stack="expand" fill="solid" strokeWidth={0} series={SERIES} />
    </ChartDemo>
  );
}

function Overlap() {
  const [seed, randomize] = useSeed(5);
  const data = useMemo(() => monthlyRevenue(seed), [seed]);
  return (
    <ChartDemo onRandomize={randomize}>
      <AreaChart
        data={data}
        x="month"
        height={240}
        showDelta
        series={[
          { id: "revenue", y: "revenue", label: "Revenue", format: { style: "currency", currency: "USD", maximumFractionDigits: 0 } },
          { id: "cost", y: "cost", label: "Cost", format: { style: "currency", currency: "USD", maximumFractionDigits: 0 } },
        ]}
        referenceLines={[{ y: 50_000, label: "Target", tone: "success" }]}
      />
    </ChartDemo>
  );
}

function Traffic() {
  const [seed, randomize] = useSeed(13);
  const data = useMemo(() => dailyTraffic(seed, 120), [seed]);
  return (
    <ChartDemo onRandomize={randomize} hint="120 days on a UTC time axis with multi-level labels.">
      <AreaChart data={data} x="date" height={220} legend="none" series={[{ id: "visitors", y: "visitors", label: "Visitors", color: "var(--pui-chart-2)" }]} />
    </ChartDemo>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) => {
    const flags = Object.entries(props)
      .filter(([k, v]) => v !== (defaults as Record<string, unknown>)[k] || k === "stack")
      .map(([k, v]) => (typeof v === "string" ? `  ${k}="${v}"` : v === true ? `  ${k}` : `  ${k}={${String(v)}}`));
    return [
      `<AreaChart`,
      `  data={rows}`,
      `  x="month"`,
      ...flags,
      `  series={[`,
      `    { id: "organic", y: "organic", label: "Organic" },`,
      `    { id: "paid", y: "paid", label: "Paid" },`,
      `    { id: "referral", y: "referral", label: "Referral" },`,
      `    { id: "social", y: "social", label: "Social" },`,
      `  ]}`,
      `/>`,
    ].join("\n");
  },
  propsTable: propDocs<AreaChartProps<unknown>>()([
    { name: "data", type: "readonly T[]", required: true, description: "Rows, in x order." },
    { name: "x", type: "keyof T | (row, i) => number | Date | string", required: true, description: "x per row." },
    { name: "series", type: "AreaChartSeries<T>[]", required: true, description: "{ id, y, y0?, label?, color?, format?, pattern?, hidden? } per layer, bottom first. y0 makes a range band from y0 to y (min/max, intervals) that never stacks." },
    { name: "stack", type: '"none" | "stack" | "expand"', default: '"none"', description: "Overlap, stack, or show shares of 100%." },
    { name: "patterns", type: "boolean", default: "false", description: "Pattern fills per layer as a redundant encoding (or per series with pattern)." },
    { name: "annotations", type: "ChartAnnotationProps[]", description: "Callouts pinned to points or x values." },
    { name: "fill", type: '"gradient" | "solid"', default: '"gradient"', description: "Layer fill." },
    { name: "curve", type: "Curve", default: '"monotone"', description: "Interpolation for both edges." },
    { name: "strokeWidth", type: "number", default: "2", description: "Outline on the top edge; 0 hides it." },
    { name: "legend", type: '"top" | "bottom" | "none"', default: '"top"', description: "Toggle legend; hidden layers collapse and neighbors re-flow." },
    { name: "showDelta", type: "boolean", default: "false", description: "Tooltip deltas vs the previous point." },
    { name: "referenceLines", type: "ReferenceLineProps[]", description: "Targets and thresholds." },
    { name: "hiddenSeries", type: "string[]", description: "Controlled legend state." },
  ]),
  keyboard: [
    { keys: "← / →", action: "Previous / next point" },
    { keys: "Home / End", action: "First / last point" },
    { keys: "T", action: "Show or hide the data table" },
  ],
  a11y: [
    "Generated summary per visible layer; the focused month is announced with every layer's value.",
    "Legend toggle buttons with aria-pressed; the data table lists the raw values.",
  ],
  reducedMotion: "Layers appear and re-stack instantly; no draw-in.",
  examples: [
    { title: "100% stacked", description: "Channel mix over time.", Demo: Expand },
    { title: "Overlapping areas", description: "Revenue and cost with a target line.", Demo: Overlap },
    { title: "Time series", description: "Daily visitors on a time axis.", Demo: Traffic, wide: true },
    { title: "Range band", description: "A year of daily lows and highs with the mean line and an annotation.", Demo: Temperature, wide: true },
    { title: "Pattern fills", description: "Stacked layers with patterns and a visible data table.", Demo: Patterned },
  ],
};

export default item;
