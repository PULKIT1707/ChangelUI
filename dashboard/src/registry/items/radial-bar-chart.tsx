import { RadialBarChart, type RadialBarChartProps, type RadialBarDatum } from "changelui";
import { mulberry32 } from "@pui-src/lib/random";
import { ChartDemo } from "../../components/chart-demo";
import { useSeed } from "../../lib/chart-data";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  size: number;
  sweep: number;
  innerRadius: number;
  gap: number;
  rounded: boolean;
  labels: "start" | "none";
  sort: "none" | "desc" | "asc";
  legend: "bottom" | "right" | "none";
};
const defaults: DemoProps = { size: 300, sweep: 270, innerRadius: 0.3, gap: 4, rounded: true, labels: "start", sort: "desc", legend: "right" };
const controls: ControlSpec<DemoProps>[] = [
  { type: "number", prop: "size", label: "Size (px)", min: 180, max: 360, step: 10 },
  { type: "number", prop: "sweep", label: "Sweep (°)", min: 180, max: 360, step: 15 },
  { type: "number", prop: "innerRadius", label: "Hole", min: 0.1, max: 0.6, step: 0.05 },
  { type: "number", prop: "gap", label: "Gap (px)", min: 0, max: 10, step: 1 },
  { type: "boolean", prop: "rounded", label: "Rounded ends" },
  { type: "select", prop: "labels", label: "Labels", options: ["start", "none"] },
  { type: "select", prop: "sort", label: "Sort", options: ["none", "desc", "asc"] },
  { type: "select", prop: "legend", label: "Legend", options: ["bottom", "right", "none"] },
];

const BROWSERS = ["Chrome", "Safari", "Edge", "Firefox", "Other"];
function visitors(seed: number): RadialBarDatum[] {
  const rand = mulberry32(seed * 6151 + 11);
  const base = [3120, 2180, 940, 610, 290];
  return BROWSERS.map((label, i) => ({ label, value: Math.round(base[i]! * (0.7 + rand() * 0.6)) }));
}

function Preview({ props }: { props: DemoProps }) {
  const [seed, randomize] = useSeed(4);
  return (
    <ChartDemo onRandomize={randomize} hint="Hover a bar or a legend row to read it in the middle; click to pin. Labels sit in the gap before 12 o'clock.">
      <div className="flex w-full justify-center">
        <RadialBarChart
          data={visitors(seed)}
          size={props.size}
          sweep={props.sweep}
          innerRadius={props.innerRadius}
          gap={props.gap}
          rounded={props.rounded}
          labels={props.labels}
          sort={props.sort}
          legend={props.legend}
          chartLabel="Visitors by browser, last 30 days"
          format={{ notation: "compact", maximumFractionDigits: 1 }}
        />
      </div>
    </ChartDemo>
  );
}

function Mini() {
  return <RadialBarChart data={visitors(1).slice(0, 4)} size={150} legend="none" labels="none" sort="desc" animation="never" />;
}

function Goals() {
  const [seed, randomize] = useSeed(7);
  const rand = mulberry32(seed * 977 + 2);
  const goals: RadialBarDatum[] = [
    { label: "New ARR", value: Math.round(380 + rand() * 260), max: 600, color: "var(--pui-chart-1)" },
    { label: "Activation", value: Math.round(28 + rand() * 22), max: 45, color: "var(--pui-chart-3)" },
    { label: "Docs NPS", value: Math.round(30 + rand() * 30), max: 50, color: "var(--pui-chart-5)" },
  ];
  return (
    <ChartDemo onRandomize={randomize} hint="Each bar has its own goal, so the sweep is progress and the middle shows a percentage.">
      <div className="flex w-full justify-center">
        <RadialBarChart title="Q3 goals" data={goals} size={230} sweep={360} labels="none" legend="bottom" innerRadius={0.42} />
      </div>
    </ChartDemo>
  );
}

function HalfArc() {
  return (
    <RadialBarChart
      title="Storage used"
      description="A 180° sweep crops the drawing to the arc."
      data={[
        { label: "Photos", value: 41, max: 100, color: "var(--pui-chart-4)" },
        { label: "Video", value: 27, max: 100, color: "var(--pui-chart-2)" },
        { label: "Docs", value: 9, max: 100, color: "var(--pui-chart-6)" },
      ]}
      sweep={180}
      startAngle={-90}
      size={260}
      innerRadius={0.45}
      legend="bottom"
      center={
        <span className="flex flex-col items-center leading-none">
          <span className="text-2xl font-semibold tabular-nums">77 GB</span>
          <span className="mt-1 text-[11px] text-pui-muted-foreground">of 100 GB</span>
        </span>
      }
      format={{ maximumFractionDigits: 0 }}
      className="w-full items-center"
    />
  );
}

function Compact() {
  return (
    <div className="grid w-full grid-cols-3 gap-2">
      {[
        { title: "CPU", value: 72, color: "var(--pui-chart-1)" },
        { title: "Memory", value: 48, color: "var(--pui-chart-3)" },
        { title: "Disk", value: 91, color: "var(--pui-chart-7)" },
      ].map((m) => (
        <div key={m.title} className="flex flex-col items-center gap-1">
          <RadialBarChart
            chartLabel={`${m.title} usage`}
            data={[{ label: m.title, value: m.value, max: 100, color: m.color }]}
            size={110}
            innerRadius={0.62}
            legend="none"
            labels="none"
            center={<span className="text-base font-semibold tabular-nums">{m.value}%</span>}
          />
          <span className="text-xs font-medium text-pui-muted-foreground">{m.title}</span>
        </div>
      ))}
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
      "<RadialBarChart",
      "  data={[",
      '    { label: "Chrome", value: 3120 },',
      '    { label: "Safari", value: 2180 },',
      '    { label: "Edge", value: 940 },',
      "  ]}",
      p.size !== 260 ? `  size={${p.size}}` : null,
      p.sweep !== 270 ? `  sweep={${p.sweep}}` : null,
      p.innerRadius !== 0.3 ? `  innerRadius={${p.innerRadius}}` : null,
      p.gap !== 4 ? `  gap={${p.gap}}` : null,
      !p.rounded ? "  rounded={false}" : null,
      p.labels !== "start" ? `  labels="${p.labels}"` : null,
      p.sort !== "none" ? `  sort="${p.sort}"` : null,
      p.legend !== "bottom" ? `  legend="${p.legend}"` : null,
      "/>",
    ]
      .filter(Boolean)
      .join("\n"),
  propsTable: propDocs<RadialBarChartProps>()([
    { name: "data", type: "RadialBarDatum[]", required: true, description: "{ label, value, max?, color?, key? } from the outside in." },
    { name: "max", type: "number", default: "largest value", description: "Value of a full sweep. Per-bar max turns a bar into progress toward its own goal." },
    { name: "size", type: "number", default: "260", description: "Drawing size in px; scales down with the container." },
    { name: "sweep", type: "number", default: "270", description: "Degrees a full bar covers; 180 crops to a half arc." },
    { name: "startAngle", type: "number", default: "0", description: "Degrees clockwise from 12 o'clock where bars start." },
    { name: "innerRadius", type: "number", default: "0.3", description: "Hole as a share of the radius." },
    { name: "gap", type: "number", default: "4", description: "Space between bars in px." },
    { name: "rounded", type: "boolean", default: "true", description: "Round bar ends." },
    { name: "trackOpacity", type: "number", default: "0.14", description: "How much of the bar color tints its track." },
    { name: "labels", type: '"start" | "none"', default: '"start"', description: "Labels in the gap before the start (12 o'clock starts, sweep up to 275°)." },
    { name: "sort", type: '"none" | "desc" | "asc"', default: '"none"', description: "Order bars by value." },
    { name: "legend", type: '"bottom" | "right" | "none"', default: '"bottom"', description: "Legend buttons that spotlight on hover/focus and pin on click." },
    { name: "center", type: "ReactNode", default: "total or avg. progress", description: "Middle content when nothing is spotlighted." },
    { name: "active", type: "string | null", description: "Controlled spotlight (a key or label)." },
    { name: "onActiveChange", type: "(key) => void", description: "Pin changes from a click or the legend." },
    { name: "format", type: "Intl.NumberFormatOptions | (v) => string", description: "Value format." },
  ]),
  keyboard: [
    { keys: "Tab", action: "Focus a legend row: spotlights its bar and reads it in the middle" },
    { keys: "Enter / Space", action: "Pin or unpin the spotlight" },
  ],
  a11y: [
    'Each bar is a role="meter" with a value text like "Activation: 41 of 45, 91%".',
    "Legend rows are toggle buttons with the same text; a data table is available to screen readers.",
  ],
  reducedMotion: "Bars render at their final sweep, no spring.",
  examples: [
    { title: "Goals with their own max", description: "A full-circle sweep reads as progress.", Demo: Goals },
    { title: "Half arc", description: "Cropped to the arc with custom center content.", Demo: HalfArc },
    { title: "Compact meters", description: "One bar each, no legend, for a status row.", Demo: Compact, wide: true },
  ],
};
export default item;
