import { ActivityRings, type ActivityRing, type ActivityRingsProps } from "changelui";
import { mulberry32 } from "@pui-src/lib/random";
import { ChartDemo } from "../../components/chart-demo";
import { useSeed } from "../../lib/chart-data";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  size: number;
  thickness: number;
  gap: number;
  legend: "right" | "bottom" | "none";
  glow: boolean;
  rings: number;
};
const defaults: DemoProps = { size: 200, thickness: 22, gap: 3, legend: "right", glow: true, rings: 3 };
const controls: ControlSpec<DemoProps>[] = [
  { type: "number", prop: "size", label: "Size (px)", min: 100, max: 280, step: 10 },
  { type: "number", prop: "thickness", label: "Thickness (px)", min: 8, max: 32, step: 2 },
  { type: "number", prop: "gap", label: "Gap (px)", min: 0, max: 10, step: 1 },
  { type: "select", prop: "legend", label: "Legend", options: ["right", "bottom", "none"] },
  { type: "boolean", prop: "glow", label: "Head glow" },
  { type: "number", prop: "rings", label: "Rings", min: 1, max: 4, step: 1 },
];

const GOALS = [
  { label: "Move", max: 520, unit: "kcal", color: "var(--pui-chart-4)" },
  { label: "Exercise", max: 30, unit: "min", color: "var(--pui-chart-7)" },
  { label: "Stand", max: 12, unit: "hrs", color: "var(--pui-chart-2)" },
  { label: "Mindful", max: 10, unit: "min", color: "var(--pui-chart-5)" },
];

function today(seed: number, count: number): ActivityRing[] {
  const rand = mulberry32(seed * 2711 + 5);
  return GOALS.slice(0, count).map((g, i) => ({ ...g, value: Math.round(g.max * (i === 1 ? 0.6 + rand() * 1.1 : 0.35 + rand() * 0.8)) }));
}

function Preview({ props }: { props: DemoProps }) {
  const [seed, randomize] = useSeed(3);
  return (
    <ChartDemo onRandomize={randomize} hint="Rings past 100% keep going on a second lap with a cap shadow. Hover or Tab the legend to spotlight a ring.">
      <div className="flex w-full justify-center">
        <ActivityRings rings={today(seed, props.rings)} size={props.size} thickness={props.thickness} gap={props.gap} legend={props.legend} glow={props.glow} chartLabel="Today's activity" />
      </div>
    </ChartDemo>
  );
}

function Mini() {
  return <ActivityRings rings={today(1, 3)} size={96} thickness={11} legend="none" animation="never" />;
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function Week() {
  const [seed, randomize] = useSeed(8);
  return (
    <ChartDemo onRandomize={randomize} hint="Seven compact days; a closed ring means the goal was met.">
      <div className="grid w-full grid-cols-7 gap-1.5">
        {DAYS.map((d, i) => (
          <div key={d} className="flex flex-col items-center gap-1">
            <ActivityRings rings={today(seed * 7 + i, 3)} size={64} thickness={7} gap={1.5} legend="none" glow={false} chartLabel={`${d} activity`} />
            <span className="text-[11px] font-medium text-pui-muted-foreground">{d}</span>
          </div>
        ))}
      </div>
    </ChartDemo>
  );
}

function Okrs() {
  return (
    <ActivityRings
      chartLabel="Q3 objectives"
      size={190}
      thickness={13}
      legend="bottom"
      center={
        <span className="flex flex-col items-center leading-tight">
          <span className="text-lg font-semibold tabular-nums">Q3</span>
          <span className="text-[10px] text-pui-muted-foreground">wk 9/13</span>
        </span>
      }
      rings={[
        { label: "Activation", value: 41, max: 50, unit: "%", color: "var(--pui-chart-1)" },
        { label: "Churn cut", value: 2.6, max: 3, unit: "pts", color: "var(--pui-chart-6)" },
        { label: "NPS", value: 58, max: 45, color: "var(--pui-chart-3)" },
      ]}
      format={{ maximumFractionDigits: 1 }}
    />
  );
}

function Streak() {
  return (
    <ActivityRings
      chartLabel="Reading streak"
      size={150}
      thickness={20}
      rings={[
        { label: "Pages", value: 92, max: 40, unit: "pages", color: "var(--pui-chart-5)" },
        { label: "Minutes", value: 54, max: 30, unit: "min", color: "var(--pui-chart-2)" },
      ]}
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
      "<ActivityRings",
      "  rings={[",
      '    { label: "Move", value: 412, max: 520, unit: "kcal" },',
      '    { label: "Exercise", value: 38, max: 30, unit: "min" },',
      '    { label: "Stand", value: 9, max: 12, unit: "hrs" },',
      "  ]}",
      p.size !== 160 ? `  size={${p.size}}` : null,
      `  thickness={${p.thickness}}`,
      p.gap !== 3 ? `  gap={${p.gap}}` : null,
      p.legend !== "right" ? `  legend="${p.legend}"` : null,
      !p.glow ? "  glow={false}" : null,
      "/>",
    ]
      .filter(Boolean)
      .join("\n"),
  propsTable: propDocs<ActivityRingsProps>()([
    { name: "rings", type: "ActivityRing[]", required: true, description: "{ label, value, max, color?, unit?, key? } from the outside in." },
    { name: "size", type: "number", default: "160", description: "Drawing size in px; scales down with the container." },
    { name: "thickness", type: "number", default: "size / 9", description: "Ring thickness in px." },
    { name: "gap", type: "number", default: "3", description: "Space between rings in px." },
    { name: "legend", type: '"right" | "bottom" | "none"', default: '"right"', description: "Legend buttons that spotlight on hover/focus and pin on click." },
    { name: "center", type: "ReactNode", description: "Middle content when no ring is spotlighted." },
    { name: "glow", type: "boolean", default: "true", description: "Soft glow behind each ring head." },
    { name: "format", type: "Intl.NumberFormatOptions | (v) => string", description: "Value format in the legend and value text." },
    { name: "chartLabel", type: "string", default: '"Activity rings"', description: "Accessible name of the group." },
  ]),
  keyboard: [
    { keys: "Tab", action: "Focus a legend row: spotlights its ring and shows its percentage in the middle" },
    { keys: "Enter / Space", action: "Pin or unpin the spotlight" },
  ],
  a11y: [
    'Each ring is a role="meter" with a value text like "Exercise: 45 of 30 min, 150%".',
    "Legend rows are toggle buttons with the numbers in text; overshoot also shows as a percentage.",
  ],
  reducedMotion: "Rings render at their final sweep, no spring.",
  examples: [
    { title: "A week at a glance", description: "Seven small sets with no legend.", Demo: Week, wide: true },
    { title: "Objectives with a center label", description: "Bottom legend and custom middle content.", Demo: Okrs },
    { title: "Overachiever", description: "Second laps with the darker head and cap shadow.", Demo: Streak },
  ],
};
export default item;
