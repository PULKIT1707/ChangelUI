import { HorizontalScroll, type HorizontalScrollProps } from "changelui";
import { useMemo } from "react";
import { landscape, SCENES } from "../../lib/demo-art";
import { ScrollStage } from "../../lib/scroll-stage";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = { panels: number; smooth: boolean; progress: boolean; breakpoint: number };
const defaults: DemoProps = { panels: 6, smooth: true, progress: true, breakpoint: 640 };
const controls: ControlSpec<DemoProps>[] = [
  { type: "number", prop: "panels", label: "Panels", min: 3, max: 8, step: 1 },
  { type: "boolean", prop: "smooth", label: "Smooth" },
  { type: "boolean", prop: "progress", label: "Progress bar" },
  { type: "number", prop: "breakpoint", label: "Fallback below (px)", min: 0, max: 1200, step: 40 },
];

const STUDIES = [
  { client: "Northwind", title: "A checkout that converts", stat: "+31% conversion" },
  { client: "Lumen", title: "Design system in 6 weeks", stat: "240 components" },
  { client: "Atlas Labs", title: "From 9s to 1.2s", stat: "−87% load time" },
  { client: "Fieldnote", title: "Offline-first notes", stat: "4.9★ rating" },
  { client: "Orbit", title: "Realtime fleet map", stat: "12k vehicles" },
  { client: "Kite", title: "Onboarding rewrite", stat: "2× activation" },
  { client: "Harbor", title: "Accessible banking", stat: "WCAG 2.2 AA" },
  { client: "Pine", title: "Pricing experiments", stat: "+18% ARPU" },
];

function useArt(count: number) {
  return useMemo(() => Array.from({ length: count }, (_, i) => landscape(SCENES[i % SCENES.length] ?? SCENES[0]!, i + 11, 900, 640)), [count]);
}

function Preview({ props }: { props: DemoProps }) {
  const { panels, ...rest } = props;
  const art = useArt(8);
  return (
    <ScrollStage height="h-[26rem]" hint="Scroll down to move sideways" lead="h-32" tail="h-40">
      {(ref) => (
        <HorizontalScroll {...rest} container={ref} label="Case studies" trackClassName="gap-5 px-6 sm:px-10">
          <div className="flex w-64 flex-col justify-center gap-3 sm:w-72">
            <span className="text-xs font-semibold tracking-widest text-pui-primary-text uppercase">Selected work</span>
            <h3 className="m-0 font-pui-display text-3xl font-bold tracking-tight text-pui-foreground">Case studies, one scroll away</h3>
            <p className="m-0 text-sm text-pui-muted-foreground">Keep scrolling: the row slides while the section stays pinned.</p>
          </div>
          {STUDIES.slice(0, panels).map((s, i) => (
            <article key={s.client} className="group relative h-72 w-64 overflow-hidden rounded-pui-xl border border-pui-border bg-pui-surface shadow-pui-lg sm:w-80">
              <img src={art[i]} alt="" className="block h-40 w-full object-cover transition-transform duration-(--pui-duration-page) ease-(--pui-ease-out) group-hover:scale-105" />
              <div className="flex flex-col gap-1 p-4">
                <span className="text-xs font-medium text-pui-muted-foreground">{s.client}</span>
                <h4 className="m-0 text-base font-semibold text-pui-surface-foreground">{s.title}</h4>
                <span className="mt-1 w-fit rounded-full bg-pui-primary/12 px-2 py-0.5 text-xs font-semibold text-pui-primary-text">{s.stat}</span>
              </div>
            </article>
          ))}
        </HorizontalScroll>
      )}
    </ScrollStage>
  );
}

const YEARS = [
  { year: "2019", text: "Two founders, one spare room and a prototype." },
  { year: "2020", text: "First 100 customers, all from word of mouth." },
  { year: "2021", text: "Seed round and a team of twelve." },
  { year: "2022", text: "Launched in Europe and Japan." },
  { year: "2023", text: "One million projects created." },
  { year: "2024", text: "Open-sourced the core engine." },
];

function TimelineDemo() {
  return (
    <ScrollStage hint="A company timeline" lead="h-20" tail="h-24">
      {(ref) => (
        <HorizontalScroll container={ref} label="Company timeline" trackClassName="items-center gap-0 px-8">
          {YEARS.map((y, i) => (
            <div key={y.year} className="relative flex w-56 flex-col gap-2 pr-8">
              <div className="flex items-center gap-3">
                <span className="size-3 shrink-0 rounded-full bg-pui-primary shadow-pui-glow" />
                {i < YEARS.length - 1 ? <span className="h-px flex-1 bg-pui-border" /> : null}
              </div>
              <span className="font-pui-display text-4xl font-bold tracking-tight text-pui-foreground tabular-nums">{y.year}</span>
              <p className="m-0 text-sm text-pui-muted-foreground">{y.text}</p>
            </div>
          ))}
        </HorizontalScroll>
      )}
    </ScrollStage>
  );
}

function SwatchDemo() {
  const tones = ["var(--pui-chart-1)", "var(--pui-chart-2)", "var(--pui-chart-3)", "var(--pui-chart-4)", "var(--pui-chart-5)", "var(--pui-primary)"];
  return (
    <ScrollStage hint="Full-bleed color panels" lead="h-20" tail="h-24">
      {(ref) => (
        <HorizontalScroll container={ref} progress={false} label="Palette" trackClassName="gap-3 px-4">
          {tones.map((tone, i) => (
            <div
              key={tone}
              className="flex h-56 w-48 flex-col justify-end rounded-pui-xl p-3 shadow-pui-md"
              style={{ background: `linear-gradient(160deg, ${tone}, color-mix(in oklch, ${tone} 55%, var(--pui-surface)))` }}
            >
              <span className="flex items-center justify-between rounded-pui-md bg-pui-surface/85 px-2.5 py-1.5 text-sm font-semibold text-pui-surface-foreground backdrop-blur-sm">
                {tone.replace("var(--pui-", "").replace(")", "")}
                <span className="font-pui-mono text-xs text-pui-muted-foreground">0{i + 1}</span>
              </span>
            </div>
          ))}
        </HorizontalScroll>
      )}
    </ScrollStage>
  );
}

function Mini() {
  return (
    <div className="relative w-44 overflow-hidden rounded-pui-md border border-pui-border bg-pui-background p-2">
      <div className="flex gap-1.5" style={{ transform: "translateX(-22px)" }}>
        {[1, 2, 3, 4].map((i) => (
          <span key={i} className="h-14 w-14 shrink-0 rounded-pui-sm shadow-pui-xs" style={{ background: `var(--pui-chart-${i})` }} />
        ))}
      </div>
      <div className="mt-2 h-0.5 rounded-full bg-pui-border">
        <div className="h-full w-1/2 rounded-full bg-linear-to-r from-pui-beam-from to-pui-beam-to" />
      </div>
    </div>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (demo) => {
    const props: Record<string, unknown> = { smooth: demo.smooth, progress: demo.progress, breakpoint: demo.breakpoint, trackClassName: "gap-6 px-10" };
    return toJsx<Record<string, unknown>>(
      "HorizontalScroll",
      props,
      { smooth: true, progress: true, breakpoint: 640, trackClassName: "" },
      `{studies.map((s) => (\n  <CaseStudyCard key={s.id} {...s} />\n))}`,
      controls as ControlSpec<Record<string, unknown>>[],
    );
  },
  propsTable: propDocs<HorizontalScrollProps>()([
    { name: "container", type: "RefObject<HTMLElement | null>", description: "Scroll box the scene lives in; default the window." },
    { name: "height", type: "string", description: "Total scroll length; default sticky height + track overflow (1:1)." },
    { name: "viewportHeight", type: "string", description: "Sticky viewport height; default the container height or 100vh." },
    { name: "breakpoint", type: "number", default: "640", description: "Below this width it becomes a swipeable row; 0 never." },
    { name: "smooth", type: "boolean", default: "true", description: "Ease the track with a spring." },
    { name: "progress", type: "boolean", default: "true", description: "Thin progress bar in the sticky viewport." },
    { name: "label", type: "string", default: '"Scrollable panels"', description: "Region name in the fallback row." },
    { name: "trackClassName", type: "string", description: "Class for the track (gap, padding)." },
  ]),
  a11y: [
    "Panels stay in DOM order, so screen readers and Tab read them left to right.",
    "The fallback row is a labelled, focusable region that scrolls with arrow keys and snaps per panel.",
  ],
  reducedMotion: "No pinning: the panels become a normal horizontal scroller with snap points.",
  examples: [
    { title: "Timeline", description: "Years on a connected rail.", Demo: TimelineDemo, wide: true },
    { title: "Palette", description: "progress={false} with full-bleed color panels.", Demo: SwatchDemo },
  ],
};
export default item;
