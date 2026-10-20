import { BarChart, SegmentedControl, SegmentedControlItem, type BarChartMode, type BarChartProps, type ChartItem } from "changelui";
import { useMemo, useState } from "react";
import { ChartDemo } from "../../components/chart-demo";
import { channels, countries, populationPyramid, productSales, profitAndLoss, regionSales, useSeed, type SalesNode } from "../../lib/chart-data";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  mode: BarChartMode;
  layout: "vertical" | "horizontal";
  radius: number;
  valueLabels: boolean;
  tooltip: "axis" | "item" | "none";
  barGap: number;
  sort: "none" | "asc" | "desc";
  patterns: boolean;
  height: number;
};

const defaults: DemoProps = { mode: "grouped", layout: "vertical", radius: 4, valueLabels: false, tooltip: "axis", barGap: 0.28, sort: "none", patterns: false, height: 320 };

const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "mode", label: "Mode", options: ["grouped", "stacked", "expand", "diverging", "butterfly"] },
  { type: "select", prop: "layout", label: "Layout", options: ["vertical", "horizontal"] },
  { type: "number", prop: "radius", label: "Radius", min: 0, max: 12, step: 1 },
  { type: "boolean", prop: "valueLabels", label: "Value labels" },
  { type: "select", prop: "tooltip", label: "Tooltip", options: ["axis", "item", "none"] },
  { type: "number", prop: "barGap", label: "Bar gap", min: 0.05, max: 0.6, step: 0.05 },
  { type: "select", prop: "sort", label: "Sort", options: ["none", "desc", "asc"] },
  { type: "boolean", prop: "patterns", label: "Pattern fills" },
  { type: "number", prop: "height", label: "Height (px)", min: 200, max: 480, step: 20 },
];

const usd: Intl.NumberFormatOptions = { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 };
const pctFmt = (v: number) => `${v.toFixed(1)}%`;

function Preview({ props }: { props: DemoProps }) {
  const [seed, randomize] = useSeed(1);
  const sales = useMemo(() => productSales(seed), [seed]);
  const pnl = useMemo(() => profitAndLoss(seed), [seed]);
  const pyramid = useMemo(() => populationPyramid(seed), [seed]);
  const diverging = props.mode === "diverging";
  return (
    <ChartDemo onRandomize={randomize} hint="Hover for the band cursor; click a bar to select it. With a sort, Randomize and legend toggles re-rank the bars.">
      {props.mode === "butterfly" ? (
        <BarChart
          {...props}
          sort="none"
          title="Population by age"
          description="Share of total population, %"
          data={pyramid}
          x="age"
          series={[
            { id: "male", y: "male", label: "Male", format: pctFmt },
            { id: "female", y: "female", label: "Female", format: pctFmt, color: "var(--pui-chart-4)" },
          ]}
        />
      ) : diverging ? (
        <BarChart
          {...props}
          title="Profit and loss"
          description="USD millions per quarter"
          data={pnl}
          x="quarter"
          series={[
            { id: "profit", y: "profit", label: "Profit", color: "var(--pui-chart-div-pos)" },
            { id: "loss", y: "loss", label: "Loss", color: "var(--pui-chart-div-neg)" },
          ]}
        />
      ) : (
        <BarChart
          {...props}
          title="Sales by product"
          description="This year vs last year"
          data={sales}
          x="name"
          series={[
            { id: "sales", y: "sales", label: "This year", format: usd },
            { id: "lastYear", y: "lastYear", label: "Last year", format: usd, color: "var(--pui-chart-2)" },
          ]}
        />
      )}
    </ChartDemo>
  );
}

function Mini() {
  const data = useMemo(() => productSales(4, 6), []);
  return (
    <BarChart
      className="w-48"
      data={data}
      x="name"
      height={96}
      interactive={false}
      animation="never"
      legend="none"
      grid={false}
      radius={3}
      xAxis={{ hide: true }}
      yAxis={{ hide: true }}
      series={[
        { id: "sales", y: "sales" },
        { id: "lastYear", y: "lastYear" },
      ]}
    />
  );
}

function Ranked() {
  const [seed, randomize] = useSeed(6);
  const data = useMemo(() => countries(seed), [seed]);
  return (
    <ChartDemo onRandomize={randomize}>
      <BarChart data={data} x="country" layout="horizontal" height={300} valueLabels radius={6} series={[{ id: "users", y: "users", label: "Users", format: { notation: "compact" } }]} />
    </ChartDemo>
  );
}

function Stacked() {
  const [seed, randomize] = useSeed(10);
  const data = useMemo(() => channels(seed, 8), [seed]);
  return (
    <ChartDemo onRandomize={randomize} hint="Only the top segment gets rounded corners; the tooltip adds a total.">
      <BarChart
        data={data}
        x="month"
        mode="stacked"
        height={260}
        valueLabels
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

function Selectable() {
  const data = useMemo(() => productSales(3, 8), []);
  const [selection, setSelection] = useState<ChartItem[]>([]);
  const picked = selection.map((s) => data[s.index]?.name).filter(Boolean);
  return (
    <ChartDemo hint={picked.length ? `Selected: ${picked.join(", ")} (Escape clears)` : "Click bars (Shift adds more), or use the arrows + Enter."}>
      <BarChart
        data={data}
        x="name"
        height={240}
        selectionMode="multiple"
        selection={selection}
        onSelectionChange={setSelection}
        series={[{ id: "sales", y: "sales", label: "Sales", format: usd, color: "var(--pui-chart-5)" }]}
        referenceLines={[{ y: 25_000, label: "Goal", tone: "warning" }]}
      />
    </ChartDemo>
  );
}

function Pyramid() {
  const [seed, randomize] = useSeed(5);
  const data = useMemo(() => populationPyramid(seed), [seed]);
  return (
    <ChartDemo onRandomize={randomize} hint="Back-to-back bars share the age axis; the tooltip and labels read magnitudes.">
      <BarChart
        data={data}
        x="age"
        mode="butterfly"
        height={340}
        valueLabels
        radius={5}
        barGap={0.18}
        series={[
          { id: "male", y: "male", label: "Male", format: pctFmt },
          { id: "female", y: "female", label: "Female", format: pctFmt, color: "var(--pui-chart-4)" },
        ]}
      />
    </ChartDemo>
  );
}

function Sorted() {
  const [seed, randomize] = useSeed(9);
  const data = useMemo(() => countries(seed), [seed]);
  const [dir, setDir] = useState<"desc" | "asc">("desc");
  return (
    <ChartDemo onRandomize={randomize} hint="Bars and labels slide to their new rank; arrow keys follow the visual order.">
      <div className="flex flex-col gap-2">
        <SegmentedControl aria-label="Sort order" size="sm" value={dir} onValueChange={(v) => setDir(v === "asc" ? "asc" : "desc")} className="self-start">
          <SegmentedControlItem value="desc">Largest first</SegmentedControlItem>
          <SegmentedControlItem value="asc">Smallest first</SegmentedControlItem>
        </SegmentedControl>
        <BarChart
          data={data}
          x="country"
          layout="horizontal"
          sort={dir}
          height={320}
          valueLabels
          radius={6}
          series={[
            { id: "users", y: "users", label: "Users", format: { notation: "compact" } },
            { id: "trial", y: (d) => Math.round(d.users * 0.18), label: "Trials", format: { notation: "compact" }, color: "var(--pui-chart-3)" },
          ]}
          mode="stacked"
        />
      </div>
    </ChartDemo>
  );
}

function Patterned() {
  const [seed, randomize] = useSeed(10);
  const data = useMemo(() => channels(seed, 6), [seed]);
  return (
    <ChartDemo onRandomize={randomize} hint="Pattern fills plus color: readable in grayscale and for colorblind readers.">
      <BarChart
        data={data}
        x="month"
        mode="stacked"
        patterns
        height={260}
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

const salesChildren = (d: SalesNode) => d.children;
const usdK = (v: number) => (v >= 1000 ? `$${(v / 1000).toFixed(1)}M` : `$${Math.round(v)}K`);

function Drill() {
  const [seed, randomize] = useSeed(2);
  const data = useMemo(() => regionSales(seed), [seed]);
  const [path, setPath] = useState<string[]>([]);
  return (
    <ChartDemo onRandomize={randomize} hint="Click a bar (or Enter) to open it: region, then country, then city. Escape, Backspace or the breadcrumb goes back.">
      <div className="flex w-full flex-col gap-2">
        <BarChart<SalesNode>
          data={data}
          x="name"
          series={[
            { id: "sales", y: "sales", label: "Sales", format: usdK },
            { id: "target", y: "target", label: "Target", format: usdK, color: "var(--pui-chart-8)" },
          ]}
          drill={{ children: salesChildren, rootLabel: "All regions", onDrillChange: setPath }}
          yAxis={{ format: usdK }}
          height={300}
          title="Sales vs target"
          description={path.length ? `Inside ${path[path.length - 1]}` : "By region"}
          className="w-full"
        />
        <p className="text-xs text-pui-muted-foreground">
          onDrillChange: <code className="font-mono">{JSON.stringify(path)}</code>
        </p>
      </div>
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
      .filter(([k, v]) => v !== (defaults as Record<string, unknown>)[k])
      .map(([k, v]) => (typeof v === "string" ? `  ${k}="${v}"` : v === true ? `  ${k}` : `  ${k}={${String(v)}}`));
    return [
      `<BarChart`,
      `  data={rows}`,
      `  x="name"`,
      ...flags,
      `  series={[`,
      `    { id: "sales", y: "sales", label: "This year" },`,
      `    { id: "lastYear", y: "lastYear", label: "Last year" },`,
      `  ]}`,
      `/>`,
    ].join("\n");
  },
  propsTable: propDocs<BarChartProps<unknown>>()([
    { name: "data", type: "readonly T[]", required: true, description: "One row per category." },
    { name: "x", type: "keyof T | (row, i) => string", required: true, description: "Category per row." },
    { name: "series", type: "BarChartSeries<T>[]", required: true, description: "{ id, y, label?, color?, format?, hidden? } per bar series." },
    { name: "mode", type: '"grouped" | "stacked" | "expand" | "diverging" | "butterfly"', default: '"grouped"', description: "Side by side, stacked, 100% stacks, positive/negative stacks from zero, or two series back to back (population pyramid)." },
    { name: "sort", type: '"none" | "asc" | "desc"', default: '"none"', description: "Order categories by their visible total; re-ranks animate as a slide." },
    { name: "patterns", type: "boolean", default: "false", description: "Pattern fills per series, as a redundant (non-color) encoding." },
    { name: "layout", type: '"vertical" | "horizontal"', default: '"vertical"', description: "Horizontal puts the categories on the left (ranked lists)." },
    { name: "radius", type: "number", default: "4", description: "Corner radius of the value end (outer segment only in stacks)." },
    { name: "valueLabels", type: "boolean", default: "false", description: "Values at the bar ends (stack totals for stacks)." },
    { name: "tooltip", type: '"axis" | "item" | "none"', default: '"axis"', description: "Whole category, the hovered bar only, or none." },
    { name: "barGap", type: "number", default: "0.28", description: "Gap between categories as a fraction of the band." },
    { name: "selectionMode", type: '"none" | "single" | "multiple"', default: '"single"', description: "Click / Enter selects bars; Shift adds in multiple mode." },
    { name: "selection", type: "ChartItem[]", description: "Controlled selection (with onSelectionChange)." },
    { name: "onItemClick", type: "(item, row, event) => void", description: "Called for a clicked or Enter-pressed bar." },
    { name: "referenceLines", type: "ReferenceLineProps[]", description: "Goals and thresholds." },
    { name: "drill", type: "{ children, label?, rootLabel?, onDrillChange? }", description: "Drill-down: click or Enter opens a category's children, Escape goes up, with a breadcrumb." },
  ]),
  keyboard: [
    { keys: "← / →", action: "Previous / next category" },
    { keys: "↑ / ↓", action: "Switch series within the category" },
    { keys: "Enter / Space", action: "Select the focused bar (Shift adds)" },
    { keys: "Escape", action: "Clear the selection" },
    { keys: "T", action: "Show or hide the data table" },
  ],
  a11y: [
    "Bars are explored like items: each focus announces the series, category and value.",
    "Selected bars get a ring as well as full opacity, so selection never relies on color alone.",
    "The generated summary and the data table describe every visible series.",
  ],
  reducedMotion: "Bars appear at full size; sorting, toggles and data changes apply instantly.",
  examples: [
    { title: "Ranked, horizontal", description: "Users by country with value labels.", Demo: Ranked },
    { title: "Stacked with totals", description: "Signups by channel.", Demo: Stacked },
    { title: "Multi-select", description: "Controlled selection with a goal line.", Demo: Selectable, wide: true },
    { title: "Population pyramid", description: 'mode="butterfly": two series back to back.', Demo: Pyramid },
    { title: "Animated sort", description: "Re-ranking slides bars and labels; legend toggles re-rank too.", Demo: Sorted },
    { title: "Pattern fills", description: "Stacked bars with patterns.", Demo: Patterned, wide: true },
    { title: "Drill-down", description: "drill={{ children }}: regions open into countries and cities, with a breadcrumb.", Demo: Drill, wide: true },
  ],
};

export default item;
