import { BumpChart, type BumpChartProps } from "changelui";
import { useMemo, useState } from "react";
import { ChartDemo } from "../../components/chart-demo";
import { languageSurvey, leagueTable, useSeed } from "../../lib/chart-data";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  curve: "bump" | "linear";
  directLabels: boolean;
  showRanks: boolean;
  seasons: number;
};
const defaults: DemoProps = { curve: "bump", directLabels: true, showRanks: true, seasons: 8 };
const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "curve", label: "Curve", options: ["bump", "linear"] },
  { type: "boolean", prop: "directLabels", label: "Direct labels" },
  { type: "boolean", prop: "showRanks", label: "Rank numbers" },
  { type: "number", prop: "seasons", label: "Seasons", min: 3, max: 12, step: 1 },
];

function Preview({ props }: { props: DemoProps }) {
  const [seed, randomize] = useSeed(4);
  const data = useMemo(() => leagueTable(seed, props.seasons), [seed, props.seasons]);
  return (
    <ChartDemo onRandomize={randomize} hint="Hover a line to follow a team; click to pin several. Arrows walk seasons and ranks; Enter pins.">
      <BumpChart
        data={data}
        x="season"
        series="team"
        value="points"
        curve={props.curve}
        directLabels={props.directLabels}
        showRanks={props.showRanks}
        label="Teams"
        title="League position by season"
        description="Ranked by points"
        className="w-full"
      />
    </ChartDemo>
  );
}

function Mini() {
  const data = useMemo(() => leagueTable(2, 6).filter((r) => ["Harbor FC", "Northside", "Red Valley", "Union City", "Ironworks"].includes(r.team)), []);
  return <BumpChart data={data} x="season" series="team" value="points" directLabels={false} showRanks={false} height={110} initialWidth={220} animation="never" className="w-56 [&_text]:hidden" />;
}

function Languages() {
  const [seed, randomize] = useSeed(9);
  const data = useMemo(() => languageSurvey(seed), [seed]);
  const [pinned, setPinned] = useState<string[]>(["Rust", "TypeScript"]);
  return (
    <ChartDemo onRandomize={randomize} hint="Controlled pins: the chips below and the chart stay in sync.">
      <BumpChart
        data={data}
        x="year"
        series="language"
        value="share"
        format={{ maximumFractionDigits: 1 }}
        pinned={pinned}
        onPinnedChange={setPinned}
        label="Languages"
        title="Most-used languages, survey rank"
        rowHeight={30}
        tableToggle
        className="w-full"
      />
      <div className="flex flex-wrap gap-1.5" aria-label="Pinned languages">
        {pinned.length ? (
          pinned.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPinned(pinned.filter((x) => x !== p))}
              className="rounded-pui-full border border-pui-border px-2.5 py-0.5 text-xs hover:bg-pui-muted focus-visible:outline-2 focus-visible:outline-pui-ring"
            >
              {p} &times;
            </button>
          ))
        ) : (
          <span className="text-xs text-pui-muted-foreground">Click lines to pin them.</span>
        )}
      </div>
    </ChartDemo>
  );
}

const explicit = [
  { week: "W1", feature: "Search", rank: 1 },
  { week: "W1", feature: "Export", rank: 2 },
  { week: "W1", feature: "Comments", rank: 3 },
  { week: "W1", feature: "Dark mode", rank: 4 },
  { week: "W2", feature: "Search", rank: 1 },
  { week: "W2", feature: "Dark mode", rank: 2 },
  { week: "W2", feature: "Export", rank: 3 },
  { week: "W2", feature: "Comments", rank: 4 },
  { week: "W3", feature: "Dark mode", rank: 1 },
  { week: "W3", feature: "Search", rank: 2 },
  { week: "W3", feature: "Comments", rank: 3 },
  { week: "W3", feature: "Export", rank: 4 },
  { week: "W4", feature: "Dark mode", rank: 1 },
  { week: "W4", feature: "Comments", rank: 2 },
  { week: "W4", feature: "Search", rank: 3 },
  { week: "W4", feature: "Export", rank: 4 },
];

function ExplicitRanks() {
  return <BumpChart data={explicit} x="week" series="feature" rank="rank" label="Features" title="Feature usage rank (explicit ranks)" rowHeight={38} className="w-full" />;
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (p) =>
    [
      "<BumpChart",
      "  data={standings} // [{ season, team, points }]",
      '  x="season"',
      '  series="team"',
      '  value="points"',
      p.curve !== "bump" ? `  curve="${p.curve}"` : null,
      p.directLabels ? null : "  directLabels={false}",
      p.showRanks ? null : "  showRanks={false}",
      '  label="Teams"',
      "/>",
    ]
      .filter(Boolean)
      .join("\n"),
  propsTable: propDocs<BumpChartProps<unknown>>()([
    { name: "data", type: "readonly T[]", description: "Long rows: one per entity and period." },
    { name: "x", type: "keyof T | (row, i) => string | number", description: "The period." },
    { name: "series", type: "keyof T | (row, i) => string", description: "The entity." },
    { name: "value", type: "keyof T | (row, i) => number", description: "Score to rank by within each period." },
    { name: "rank", type: "keyof T | (row, i) => number", description: "Explicit rank (1 = top), instead of value." },
    { name: "higherIsBetter", type: "boolean", default: "true", description: "Rank direction when ranking by value." },
    { name: "curve", type: '"bump" | "linear"', default: '"bump"', description: "Sigmoid bumps or straight segments." },
    { name: "directLabels", type: "boolean", default: "true", description: "Names at both ends of each line." },
    { name: "showRanks", type: "boolean", default: "true", description: "Rank numbers inside the dots." },
    { name: "pinned", type: "string[]", description: "Controlled pinned entities (with onPinnedChange)." },
    { name: "rowHeight", type: "number", default: "34", description: "Height per rank in px." },
  ]),
  keyboard: [
    { keys: "Tab", action: "Focus the plot" },
    { keys: "← / →", action: "Previous / next period for the focused entity" },
    { keys: "↑ / ↓", action: "Entity ranked above / below in this period" },
    { keys: "Enter / Space", action: "Pin or unpin the focused line" },
    { keys: "Escape", action: "Clear the focus, then the pins" },
    { keys: "T", action: "Show or hide the rank table" },
  ],
  a11y: [
    'Announcements read like "Harbor FC: 3rd in 2022, up 2 (71)".',
    "The summary names the biggest climber, the biggest fall and the most frequent leader.",
    "Rank numbers in the dots and direct labels mean color is never the only key.",
  ],
  reducedMotion: "Lines appear without drawing; re-ranks jump to their rows.",
  examples: [
    { title: "Controlled pins", description: "Survey ranks with pins mirrored outside the chart.", Demo: Languages, wide: true },
    { title: "Explicit ranks", description: "Ranks given directly with the rank accessor.", Demo: ExplicitRanks, wide: true },
  ],
};
export default item;
