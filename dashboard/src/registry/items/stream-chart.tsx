import { StreamChart, type StreamChartProps } from "changelui";
import { useMemo, useState } from "react";
import { ChartDemo } from "../../components/chart-demo";
import { deviceMix, genreStreams, GENRES, useSeed } from "../../lib/chart-data";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  offset: "wiggle" | "silhouette" | "expand" | "zero";
  order: "insideOut" | "none" | "ascending" | "descending";
  curve: "monotone" | "natural" | "linear" | "step";
  labels: boolean;
  patterns: boolean;
  legend: "top" | "bottom" | "none";
};
const defaults: DemoProps = { offset: "wiggle", order: "insideOut", curve: "monotone", labels: true, patterns: false, legend: "top" };
const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "offset", label: "Offset", options: ["wiggle", "silhouette", "expand", "zero"] },
  { type: "select", prop: "order", label: "Order", options: ["insideOut", "none", "ascending", "descending"] },
  { type: "select", prop: "curve", label: "Curve", options: ["monotone", "natural", "linear", "step"] },
  { type: "boolean", prop: "labels", label: "Inside labels" },
  { type: "boolean", prop: "patterns", label: "Pattern fills" },
  { type: "select", prop: "legend", label: "Legend", options: ["top", "bottom", "none"] },
];
const millions = { maximumFractionDigits: 1 } as const;

function Preview({ props }: { props: DemoProps }) {
  const [seed, randomize] = useSeed(3);
  const data = useMemo(() => genreStreams(seed), [seed]);
  return (
    <ChartDemo onRandomize={randomize} hint="Hover a layer to isolate it. Click legend chips to collapse layers (Alt+click solos). Arrows walk weeks and layers; Enter solos.">
      <StreamChart
        data={data}
        x="week"
        series={[...GENRES]}
        offset={props.offset}
        order={props.order}
        curve={props.curve}
        labels={props.labels ? "inside" : "none"}
        patterns={props.patterns}
        legend={props.legend}
        format={millions}
        label="Streams (M)"
        title="Weekly streams by genre"
        description="Millions of plays, 2025"
        height={340}
        className="w-full"
      />
    </ChartDemo>
  );
}

function Mini() {
  const data = useMemo(() => genreStreams(5, 30), []);
  return <StreamChart data={data} x="week" series={["Pop", "Hip-hop", "Rock", "Electronic", "Indie"]} legend="none" labels="none" height={110} initialWidth={220} animation="never" className="w-56 [&_text]:hidden" />;
}

function Devices() {
  const [seed, randomize] = useSeed(8);
  const data = useMemo(() => deviceMix(seed), [seed]);
  const [hidden, setHidden] = useState<string[]>([]);
  const series = [
    { key: "ios", label: "iOS" },
    { key: "android", label: "Android" },
    { key: "web", label: "Web" },
    { key: "desktop", label: "Desktop" },
    { key: "tv", label: "TV app" },
  ];
  return (
    <ChartDemo onRandomize={randomize} hint='offset="expand": shares of the whole. The TV app launch carves out its own layer.'>
      <StreamChart
        data={data}
        x="month"
        xFormat={{ month: "short", year: "2-digit", timeZone: "UTC" }}
        series={series}
        offset="expand"
        order="none"
        hiddenSeries={hidden}
        onHiddenSeriesChange={setHidden}
        label="Devices"
        title="Active devices by platform"
        height={260}
        tableToggle
        className="w-full"
      />
      <p className="text-xs text-pui-muted-foreground" aria-live="polite">
        {hidden.length ? `Hidden: ${hidden.join(", ")}` : "All platforms shown (controlled hiddenSeries)."}
      </p>
    </ChartDemo>
  );
}

function Silhouette() {
  const data = useMemo(() => genreStreams(11, 40), []);
  return (
    <StreamChart
      data={data}
      x="week"
      series={GENRES.slice(0, 6).map((g, i) => ({ key: g, color: `var(--pui-chart-${(i % 3) + 1})` }))}
      offset="silhouette"
      curve="natural"
      legend="bottom"
      patterns
      label="Streams (M)"
      height={240}
      className="w-full"
    />
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (p) =>
    [
      "<StreamChart",
      "  data={weeks} // [{ week, Pop, Rock, ... }]",
      '  x="week"',
      '  series={["Pop", "Hip-hop", "Rock", "Electronic"]}',
      p.offset !== "wiggle" ? `  offset="${p.offset}"` : null,
      p.order !== "insideOut" ? `  order="${p.order}"` : null,
      p.curve !== "monotone" ? `  curve="${p.curve}"` : null,
      p.labels ? null : '  labels="none"',
      p.patterns ? "  patterns" : null,
      p.legend !== "top" ? `  legend="${p.legend}"` : null,
      '  label="Streams"',
      "/>",
    ]
      .filter(Boolean)
      .join("\n"),
  propsTable: propDocs<StreamChartProps<unknown>>()([
    { name: "data", type: "readonly T[]", description: "Wide rows: one per x with a numeric column per layer." },
    { name: "x", type: "keyof T | (row, i) => string | number | Date", description: "The x of a row; points are evenly spaced." },
    { name: "series", type: "(string | { key, label?, color? })[]", description: "Layers by row key." },
    { name: "offset", type: '"wiggle" | "silhouette" | "expand" | "zero"', default: '"wiggle"', description: "Baseline: streamgraph, centered, 100% or stacked." },
    { name: "order", type: '"insideOut" | "none" | "ascending" | "descending"', default: '"insideOut"', description: "Layer order from the baseline out." },
    { name: "curve", type: '"monotone" | "natural" | "linear" | "step"', default: '"monotone"', description: "Edge interpolation." },
    { name: "labels", type: '"inside" | "none"', default: '"inside"', description: "Names inside each layer at its widest point." },
    { name: "patterns", type: "boolean", default: "false", description: "Pattern fills as a second encoding." },
    { name: "hiddenSeries", type: "string[]", description: "Controlled hidden layers (with onHiddenSeriesChange)." },
    { name: "xFormat", type: "Intl.DateTimeFormatOptions | (x, i) => string", description: "x label format." },
    { name: "tableToggle", type: "boolean", default: "false", description: "A visible Show data button." },
  ]),
  keyboard: [
    { keys: "Tab", action: "Focus the plot" },
    { keys: "← / →", action: "Previous / next point" },
    { keys: "↑ / ↓", action: "Layer above / below (↑ from the top returns to the totals)" },
    { keys: "Home / End, PageUp / PageDown", action: "First / last point, jump 10%" },
    { keys: "Enter / Space", action: "Show only the focused layer (again to show all)" },
    { keys: "T", action: "Show or hide the data table" },
  ],
  a11y: [
    "Announcements include the value and the share of the total at that point.",
    "The summary names the largest and fastest-growing layers and the peak total.",
    "Legend chips are aria-pressed toggles; pattern fills give a non-color encoding.",
  ],
  reducedMotion: "No grow-in; legend toggles and data updates re-flow instantly.",
  examples: [
    { title: "Platform shares", description: "100% stream with a controlled legend and a visible data table.", Demo: Devices, wide: true },
    { title: "Silhouette with patterns", description: "Centered baseline, natural curves, three colors plus patterns.", Demo: Silhouette, wide: true },
  ],
};
export default item;
