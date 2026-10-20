import { ComboChart, type ComboChartProps } from "changelui";
import { useMemo } from "react";
import { ChartDemo } from "../../components/chart-demo";
import { cashFlow, monthlyRevenue, signupFunnel, useSeed } from "../../lib/chart-data";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  rate: "line" | "area";
  trials: boolean;
  stackBars: boolean;
  alignZero: boolean;
  target: boolean;
  legend: "top" | "bottom" | "none";
  height: number;
};
const defaults: DemoProps = { rate: "line", trials: true, stackBars: false, alignZero: true, target: true, legend: "top", height: 320 };
const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "rate", label: "Rate as", options: ["line", "area"] },
  { type: "boolean", prop: "trials", label: "Second bar series" },
  { type: "boolean", prop: "stackBars", label: "Stack bars" },
  { type: "boolean", prop: "alignZero", label: "Align zero" },
  { type: "boolean", prop: "target", label: "Target line (right axis)" },
  { type: "select", prop: "legend", label: "Legend", options: ["top", "bottom", "none"] },
  { type: "number", prop: "height", label: "Height (px)", min: 220, max: 440, step: 20 },
];
const pct: Intl.NumberFormatOptions = { style: "percent", maximumFractionDigits: 1 };
const compact: Intl.NumberFormatOptions = { notation: "compact", maximumFractionDigits: 1 };
const usd: Intl.NumberFormatOptions = { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 };

function Preview({ props }: { props: DemoProps }) {
  const [seed, randomize] = useSeed(3);
  const data = useMemo(() => signupFunnel(seed), [seed]);
  return (
    <ChartDemo onRandomize={randomize} hint="One crosshair, tooltip grouped by axis. Toggle a series in the legend: both axes re-fit.">
      <ComboChart
        data={data}
        x="month"
        title="Signups and conversion"
        description="Bars on the left axis, the rate on the right"
        series={[
          { id: "signups", type: "bar", y: "signups", label: "Signups" },
          ...(props.trials ? [{ id: "trials", type: "bar" as const, y: "trials" as const, label: "Trials" }] : []),
          { id: "conversion", type: props.rate, y: "conversion", label: "Trial to paid", axis: "right" as const, color: "var(--pui-chart-3)" },
        ]}
        leftAxis={{ label: "Signups", format: compact }}
        rightAxis={{ label: "Conversion", format: pct }}
        stackBars={props.stackBars}
        alignZero={props.alignZero}
        legend={props.legend}
        referenceLines={props.target ? [{ y: 0.15, axisId: "right", label: "Goal 15%", tone: "success" }] : undefined}
        height={props.height}
      />
    </ChartDemo>
  );
}

function Mini() {
  const data = useMemo(() => signupFunnel(5, 8), []);
  return (
    <ComboChart
      data={data}
      x="month"
      series={[
        { id: "s", type: "bar", y: "signups" },
        { id: "c", type: "line", y: "conversion", axis: "right", color: "var(--pui-chart-3)" },
      ]}
      legend="none"
      xAxis={{ hide: true }}
      leftAxis={{}}
      height={110}
      initialWidth={220}
      interactive={false}
      animation="never"
      grid={false}
      className="w-56"
    />
  );
}

function CashFlow({ align }: { align: boolean }) {
  const [seed, randomize] = useSeed(4);
  const data = useMemo(() => cashFlow(seed), [seed]);
  return (
    <ChartDemo onRandomize={randomize} hint={align ? "alignZero: both zeros share one gridline." : "alignZero off: the zeros drift apart and the chart lies."}>
      <ComboChart
        data={data}
        x="month"
        series={[
          { id: "net", type: "bar", y: "net", label: "Net cash flow" },
          { id: "runway", type: "line", y: (d) => d.runway - 12, label: "Runway vs 12-month plan", axis: "right", color: "var(--pui-chart-4)" },
        ]}
        leftAxis={{ format: usd }}
        rightAxis={{ format: { maximumFractionDigits: 1 } }}
        alignZero={align}
        height={260}
      />
    </ChartDemo>
  );
}

function RevenueMargin() {
  const [seed, randomize] = useSeed(8);
  const data = useMemo(() => monthlyRevenue(seed).map((d) => ({ ...d, margin: (d.revenue - d.cost) / d.revenue })), [seed]);
  return (
    <ChartDemo onRandomize={randomize} hint="Stacked cost + profit bars with a margin area on the right axis.">
      <ComboChart
        data={data}
        x="month"
        series={[
          { id: "cost", type: "bar", y: "cost", label: "Cost", color: "var(--pui-chart-6)" },
          { id: "profit", type: "bar", y: (d) => d.revenue - d.cost, label: "Profit", color: "var(--pui-chart-2)" },
          { id: "margin", type: "area", y: "margin", label: "Margin", axis: "right", color: "var(--pui-chart-5)" },
        ]}
        leftAxis={{ label: "Revenue", format: usd }}
        rightAxis={{ label: "Margin", format: { style: "percent", maximumFractionDigits: 0 } }}
        stackBars
        height={280}
      />
    </ChartDemo>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (p) =>
    [
      "<ComboChart",
      "  data={months}",
      '  x="month"',
      "  series={[",
      '    { id: "signups", type: "bar", y: "signups" },',
      p.trials ? '    { id: "trials", type: "bar", y: "trials" },' : null,
      `    { id: "conversion", type: "${p.rate}", y: "conversion", axis: "right" },`,
      "  ]}",
      '  leftAxis={{ label: "Signups", format: { notation: "compact" } }}',
      '  rightAxis={{ label: "Conversion", format: { style: "percent" } }}',
      p.stackBars ? "  stackBars" : null,
      p.alignZero ? null : "  alignZero={false}",
      p.target ? '  referenceLines={[{ y: 0.15, axisId: "right", label: "Goal 15%" }]}' : null,
      p.legend !== "top" ? `  legend="${p.legend}"` : null,
      "/>",
    ]
      .filter(Boolean)
      .join("\n"),
  propsTable: propDocs<ComboChartProps<unknown>>()([
    { name: "data", type: "readonly T[]", required: true, description: "Rows on a shared band axis." },
    { name: "x", type: "keyof T | (row, i) => XValue", required: true, description: "Category per row." },
    { name: "series", type: "ComboSeries<T>[]", required: true, description: '{ id, type: "bar" | "line" | "area", y, axis?: "left" | "right", label?, color?, format?, dashed? }' },
    { name: "leftAxis", type: "{ label?, format?, min?, max?, tickCount? }", description: "Left axis; the label becomes a colored caption." },
    { name: "rightAxis", type: "{ label?, format?, min?, max?, tickCount? }", description: "Right axis (used by series with axis: right)." },
    { name: "alignZero", type: "boolean", default: "true", description: "Zero at the same height on both axes (skipped when you set min or max)." },
    { name: "stackBars", type: "boolean", default: "false", description: "Stack the bars per axis instead of grouping." },
    { name: "referenceLines", type: "ReferenceLineProps[]", description: 'Targets; axisId "right" pins one to the right axis.' },
    { name: "hiddenSeries", type: "string[]", description: "Controlled hidden series; axes re-fit and stay aligned." },
    { name: "legend", type: '"top" | "bottom" | "none"', default: '"top"', description: "Toggle buttons; Alt+click isolates." },
    { name: "height", type: "number", default: "300", description: "Chart height in px." },
  ]),
  keyboard: [
    { keys: "Tab", action: "Focus the chart, then the legend" },
    { keys: "← / →", action: "Previous / next month (all series announced)" },
    { keys: "Home / End", action: "First / last month" },
    { keys: "T", action: "Show or hide the data table" },
  ],
  a11y: [
    "Built on the Chart kit: figure with a generated summary, sr-only data table, one tab stop with live announcements.",
    "The tooltip groups values by axis and each axis caption names its unit, so dual axes stay readable.",
  ],
  reducedMotion: "Bars and lines appear at their final positions; updates and legend toggles are instant.",
  examples: [
    { title: "alignZero on", description: "Negative bars and a signed line share one zero.", Demo: () => <CashFlow align />, wide: false },
    { title: "alignZero off", description: "The same data with independent axes: the zeros drift.", Demo: () => <CashFlow align={false} /> },
    { title: "Stacked bars + area", description: "Cost and profit stack to revenue; margin rides the right axis.", Demo: RevenueMargin, wide: true },
  ],
};
export default item;
