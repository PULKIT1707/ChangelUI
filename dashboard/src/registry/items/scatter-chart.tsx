import { ScatterChart, type ScatterChartProps } from "changelui";
import { useMemo, useState } from "react";
import { ChartDemo } from "../../components/chart-demo";
import { campaigns, countryStats, dailyTraffic, useSeed, type CampaignRow } from "../../lib/chart-data";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  bubbles: boolean;
  trend: "none" | "linear" | "series";
  quadrants: boolean;
  brush: "zoom" | "select" | "none";
  legend: "top" | "bottom" | "none";
  radius: number;
  height: number;
};
const defaults: DemoProps = { bubbles: true, trend: "series", quadrants: false, brush: "zoom", legend: "top", radius: 4.5, height: 360 };
const controls: ControlSpec<DemoProps>[] = [
  { type: "boolean", prop: "bubbles", label: "Bubble size (conversions)" },
  { type: "select", prop: "trend", label: "Trend", options: ["none", "linear", "series"] },
  { type: "boolean", prop: "quadrants", label: "Quadrants" },
  { type: "select", prop: "brush", label: "Drag", options: ["zoom", "select", "none"] },
  { type: "select", prop: "legend", label: "Legend", options: ["top", "bottom", "none"] },
  { type: "number", prop: "radius", label: "Point radius", min: 2, max: 10, step: 0.5 },
  { type: "number", prop: "height", label: "Height (px)", min: 240, max: 520, step: 20 },
];
const usd: Intl.NumberFormatOptions = { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 };

function Preview({ props }: { props: DemoProps }) {
  const [seed, randomize] = useSeed(3);
  const data = useMemo(() => campaigns(seed), [seed]);
  const { bubbles, quadrants, ...rest } = props;
  return (
    <ChartDemo onRandomize={randomize} hint="Hover to snap, drag a box to zoom (Shift selects), Ctrl/⌘ + scroll zooms, double-click resets.">
      <ScatterChart
        {...rest}
        title="Campaign spend vs revenue"
        description="Each point is a campaign; bubble size is conversions"
        data={data}
        x="spend"
        y="revenue"
        size={bubbles ? "conversions" : undefined}
        sizeLabel="Conversions"
        series="channel"
        label="campaign"
        xAxis={{ label: "Spend", format: usd }}
        yAxis={{ label: "Revenue", format: usd }}
        quadrants={quadrants ? { x: 25_000, y: 60_000, labels: ["Efficient", "Stars", "Small bets", "Expensive"] } : undefined}
      />
    </ChartDemo>
  );
}

function Mini() {
  const data = useMemo(() => campaigns(2, 40), []);
  return (
    <ScatterChart
      className="w-56"
      data={data}
      x="spend"
      y="revenue"
      series="channel"
      height={120}
      legend="none"
      brush="none"
      animation="never"
      initialWidth={224}
      xAxis={{ tickCount: 2 }}
      yAxis={{ tickCount: 2 }}
    />
  );
}

function Gapminder() {
  const [seed, randomize] = useSeed(1);
  const data = useMemo(() => countryStats(seed), [seed]);
  return (
    <ChartDemo onRandomize={randomize} hint="Bubbles are population; the regions toggle from the legend.">
      <ScatterChart
        data={data}
        x="gdp"
        y="lifeExpectancy"
        size="population"
        sizeLabel="Population (M)"
        sizeRange={[3, 26]}
        series="region"
        label="country"
        height={320}
        trend="linear"
        xAxis={{ label: "GDP per capita (log scale)", scale: "log", format: { style: "currency", currency: "USD", notation: "compact" } }}
        yAxis={{ label: "Life expectancy (years)", format: { maximumFractionDigits: 1 } }}
      />
    </ChartDemo>
  );
}

function BrushSelect() {
  const data = useMemo(() => campaigns(11, 80), []);
  const [rows, setRows] = useState<CampaignRow[]>([]);
  const spend = rows.reduce((a, r) => a + r.spend, 0);
  const revenue = rows.reduce((a, r) => a + r.revenue, 0);
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-pui-muted-foreground">Drag a box to select campaigns; the summary below updates (Escape clears).</p>
      <ScatterChart data={data} x="spend" y="revenue" series="channel" label="campaign" brush="select" trend="linear" height={280} onSelectionChange={setRows} xAxis={{ format: usd }} yAxis={{ format: usd }} />
      <div className="grid grid-cols-3 gap-2 text-center text-xs" aria-live="polite">
        <div className="rounded-pui-md bg-pui-muted px-2 py-1.5">
          <div className="text-pui-muted-foreground">Selected</div>
          <div className="text-sm font-semibold tabular-nums">{rows.length}</div>
        </div>
        <div className="rounded-pui-md bg-pui-muted px-2 py-1.5">
          <div className="text-pui-muted-foreground">Spend</div>
          <div className="text-sm font-semibold tabular-nums">{spend.toLocaleString("en-US", usd)}</div>
        </div>
        <div className="rounded-pui-md bg-pui-muted px-2 py-1.5">
          <div className="text-pui-muted-foreground">ROAS</div>
          <div className="text-sm font-semibold tabular-nums">{spend ? `${(revenue / spend).toFixed(2)}x` : "\u2013"}</div>
        </div>
      </div>
    </div>
  );
}

function OverTime() {
  const [seed, randomize] = useSeed(6);
  const data = useMemo(() => dailyTraffic(seed, 120), [seed]);
  return (
    <ChartDemo onRandomize={randomize} hint="Dates on x give a time axis; the trend shows growth per day.">
      <ScatterChart data={data} x="date" y="signups" trend="linear" height={260} radius={3.5} xAxis={{ label: "Day" }} yAxis={{ label: "Signups" }} />
    </ChartDemo>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: ({ bubbles, quadrants, height, ...props }) => {
    const lib: Record<string, unknown> = { trend: "none", brush: "zoom", legend: "top", radius: 4.5 };
    const lines = Object.entries(props)
      .filter(([k, v]) => v !== lib[k])
      .map(([k, v]) => (typeof v === "string" ? `  ${k}="${v}"` : `  ${k}={${String(v)}}`));
    if (bubbles) lines.unshift(`  size="conversions"`);
    if (quadrants) lines.push(`  quadrants={{ x: 25000, y: 60000, labels: ["Efficient", "Stars", "Small bets", "Expensive"] }}`);
    if (height !== 340) lines.push(`  height={${height}}`);
    return [
      `<ScatterChart`,
      `  data={campaigns}`,
      `  x="spend"`,
      `  y="revenue"`,
      `  series="channel"`,
      `  label="campaign"`,
      ...lines,
      `  xAxis={{ label: "Spend", format: { style: "currency", currency: "USD", notation: "compact" } }}`,
      `  yAxis={{ label: "Revenue", format: { style: "currency", currency: "USD", notation: "compact" } }}`,
      `/>`,
    ].join("\n");
  },
  propsTable: propDocs<ScatterChartProps<unknown>>()([
    { name: "data", type: "readonly T[]", required: true, description: "Rows, one per point." },
    { name: "x", type: "keyof T | (row, i) => number | Date", required: true, description: "Dates give a time axis." },
    { name: "y", type: "keyof T | (row, i) => number", required: true, description: "Vertical value." },
    { name: "size", type: "keyof T | (row, i) => number", description: "Bubble size (area-true sqrt scale)." },
    { name: "sizeRange", type: "[number, number]", default: "[4, 22]", description: "Bubble radius range in px." },
    { name: "series", type: "keyof T | (row, i) => string", description: "Group per row: colors, legend and per-group trends." },
    { name: "label", type: "keyof T | (row, i) => string", description: "Point name (tooltip heading, table)." },
    { name: "trend", type: '"none" | "linear" | "series"', default: '"none"', description: "Least-squares lines with R²." },
    { name: "quadrants", type: "{ x, y, labels? }", description: "Divider lines, tinted quadrants and corner labels." },
    { name: "brush", type: '"zoom" | "select" | "none"', default: '"zoom"', description: "What a drag does; Shift does the other." },
    { name: "wheelZoom", type: "boolean", default: "true", description: "Ctrl/⌘ + wheel zooms around the pointer." },
    { name: "onSelectionChange", type: "(rows: T[]) => void", description: "Brush or click selection." },
    { name: "xAxis", type: "{ label?, scale?, format?, min?, max?, tickCount? }", description: "x axis title, linear or log scale, format and bounds." },
    { name: "yAxis", type: "{ label?, scale?, format?, min?, max?, tickCount? }", description: "y axis title, linear or log scale, format and bounds." },
    { name: "legend", type: '"top" | "bottom" | "none"', default: '"top" with groups', description: "Toggle groups (Alt+click isolates), with counts." },
    { name: "radius", type: "number", default: "4.5", description: "Point radius without size." },
    { name: "height", type: "number", default: "340", description: "Height in px; the width follows the container." },
  ]),
  keyboard: [
    { keys: "← / →", action: "Previous / next point by x (announced)" },
    { keys: "↑ / ↓", action: "Nearest point above / below" },
    { keys: "Home / End, PageUp / PageDown", action: "Jump through the points" },
    { keys: "Enter / Space", action: "Select (Shift adds)" },
    { keys: "+ / − / 0", action: "Zoom around the focused point, reset" },
    { keys: "Escape", action: "Clear the selection, then reset the zoom" },
    { keys: "T", action: "Show or hide the data table" },
  ],
  a11y: [
    "Described by a generated summary with the correlation strength (r) and the value ranges.",
    'One tab stop (role="application"); arrow keys move in x order or to the nearest point above / below.',
    "A screen-reader data table lists every point (first 500).",
    "Legend items are toggle buttons (aria-pressed); trend lines are dashed and labelled with R².",
  ],
  reducedMotion: "No pop-in, no gliding zoom or tooltip: points, axes and selections update instantly.",
  examples: [
    { title: "Life expectancy vs income", description: "A Gapminder-style bubble cloud by region.", Demo: Gapminder, wide: true },
    { title: "Brush to analyse", description: "brush=\"select\" reports the selected rows.", Demo: BrushSelect },
    { title: "Time on x", description: "Dates make a time axis; a linear trend overlays.", Demo: OverTime },
  ],
};
export default item;
