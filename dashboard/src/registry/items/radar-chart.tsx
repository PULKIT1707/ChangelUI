import { RadarChart, type RadarChartProps } from "changelui";
import { useMemo, useState } from "react";
import { ChartDemo } from "../../components/chart-demo";
import { productScores, serviceHealth, useSeed, type SkillRow } from "../../lib/chart-data";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  grid: "polygon" | "circle";
  curve: "linear" | "smooth";
  axes: number;
  levels: number;
  fillOpacity: number;
  markers: boolean;
  legend: "top" | "bottom" | "none";
  size: number;
};
const defaults: DemoProps = { grid: "polygon", curve: "linear", axes: 7, levels: 5, fillOpacity: 0.18, markers: true, legend: "top", size: 300 };
const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "grid", label: "Grid", options: ["polygon", "circle"] },
  { type: "select", prop: "curve", label: "Curve", options: ["linear", "smooth"] },
  { type: "number", prop: "axes", label: "Axes", min: 3, max: 7, step: 1 },
  { type: "number", prop: "levels", label: "Rings", min: 2, max: 8, step: 1 },
  { type: "number", prop: "fillOpacity", label: "Fill opacity", min: 0, max: 0.5, step: 0.02 },
  { type: "boolean", prop: "markers", label: "Markers" },
  { type: "select", prop: "legend", label: "Legend", options: ["top", "bottom", "none"] },
  { type: "number", prop: "size", label: "Size (px)", min: 200, max: 420, step: 20 },
];
const PRODUCTS = ["Model S", "Model R", "Model T"];

function Preview({ props }: { props: DemoProps }) {
  const [seed, randomize] = useSeed(2);
  const data = useMemo(() => productScores(seed, props.axes, PRODUCTS), [seed, props.axes]);
  return (
    <ChartDemo onRandomize={randomize} hint="Hover a direction to compare every model on that axis; ←/→ axes, ↑/↓ models.">
      <RadarChart
        {...props}
        data={data}
        axis="skill"
        series={PRODUCTS.map((p) => ({ id: p, value: (row: SkillRow) => row[p] as number }))}
        max={100}
        title="E-bike comparison"
        description="Reviewer scores, 0 to 100"
        className="w-full"
      />
    </ChartDemo>
  );
}

function Mini() {
  const data = useMemo(() => productScores(4, 6, ["A", "B"]), []);
  return <RadarChart data={data} axis="skill" series={[{ id: "A", value: "A" }, { id: "B", value: "B" }]} max={100} size={110} legend="none" levelLabels={false} markers={false} animation="never" className="w-44" />;
}

function PerAxis() {
  const [seed, randomize] = useSeed(6);
  const data = useMemo(() => serviceHealth(seed), [seed]);
  return (
    <ChartDemo onRandomize={randomize} hint="Each axis has its own maximum (max accessor), so mixed units compare fairly.">
      <RadarChart
        data={data}
        axis="metric"
        max="max"
        series={[
          { id: "eu", label: "eu-west", value: "eu" },
          { id: "us", label: "us-east", value: "us" },
        ]}
        grid="circle"
        curve="smooth"
        fillOpacity={0.22}
        size={260}
        className="w-full"
      />
    </ChartDemo>
  );
}

function Controlled() {
  const data = useMemo(() => productScores(12, 6, PRODUCTS), []);
  const [hidden, setHidden] = useState<string[]>(["Model T"]);
  const [active, setActive] = useState<{ axis: number; series: string | null } | null>(null);
  return (
    <div className="flex w-full flex-col gap-2">
      <RadarChart
        data={data}
        axis="skill"
        max={100}
        series={PRODUCTS.map((p) => ({ id: p, value: (row: SkillRow) => row[p] as number }))}
        hiddenSeries={hidden}
        onHiddenSeriesChange={setHidden}
        onActiveChange={setActive}
        size={240}
        legend="bottom"
        className="w-full"
      />
      <p className="text-xs text-pui-muted-foreground" aria-live="polite">
        Hidden: {hidden.length ? hidden.join(", ") : "none"}
        {active ? ` \u00b7 exploring ${data[active.axis]?.skill}${active.series ? ` (${active.series})` : ""}` : ""}
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
      "<RadarChart",
      "  data={scores} // one row per axis",
      '  axis="skill"',
      "  series={[",
      '    { id: "s", label: "Model S", value: "Model S" },',
      '    { id: "r", label: "Model R", value: "Model R" },',
      "  ]}",
      "  max={100}",
      p.grid !== "polygon" ? `  grid="${p.grid}"` : null,
      p.curve !== "linear" ? `  curve="${p.curve}"` : null,
      p.levels !== 5 ? `  levels={${p.levels}}` : null,
      p.fillOpacity !== 0.18 ? `  fillOpacity={${p.fillOpacity}}` : null,
      p.markers ? null : "  markers={false}",
      p.legend !== "top" ? `  legend="${p.legend}"` : null,
      "/>",
    ]
      .filter(Boolean)
      .join("\n"),
  propsTable: propDocs<RadarChartProps<unknown>>()([
    { name: "data", type: "readonly T[]", required: true, description: "One row per axis (spoke)." },
    { name: "axis", type: "keyof T | (row, i) => string", required: true, description: "Axis name." },
    { name: "series", type: "RadarSeries<T>[]", required: true, description: "{ id, value, label?, color?, hidden? }" },
    { name: "max", type: "number | keyof T | (row, i) => number", description: "Scale max for all axes, or per axis. Default: the nice data max." },
    { name: "min", type: "number", default: "0", description: "Value at the center." },
    { name: "levels", type: "number", default: "5", description: "Grid rings." },
    { name: "grid", type: '"polygon" | "circle"', default: '"polygon"', description: "Ring shape." },
    { name: "curve", type: '"linear" | "smooth"', default: '"linear"', description: "Smooth draws closed Catmull-Rom curves." },
    { name: "fillOpacity", type: "number", default: "0.18", description: "Area fill opacity." },
    { name: "markers", type: "boolean", default: "true", description: "Dots at each value." },
    { name: "legend", type: '"top" | "bottom" | "none"', default: '"top" (2+ series)', description: "Toggle buttons; Alt+click isolates." },
    { name: "hiddenSeries", type: "string[]", description: "Controlled hidden series (with onHiddenSeriesChange)." },
    { name: "onActiveChange", type: "({ axis, series }) => void", description: "Axis and series under the pointer or keyboard focus." },
    { name: "size", type: "number", default: "300", description: "Web diameter in px; scales down with the container." },
  ]),
  keyboard: [
    { keys: "Tab", action: "Focus the chart, then the legend" },
    { keys: "← / →", action: "Previous / next axis (every series is announced)" },
    { keys: "↑ / ↓", action: "Focus one series on the current axis" },
    { keys: "Home / End", action: "First / last axis" },
    { keys: "Escape", action: "Clear the focus" },
    { keys: "T", action: "Show or hide the data table" },
  ],
  a11y: [
    'A figure (aria-roledescription="chart") with a summary naming each series\' strongest and weakest axis.',
    'One tab stop (role="application") with a debounced live region; an sr-only table lists every value.',
    "Legend items are aria-pressed toggle buttons with 24px targets.",
  ],
  reducedMotion: "No grow-from-center or morph: shapes jump to their values; highlight fades are instant.",
  examples: [
    { title: "Per-axis maxima", description: "Mixed units on a circular grid with smooth curves.", Demo: PerAxis },
    { title: "Controlled", description: "hiddenSeries and onActiveChange wired to outside UI.", Demo: Controlled },
  ],
};
export default item;
