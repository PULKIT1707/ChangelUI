import { DiffChart, type Curve, type DiffChartProps } from "changelui";
import { useMemo } from "react";
import { ChartDemo } from "../../components/chart-demo";
import { bookingsVsTarget, dailyOrders, temperatures, useSeed } from "../../lib/chart-data";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";
type DemoProps = {
  baseline: "target" | "forecast";
  curve: Curve;
  positiveTone: "success" | "primary" | "info";
  negativeTone: "danger" | "warning";
  fillOpacity: number;
  patterns: boolean;
  strip: boolean;
  legend: "top" | "bottom" | "none";
  height: number;
};
const defaults: DemoProps = { baseline: "target", curve: "monotone", positiveTone: "success", negativeTone: "danger", fillOpacity: 0.26, patterns: false, strip: true, legend: "bottom", height: 320 };
const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "baseline", label: "Baseline", options: ["target", "forecast"] },
  { type: "select", prop: "curve", label: "Curve", options: ["monotone", "linear", "step", "natural"] },
  { type: "select", prop: "positiveTone", label: "Above tone", options: ["success", "primary", "info"] },
  { type: "select", prop: "negativeTone", label: "Below tone", options: ["danger", "warning"] },
  { type: "number", prop: "fillOpacity", label: "Fill opacity", min: 0.1, max: 0.6, step: 0.02 },
  { type: "boolean", prop: "patterns", label: "Patterns (CVD)" },
  { type: "boolean", prop: "strip", label: "Summary chips" },
  { type: "select", prop: "legend", label: "Legend", options: ["top", "bottom", "none"] },
  { type: "number", prop: "height", label: "Height (px)", min: 200, max: 480, step: 20 },
];
const usd: Intl.NumberFormatOptions = { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 };
function Preview({ props }: { props: DemoProps }) {
  const [seed, randomize] = useSeed(4);
  const rows = useMemo(() => bookingsVsTarget(seed), [seed]);
  const { baseline, ...rest } = props;
  return (
    <ChartDemo onRandomize={randomize} hint="Hover for the gap at each month; hover the Above / Below chips to spotlight a side.">
      <DiffChart
        {...rest}
        title="Bookings vs plan"
        description="FY2026, monthly"
        data={rows}
        x="month"
        a="actual"
        b={baseline}
        labels={{ a: "Bookings", b: baseline === "target" ? "Target" : "Forecast" }}
        format={usd}
        sideLabels={{ above: "Ahead", below: "Behind" }}
      />
    </ChartDemo>
  );
}
function Mini() {
  const rows = useMemo(() => bookingsVsTarget(2), []);
  return <DiffChart data={rows} x="month" a="actual" b="target" height={150} initialWidth={260} strip={false} legend="none" interactive={false} animation="never" yAxis={{ hide: true }} xAxis={{ hide: true }} />;
}
function WeekOverWeek() {
  const [seed, randomize] = useSeed(9);
  const rows = useMemo(() => dailyOrders(seed), [seed]);
  return (
    <ChartDemo onRandomize={randomize} hint={'compare="previous-period" with period={7}: each day against the same weekday last week.'}>
      <DiffChart
        data={rows}
        x="date"
        a="orders"
        compare="previous-period"
        period={7}
        labels={{ a: "Orders", b: "Same day last week" }}
        curve="linear"
        markers={false}
        sideLabels={{ above: "Up WoW", below: "Down WoW" }}
        height={260}
        className="w-full"
      />
    </ChartDemo>
  );
}
function Climate() {
  const [seed, randomize] = useSeed(2);
  // The seasonal normal is the smooth curve the generator's weather wanders around.
  const rows = useMemo(
    () =>
      temperatures(seed, 365)
        .map((r, i) => ({ date: r.date, mean: r.avg, normal: Math.round((11 - 10 * Math.cos(((i - 15) / 365) * Math.PI * 2)) * 10) / 10 }))
        .filter((_, i) => i % 3 === 0),
    [seed],
  );
  return (
    <ChartDemo onRandomize={randomize} hint="Warm vs cold against the long-term normal, with redundant patterns for color-vision deficiency.">
      <DiffChart
        data={rows}
        x="date"
        a="mean"
        b="normal"
        labels={{ a: "Daily mean", b: "Normal" }}
        positiveTone="danger"
        negativeTone="info"
        sideLabels={{ above: "Warmer", below: "Colder" }}
        patterns
        fillOpacity={0.34}
        markers={false}
        format={{ maximumFractionDigits: 1 }}
        height={260}
        className="w-full"
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
      "<DiffChart",
      "  data={rows}",
      '  x="month"',
      '  a="actual"',
      `  b="${p.baseline}"`,
      `  labels={{ a: "Bookings", b: "${p.baseline === "target" ? "Target" : "Forecast"}" }}`,
      p.curve !== "monotone" ? `  curve="${p.curve}"` : null,
      p.positiveTone !== "success" ? `  positiveTone="${p.positiveTone}"` : null,
      p.negativeTone !== "danger" ? `  negativeTone="${p.negativeTone}"` : null,
      p.fillOpacity !== 0.26 ? `  fillOpacity={${p.fillOpacity}}` : null,
      p.patterns ? "  patterns" : null,
      p.strip ? null : "  strip={false}",
      p.legend !== "bottom" ? `  legend="${p.legend}"` : null,
      "/>",
    ]
      .filter(Boolean)
      .join("\n"),
  propsTable: propDocs<DiffChartProps<unknown>>()([
    { name: "data", type: "T[]", required: true, description: "Rows, one per x." },
    { name: "x", type: "Accessor<T, XValue>", required: true, description: "Column or function: dates, numbers or categories." },
    { name: "a", type: "Accessor<T, number>", required: true, description: "The actual values." },
    { name: "b", type: "Accessor<T, number>", description: 'The baseline (target, forecast, another series) for compare="series".' },
    { name: "compare", type: '"series" | "previous-period"', default: '"series"', description: "Compare with b, or with a itself `period` points earlier." },
    { name: "period", type: "number", default: "1", description: "Points per period (7 = week over week on daily data)." },
    { name: "labels", type: "{ a?: string; b?: string }", description: "Names for the legend, tooltip, chips and summary." },
    { name: "positiveTone", type: "ChartTone", default: '"success"', description: "Fill where a is above b." },
    { name: "negativeTone", type: "ChartTone", default: '"danger"', description: "Fill where a is below b." },
    { name: "sideLabels", type: "{ above?: string; below?: string }", default: '"Above" / "Below"', description: "Chip labels." },
    { name: "curve", type: "Curve", default: '"monotone"', description: "Both lines and the fill share it, so crossings stay exact." },
    { name: "patterns", type: "boolean", default: "false", description: "Hatched and dotted fills so the sides never rely on color alone." },
    { name: "strip", type: "boolean", default: "true", description: "Above / below counts, net gap and crossings over the plot." },
    { name: "fillOpacity", type: "number", default: "0.26", description: "Fill strength." },
  ]),
  keyboard: [
    { keys: "Tab", action: "Focus the plot, then the side chips" },
    { keys: "\u2190 / \u2192", action: "Previous / next point (announces both values and the gap)" },
    { keys: "Home / End", action: "First / last point" },
    { keys: "T", action: "Toggle the data table" },
  ],
  a11y: [
    'Each point is announced with the gap in words, e.g. "4% above Target".',
    "The summary counts the points above and below, the net gap and the crossings.",
    "patterns adds hatch and dot fills, so the two sides differ beyond color.",
  ],
  reducedMotion: "The fill and lines jump to new data; the gap bracket moves without gliding.",
  examples: [
    { title: "Week over week", description: "Each day against the same weekday a week earlier.", Demo: WeekOverWeek, wide: true },
    { title: "Warmer or colder than normal", description: "Swapped tones and CVD patterns.", Demo: Climate, wide: true },
  ],
};
export default item;
