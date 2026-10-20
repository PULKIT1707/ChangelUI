import { AreaChart, ChartInsights, ChartSummary, InsightList, LineChart, type ChartInsightsProps, type InsightKind, type RankedInsight } from "changelui";
import { useMemo, useState } from "react";
import { ChartDemo } from "../../components/chart-demo";
import { conversionDays, dailyTraffic, monthlyRevenue, useSeed } from "../../lib/chart-data";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";
type DemoProps = {
  max: number;
  extrema: boolean;
  anomalies: boolean;
  change: boolean;
  threshold: boolean;
  streak: boolean;
  labels: boolean;
  list: boolean;
  summary: boolean;
};
const defaults: DemoProps = { max: 4, extrema: true, anomalies: true, change: true, threshold: true, streak: false, labels: true, list: true, summary: true };
const controls: ControlSpec<DemoProps>[] = [
  { type: "number", prop: "max", label: "Max insights", min: 1, max: 8, step: 1 },
  { type: "boolean", prop: "extrema", label: "Peaks and lows" },
  { type: "boolean", prop: "anomalies", label: "Anomalies (MAD)" },
  { type: "boolean", prop: "change", label: "Level shifts (CUSUM)" },
  { type: "boolean", prop: "threshold", label: "Threshold crossings" },
  { type: "boolean", prop: "streak", label: "Streaks" },
  { type: "boolean", prop: "labels", label: "Plot labels" },
  { type: "boolean", prop: "list", label: "Insight list" },
  { type: "boolean", prop: "summary", label: "Summary card" },
];
const pct = (v: number) => `${v.toFixed(2)}%`;
function kinds(p: DemoProps): InsightKind[] {
  const out: InsightKind[] = [];
  if (p.extrema) out.push("extrema");
  if (p.anomalies) out.push("anomalies");
  if (p.change) out.push("change");
  if (p.threshold) out.push("threshold");
  if (p.streak) out.push("streak");
  return out;
}
function Preview({ props }: { props: DemoProps }) {
  const [seed, randomize] = useSeed(6);
  const rows = useMemo(() => conversionDays(seed), [seed]);
  return (
    <ChartDemo onRandomize={randomize} hint="Insights are detected from the data, no AI. Hover an insight in the list to light up its region; click it to focus that point.">
      <LineChart
        title="Checkout conversion"
        description="Daily, March to April 2026"
        data={rows}
        x="date"
        series={[{ id: "rate", y: "rate", label: "Conversion", format: pct, area: true }]}
        height={300}
        markers={false}
        legend="none"
        yAxis={{ format: pct }}
      >
        <ChartInsights
          detect={kinds(props)}
          max={props.max}
          thresholds={[3.5]}
          labels={props.labels}
          list={props.list ? "bottom" : false}
          summary={props.summary ? "top" : false}
        />
      </LineChart>
    </ChartDemo>
  );
}
function Mini() {
  const rows = useMemo(() => conversionDays(3, 40), []);
  return (
    <LineChart data={rows} x="date" series={[{ id: "rate", y: "rate", area: true }]} height={150} initialWidth={260} legend="none" markers={false} grid={false} interactive={false} animation="never" yAxis={{ hide: true }} xAxis={{ hide: true }}>
      <ChartInsights max={3} />
    </LineChart>
  );
}
function TrafficStory() {
  const [seed, randomize] = useSeed(4);
  const rows = useMemo(() => dailyTraffic(seed, 120), [seed]);
  const [picked, setPicked] = useState<RankedInsight | null>(null);
  return (
    <ChartDemo onRandomize={randomize} hint="InsightList and ChartSummary are separate parts too; onInsightClick reports the pick.">
      <AreaChart data={rows} x="date" series={[{ id: "visitors", y: "visitors", label: "Visitors" }]} height={260} legend="none">
        <ChartSummary position="top" heading="In short" insightSentences={3} />
        <ChartInsights detect={["anomalies", "change"]} max={5} />
        <InsightList position="bottom" detect={["anomalies", "change"]} max={5} onInsightClick={setPicked} />
      </AreaChart>
      <p className="text-xs text-pui-muted-foreground" aria-live="polite">
        {picked ? `Picked: ${picked.title} (${picked.detail})` : "Pick an insight"}
      </p>
    </ChartDemo>
  );
}
function Streaks() {
  const [seed, randomize] = useSeed(10);
  const rows = useMemo(() => monthlyRevenue(seed, 24).map((r, i) => ({ ...r, i })), [seed]);
  return (
    <ChartDemo onRandomize={randomize} hint="Streaks and target crossings on revenue; hover a streak to shade its run.">
      <LineChart data={rows} x="i" xScale="band" series={[{ id: "revenue", y: "revenue", label: "Revenue", format: { style: "currency", currency: "USD", notation: "compact" } }]} height={260} legend="none" formatX={(v) => `Month ${Number(v) + 1}`}>
        <ChartInsights detect={["streak", "threshold", "extrema"]} thresholds={[50_000]} max={5} list="bottom" />
      </LineChart>
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
      '<LineChart data={rows} x="date" series={[{ id: "rate", y: "rate" }]}>',
      "  <ChartInsights",
      `    detect={${JSON.stringify(kinds(p))}}`,
      p.max !== 4 ? `    max={${p.max}}` : null,
      p.threshold ? "    thresholds={[3.5]}" : null,
      p.labels ? null : "    labels={false}",
      p.list ? '    list="bottom"' : null,
      p.summary ? '    summary="top"' : null,
      "  />",
      "</LineChart>",
    ]
      .filter(Boolean)
      .join("\n"),
  propsTable: propDocs<ChartInsightsProps>()([
    { name: "detect", type: "InsightKind[]", default: '["extrema", "anomalies", "change", "threshold"]', description: '"extrema" | "anomalies" (MAD z > 3.5) | "change" (CUSUM) | "threshold" | "streak".' },
    { name: "max", type: "number", default: "4", description: "How many insights to show, by priority (anomalies, shifts, extremes, crossings, streaks)." },
    { name: "seriesId", type: "string", description: "Series to analyze. Default: the first visible one." },
    { name: "thresholds", type: "number[]", description: "Values whose crossings are reported (targets, SLOs)." },
    { name: "anomalyThreshold", type: "number", default: "3.5", description: "Robust z-score cut-off." },
    { name: "streakMin", type: "number", default: "3", description: "Shortest streak reported." },
    { name: "labels", type: "boolean", default: "true", description: "Pill labels placed without overlaps; markers only when false." },
    { name: "list", type: '"top" | "bottom" | false', default: "false", description: "Also render the InsightList." },
    { name: "summary", type: '"top" | "bottom" | false', default: "false", description: "Also render the ChartSummary card." },
    { name: "onInsightClick", type: "(insight: RankedInsight) => void", description: "A list item was picked." },
  ]),
  keyboard: [
    { keys: "Tab", action: "Into the plot, then the insight list" },
    { keys: "Focus an insight", action: "Highlights its region and shows the tooltip" },
    { keys: "Enter on an insight", action: "Moves focus to that point; arrows continue from there" },
  ],
  a11y: [
    "Insights are a real ordered list of text, not just pixels on the plot.",
    "ChartSummary writes the trend, extremes and top insights as one paragraph; useChartSummary() returns the same text.",
    "Picking an insight announces it and hands focus to the chart at that point.",
  ],
  reducedMotion: "Markers and labels appear in place, with no leader-line draw or anomaly pulse.",
  examples: [
    { title: "Traffic story", description: "Summary, annotations and list as separate parts.", Demo: TrafficStory, wide: true },
    { title: "Streaks and targets", description: "Runs of growth and crossings of a target.", Demo: Streaks, wide: true },
  ],
};
export default item;
