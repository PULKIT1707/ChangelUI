import { HeatmapChart, type HeatmapChartProps } from "changelui";
import { useMemo, useState } from "react";
import { ChartDemo } from "../../components/chart-demo";
import { regionGrowth, retentionCohorts, useSeed, WEEKDAYS, weeklyActivity } from "../../lib/chart-data";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  cellLabels: "auto" | "on" | "off";
  cellHeight: number;
  gap: number;
  radius: number;
  legend: boolean;
  xAxisPosition: "bottom" | "top";
};
const defaults: DemoProps = { cellLabels: "auto", cellHeight: 28, gap: 2, radius: 4, legend: true, xAxisPosition: "bottom" };
const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "cellLabels", label: "Cell labels", options: ["auto", "on", "off"] },
  { type: "number", prop: "cellHeight", label: "Row height", min: 16, max: 44, step: 2 },
  { type: "number", prop: "gap", label: "Gap", min: 0, max: 6, step: 1 },
  { type: "number", prop: "radius", label: "Radius", min: 0, max: 10, step: 1 },
  { type: "boolean", prop: "legend", label: "Legend" },
  { type: "select", prop: "xAxisPosition", label: "Column labels", options: ["bottom", "top"] },
];
const labelMode = (v: DemoProps["cellLabels"]) => (v === "auto" ? "auto" : v === "on");

function Preview({ props }: { props: DemoProps }) {
  const [seed, randomize] = useSeed(2);
  const data = useMemo(() => weeklyActivity(seed), [seed]);
  return (
    <ChartDemo onRandomize={randomize} hint="Hover for the row + column crosshair; hover the legend to filter by value; arrows walk the grid.">
      <HeatmapChart
        data={data}
        x="hour"
        y="day"
        value="events"
        yOrder={WEEKDAYS}
        cellLabels={labelMode(props.cellLabels)}
        cellHeight={props.cellHeight}
        gap={props.gap}
        radius={props.radius}
        legend={props.legend}
        xAxisPosition={props.xAxisPosition}
        legendLabel="Events"
        title="When people use the app"
        description="Events by weekday and hour (UTC)"
        className="w-full"
      />
    </ChartDemo>
  );
}

function Mini() {
  const data = useMemo(() => weeklyActivity(5).filter((d) => +d.hour % 2 === 0), []);
  return <HeatmapChart data={data} x="hour" y="day" value="events" cellHeight={10} gap={1} radius={2} legend={false} cellLabels={false} initialWidth={210} animation="never" className="w-56 [&_text]:hidden" />;
}

function Cohorts() {
  const [seed, randomize] = useSeed(4);
  const data = useMemo(() => retentionCohorts(seed), [seed]);
  return (
    <ChartDemo onRandomize={randomize} hint="cohort: percent format, labels on top and a clean triangle. The tooltip compares with row and column averages.">
      <HeatmapChart data={data} x="month" y="cohort" value="retained" cohort cellHeight={30} legendLabel="Retained" className="w-full" />
    </ChartDemo>
  );
}

function Growth() {
  const [seed, randomize] = useSeed(7);
  const data = useMemo(() => regionGrowth(seed), [seed]);
  return (
    <ChartDemo onRandomize={randomize} hint="Diverging around 0 (orange to blue, colorblind-safe). Colors crossfade on update.">
      <HeatmapChart
        data={data}
        x="quarter"
        y="region"
        value="change"
        scale="diverging"
        midpoint={0}
        format={{ style: "percent", maximumFractionDigits: 0, signDisplay: "exceptZero" }}
        legendLabel="YoY change"
        className="w-full"
      />
    </ChartDemo>
  );
}

function Drill() {
  const data = useMemo(() => weeklyActivity(9).filter((d) => +d.hour >= 7 && +d.hour <= 20), []);
  const [picked, setPicked] = useState<{ day: string; hour: string; events: number } | null>(null);
  return (
    <div className="flex w-full flex-col gap-2">
      <HeatmapChart data={data} x="hour" y="day" value="events" onCellClick={(cell) => setPicked(cell.datum)} cellHeight={24} legend={false} className="w-full" />
      <p className="text-sm" aria-live="polite">
        {picked ? (
          <>
            <strong>
              {picked.day} {picked.hour}:00
            </strong>{" "}
            had {picked.events.toLocaleString("en-US")} events
          </>
        ) : (
          "Click a cell (or press Enter on it)"
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
      "<HeatmapChart",
      "  data={events} // [{ day, hour, events }]",
      '  x="hour"',
      '  y="day"',
      '  value="events"',
      p.cellLabels !== "auto" ? `  cellLabels={${p.cellLabels === "on"}}` : null,
      p.cellHeight !== 30 ? `  cellHeight={${p.cellHeight}}` : null,
      p.gap !== 2 ? `  gap={${p.gap}}` : null,
      p.radius !== 4 ? `  radius={${p.radius}}` : null,
      p.legend ? '  legendLabel="Events"' : "  legend={false}",
      p.xAxisPosition !== "bottom" ? `  xAxisPosition="${p.xAxisPosition}"` : null,
      "/>",
    ]
      .filter(Boolean)
      .join("\n"),
  propsTable: propDocs<HeatmapChartProps<unknown>>()([
    { name: "data", type: "readonly T[]", required: true, description: "One row per cell; missing cells stay empty." },
    { name: "x", type: "keyof T | (row, i) => string | number", required: true, description: "Column category." },
    { name: "y", type: "keyof T | (row, i) => string | number", required: true, description: "Row category." },
    { name: "value", type: "keyof T | (row, i) => number", required: true, description: "Cell value." },
    { name: "xOrder", type: "readonly (string | number)[]", description: "Column order. Default: first appearance." },
    { name: "yOrder", type: "readonly (string | number)[]", description: "Row order. Default: first appearance." },
    { name: "scale", type: '"sequential" | "diverging"', default: '"sequential"', description: "Theme ramps (--pui-chart-seq-* / --pui-chart-div-*)." },
    { name: "domain", type: "[number, number]", description: "Color domain. Default: the data extent." },
    { name: "midpoint", type: "number", default: "0", description: "Diverging center." },
    { name: "cohort", type: "boolean", default: "false", description: "Retention triangle: percent format, labels on top." },
    { name: "cellLabels", type: '"auto" | boolean', default: '"auto"', description: "Values in cells (auto when they fit), with a readable ink." },
    { name: "cellHeight", type: "number", default: "30", description: "Row height in px." },
    { name: "legend", type: "boolean", default: "true", description: "Gradient legend with a live marker; hover it to filter by value." },
    { name: "onCellClick", type: "(cell, event) => void", description: "Click or Enter on a cell." },
    { name: "onActiveCellChange", type: "(cell | null) => void", description: "Cell under the pointer or keyboard focus." },
  ]),
  keyboard: [
    { keys: "Tab", action: "Focus the grid" },
    { keys: "← / → / ↑ / ↓", action: "Move between cells (announced with the row average)" },
    { keys: "Home / End", action: "Row start / end" },
    { keys: "Page Up / Page Down", action: "First / last row" },
    { keys: "Enter / Space", action: "Activate the cell (onCellClick)" },
    { keys: "Escape", action: "Clear the focus" },
    { keys: "T", action: "Show or hide the data table" },
  ],
  a11y: [
    "A figure with a summary naming the highest and lowest cells; an sr-only table mirrors the matrix.",
    'One tab stop (role="application") with 2D arrow navigation and a debounced live region.',
    "The diverging ramp is orange to blue (colorblind-safe), and values can be printed in cells.",
  ],
  reducedMotion: "No wave entrance or color crossfade: cells render in their final colors.",
  examples: [
    { title: "Retention cohorts", description: "The classic SaaS triangle in cohort mode.", Demo: Cohorts, wide: true },
    { title: "Diverging growth", description: "Signed values around a midpoint.", Demo: Growth },
    { title: "Click a cell", description: "onCellClick with the row datum.", Demo: Drill },
  ],
};
export default item;
