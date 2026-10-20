import { WhatIfChart, type WhatIfChartProps, type WhatIfTotals } from "changelui";
import { useMemo, useState } from "react";
import { ChartDemo } from "../../components/chart-demo";
import { headcountPlan, quarterlyPlan, useSeed } from "../../lib/chart-data";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  bandPct: number;
  showTarget: boolean;
  totals: boolean;
  height: number;
  forecastLabel: string;
};
const defaults: DemoProps = { bandPct: 0.06, showTarget: true, totals: true, height: 320, forecastLabel: "Forecast" };
const controls: ControlSpec<DemoProps>[] = [
  { type: "number", prop: "bandPct", label: "Band width (per step)", min: 0, max: 0.2, step: 0.01 },
  { type: "boolean", prop: "showTarget", label: "Target line" },
  { type: "boolean", prop: "totals", label: "Totals strip" },
  { type: "number", prop: "height", label: "Height (px)", min: 220, max: 420, step: 20 },
  { type: "text", prop: "forecastLabel", label: "Forecast label", maxLength: 24 },
];
const usd: Intl.NumberFormatOptions = { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 2 };

function Preview({ props }: { props: DemoProps }) {
  const [seed, randomize] = useSeed(2);
  const data = useMemo(() => quarterlyPlan(seed), [seed]);
  const target = useMemo(() => Math.round((Math.max(...data.map((d) => d.revenue)) * 1.08) / 1e5) * 1e5, [data]);
  return (
    <ChartDemo onRandomize={randomize} hint="Drag a forecast point (Shift-drag scales every later quarter), or Tab to a point and use the arrow keys.">
      <WhatIfChart
        title="Revenue plan"
        description="What if Q3 grows 20%?"
        data={data}
        x="quarter"
        y="revenue"
        editableFrom={8}
        format={usd}
        step={10_000}
        bandPct={props.bandPct}
        target={props.showTarget ? target : undefined}
        totals={props.totals}
        height={props.height}
        forecastLabel={props.forecastLabel}
        className="w-full"
      />
    </ChartDemo>
  );
}

function Mini() {
  const data = useMemo(() => quarterlyPlan(5), []);
  return (
    <div className="pointer-events-none w-56">
      <WhatIfChart data={data} x="quarter" y="revenue" editableFrom={8} totals={false} height={130} initialWidth={224} animation="never" format={{ notation: "compact" }} />
    </div>
  );
}

function Headcount() {
  const [seed, randomize] = useSeed(3);
  const data = useMemo(() => headcountPlan(seed), [seed]);
  const [totals, setTotals] = useState<WhatIfTotals | null>(null);
  const cost = totals ? totals.total * 11_500 : 0;
  return (
    <ChartDemo onRandomize={randomize} hint="A hiring plan: onTotalsChange feeds the cost line below.">
      <WhatIfChart
        data={data}
        x="month"
        y="people"
        editableFrom={6}
        min={0}
        max={120}
        step={1}
        band={(v, k) => [v - (k + 1), v + (k + 1) * 0.5]}
        format={{ maximumFractionDigits: 0 }}
        totalLabel="Person-months"
        forecastLabel="Plan"
        onTotalsChange={setTotals}
        height={260}
        color="var(--pui-chart-5)"
        forecastColor="var(--pui-chart-7)"
      />
      <p className="text-sm tabular-nums">
        Payroll for the planned months: <strong>{cost.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}</strong>
      </p>
    </ChartDemo>
  );
}

function Controlled() {
  const data = useMemo(() => quarterlyPlan(9), []);
  const original = useMemo(() => data.slice(8).map((d) => d.revenue), [data]);
  const [value, setValue] = useState<number[]>(original);
  const scenarios: Array<[string, number]> = [
    ["Bear -15%", 0.85],
    ["Plan", 1],
    ["Bull +20%", 1.2],
  ];
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Scenario">
        {scenarios.map(([name, k]) => (
          <button
            key={name}
            type="button"
            onClick={() => setValue(original.map((v) => Math.round((v * k) / 1e4) * 1e4))}
            className="rounded-pui-full border border-pui-border px-3 py-1 text-xs font-medium hover:bg-pui-muted"
          >
            {name}
          </button>
        ))}
      </div>
      <WhatIfChart data={data} x="quarter" y="revenue" editableFrom={8} value={value} onValueChange={setValue} format={usd} step={10_000} height={240} totals={false} />
    </div>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: ({ bandPct, showTarget, totals, height, forecastLabel }) =>
    [
      `<WhatIfChart`,
      `  data={quarters}`,
      `  x="quarter"`,
      `  y="revenue"`,
      `  editableFrom={8}`,
      `  step={10_000}`,
      `  format={{ style: "currency", currency: "USD", notation: "compact" }}`,
      ...(bandPct !== 0.06 ? [`  bandPct={${bandPct}}`] : []),
      ...(showTarget ? [`  target={2_400_000}`] : []),
      ...(!totals ? [`  totals={false}`] : []),
      ...(height !== 320 ? [`  height={${height}}`] : []),
      ...(forecastLabel !== "Forecast" ? [`  forecastLabel=${JSON.stringify(forecastLabel)}`] : []),
      `  onTotalsChange={(t) => setPlanTotal(t.total)}`,
      `/>`,
    ].join("\n"),
  propsTable: propDocs<WhatIfChartProps<unknown>>()([
    { name: "data", type: "readonly T[]", required: true, description: "Actuals followed by the original forecast." },
    { name: "x", type: "keyof T | (row, i) => string | number", required: true, description: "Point label." },
    { name: "y", type: "keyof T | (row, i) => number", required: true, description: "Value (actual or planned)." },
    { name: "editableFrom", type: "number", default: "half of the data", description: "Index of the first draggable forecast point." },
    { name: "min", type: "number", default: "0", description: "Lower drag bound (and axis minimum)." },
    { name: "max", type: "number", default: "1.8 x data max", description: "Upper drag bound; the axis never moves while dragging." },
    { name: "step", type: "number", default: "1/100 of the axis", description: "Snap and keyboard step." },
    { name: "value", type: "readonly number[]", description: "Controlled forecast (one per editable point), with onValueChange." },
    { name: "defaultValue", type: "readonly number[]", description: "Initial edits when uncontrolled." },
    { name: "bandPct", type: "number", default: "0.06", description: "Band half-width per step ahead, widening with sqrt(k + 1)." },
    { name: "band", type: "(value, k) => [lo, hi]", description: "Custom confidence band; overrides bandPct." },
    { name: "target", type: "number", description: "Dashed goal line." },
    { name: "totals", type: "boolean", default: "true", description: "Totals strip: total, delta vs plan, end-vs-start growth." },
    { name: "onTotalsChange", type: "(totals) => void", description: "Derived totals on every change." },
    { name: "forecastColor", type: "string", default: "var(--pui-chart-2)", description: "Forecast line, band and handles." },
    { name: "height", type: "number", default: "320", description: "Plot height in px." },
  ]),
  keyboard: [
    { keys: "Tab", action: "Focus the first forecast point (one tab stop), then Reset" },
    { keys: "↑ / ↓", action: "Change the value by one step (Shift: 10 steps; Alt: also scale the later points)" },
    { keys: "← / →", action: "Previous / next forecast point" },
    { keys: "Home / End", action: "Minimum / maximum" },
    { keys: "Escape", action: "Cancel a drag in progress" },
  ],
  a11y: [
    'Every forecast point is a role="slider" whose value text names the point ("Q3 26 forecast: $1.2M").',
    "Changes announce the new value with the updated total and the delta against plan.",
    "A screen-reader table lists actuals, the edited forecast and the original plan.",
  ],
  reducedMotion: "No grab scale, rolling totals or path tweens: values update instantly.",
  examples: [
    { title: "Hiring plan", description: "Custom band, integer steps and onTotalsChange driving outside UI.", Demo: Headcount, wide: true },
    { title: "Controlled scenarios", description: "value / onValueChange with preset scenarios.", Demo: Controlled },
  ],
};
export default item;
