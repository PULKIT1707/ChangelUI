import { BarChart, LineChart, ScrollyChart, type ChartAnnotationProps, type ReferenceAreaProps, type ScrollyChartProps, type ScrollyStep } from "changelui";
import { useMemo } from "react";
import { ChartDemo } from "../../components/chart-demo";
import { adoptionStory, productSales, useSeed } from "../../lib/chart-data";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";
type DemoProps = {
  side: "left" | "right";
  mode: "step" | "progress";
  offset: number;
  height: number;
  graphicShare: number;
  rail: boolean;
};
const defaults: DemoProps = { side: "right", mode: "step", offset: 0.5, height: 520, graphicShare: 0.58, rail: true };
const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "side", label: "Graphic side", options: ["right", "left"] },
  { type: "select", prop: "mode", label: "Mode", options: ["step", "progress"] },
  { type: "number", prop: "offset", label: "Trigger line", min: 0.2, max: 0.8, step: 0.05 },
  { type: "number", prop: "height", label: "Scroll box (px)", min: 380, max: 720, step: 20 },
  { type: "number", prop: "graphicShare", label: "Graphic width", min: 0.4, max: 0.7, step: 0.02 },
  { type: "boolean", prop: "rail", label: "Step rail" },
];
interface StoryState {
  window: [number, number] | null;
  annotation?: ChartAnnotationProps;
  area?: ReferenceAreaProps;
  forecast?: boolean;
}
const W = (y: number, m: number, d = 1) => Date.UTC(y, m, d);
function useStory(seed: number): Array<ScrollyStep<StoryState>> {
  return useMemo(() => {
    const rows = adoptionStory(seed);
    const at = (i: number) => rows[i]?.week ?? new Date(0);
    return [
      {
        id: "overview",
        label: "Two years",
        state: { window: null },
        content: (
          <>
            <p className="font-semibold">Two years of weekly active users.</p>
            <p className="mt-1 text-pui-muted-foreground">From about 40K to well over 100K. Scroll to walk through what happened.</p>
          </>
        ),
      },
      {
        id: "launch",
        label: "Launch",
        state: { window: [W(2024, 4), W(2024, 10)], annotation: { x: at(32), seriesId: "users", label: "Mobile launch", note: "Week 31", tone: "primary" }, area: { x: [at(30), at(34)], label: "Launch", tone: "primary" } },
        content: (
          <>
            <p className="font-semibold">The mobile launch.</p>
            <p className="mt-1 text-pui-muted-foreground">Four weeks in August added more users than the previous six months. The chart zooms in on its own.</p>
          </>
        ),
      },
      {
        id: "outage",
        label: "Outage",
        state: { window: [W(2024, 10), W(2025, 2)], annotation: { x: at(52), seriesId: "users", label: "Outage", note: "Two bad weeks", tone: "danger" } },
        content: (
          <>
            <p className="font-semibold">Then a two-week outage.</p>
            <p className="mt-1 text-pui-muted-foreground">Activity fell by almost a third over New Year, and recovered just as quickly.</p>
          </>
        ),
      },
      {
        id: "plateau",
        label: "Plateau",
        state: { window: [W(2025, 0), W(2025, 6)], area: { x: [at(60), at(72)], label: "Flat", tone: "warning" } },
        content: (
          <>
            <p className="font-semibold">A long plateau.</p>
            <p className="mt-1 text-pui-muted-foreground">Twelve weeks with no growth at all, while the team rebuilt pricing.</p>
          </>
        ),
      },
      {
        id: "pricing",
        label: "New pricing",
        state: { window: null, annotation: { x: at(80), seriesId: "users", label: "New pricing", tone: "success" }, forecast: true },
        content: (
          <>
            <p className="font-semibold">New pricing, new slope.</p>
            <p className="mt-1 text-pui-muted-foreground">Growth came back at about 2% a week, the steepest since launch.</p>
          </>
        ),
      },
    ];
  }, [seed]);
}
function StoryChart({ seed, state, progress }: { seed: number; state: StoryState; progress: number }) {
  const rows = useMemo(() => adoptionStory(seed), [seed]);
  return (
    <LineChart
      data={rows}
      x="week"
      series={[{ id: "users", y: "users", label: "Weekly active users", area: true, format: (v: number) => `${v.toFixed(1)}K` }]}
      xDomain={state.window}
      height={300}
      legend="none"
      markers={false}
      yAxis={{ format: (v: number) => `${v}K` }}
      annotations={state.annotation ? [state.annotation] : []}
      referenceAreas={state.area ? [state.area] : []}
      referenceLines={state.forecast ? [{ y: 100, label: "100K", tone: "success" }] : []}
      chartLabel="Weekly active users"
      style={{ opacity: 0.85 + 0.15 * (1 - Math.abs(progress - 0.5) * 2) }}
    />
  );
}
function Preview({ props }: { props: DemoProps }) {
  const [seed, randomize] = useSeed(2);
  const steps = useStory(seed);
  return (
    <ChartDemo onRandomize={randomize} hint="Scroll inside the box. Each step sets the chart's window, annotation and highlight; the chart tweens between them.">
      <ScrollyChart<StoryState>
        steps={steps}
        side={props.side}
        mode={props.mode}
        offset={props.offset}
        height={props.height}
        graphicShare={props.graphicShare}
        rail={props.rail}
        render={(state, ctx) => <StoryChart seed={seed} state={state} progress={ctx.progress} />}
        className="rounded-pui-lg border border-pui-border"
      />
    </ChartDemo>
  );
}
function Mini() {
  const rows = useMemo(() => adoptionStory(3, 60), []);
  return (
    <div className="flex w-64 items-center gap-3">
      <div className="flex w-24 flex-col gap-1.5" aria-hidden="true">
        <span className="h-8 rounded-pui-sm border border-pui-primary/40 bg-pui-background" />
        <span className="h-8 rounded-pui-sm border border-pui-border opacity-50" />
        <span className="h-8 rounded-pui-sm border border-pui-border opacity-30" />
      </div>
      <LineChart data={rows} x="week" series={[{ id: "users", y: "users", area: true }]} height={110} initialWidth={150} legend="none" markers={false} grid={false} interactive={false} animation="never" yAxis={{ hide: true }} xAxis={{ hide: true }} className="min-w-0 flex-1" />
    </div>
  );
}
const PRODUCT_STEPS: Array<ScrollyStep<{ count: number; sort: "none" | "desc" }>> = [
  { id: "few", label: "Three", state: { count: 3, sort: "none" }, content: <p>Start with the three products everyone knows.</p> },
  { id: "all", label: "All", state: { count: 8, sort: "none" }, content: <p>Now the whole catalog: bars grow in as products enter.</p> },
  { id: "ranked", label: "Ranked", state: { count: 8, sort: "desc" }, content: <p>Sorted by units, the long tail is obvious.</p> },
];
function Ranking() {
  const [seed, randomize] = useSeed(7);
  const rows = useMemo(() => productSales(seed, 8), [seed]);
  return (
    <ChartDemo onRandomize={randomize} hint="Any chart works as the graphic: here a BarChart that adds categories, then re-sorts.">
      <ScrollyChart
        steps={PRODUCT_STEPS}
        side="left"
        height={420}
        render={(s) => (
          <BarChart data={rows.slice(0, s.count)} x="name" series={[{ id: "sales", y: "sales", label: "Units sold" }]} sort={s.sort} height={260} legend="none" />
        )}
        className="rounded-pui-lg border border-pui-border"
      />
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
      "<ScrollyChart",
      "  steps={[",
      '    { id: "overview", content: <p>Two years of users.</p>, state: { window: null } },',
      '    { id: "launch", content: <p>The mobile launch.</p>, state: { window: [may, nov] } },',
      "  ]}",
      '  render={(state) => <LineChart data={rows} x="week" series={series} xDomain={state.window} />}',
      p.side !== "right" ? `  side="${p.side}"` : null,
      p.mode !== "step" ? `  mode="${p.mode}"` : null,
      p.offset !== 0.5 ? `  offset={${p.offset}}` : null,
      `  height={${p.height}} // omit to scroll with the page`,
      p.rail ? null : "  rail={false}",
      "/>",
    ]
      .filter(Boolean)
      .join("\n"),
  propsTable: propDocs<ScrollyChartProps<unknown>>()([
    { name: "steps", type: "{ id, content, state, label? }[]", required: true, description: "Prose steps, each with the chart state it shows." },
    { name: "render", type: "(state, ctx) => ReactNode", required: true, description: "The sticky graphic; ctx has index, progress and total." },
    { name: "mode", type: '"step" | "progress"', default: '"step"', description: "progress also reports 0..1 through the active step." },
    { name: "offset", type: "number", default: "0.5", description: "Trigger line as a fraction of the viewport (or scroll box)." },
    { name: "side", type: '"left" | "right"', default: '"right"', description: "Graphic side on wide screens; narrow screens overlay the steps." },
    { name: "height", type: "number", description: "Make the component its own scroll box of this height." },
    { name: "graphicShare", type: "number", default: "0.58", description: "Width share of the graphic column." },
    { name: "rail", type: "boolean", default: "true", description: "Clickable step rail with the current step." },
    { name: "activeStep", type: "number", description: "Controlled active step (with onStepChange)." },
    { name: "onStepChange", type: "(index, step) => void", description: "The active step changed." },
  ]),
  keyboard: [
    { keys: "Scroll / Page Down", action: "Advance the story" },
    { keys: "Tab to the rail, Enter", action: "Jump to a step (focus moves to it)" },
  ],
  a11y: [
    "Steps are ordinary content in reading order; nothing is announced on scroll.",
    "The rail marks the current step with aria-current and every button has a name.",
    "The chart inside keeps its own summary, keyboard exploration and data table.",
  ],
  reducedMotion: "Steps switch instantly, the rail jumps instead of smooth-scrolling, and the chart applies new states without tweening.",
  examples: [{ title: "Bars that grow and re-rank", description: "Graphic on the left, a BarChart per state.", Demo: Ranking, wide: true }],
};
export default item;
