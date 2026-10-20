import { WaterfallChart, type WaterfallChartProps } from "changelui";
import { useMemo, useState } from "react";
import { ChartDemo } from "../../components/chart-demo";
import { arrBridge, profitBridge, useSeed } from "../../lib/chart-data";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  connectors: boolean;
  valueLabels: boolean;
  orientation: "vertical" | "horizontal";
  height: number;
};
const defaults: DemoProps = { connectors: true, valueLabels: true, orientation: "vertical", height: 300 };
const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "orientation", label: "Orientation", options: ["vertical", "horizontal"] },
  { type: "boolean", prop: "connectors", label: "Connectors" },
  { type: "boolean", prop: "valueLabels", label: "Value labels" },
  { type: "number", prop: "height", label: "Height", min: 200, max: 420, step: 20 },
];
const usd = { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 } as const;

function Preview({ props }: { props: DemoProps }) {
  const [seed, randomize] = useSeed(1);
  const data = useMemo(() => profitBridge(seed), [seed]);
  return (
    <ChartDemo onRandomize={randomize} hint="Each bar grows out of where the last one ended. Hover for the running total; click or Enter selects.">
      <WaterfallChart
        data={data}
        label="step"
        value="amount"
        isTotal="total"
        connectors={props.connectors}
        valueLabels={props.valueLabels}
        orientation={props.orientation}
        height={props.orientation === "horizontal" ? undefined : props.height}
        format={usd}
        title="Q3 profit bridge"
        description="From revenue to net profit"
        className="w-full"
      />
    </ChartDemo>
  );
}

function Horizontal() {
  const [seed, randomize] = useSeed(7);
  const data = useMemo(() => arrBridge(seed), [seed]);
  return (
    <ChartDemo onRandomize={randomize} hint="Steps read top to bottom; long labels get room on the left. Up and down arrows move between bars.">
      <WaterfallChart
        data={data}
        label="step"
        value="amount"
        isTotal="total"
        orientation="horizontal"
        format={usd}
        title="ARR walk"
        description="Starting ARR to ending ARR"
        className="w-full"
      />
    </ChartDemo>
  );
}

function Mini() {
  const data = useMemo(() => arrBridge(2), []);
  return <WaterfallChart data={data} label="step" value="amount" isTotal="total" height={120} valueLabels={false} initialWidth={220} animation="never" className="w-56 [&_text]:hidden [&_figure>div:first-child]:hidden" />;
}

function Arr() {
  const [seed, randomize] = useSeed(4);
  const data = useMemo(() => arrBridge(seed), [seed]);
  const [picked, setPicked] = useState<string | null>(null);
  return (
    <ChartDemo onRandomize={randomize} hint="ARR movements with a controlled selection.">
      <div className="flex w-full flex-col gap-2">
        <WaterfallChart
          data={data}
          label="step"
          value="amount"
          isTotal="total"
          format={usd}
          colors={{ total: "var(--pui-chart-4)" }}
          onSelectedChange={(_, bar) => setPicked(bar ? `${bar.label}: ${bar.kind === "total" ? "" : bar.value > 0 ? "+" : ""}${Math.round(bar.value).toLocaleString("en-US")}` : null)}
          height={260}
          className="w-full"
        />
        <p className="text-sm" aria-live="polite">
          {picked ?? "Click a bar to select it."}
        </p>
      </div>
    </ChartDemo>
  );
}

function Budget() {
  const data = useMemo(
    () => [
      { item: "Budget", hours: 480 },
      { item: "Scope add", hours: 64 },
      { item: "Design", hours: -12 },
      { item: "Bugs", hours: 38 },
      { item: "Reuse", hours: -40 },
      { item: "Forecast", hours: 0, total: true },
    ],
    [],
  );
  return <WaterfallChart data={data} label="item" value="hours" isTotal="total" format={{ maximumFractionDigits: 0 }} colors={{ increase: "var(--pui-chart-down)", decrease: "var(--pui-chart-up)" }} height={240} title="Project hours" description="Increases are bad here, so the colors are swapped" tableToggle className="w-full" />;
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (p) =>
    [
      "<WaterfallChart",
      "  data={bridge} // [{ step, amount, total? }]",
      '  label="step"',
      '  value="amount"',
      '  isTotal="total"',
      p.connectors ? null : "  connectors={false}",
      p.valueLabels ? null : "  valueLabels={false}",
      p.orientation === "horizontal" ? '  orientation="horizontal"' : null,
      p.height !== 300 && p.orientation !== "horizontal" ? `  height={${p.height}}` : null,
      '  format={{ style: "currency", currency: "USD", notation: "compact" }}',
      "/>",
    ]
      .filter(Boolean)
      .join("\n"),
  propsTable: propDocs<WaterfallChartProps<unknown>>()([
    { name: "data", type: "readonly T[]", required: true, description: "Steps in order." },
    { name: "label", type: "keyof T | (row, i) => string", required: true, description: "Bar label." },
    { name: "value", type: "keyof T | (row, i) => number", required: true, description: "The change (ignored for totals)." },
    { name: "orientation", type: '"vertical" | "horizontal"', default: '"vertical"', description: "Horizontal lists steps top to bottom (height defaults to 34 px per step)." },
    { name: "isTotal", type: "keyof T | (row, i) => boolean", description: "Marks totals and subtotals, drawn from zero to the running total." },
    { name: "startAsTotal", type: "boolean", default: "true", description: "Style the first bar as the starting total." },
    { name: "connectors", type: "boolean", default: "true", description: "Dashed connectors between bars." },
    { name: "valueLabels", type: "boolean", default: "true", description: "Signed values on the bars." },
    { name: "colors", type: "{ increase?, decrease?, total? }", description: "Override the up / down / total colors." },
    { name: "selected", type: "number | null", description: "Controlled selected bar (with onSelectedChange)." },
    { name: "onSelectedChange", type: "(index | null, bar | null) => void", description: "Click or Enter toggles the selection." },
  ]),
  keyboard: [
    { keys: "Tab", action: "Focus the chart" },
    { keys: "← / →", action: "Previous / next bar, announced with the running total" },
    { keys: "Home / End", action: "First / last bar" },
    { keys: "Enter / Space", action: "Select or deselect the bar" },
    { keys: "Escape", action: "Clear the selection, then the focus" },
    { keys: "T", action: "Show or hide the data table" },
  ],
  a11y: [
    "The summary states start, end, net change and the biggest increase and decrease.",
    "Increase, decrease and total are labelled in the legend and the signed value labels, not by color alone.",
    "An sr-only table lists each change and the running total.",
  ],
  reducedMotion: "No cascade: bars render at their final spans; updates are instant.",
  examples: [
    { title: "ARR bridge", description: "Custom total color and a selection callback.", Demo: Arr, wide: true },
    { title: "Horizontal", description: 'orientation="horizontal": a top-to-bottom walk with labels on the left.', Demo: Horizontal, wide: true },
    { title: "Swapped semantics", description: "Where up is bad: colors swapped, with a data table toggle.", Demo: Budget, wide: true },
  ],
};
export default item;
