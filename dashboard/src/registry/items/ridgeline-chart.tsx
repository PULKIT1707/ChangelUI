import { RidgelineChart, type RidgelineChartProps } from "changelui";
import { useMemo, useState } from "react";
import { ChartDemo } from "../../components/chart-demo";
import { commuteTimes, dailyHighs, MONTHS, useSeed } from "../../lib/chart-data";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  overlap: number;
  sort: "median" | "mean" | "none";
  normalize: "each" | "shared";
  color: "median" | "category";
  showMedian: boolean;
};
const defaults: DemoProps = { overlap: 0.8, sort: "median", normalize: "each", color: "median", showMedian: true };
const controls: ControlSpec<DemoProps>[] = [
  { type: "number", prop: "overlap", label: "Overlap", min: 0, max: 1.6, step: 0.1 },
  { type: "select", prop: "sort", label: "Sort", options: ["median", "mean", "none"] },
  { type: "select", prop: "normalize", label: "Normalize", options: ["each", "shared"] },
  { type: "select", prop: "color", label: "Color", options: ["median", "category"] },
  { type: "boolean", prop: "showMedian", label: "Median ticks" },
];
const min = { style: "unit", unit: "minute", unitDisplay: "narrow", maximumFractionDigits: 0 } as const;

function Preview({ props }: { props: DemoProps }) {
  const [seed, randomize] = useSeed(6);
  const data = useMemo(() => commuteTimes(seed), [seed]);
  return (
    <ChartDemo onRandomize={randomize} hint="Hover a ridge for its quantiles and the share below the pointer. Up/down move between ridges, left/right slide the probe.">
      <RidgelineChart
        data={data}
        group="city"
        value="minutes"
        overlap={props.overlap}
        sort={props.sort}
        normalize={props.normalize}
        color={props.color}
        showMedian={props.showMedian}
        label="Commute"
        format={min}
        title="One-way commute times"
        description="160 survey answers per city"
        className="w-full"
      />
    </ChartDemo>
  );
}

function Mini() {
  const data = useMemo(() => commuteTimes(3, 60).filter((r) => ["Lisbon", "Berlin", "Seoul", "Mumbai"].includes(r.city)), []);
  return <RidgelineChart data={data} group="city" value="minutes" rowHeight={20} height={110} initialWidth={220} animation="never" showMedian={false} className="w-56 [&_text]:hidden" />;
}

function Temperatures() {
  const [seed, randomize] = useSeed(4);
  const data = useMemo(() => dailyHighs(seed), [seed]);
  const [active, setActive] = useState<string>("Hover a month.");
  return (
    <ChartDemo onRandomize={randomize} hint='sort="none" keeps calendar order; a fixed bandwidth keeps months comparable.'>
      <RidgelineChart
        data={data}
        group="month"
        value="temp"
        groupOrder={[...MONTHS]}
        sort="none"
        bandwidth={1.6}
        overlap={1.2}
        rowHeight={24}
        label="Daily high"
        format={{ style: "unit", unit: "celsius", maximumFractionDigits: 1 }}
        title="Daily highs through the year"
        onActiveGroupChange={(g) => setActive(g ? `${g.group}: median ${g.median.toFixed(1)} °C, ${g.n} days` : "Hover a month.")}
        tableToggle
        className="w-full"
      />
      <p className="text-xs text-pui-muted-foreground" aria-live="polite">
        {active}
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
      "<RidgelineChart",
      "  data={answers} // [{ city, minutes }]",
      '  group="city"',
      '  value="minutes"',
      p.overlap !== 0.6 ? `  overlap={${p.overlap}}` : null,
      p.sort !== "median" ? `  sort="${p.sort}"` : null,
      p.normalize !== "each" ? `  normalize="${p.normalize}"` : null,
      p.color !== "median" ? `  color="${p.color}"` : null,
      p.showMedian ? null : "  showMedian={false}",
      '  label="Commute"',
      "/>",
    ]
      .filter(Boolean)
      .join("\n"),
  propsTable: propDocs<RidgelineChartProps<unknown>>()([
    { name: "data", type: "readonly T[]", description: "Raw rows, one value each." },
    { name: "group", type: "keyof T | (row, i) => string | number", description: "One ridge per group." },
    { name: "value", type: "keyof T | (row, i) => number", description: "The measure." },
    { name: "overlap", type: "number", default: "0.6", description: "How far a ridge reaches into the row above (rows)." },
    { name: "sort", type: '"median" | "mean" | "none"', default: '"median"', description: "Ridge order, highest at the top." },
    { name: "bandwidth", type: "number", description: "KDE bandwidth in value units (default: Silverman)." },
    { name: "normalize", type: '"each" | "shared"', default: '"each"', description: "Same peak per ridge, or comparable densities." },
    { name: "color", type: '"median" | "category" | string', default: '"median"', description: "Sequential by median, palette, or one color." },
    { name: "showMedian", type: "boolean", default: "true", description: "Median tick on every ridge." },
    { name: "onActiveGroupChange", type: "(group | null) => void", description: "Hovered or focused ridge with its quantiles." },
  ]),
  keyboard: [
    { keys: "Tab", action: "Focus the plot" },
    { keys: "↑ / ↓", action: "Previous / next ridge, announced with median, IQR and n" },
    { keys: "← / → (Shift: ×5)", action: "Slide the probe; announces the share at or below it" },
    { keys: "Home / End", action: "Top / bottom ridge" },
    { keys: "T", action: "Show or hide the quantile table" },
  ],
  a11y: [
    "Each ridge's five-number summary is in the sr-only table and the tooltip.",
    "The summary names the highest and lowest medians and the widest spread.",
  ],
  reducedMotion: "Ridges render in place; updates are instant.",
  examples: [{ title: "Seasons", description: "Calendar-ordered monthly ridges with a fixed bandwidth.", Demo: Temperatures, wide: true }],
};
export default item;
