import { BoxPlot, type BoxPlotProps, type BoxPlotStats } from "changelui";
import { useMemo, useState } from "react";
import { ChartDemo } from "../../components/chart-demo";
import { regionLatency, salaries, useSeed } from "../../lib/chart-data";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  variant: "box" | "violin" | "both";
  points: "none" | "jitter" | "swarm";
  orientation: "vertical" | "horizontal";
  showMean: boolean;
  colorByGroup: boolean;
};
const defaults: DemoProps = { variant: "box", points: "swarm", orientation: "vertical", showMean: true, colorByGroup: true };
const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "variant", label: "Variant", options: ["box", "violin", "both"] },
  { type: "select", prop: "points", label: "Raw points", options: ["none", "jitter", "swarm"] },
  { type: "select", prop: "orientation", label: "Orientation", options: ["vertical", "horizontal"] },
  { type: "boolean", prop: "showMean", label: "Mean diamond" },
  { type: "boolean", prop: "colorByGroup", label: "Color by group" },
];
const ms = { style: "unit", unit: "millisecond", unitDisplay: "narrow", maximumFractionDigits: 0 } as const;

function Preview({ props }: { props: DemoProps }) {
  const [seed, randomize] = useSeed(2);
  const data = useMemo(() => regionLatency(seed), [seed]);
  return (
    <ChartDemo onRandomize={randomize} hint="Hover a group for its five numbers; its median is carried across the others. Arrows walk groups and outliers.">
      <BoxPlot
        data={data}
        group="region"
        value="ms"
        variant={props.variant}
        points={props.points}
        orientation={props.orientation}
        showMean={props.showMean}
        colorByGroup={props.colorByGroup}
        label="Latency"
        format={ms}
        title="p50 latency by region"
        description="70 synthetic probes per region"
        className="w-full"
      />
    </ChartDemo>
  );
}

function Mini() {
  const data = useMemo(() => regionLatency(4, 40), []);
  return <BoxPlot data={data} group="region" value="ms" height={120} showMean={false} initialWidth={220} animation="never" className="w-56 [&_text]:hidden" />;
}

function Violins() {
  const [seed, randomize] = useSeed(6);
  const data = useMemo(() => salaries(seed), [seed]);
  const usd = { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 0 } as const;
  return (
    <ChartDemo onRandomize={randomize} hint='variant="both": KDE violins with a slim box inside. Shapes morph on update.'>
      <BoxPlot data={data} group="role" value="salary" variant="both" orientation="horizontal" label="Salary" format={usd} title="Salary by role" className="w-full" />
    </ChartDemo>
  );
}

const quartiles: BoxPlotStats[] = [
  { group: "2022", min: 12, q1: 28, median: 36, q3: 47, max: 71, mean: 38, n: 412, outliers: [88, 93] },
  { group: "2023", min: 15, q1: 31, median: 40, q3: 52, max: 78, mean: 42, n: 468, outliers: [96] },
  { group: "2024", min: 18, q1: 34, median: 45, q3: 55, max: 80, mean: 46, n: 521, outliers: [9, 99, 104] },
  { group: "2025", min: 21, q1: 39, median: 49, q3: 61, max: 84, mean: 51, n: 590, outliers: [] },
];

function Precomputed() {
  const [picked, setPicked] = useState<{ group: string; value: number } | null>(null);
  return (
    <div className="flex w-full flex-col gap-2">
      <BoxPlot stats={quartiles} label="Minutes" colorByGroup={false} onOutlierClick={(o) => setPicked(o)} height={260} className="w-full" />
      <p className="text-sm" aria-live="polite">
        {picked ? (
          <>
            Outlier <strong>{picked.value} min</strong> in {picked.group}
          </>
        ) : (
          "Click an outlier (or arrow up/down to one and press Enter)."
        )}
      </p>
    </div>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (p) =>
    [
      "<BoxPlot",
      "  data={probes} // [{ region, ms }]",
      '  group="region"',
      '  value="ms"',
      p.variant !== "box" ? `  variant="${p.variant}"` : null,
      p.points !== "none" ? `  points="${p.points}"` : null,
      p.orientation !== "vertical" ? `  orientation="${p.orientation}"` : null,
      p.showMean ? null : "  showMean={false}",
      p.colorByGroup ? null : "  colorByGroup={false}",
      '  label="Latency"',
      "/>",
    ]
      .filter(Boolean)
      .join("\n"),
  propsTable: propDocs<BoxPlotProps<unknown>>()([
    { name: "data", type: "readonly T[]", description: "Raw rows, one value each." },
    { name: "group", type: "keyof T | (row, i) => string | number", description: "Group key." },
    { name: "value", type: "keyof T | (row, i) => number", description: "The measure." },
    { name: "stats", type: "BoxPlotStats[]", description: "Precomputed quartiles (instead of data)." },
    { name: "variant", type: '"box" | "violin" | "both"', default: '"box"', description: "Box, KDE violin, or a violin with a slim box." },
    { name: "points", type: '"none" | "jitter" | "swarm"', default: '"none"', description: "Raw points: seeded jitter or a non-overlapping beeswarm." },
    { name: "orientation", type: '"vertical" | "horizontal"', default: '"vertical"', description: "Groups along x or along y." },
    { name: "whisker", type: "number", default: "1.5", description: "Whisker reach in IQRs (Tukey fences)." },
    { name: "showMean", type: "boolean", default: "true", description: "Mean diamond." },
    { name: "onOutlierClick", type: "({ group, value }, event) => void", description: "Click or Enter on an outlier." },
    { name: "onGroupClick", type: "(group, event) => void", description: "Click or Enter on a group." },
  ]),
  keyboard: [
    { keys: "Tab", action: "Focus the plot" },
    { keys: "← / → (↑ / ↓ when horizontal)", action: "Previous / next group, announced with median, IQR and outliers" },
    { keys: "↑ / ↓ (← / → when horizontal)", action: "Walk the focused group's outliers" },
    { keys: "Enter / Space", action: "Select the outlier, or activate the group" },
    { keys: "Escape", action: "Clear the selection, then the focus" },
    { keys: "T", action: "Show or hide the data table" },
  ],
  a11y: [
    "The summary names the highest and lowest medians, the widest spread and the outlier count.",
    "An sr-only table lists n, min, quartiles, max and outliers per group.",
    "Selected outliers get a focus-colored ring in addition to the fill change.",
  ],
  reducedMotion: "Boxes, violins and points render in place; updates are instant.",
  examples: [
    { title: "Violins", description: "Horizontal violins with inner boxes.", Demo: Violins, wide: true },
    { title: "From quartiles", description: "Precomputed stats with selectable outliers.", Demo: Precomputed, wide: true },
  ],
};
export default item;
