import { AreaSeries, ChartAnnotation, ChartDataTable, ChartSyncGroup, ChartZoom, LineChart, type Curve, type LineChartProps } from "changelui";
import { useMemo } from "react";
import { ChartDemo } from "../../components/chart-demo";
import { channels, dailyTraffic, forecastBand, latency, monthlyRevenue, sensorTrace, useSeed } from "../../lib/chart-data";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  dataset: "revenue" | "traffic" | "latency";
  curve: Curve;
  markers: "auto" | "always" | "never";
  area: boolean;
  glow: boolean;
  legend: "top" | "bottom" | "none";
  crosshairY: boolean;
  directLabels: boolean;
  showDelta: boolean;
  patterns: boolean;
  annotations: boolean;
  height: number;
};

const defaults: DemoProps = {
  dataset: "revenue",
  curve: "monotone",
  markers: "auto",
  area: true,
  glow: false,
  legend: "top",
  crosshairY: false,
  directLabels: false,
  showDelta: true,
  patterns: false,
  annotations: true,
  height: 320,
};

const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "dataset", label: "Data", options: ["revenue", "traffic", "latency"] },
  { type: "select", prop: "curve", label: "Curve", options: ["monotone", "linear", "natural", "step", "stepAfter", "bump"] },
  { type: "select", prop: "markers", label: "Markers", options: ["auto", "always", "never"] },
  { type: "boolean", prop: "area", label: "Gradient area" },
  { type: "boolean", prop: "glow", label: "Glow" },
  { type: "select", prop: "legend", label: "Legend", options: ["top", "bottom", "none"] },
  { type: "boolean", prop: "crosshairY", label: "Value crosshair" },
  { type: "boolean", prop: "directLabels", label: "Direct labels" },
  { type: "boolean", prop: "showDelta", label: "Tooltip deltas" },
  { type: "boolean", prop: "patterns", label: "Dash patterns" },
  { type: "boolean", prop: "annotations", label: "Annotations" },
  { type: "number", prop: "height", label: "Height (px)", min: 200, max: 480, step: 20 },
];

const usd: Intl.NumberFormatOptions = { style: "currency", currency: "USD", maximumFractionDigits: 0 };
const ms = (v: number) => `${Math.round(v)} ms`;

function Preview({ props }: { props: DemoProps }) {
  const [seed, randomize] = useSeed(3);
  const { dataset, markers, annotations, ...rest } = props;
  const common = { ...rest, markers: markers === "auto" ? ("auto" as const) : markers === "always" };
  const revenue = useMemo(() => monthlyRevenue(seed), [seed]);
  const traffic = useMemo(() => dailyTraffic(seed), [seed]);
  const lat = useMemo(() => latency(seed), [seed]);
  return (
    <ChartDemo onRandomize={randomize}>
      {dataset === "revenue" ? (
        <LineChart
          {...common}
          title="Revenue vs cost"
          description="Monthly, FY2026 (USD)"
          data={revenue}
          x="month"
          series={[
            { id: "revenue", y: "revenue", label: "Revenue", format: usd },
            { id: "cost", y: "cost", label: "Cost", format: usd },
            { id: "forecast", y: "forecast", label: "Forecast", format: usd, dashed: true, area: false },
          ]}
          referenceLines={[{ y: 50_000, label: "Target", tone: "success" }]}
          annotations={
            annotations
              ? [
                  { x: "Apr", seriesId: "revenue", label: "Spring launch", note: "v3 pricing", tone: "primary" },
                  { x: "Sep", label: "Price change", tone: "warning" },
                ]
              : undefined
          }
        />
      ) : dataset === "traffic" ? (
        <LineChart
          {...common}
          title="Website traffic"
          description="Daily, last 90 days"
          data={traffic}
          x="date"
          series={[
            { id: "sessions", y: "sessions", label: "Sessions" },
            { id: "visitors", y: "visitors", label: "Visitors" },
          ]}
        />
      ) : (
        <LineChart
          {...common}
          title="API latency"
          description="Percentiles per minute"
          data={lat}
          x="t"
          xAxis={{ format: (v) => `${String(v)}m` }}
          yAxis={{ format: ms }}
          series={[
            { id: "p50", y: "p50", label: "p50", format: ms },
            { id: "p95", y: "p95", label: "p95", format: ms },
            { id: "p99", y: "p99", label: "p99", format: ms },
          ]}
          referenceAreas={[{ x: [33, 40], label: "Incident", tone: "danger" }]}
          annotations={annotations ? [{ x: 36, seriesId: "p99", label: "Cache flush", note: "p99 spiked", tone: "danger" }] : undefined}
        />
      )}
    </ChartDemo>
  );
}

function Mini() {
  const data = useMemo(() => monthlyRevenue(5), []);
  return (
    <LineChart
      className="w-48"
      data={data}
      x="month"
      height={96}
      interactive={false}
      animation="never"
      legend="none"
      grid={false}
      markers={false}
      area
      xAxis={{ hide: true }}
      yAxis={{ hide: true }}
      series={[
        { id: "revenue", y: "revenue" },
        { id: "cost", y: "cost" },
      ]}
    />
  );
}

function DualAxis() {
  const [seed, randomize] = useSeed(11);
  const data = useMemo(() => dailyTraffic(seed, 45), [seed]);
  return (
    <ChartDemo onRandomize={randomize} hint="Signups use the right axis.">
      <LineChart
        data={data}
        x="date"
        height={260}
        crosshairY
        series={[
          { id: "visitors", y: "visitors", label: "Visitors", area: true },
          { id: "signups", y: "signups", label: "Signups", yAxisId: "right", curve: "stepAfter" },
        ]}
        rightAxis={{}}
      />
    </ChartDemo>
  );
}

function DirectLabels() {
  const [seed, randomize] = useSeed(4);
  const data = useMemo(() => channels(seed), [seed]);
  return (
    <ChartDemo onRandomize={randomize} hint="Labels dodge each other at the line ends.">
      <LineChart
        data={data}
        x="month"
        height={260}
        legend="none"
        directLabels
        glow
        markers={false}
        series={[
          { id: "organic", y: "organic", label: "Organic" },
          { id: "paid", y: "paid", label: "Paid" },
          { id: "referral", y: "referral", label: "Referral" },
          { id: "social", y: "social", label: "Social" },
        ]}
      />
    </ChartDemo>
  );
}

function Gaps() {
  const data = useMemo(
    () => monthlyRevenue(9).map((row, i) => ({ ...row, revenue: i === 4 || i === 5 ? null : row.revenue })),
    [],
  );
  return (
    <LineChart
      data={data}
      x="month"
      height={240}
      markers
      legend="none"
      series={[{ id: "revenue", y: "revenue", label: "Revenue", format: usd }]}
      referenceAreas={[{ x: ["May", "Jun"], label: "Outage", tone: "warning" }]}
    />
  );
}

function Synced() {
  const [seed, randomize] = useSeed(21);
  const data = useMemo(() => dailyTraffic(seed, 60), [seed]);
  return (
    <ChartDemo onRandomize={randomize} hint="Hover one chart: both crosshairs follow (ChartSyncGroup).">
      <ChartSyncGroup id="traffic">
        <div className="grid gap-4 md:grid-cols-2">
          <LineChart data={data} x="date" height={200} legend="none" area title="Visitors" series={[{ id: "visitors", y: "visitors", label: "Visitors" }]} />
          <LineChart
            data={data}
            x="date"
            height={200}
            legend="none"
            title="Signups"
            series={[{ id: "signups", y: "signups", label: "Signups", color: "var(--pui-chart-2)", area: true }]}
          />
        </div>
      </ChartSyncGroup>
    </ChartDemo>
  );
}

const plain: Intl.NumberFormatOptions = { maximumFractionDigits: 0 };

function Forecast() {
  const [seed, randomize] = useSeed(14);
  const data = useMemo(() => forecastBand(seed), [seed]);
  const last = data.find((d) => d.forecast !== null && d.actual !== null);
  return (
    <ChartDemo onRandomize={randomize} hint="A range band (AreaSeries y0) widens with the horizon; hover for the interval.">
      <LineChart
        data={data}
        x="date"
        height={280}
        title="Orders forecast"
        description="Daily orders, next 30 days at 80% confidence"
        series={[
          { id: "actual", y: "actual", label: "Actual", format: plain },
          { id: "forecast", y: "forecast", label: "Forecast", dashed: true, format: plain },
        ]}
        markers={false}
        showDelta={false}
      >
        <AreaSeries id="interval" y="hi" y0="lo" label="80% interval" color="var(--pui-chart-2)" fill="solid" format={plain} />
        {last ? <ChartAnnotation x={last.date} label="Today" tone="neutral" /> : null}
      </LineChart>
    </ChartDemo>
  );
}

function Dense() {
  const [seed, randomize] = useSeed(2);
  const data = useMemo(() => sensorTrace(seed), [seed]);
  return (
    <ChartDemo onRandomize={randomize} hint="20,000 points drawn as about two per pixel (LTTB); hover still snaps to raw readings. Ctrl/Cmd + scroll to zoom.">
      <LineChart
        data={data}
        x="t"
        height={260}
        legend="none"
        markers={false}
        showDelta={false}
        area
        series={[{ id: "value", y: "value", label: "Sensor", format: { maximumFractionDigits: 1 } }]}
        yAxis={{ format: { maximumFractionDigits: 0 } }}
      >
        <ChartZoom />
      </LineChart>
    </ChartDemo>
  );
}

function Patterns() {
  const [seed, randomize] = useSeed(8);
  const data = useMemo(() => channels(seed), [seed]);
  return (
    <ChartDemo onRandomize={randomize} hint="Each line keeps its own dash rhythm, so color is never the only key. The button shows the data table.">
      <LineChart
        data={data}
        x="month"
        height={260}
        patterns
        markers={false}
        series={[
          { id: "organic", y: "organic", label: "Organic" },
          { id: "paid", y: "paid", label: "Paid" },
          { id: "referral", y: "referral", label: "Referral" },
          { id: "social", y: "social", label: "Social" },
        ]}
      >
        <ChartDataTable />
      </LineChart>
    </ChartDemo>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: ({ dataset, markers, height, annotations, ...props }) => {
    const flags = Object.entries(props)
      .filter(([k, v]) => v !== (defaults as Record<string, unknown>)[k])
      .map(([k, v]) => (v === true ? `  ${k}` : typeof v === "string" ? `  ${k}="${v}"` : `  ${k}={${String(v)}}`));
    if (markers !== "auto") flags.push(`  markers={${markers === "always"}}`);
    if (height !== 320) flags.push(`  height={${height}}`);
    const x = dataset === "traffic" ? "date" : dataset === "latency" ? "t" : "month";
    return [
      `<LineChart`,
      `  data={rows}`,
      `  x="${x}"`,
      `  series={[`,
      `    { id: "revenue", y: "revenue", label: "Revenue", format: { style: "currency", currency: "USD" } },`,
      `    { id: "cost", y: (row) => row.cost, label: "Cost" },`,
      `  ]}`,
      `  area`,
      ...flags,
      `  referenceLines={[{ y: 50000, label: "Target", tone: "success" }]}`,
      ...(annotations ? [`  annotations={[{ x: "Apr", seriesId: "revenue", label: "Spring launch", note: "v3 pricing" }]}`] : []),
      `/>`,
    ].join("\n");
  },
  propsTable: propDocs<LineChartProps<unknown>>()([
    { name: "data", type: "readonly T[]", required: true, description: "Rows, in x order." },
    { name: "x", type: "keyof T | (row, i) => number | Date | string", required: true, description: "x per row. Dates give a time axis, strings a band axis, numbers a linear axis." },
    { name: "series", type: "LineChartSeries<T>[]", required: true, description: "{ id, y, label?, color?, curve?, dashed?, format?, yAxisId?, area?, hidden? } per line." },
    { name: "curve", type: '"monotone" | "linear" | "natural" | "step" | "stepBefore" | "stepAfter" | "bump"', default: '"monotone"', description: "Interpolation. Monotone never overshoots the data." },
    { name: "markers", type: 'boolean | "auto"', default: '"auto"', description: "Point markers; auto shows them for 24 points or fewer." },
    { name: "area", type: "boolean", default: "false", description: "Gradient fill under every line." },
    { name: "glow", type: "boolean", default: "false", description: "Soft glow under each stroke." },
    { name: "legend", type: '"top" | "bottom" | "none"', default: '"top"', description: "Toggle legend (Alt+click isolates a series), with live values." },
    { name: "crosshairY", type: "boolean", default: "false", description: "Horizontal crosshair with a value pill." },
    { name: "showDelta", type: "boolean", default: "true", description: "Tooltip shows the change from the previous point." },
    { name: "directLabels", type: "boolean", default: "false", description: "Collision-free labels at the line ends." },
    { name: "rightAxis", type: "YAxisProps", description: 'Adds a right axis; series opt in with yAxisId: "right".' },
    { name: "yAxis", type: "YAxisProps", description: "min, max, includeZero, format, tickCount, hide." },
    { name: "xAxis", type: "XAxisProps", description: "format, tickCount, hide." },
    { name: "referenceLines", type: "ReferenceLineProps[]", description: "Targets and thresholds: { y | x, label, tone }." },
    { name: "referenceAreas", type: "ReferenceAreaProps[]", description: "Shaded windows: { x: [a, b] | y: [a, b], label, tone }." },
    { name: "annotations", type: "ChartAnnotationProps[]", description: "Callouts: { x, seriesId? | y?, label, note?, tone?, dx?, dy? }. Without seriesId or y, an event line." },
    { name: "patterns", type: "boolean", default: "false", description: "A dash rhythm per series (redundant to color); also per series with pattern." },
    { name: "decimate", type: '"auto" | "lttb" | "minmax" | false', default: '"auto"', description: "Above two points per pixel, draw an LTTB-decimated path; hover reads the raw data." },
    { name: "sort", type: '"none" | "asc" | "desc"', default: '"none"', description: "Band axes only: order categories by their visible total." },
    { name: "hiddenSeries", type: "string[]", description: "Controlled legend state (with onHiddenSeriesChange)." },
    { name: "height", type: "number", default: "300", description: "Height in px; the width follows the container." },
    { name: "animation", type: '"auto" | "always" | "never"', default: '"auto"', description: "auto skips the entrance for server-rendered charts; updates always morph." },
  ]),
  keyboard: [
    { keys: "Tab", action: "Focus the chart, then the legend" },
    { keys: "← / →", action: "Previous / next point (announced)" },
    { keys: "Home / End", action: "First / last point" },
    { keys: "PageUp / PageDown", action: "Jump 10% of the points" },
    { keys: "T", action: "Show or hide the data table" },
    { keys: "← / → in the legend", action: "Move between series; Enter toggles" },
  ],
  a11y: [
    'A figure with role="group" and aria-roledescription="chart", described by a generated summary (trend, peak, low).',
    'The plot is one tab stop (role="application") with keyboard help; the focused point is announced in a polite live region.',
    "A screen-reader data table is always in the DOM (T makes it visible).",
    "Legend items are toggle buttons (aria-pressed) with 24px targets; dashed lines and direct labels avoid color-only keys.",
  ],
  reducedMotion: "No draw-in, no morphs and no gliding tooltip: updates and hovers apply instantly.",
  examples: [
    { title: "Dual axis", description: "Visitors on the left, signups (step curve) on the right.", Demo: DualAxis },
    { title: "Direct labels", description: "End-of-line labels instead of a legend, with glow.", Demo: DirectLabels },
    { title: "Gaps in the data", description: "null values break the line; a reference area explains why.", Demo: Gaps },
    { title: "Synced crosshairs", description: "Two charts in a ChartSyncGroup share the hovered date.", Demo: Synced, wide: true },
    { title: "Forecast with a confidence band", description: "A range AreaSeries (y0 to y) composed into a LineChart, plus a Today marker.", Demo: Forecast, wide: true },
    { title: "20,000 points", description: "LTTB decimation keeps the shape; zoom in for detail.", Demo: Dense, wide: true },
    { title: "Patterns and a visible table", description: "Dash rhythms per series and a ChartDataTable toggle.", Demo: Patterns },
  ],
};

export default item;
