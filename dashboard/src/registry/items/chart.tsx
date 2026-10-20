import {
  AreaSeries,
  BarSeries,
  Chart,
  ChartCrosshair,
  ChartGrid,
  ChartLegend,
  ChartTooltip,
  LineSeries,
  ReferenceArea,
  ReferenceLine,
  typedChart,
  XAxis,
  YAxis,
  type ChartProps,
} from "changelui";
import { useMemo } from "react";
import { ChartDemo } from "../../components/chart-demo";
import { channels, monthlyRevenue, useSeed, type MonthlyRow } from "../../lib/chart-data";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  tooltip: "axis" | "item" | "none";
  legend: "top" | "bottom";
  crosshairY: boolean;
  gridX: boolean;
  reference: boolean;
  animation: "auto" | "always" | "never";
  height: number;
};

const defaults: DemoProps = { tooltip: "axis", legend: "top", crosshairY: true, gridX: false, reference: true, animation: "auto", height: 340 };

const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "tooltip", label: "Tooltip", options: ["axis", "item", "none"] },
  { type: "select", prop: "legend", label: "Legend", options: ["top", "bottom"] },
  { type: "boolean", prop: "crosshairY", label: "Value crosshair" },
  { type: "boolean", prop: "gridX", label: "Vertical grid" },
  { type: "boolean", prop: "reference", label: "Reference marks" },
  { type: "select", prop: "animation", label: "Animation", options: ["auto", "always", "never"] },
  { type: "number", prop: "height", label: "Height (px)", min: 220, max: 480, step: 20 },
];

const usd: Intl.NumberFormatOptions = { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 };
const pct: Intl.NumberFormatOptions = { style: "percent", maximumFractionDigits: 1 };
const marginOf = (r: MonthlyRow) => (r.revenue - r.cost) / r.revenue;

function Preview({ props }: { props: DemoProps }) {
  const [seed, randomize] = useSeed(7);
  const data = useMemo(() => monthlyRevenue(seed), [seed]);
  return (
    <ChartDemo onRandomize={randomize} hint="Bars, a line on a second axis, reference marks, tooltip and legend: all composed by hand.">
      <Chart
        data={data}
        x="month"
        height={props.height}
        tooltip={props.tooltip}
        animation={props.animation}
        title="Revenue and margin"
        description="Composed from BarSeries, LineSeries and two YAxis parts"
      >
        <ChartLegend position={props.legend} />
        <ChartGrid x={props.gridX} />
        {props.reference ? <ReferenceArea x={["Jun", "Aug"]} label="Summer campaign" tone="info" /> : null}
        <XAxis line={false} />
        <YAxis format={usd} />
        <YAxis id="margin" side="right" format={pct} min={0} max={0.6} />
        <BarSeries id="revenue" y="revenue" label="Revenue" format={usd} />
        <BarSeries id="cost" y="cost" label="Cost" format={usd} color="var(--pui-chart-8)" />
        <LineSeries id="margin" y={marginOf} label="Margin" yAxisId="margin" format={pct} color="var(--pui-chart-3)" strokeWidth={2.5} glow />
        {props.reference ? <ReferenceLine y={50_000} label="Target" tone="success" /> : null}
        <ChartCrosshair y={props.crosshairY} />
        <ChartTooltip showDelta />
      </Chart>
    </ChartDemo>
  );
}

function Mini() {
  const data = useMemo(() => monthlyRevenue(2), []);
  return (
    <Chart className="w-48" data={data} x="month" height={96} interactive={false} animation="never">
      <BarSeries id="revenue" y="revenue" radius={2} color="var(--pui-chart-2)" />
      <LineSeries id="cost" y="cost" markers={false} />
    </Chart>
  );
}

const Kit = typedChart<MonthlyRow>();

function Typed() {
  const [seed, randomize] = useSeed(12);
  const data = useMemo(() => monthlyRevenue(seed), [seed]);
  return (
    <ChartDemo onRandomize={randomize} hint="typedChart<Row>() binds the row type, so y=&quot;…&quot; autocompletes.">
      <Kit.Chart data={data} x="month" height={260}>
        <ChartLegend />
        <ChartGrid />
        <ReferenceArea x={["Oct", "Dec"]} label="Forecast" tone="neutral" />
        <XAxis />
        <YAxis format={usd} />
        <Kit.AreaSeries id="revenue" y="revenue" label="Revenue" format={usd} />
        <Kit.LineSeries id="forecast" y="forecast" label="Forecast" format={usd} dashed markers={false} />
        <ChartCrosshair />
        <ChartTooltip />
      </Kit.Chart>
    </ChartDemo>
  );
}

function CustomTooltip() {
  const [seed, randomize] = useSeed(9);
  const data = useMemo(() => channels(seed), [seed]);
  return (
    <ChartDemo onRandomize={randomize} hint="ChartTooltip content={(ctx) => …} renders anything.">
      <Chart data={data} x="month" height={260} stackOffset="none">
        <ChartGrid />
        <XAxis line={false} />
        <YAxis />
        <BarSeries id="organic" y="organic" label="Organic" stack="all" />
        <BarSeries id="paid" y="paid" label="Paid" stack="all" />
        <BarSeries id="social" y="social" label="Social" stack="all" />
        <ChartCrosshair />
        <ChartTooltip
          content={(ctx) => {
            const total = ctx.rows.reduce((a, r) => a + r.value, 0);
            const top = [...ctx.rows].sort((a, b) => b.value - a.value)[0];
            return (
              <div className="flex flex-col gap-1 text-xs">
                <span className="font-semibold">{ctx.title}</span>
                <span className="text-lg font-bold tabular-nums">{total.toLocaleString("en-US")}</span>
                <span className="text-pui-muted-foreground">
                  Top channel: <strong className="text-pui-foreground">{top?.series.label}</strong> ({top ? Math.round((top.value / total) * 100) : 0}%)
                </span>
              </div>
            );
          }}
        />
      </Chart>
    </ChartDemo>
  );
}

function Horizontal() {
  const data = useMemo(() => monthlyRevenue(15, 6), []);
  return (
    <Chart data={data} x="month" layout="horizontal" height={260} stackOffset="diverging">
      <ChartLegend />
      <ChartGrid />
      <XAxis />
      <YAxis format={usd} />
      <BarSeries id="revenue" y="revenue" label="Revenue" stack="pl" format={usd} />
      <BarSeries id="cost" y={(r: MonthlyRow) => -r.cost} label="Cost" stack="pl" format={usd} color="var(--pui-chart-4)" />
      <ChartCrosshair />
      <ChartTooltip />
    </Chart>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (p) =>
    [
      `<Chart data={rows} x="month" height={${p.height}}${p.tooltip !== "axis" ? ` tooltip="${p.tooltip}"` : ""}>`,
      `  <ChartLegend position="${p.legend}" />`,
      `  <ChartGrid${p.gridX ? " x" : ""} />`,
      p.reference ? `  <ReferenceArea x={["Jun", "Aug"]} label="Summer campaign" tone="info" />` : null,
      `  <XAxis line={false} />`,
      `  <YAxis format={{ style: "currency", currency: "USD", notation: "compact" }} />`,
      `  <YAxis id="margin" side="right" format={{ style: "percent" }} min={0} max={0.6} />`,
      `  <BarSeries id="revenue" y="revenue" label="Revenue" />`,
      `  <BarSeries id="cost" y="cost" label="Cost" />`,
      `  <LineSeries id="margin" y={(r) => (r.revenue - r.cost) / r.revenue} label="Margin" yAxisId="margin" glow />`,
      p.reference ? `  <ReferenceLine y={50000} label="Target" tone="success" />` : null,
      `  <ChartCrosshair${p.crosshairY ? " y" : ""} />`,
      `  <ChartTooltip showDelta />`,
      `</Chart>`,
    ]
      .filter((line): line is string => line !== null)
      .join("\n"),
  propsTable: propDocs<ChartProps<unknown>>()([
    { name: "data", type: "readonly T[]", required: true, description: "Rows, in x order." },
    { name: "x", type: "keyof T | (row, i) => number | Date | string", required: true, description: "Dates give a UTC time axis, strings a band axis, numbers a linear axis." },
    { name: "xScale", type: '"auto" | "band" | "time" | "linear"', default: '"auto"', description: "Force the x scale (band whenever there are bars)." },
    { name: "layout", type: '"vertical" | "horizontal"', default: '"vertical"', description: "Horizontal puts the categories on the left." },
    { name: "height", type: "number", default: "300", description: "Height in px; reserved up front, so there is no layout shift." },
    { name: "initialWidth", type: "number", default: "640", description: "Width on the server and before the first measure." },
    { name: "tooltip", type: '"axis" | "item" | "none"', default: '"axis"', description: "Hover model: all series at an x, one mark, or none." },
    { name: "stackOffset", type: '"none" | "expand" | "diverging"', default: '"none"', description: "Offset for series sharing a stack id." },
    { name: "sort", type: '"none" | "asc" | "desc"', default: '"none"', description: "Band axes: order categories by visible total; re-ranks slide (keys follow the visual order)." },
    { name: "patterns", type: "boolean", default: "false", description: "Pattern fills (bars, areas) and dash rhythms (lines) per series; children: ChartAnnotation, ChartDataTable." },
    { name: "animation", type: '"auto" | "always" | "never"', default: '"auto"', description: "Entrance policy; data updates always morph (unless reduced motion)." },
    { name: "hiddenSeries", type: "string[]", description: "Controlled legend state (defaultHiddenSeries / onHiddenSeriesChange)." },
    { name: "selection", type: "ChartItem[]", description: "Controlled selection (selectionMode, onSelectionChange)." },
    { name: "highlight", type: "ChartItem | null", description: "Controlled highlight (onHighlightChange)." },
    { name: "onItemClick", type: "(item, row, event) => void", description: "Click or Enter on a mark." },
    { name: "onAxisClick", type: "({ index, x }, event) => void", description: "Click anywhere in the plot." },
    { name: "formatX", type: "(x) => string", description: "Tooltip, announcement and data-table x labels." },
    { name: "formatAnnouncement", type: "(ctx) => string", description: "Live-region text for the focused point." },
    { name: "locale", type: "string", default: '"en-US"', description: "Intl locale, fixed by default so server and client agree." },
    { name: "timeZone", type: "string", default: '"UTC"', description: "IANA zone for date labels (UTC is SSR-safe)." },
    { name: "summary", type: "string", description: "Replaces the generated screen-reader summary." },
    { name: "interactive", type: "boolean", default: "true", description: "false renders a static role=img chart." },
  ]),
  keyboard: [
    { keys: "Tab", action: "Focus the plot (one stop), then the legend" },
    { keys: "← / →", action: "Previous / next point" },
    { keys: "↑ / ↓", action: "Switch series (item mode and bars)" },
    { keys: "Home / End, PageUp / PageDown", action: "Jump to the ends or by 10%" },
    { keys: "Enter / Space", action: "Select the focused mark" },
    { keys: "Escape", action: "Clear the selection" },
    { keys: "T", action: "Show or hide the data table" },
  ],
  a11y: [
    'figure role="group" with aria-roledescription="chart", titled by its caption and described by an auto summary.',
    'One focusable plot overlay (role="application") with keyboard help; announcements go to a debounced polite live region.',
    "The tooltip is aria-hidden: the live region carries the same text.",
    "An sr-only data table (first 500 rows) is always rendered; T shows it.",
  ],
  reducedMotion: "Entrances, morphs, gliding tooltips and fades are instant; the chart stays fully interactive.",
  examples: [
    { title: "typedChart<Row>()", description: "Area + dashed forecast with typed accessors.", Demo: Typed },
    { title: "Custom tooltip", description: "Stacked bars with a render-prop tooltip.", Demo: CustomTooltip },
    { title: "Butterfly-style diverging", description: "Horizontal bars with negative values stacked from zero.", Demo: Horizontal, wide: true },
  ],
};

export default item;
