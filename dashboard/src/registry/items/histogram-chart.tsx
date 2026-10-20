import { HistogramChart, type HistogramChartProps, type HistogramSelection } from "changelui";
import { useMemo, useState } from "react";
import { ChartDemo } from "../../components/chart-demo";
import { orderValues, responseTimes, useSeed } from "../../lib/chart-data";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  thresholds: "fd" | "sturges" | "10" | "30";
  kde: boolean;
  showMean: boolean;
  showMedian: boolean;
  cumulative: boolean;
  brush: boolean;
  height: number;
};
const defaults: DemoProps = { thresholds: "fd", kde: true, showMean: true, showMedian: true, cumulative: false, brush: true, height: 260 };
const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "thresholds", label: "Bins", options: ["fd", "sturges", "10", "30"] },
  { type: "boolean", prop: "kde", label: "KDE curve" },
  { type: "boolean", prop: "showMean", label: "Mean" },
  { type: "boolean", prop: "showMedian", label: "Median" },
  { type: "boolean", prop: "cumulative", label: "Cumulative" },
  { type: "boolean", prop: "brush", label: "Brush select" },
  { type: "number", prop: "height", label: "Height", min: 160, max: 400, step: 20 },
];
const ms = { style: "unit", unit: "millisecond", unitDisplay: "narrow", maximumFractionDigits: 0 } as const;
const toThresholds = (t: DemoProps["thresholds"]) => (t === "fd" || t === "sturges" ? t : Number(t));

function Preview({ props }: { props: DemoProps }) {
  const [seed, randomize] = useSeed(3);
  const values = useMemo(() => responseTimes(seed), [seed]);
  return (
    <ChartDemo onRandomize={randomize} hint="Hover a bin; drag to select a range; Ctrl/Cmd + wheel or +/- changes the bin count and the bars morph.">
      <HistogramChart
        key={props.thresholds}
        values={values}
        thresholds={toThresholds(props.thresholds)}
        kde={props.kde}
        showMean={props.showMean}
        showMedian={props.showMedian}
        cumulative={props.cumulative}
        brush={props.brush}
        height={props.height}
        label="Response time"
        format={ms}
        title="API response time"
        description="900 requests, last hour"
        className="w-full"
      />
    </ChartDemo>
  );
}

function Mini() {
  const values = useMemo(() => responseTimes(5, 400), []);
  return <HistogramChart values={values} thresholds={18} height={110} showMedian={false} binWheel={false} brush={false} initialWidth={220} animation="never" className="w-56 [&_text]:hidden" />;
}

function Compare() {
  const [seed, randomize] = useSeed(8);
  const before = useMemo(() => responseTimes(seed, 800, 140), [seed]);
  const after = useMemo(() => responseTimes(seed + 50, 800, 105), [seed]);
  return (
    <ChartDemo onRandomize={randomize} hint="compare overlays a second distribution on the same bins. Toggle either in the legend.">
      <HistogramChart values={after} compare={before} label="After deploy" compareLabel="Before deploy" format={ms} kde={false} title="Did the cache help?" className="w-full" />
    </ChartDemo>
  );
}

function Selection() {
  const [seed, randomize] = useSeed(11);
  const values = useMemo(() => orderValues(seed), [seed]);
  const [sel, setSel] = useState<HistogramSelection | null>(null);
  const usd = { style: "currency", currency: "USD", maximumFractionDigits: 0 } as const;
  return (
    <ChartDemo onRandomize={randomize} hint="Two humps: small baskets and bulk orders. Drag across a hump to size it.">
      <HistogramChart values={values} format={usd} label="Order value" kde cumulative onSelectionChange={setSel} tableToggle className="w-full" />
      <p className="text-sm" aria-live="polite">
        {sel ? (
          <>
            <strong>{sel.count.toLocaleString("en-US")}</strong> orders ({Math.round(sel.share * 100)}%) between ${Math.round(sel.range[0])} and ${Math.round(sel.range[1])}
          </>
        ) : (
          "Drag across the chart (or press Enter on a bin) to select a range."
        )}
      </p>
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
      "<HistogramChart",
      "  values={latencies} // number[]",
      p.thresholds !== "fd" ? `  thresholds={${p.thresholds === "sturges" ? '"sturges"' : p.thresholds}}` : null,
      p.kde ? "  kde" : null,
      p.showMean ? "  showMean" : null,
      p.showMedian ? null : "  showMedian={false}",
      p.cumulative ? "  cumulative" : null,
      p.brush ? "  onSelectionChange={(s) => setRange(s?.range ?? null)}" : "  brush={false}",
      p.height !== 260 ? `  height={${p.height}}` : null,
      '  format={{ style: "unit", unit: "millisecond" }}',
      '  title="API response time"',
      "/>",
    ]
      .filter(Boolean)
      .join("\n"),
  propsTable: propDocs<HistogramChartProps>()([
    { name: "values", type: "readonly number[]", required: true, description: "Raw values; non-finite values are ignored." },
    { name: "thresholds", type: '"fd" | "sturges" | number | number[]', default: '"fd"', description: "Bin rule, a target count (round edges) or explicit edges." },
    { name: "compare", type: "readonly number[]", description: "Second distribution drawn as an outline on the same bins." },
    { name: "kde", type: "boolean", default: "false", description: "Kernel density curve scaled to the counts." },
    { name: "showMean", type: "boolean", default: "false", description: "Mean marker." },
    { name: "showMedian", type: "boolean", default: "true", description: "Median marker (and the comparison median)." },
    { name: "cumulative", type: "boolean", default: "false", description: "Cumulative share line on a right 0-100% axis." },
    { name: "brush", type: "boolean", default: "true", description: "Drag to select a range snapped to bin edges." },
    { name: "binWheel", type: "boolean", default: "true", description: "Ctrl/Cmd + wheel, +/- keys and buttons change the bin count." },
    { name: "onSelectionChange", type: "(selection | null) => void", description: "{ range, count, share } of the brushed range." },
    { name: "onBinClick", type: "(bin, event) => void", description: "Click or Enter on a bin." },
    { name: "format", type: "Intl.NumberFormatOptions | (v) => string", description: "Value format for the axis and tooltip." },
    { name: "height", type: "number", default: "260", description: "Plot height in px." },
  ]),
  keyboard: [
    { keys: "Tab", action: "Focus the plot" },
    { keys: "← / →", action: "Previous / next bin (announced with share and cumulative %)" },
    { keys: "Home / End, Page Up / Down", action: "First / last bin, jump 10%" },
    { keys: "Enter / Shift + Enter", action: "Select the bin / extend the selection" },
    { keys: "+ / −", action: "More / fewer bins" },
    { keys: "Escape", action: "Clear the selection, then the focus" },
    { keys: "T", action: "Show or hide the data table" },
  ],
  a11y: [
    "The summary states count, range, mean, median, skew and the most common range.",
    'One tab stop (role="application") with a debounced live region; selections are announced with their count and share.',
    "An sr-only table lists every bin; tableToggle adds a visible Show data button.",
  ],
  reducedMotion: "Bars, curves and markers render in place; bin changes and updates are instant.",
  examples: [
    { title: "Before and after", description: "Overlay comparison with legend toggles.", Demo: Compare, wide: true },
    { title: "Brush a range", description: "onSelectionChange with a bimodal distribution, KDE and cumulative share.", Demo: Selection, wide: true },
  ],
};
export default item;
