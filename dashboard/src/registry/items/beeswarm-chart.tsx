import { BeeswarmChart, type BeeswarmChartProps } from "changelui";
import { useMemo, useState } from "react";
import { ChartDemo } from "../../components/chart-demo";
import { examScores, fundingRounds, regionLatency, useSeed } from "../../lib/chart-data";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  grouped: boolean;
  colorBySector: boolean;
  sized: boolean;
  radius: number;
  showQuartiles: boolean;
  brush: boolean;
};
const defaults: DemoProps = { grouped: true, colorBySector: true, sized: false, radius: 4, showQuartiles: true, brush: true };
const controls: ControlSpec<DemoProps>[] = [
  { type: "boolean", prop: "grouped", label: "Rows by stage" },
  { type: "boolean", prop: "colorBySector", label: "Color by sector" },
  { type: "boolean", prop: "sized", label: "Size by headcount" },
  { type: "number", prop: "radius", label: "Radius (px)", min: 2, max: 8, step: 0.5 },
  { type: "boolean", prop: "showQuartiles", label: "Quartile guides" },
  { type: "boolean", prop: "brush", label: "Brush select" },
];
const usdM = { style: "currency", currency: "USD", maximumFractionDigits: 1 } as const;
const fmtM = (v: number) => `${new Intl.NumberFormat("en-US", usdM).format(v)}M`;

function Preview({ props }: { props: DemoProps }) {
  const [seed, randomize] = useSeed(5);
  const data = useMemo(() => fundingRounds(seed), [seed]);
  return (
    <ChartDemo onRandomize={randomize} hint="Hover a dot; drag along the axis to select a range. Arrows walk dots in sorted order, up/down change rows.">
      <BeeswarmChart
        data={data}
        value="raised"
        group={props.grouped ? "stage" : undefined}
        groupOrder={props.grouped ? ["Seed", "Series A", "Series B", "Series C+"] : undefined}
        color={props.colorBySector ? "sector" : undefined}
        size={props.sized ? "employees" : undefined}
        name="company"
        rowKey="company"
        radius={props.radius}
        showQuartiles={props.showQuartiles}
        brush={props.brush}
        label="Raised"
        format={fmtM}
        title="Funding rounds by stage"
        description="Every round is a dot; none overlap"
        className="w-full"
      />
    </ChartDemo>
  );
}

function Mini() {
  const data = useMemo(() => examScores(3, 90), []);
  return <BeeswarmChart data={data} value="score" color="track" radius={3} height={110} initialWidth={220} animation="never" showQuartiles={false} className="w-56 [&_text]:hidden [&_[role=group]]:hidden" />;
}

function Latency() {
  const [seed, randomize] = useSeed(7);
  const data = useMemo(() => regionLatency(seed, 90), [seed]);
  const [picked, setPicked] = useState<string>("Drag across the axis to select a range.");
  return (
    <ChartDemo onRandomize={randomize} hint="References mark the SLO; onSelectionChange reports the brushed rows.">
      <BeeswarmChart
        data={data}
        value="ms"
        group="region"
        radius={3}
        references={[{ value: 200, label: "SLO 200 ms" }]}
        label="Latency"
        format={{ style: "unit", unit: "millisecond", unitDisplay: "narrow", maximumFractionDigits: 0 }}
        onSelectionChange={(range, points) => setPicked(range ? `${points.length} probes between ${Math.round(range[0])} and ${Math.round(range[1])} ms` : "Selection cleared.")}
        rowHeight={80}
        className="w-full"
      />
      <p className="text-xs text-pui-muted-foreground" aria-live="polite">
        {picked}
      </p>
    </ChartDemo>
  );
}

function Scores() {
  const [seed, randomize] = useSeed(2);
  const data = useMemo(() => examScores(seed), [seed]);
  return (
    <ChartDemo onRandomize={randomize} hint="One row, colored by track. Legend chips hide a track; points glide on update.">
      <BeeswarmChart data={data} value="score" color="track" name="student" domain={[0, 100]} radius={4.5} label="Score" title="Final exam scores" tableToggle className="w-full" />
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
      "<BeeswarmChart",
      "  data={rounds} // [{ company, raised, stage, sector, employees }]",
      '  value="raised"',
      p.grouped ? '  group="stage"' : null,
      p.colorBySector ? '  color="sector"' : null,
      p.sized ? '  size="employees"' : null,
      '  name="company"',
      p.radius !== 4 ? `  radius={${p.radius}}` : null,
      p.showQuartiles ? null : "  showQuartiles={false}",
      p.brush ? "  onSelectionChange={(range, points) => setSelected(points)}" : "  brush={false}",
      "/>",
    ]
      .filter(Boolean)
      .join("\n"),
  propsTable: propDocs<BeeswarmChartProps<unknown>>()([
    { name: "data", type: "readonly T[]", description: "Rows, one dot each." },
    { name: "value", type: "keyof T | (row, i) => number", description: "Position on the axis." },
    { name: "group", type: "keyof T | (row, i) => string | number", description: "One swarm row per group." },
    { name: "color", type: "keyof T | (row, i) => string | number", description: "Color category, with toggling legend chips." },
    { name: "size", type: "keyof T | (row, i) => number", description: "Circle area encoding." },
    { name: "name", type: "keyof T | (row, i) => string", description: "Dot name for tooltips and announcements." },
    { name: "rowKey", type: "keyof T | (row, i) => string | number", description: "Stable key so updates glide." },
    { name: "radius", type: "number", default: "4", description: "Radius in px; shrinks so swarms fit their rows." },
    { name: "showQuartiles", type: "boolean", default: "true", description: "IQR band and median line per row." },
    { name: "references", type: "{ value, label? }[]", description: "Dashed reference lines." },
    { name: "brush", type: "boolean", default: "true", description: "Drag to select a value range." },
    { name: "onSelectionChange", type: "(range, points) => void", description: "Brushed range and the rows inside it." },
  ]),
  keyboard: [
    { keys: "Tab", action: "Focus the plot" },
    { keys: "← / →", action: "Previous / next dot in sorted order" },
    { keys: "↑ / ↓", action: "Nearest dot in the row above / below" },
    { keys: "Home / End, PageUp / PageDown", action: "Lowest / highest dot, jump 10%" },
    { keys: "Enter / Space", action: "Activate the dot (onPointClick)" },
    { keys: "Escape", action: "Clear the brush, then the focus" },
    { keys: "T", action: "Show or hide the data table" },
  ],
  a11y: [
    "Announcements give the value, group, category and percentile within the row.",
    "The summary lists the median and IQR of every row.",
    "The brush result is announced with the count and range.",
  ],
  reducedMotion: "Dots render in place; updates and highlights are instant.",
  examples: [
    { title: "Latency by region", description: "Grouped swarms with an SLO reference and a brush callback.", Demo: Latency, wide: true },
    { title: "One distribution", description: "Exam scores colored by track.", Demo: Scores, wide: true },
  ],
};
export default item;
