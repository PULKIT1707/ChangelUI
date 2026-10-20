import { Button, MorphChart, SegmentedControl, SegmentedControlItem, type MorphChartProps, type MorphType } from "changelui";
import { useEffect, useMemo, useState } from "react";
import { ChartDemo } from "../../components/chart-demo";
import { budget, planRevenue, productSales, trafficSources, useSeed } from "../../lib/chart-data";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

const TYPES = ["bar", "line", "area", "pie", "donut", "treemap", "waffle"] as const;
type DemoProps = {
  type: MorphType;
  dataset: "product sales" | "traffic sources" | "plan revenue";
  items: number;
  switcher: boolean;
  legend: boolean;
  resolution: number;
  height: number;
};
const defaults: DemoProps = { type: "bar", dataset: "product sales", items: 6, switcher: true, legend: true, resolution: 48, height: 300 };
const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "type", label: "Form", options: TYPES },
  { type: "select", prop: "dataset", label: "Dataset", options: ["product sales", "traffic sources", "plan revenue"] },
  { type: "number", prop: "items", label: "Items", min: 3, max: 8, step: 1 },
  { type: "boolean", prop: "switcher", label: "Built-in switcher" },
  { type: "boolean", prop: "legend", label: "Legend" },
  { type: "number", prop: "resolution", label: "Polygon points", min: 16, max: 96, step: 8 },
  { type: "number", prop: "height", label: "Height (px)", min: 200, max: 420, step: 20 },
];
const usd: Intl.NumberFormatOptions = { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 };
const visits: Intl.NumberFormatOptions = { notation: "compact", maximumFractionDigits: 1 };

function useDataset(dataset: DemoProps["dataset"], seed: number, items: number) {
  return useMemo(() => {
    if (dataset === "traffic sources") return trafficSources(seed, items).map((r) => ({ name: r.name, value: r.value }));
    if (dataset === "plan revenue") return planRevenue(seed).slice(0, items).map((r) => ({ name: r.name, value: r.value }));
    return productSales(seed, items).map((r) => ({ name: r.name, value: r.sales }));
  }, [dataset, seed, items]);
}

/** Follows the control panel's form, but lets the built-in switcher change it too. */
function useFollowed<T>(value: T): [T, (v: T) => void] {
  const [state, setState] = useState(value);
  const [seen, setSeen] = useState(value);
  if (seen !== value) {
    setSeen(value);
    setState(value);
  }
  return [state, setState];
}

function Preview({ props }: { props: DemoProps }) {
  const [seed, randomize] = useSeed(3);
  const data = useDataset(props.dataset, seed, props.items);
  const [type, setType] = useFollowed<MorphType>(props.type);
  return (
    <ChartDemo onRandomize={randomize} hint="Switch forms (or press [ and ] on the chart): every mark morphs into its next shape.">
      <MorphChart
        title={props.dataset === "traffic sources" ? "Sessions by source" : props.dataset === "plan revenue" ? "ARR by plan" : "Sales by product"}
        description="Same data, seven forms"
        data={data}
        label="name"
        value="value"
        type={type}
        onTypeChange={setType}
        format={props.dataset === "traffic sources" ? visits : usd}
        switcher={props.switcher}
        legend={props.legend}
        resolution={props.resolution}
        height={props.height}
        className="w-full"
      />
    </ChartDemo>
  );
}

function Mini() {
  const data = useMemo(() => productSales(4, 5).map((r) => ({ name: r.name, value: r.sales })), []);
  const [type, setType] = useState<MorphType>("bar");
  useEffect(() => {
    const id = setInterval(() => setType((t) => TYPES[(TYPES.indexOf(t) + 1) % TYPES.length] as MorphType), 1800);
    return () => clearInterval(id);
  }, []);
  return <MorphChart data={data} label="name" value="value" type={type} switcher={false} legend={false} height={120} initialWidth={200} className="w-48" />;
}

function Tour() {
  const data = useMemo(() => trafficSources(5, 6), []);
  const [type, setType] = useState<MorphType>("bar");
  const [touring, setTouring] = useState(false);
  useEffect(() => {
    if (!touring) return;
    const id = setInterval(() => setType((t) => TYPES[(TYPES.indexOf(t) + 1) % TYPES.length] as MorphType), 1700);
    return () => clearInterval(id);
  }, [touring]);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-pui-muted-foreground">A guided tour through every form.</p>
        <Button size="sm" variant="outline" tone="neutral" onClick={() => setTouring((v) => !v)} aria-pressed={touring}>
          {touring ? "Stop tour" : "Play tour"}
        </Button>
      </div>
      <MorphChart data={data} label="name" value="value" format={visits} type={type} onTypeChange={setType} switcher={false} height={240} />
    </div>
  );
}

function BudgetParts() {
  const [seed, randomize] = useSeed(2);
  const data = useMemo(() => budget(seed).slice(0, 6), [seed]);
  return (
    <ChartDemo onRandomize={randomize} hint="Part-to-whole only: waffle, pie and treemap.">
      <MorphChart
        data={data}
        label="name"
        value="spent"
        format={{ style: "currency", currency: "USD", maximumFractionDigits: 0 }}
        defaultType="waffle"
        types={["waffle", "pie", "donut", "treemap"]}
        height={240}
      />
    </ChartDemo>
  );
}

function External() {
  const data = useMemo(() => planRevenue(4), []);
  const [type, setType] = useState<MorphType>("donut");
  return (
    <div className="flex flex-col gap-3">
      <SegmentedControl aria-label="Chart form" size="sm" value={type} onValueChange={(v) => setType(v as MorphType)}>
        {(["donut", "bar", "treemap", "line"] as const).map((t) => (
          <SegmentedControlItem key={t} value={t}>
            {t[0]?.toUpperCase()}
            {t.slice(1)}
          </SegmentedControlItem>
        ))}
      </SegmentedControl>
      <MorphChart data={data} label="name" value="value" format={usd} type={type} onTypeChange={setType} switcher={false} legend={false} height={220} />
    </div>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: ({ type, dataset: _dataset, items: _items, ...props }) => {
    const lib: Record<string, unknown> = { switcher: true, legend: true, resolution: 48, height: 300 };
    const lines = Object.entries(props)
      .filter(([k, v]) => v !== lib[k])
      .map(([k, v]) => `  ${k}={${String(v)}}`);
    return [
      `const [type, setType] = useState<MorphType>("${type}");`,
      ``,
      `<MorphChart`,
      `  data={sales}`,
      `  label="name"`,
      `  value="value"`,
      `  type={type}`,
      `  onTypeChange={setType}`,
      `  format={{ style: "currency", currency: "USD", notation: "compact" }}`,
      ...lines,
      `/>`,
    ].join("\n");
  },
  propsTable: propDocs<MorphChartProps<unknown>>()([
    { name: "data", type: "readonly T[]", required: true, description: "Rows, one mark each." },
    { name: "label", type: "keyof T | (row, i) => string", required: true, description: "Mark name (axis, legend, tooltip)." },
    { name: "value", type: "keyof T | (row, i) => number", required: true, description: "Mark value; negative values count as 0." },
    { name: "color", type: "keyof T | (row, i) => string", description: "Per-mark color. Default: the chart palette." },
    { name: "type", type: '"bar" | "line" | "area" | "pie" | "donut" | "treemap" | "waffle"', description: "Controlled form (with onTypeChange)." },
    { name: "defaultType", type: "MorphType", default: '"bar"', description: "Initial form when uncontrolled." },
    { name: "types", type: "readonly MorphType[]", default: "all seven", description: "Forms offered by the switcher and the [ / ] keys." },
    { name: "switcher", type: "boolean", default: "true", description: "Built-in segmented switcher with a gliding pill." },
    { name: "seriesColor", type: "string", default: "var(--pui-chart-1)", description: "Single color used by the line and area forms." },
    { name: "resolution", type: "number", default: "48", description: "Points per polygon: higher is smoother arcs, more work per frame." },
    { name: "legend", type: "boolean", default: "true", description: "Legend with shares under the plot." },
    { name: "height", type: "number", default: "300", description: "Plot height in px." },
    { name: "format", type: "Intl.NumberFormatOptions | (v) => string", description: "Value format (axis ticks use the compact form)." },
    { name: "onActiveChange", type: "(item | null) => void", description: "Hovered or focused mark." },
  ]),
  keyboard: [
    { keys: "Tab", action: "Focus the switcher, then the chart" },
    { keys: "← / → / ↑ / ↓", action: "Previous / next mark (announced with value, share and rank)" },
    { keys: "[ / ]", action: "Previous / next form" },
    { keys: "Home / End", action: "First / last mark" },
    { keys: "Escape", action: "Clear the focused mark" },
  ],
  a11y: [
    'A figure (aria-roledescription="chart") described by a generated summary; the form is part of the name.',
    'The switcher is a radiogroup with roving arrow-key focus; the form change is announced ("Now showing as pie chart").',
    "A screen-reader table lists every item with its value and share in every form.",
  ],
  reducedMotion: "No morph: the new form appears with a 150ms crossfade.",
  examples: [
    { title: "Guided tour", description: "Cycle through every form with an outside timer.", Demo: Tour },
    { title: "Part-to-whole only", description: "types limits the forms; the waffle tiles morph into wedges.", Demo: BudgetParts },
    { title: "Your own switcher", description: "switcher={false} with a SegmentedControl driving type.", Demo: External },
  ],
};
export default item;
