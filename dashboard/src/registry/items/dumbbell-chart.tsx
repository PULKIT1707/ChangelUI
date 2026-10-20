import { DumbbellChart, SegmentedControl, SegmentedControlItem, type DumbbellChartProps } from "changelui";
import { useMemo, useState } from "react";
import { ChartDemo } from "../../components/chart-demo";
import { countries, skillGaps, teamDelivery, useSeed } from "../../lib/chart-data";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  variant: "dumbbell" | "lollipop";
  sort: "none" | "gap" | "start" | "end" | "label";
  sortDirection: "asc" | "desc";
  colorBy: "neutral" | "direction";
  showValues: "hover" | "always" | "none";
  showAverage: boolean;
};
const defaults: DemoProps = { variant: "dumbbell", sort: "gap", sortDirection: "desc", colorBy: "direction", showValues: "hover", showAverage: false };
const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "variant", label: "Variant", options: ["dumbbell", "lollipop"] },
  { type: "select", prop: "sort", label: "Sort", options: ["none", "gap", "start", "end", "label"] },
  { type: "select", prop: "sortDirection", label: "Direction", options: ["desc", "asc"] },
  { type: "select", prop: "colorBy", label: "Connector", options: ["neutral", "direction"] },
  { type: "select", prop: "showValues", label: "Values", options: ["hover", "always", "none"] },
  { type: "boolean", prop: "showAverage", label: "Average line" },
];

function Preview({ props }: { props: DemoProps }) {
  const [seed, randomize] = useSeed(2);
  const data = useMemo(() => teamDelivery(seed), [seed]);
  return (
    <ChartDemo onRandomize={randomize} hint="Hover a row for the gap. Change the sort to watch rows re-order. Up/down walk rows.">
      <DumbbellChart
        data={data}
        label="team"
        start="planned"
        end="delivered"
        variant={props.variant}
        sort={props.sort}
        sortDirection={props.sortDirection}
        colorBy={props.colorBy}
        showValues={props.showValues}
        showAverage={props.showAverage}
        labels={{ start: "Planned", end: "Delivered" }}
        measure="Story points"
        format={{ maximumFractionDigits: 0 }}
        title="Planned vs delivered, Q3"
        description="Story points per team"
        className="w-full"
      />
    </ChartDemo>
  );
}

function Mini() {
  const data = useMemo(() => teamDelivery(5).slice(0, 5), []);
  return <DumbbellChart data={data} label="team" start="planned" end="delivered" colorBy="direction" rowHeight={20} height={110} initialWidth={220} animation="never" className="w-56 [&_text]:hidden [&_[role=group]]:hidden" />;
}

function Skills() {
  const [seed, randomize] = useSeed(3);
  const data = useMemo(() => skillGaps(seed), [seed]);
  const [sort, setSort] = useState<"gap" | "label">("gap");
  return (
    <ChartDemo onRandomize={randomize} hint="Sort from outside the chart; rows glide to their new order.">
      <SegmentedControl aria-label="Sort skills" size="sm" value={sort} onValueChange={(v) => setSort(v === "label" ? "label" : "gap")} className="self-start">
        <SegmentedControlItem value="gap">Biggest gap</SegmentedControlItem>
        <SegmentedControlItem value="label">A to Z</SegmentedControlItem>
      </SegmentedControl>
      <DumbbellChart
        data={data}
        label="skill"
        start="current"
        end="target"
        sort={sort}
        sortDirection={sort === "label" ? "asc" : "desc"}
        labels={{ start: "Today", end: "Target" }}
        colors={{ start: "var(--pui-chart-3)", end: "var(--pui-chart-1)" }}
        domain={[0, 10]}
        showValues="always"
        title="Skill gaps for the next level"
        className="w-full"
      />
    </ChartDemo>
  );
}

function Lollipop() {
  const [seed, randomize] = useSeed(4);
  const data = useMemo(() => countries(seed, 10), [seed]);
  return (
    <ChartDemo onRandomize={randomize} hint='variant="lollipop": one value per row from zero, sorted largest first.'>
      <DumbbellChart data={data} label="country" end="users" variant="lollipop" sort="end" measure="Users" showAverage tableToggle title="Users by country" className="w-full" />
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
      "<DumbbellChart",
      "  data={teams} // [{ team, planned, delivered }]",
      '  label="team"',
      p.variant === "lollipop" ? null : '  start="planned"',
      '  end="delivered"',
      p.variant !== "dumbbell" ? `  variant="${p.variant}"` : null,
      p.sort !== "none" ? `  sort="${p.sort}"` : null,
      p.sortDirection !== "desc" ? `  sortDirection="${p.sortDirection}"` : null,
      p.colorBy !== "neutral" ? `  colorBy="${p.colorBy}"` : null,
      p.showValues !== "hover" ? `  showValues="${p.showValues}"` : null,
      p.showAverage ? "  showAverage" : null,
      '  labels={{ start: "Planned", end: "Delivered" }}',
      "/>",
    ]
      .filter(Boolean)
      .join("\n"),
  propsTable: propDocs<DumbbellChartProps<unknown>>()([
    { name: "data", type: "readonly T[]", description: "One row per category." },
    { name: "label", type: "keyof T | (row, i) => string", description: "Category name." },
    { name: "start", type: "keyof T | (row, i) => number", description: "First value (dumbbell)." },
    { name: "end", type: "keyof T | (row, i) => number", description: "Second value, or the lollipop value." },
    { name: "variant", type: '"dumbbell" | "lollipop"', default: '"dumbbell"', description: "Two dots with a gap, or one value from zero." },
    { name: "sort", type: '"none" | "gap" | "start" | "end" | "label"', default: '"none"', description: "Row order; changes glide on a spring." },
    { name: "sortDirection", type: '"asc" | "desc"', default: '"desc"', description: "Sort direction." },
    { name: "colorBy", type: '"neutral" | "direction"', default: '"neutral"', description: "Connector color by the sign of the gap." },
    { name: "colors", type: "{ start?, end? }", description: "Dot colors." },
    { name: "showValues", type: '"hover" | "always" | "none"', default: '"hover"', description: "Values next to the dots." },
    { name: "showAverage", type: "boolean", default: "false", description: "Dashed line at the average end value." },
    { name: "onRowClick", type: "(row, event) => void", description: "Click or Enter on a row." },
  ]),
  keyboard: [
    { keys: "Tab", action: "Focus the plot" },
    { keys: "↑ / ↓", action: "Previous / next row, announced with both values and the gap" },
    { keys: "Home / End", action: "First / last row" },
    { keys: "Enter / Space", action: "Activate the row (onRowClick)" },
    { keys: "T", action: "Show or hide the data table" },
  ],
  a11y: [
    'Announcements read like "Payments: 120 to 96, gap −24 (−20%). Row 3 of 10."',
    "The summary names the largest and smallest gaps and the average gap.",
    "The start dot is hollow and the end dot filled, so the two never rely on color alone.",
  ],
  reducedMotion: "Dots and connectors appear in place; sorting jumps.",
  examples: [
    { title: "Skill gaps", description: "External sort control with gliding rows and always-on values.", Demo: Skills, wide: true },
    { title: "Lollipop", description: "One value per country with an average line.", Demo: Lollipop, wide: true },
  ],
};
export default item;
