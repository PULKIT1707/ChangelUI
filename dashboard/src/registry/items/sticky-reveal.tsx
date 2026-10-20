import { StickyReveal, type StickyRevealItem, type StickyRevealProps } from "changelui";
import { useMemo, useState, type ReactNode } from "react";
import { BrainIcon, ChartIcon, CodeIcon, PencilIcon } from "../../lib/demo-icons";
import { landscape, SCENES } from "../../lib/demo-art";
import { ScrollStage } from "../../lib/scroll-stage";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = { side: NonNullable<StickyRevealProps["side"]>; indicator: boolean; stickyTop: number };
const defaults: DemoProps = { side: "right", indicator: true, stickyTop: 24 };
const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "side", label: "Panel side", options: ["right", "left"] },
  { type: "boolean", prop: "indicator", label: "Progress rail" },
  { type: "number", prop: "stickyTop", label: "Sticky top (px)", min: 0, max: 96, step: 4 },
];

function Screen({ tint, icon, children }: { tint: string; icon: ReactNode; children: ReactNode }) {
  return (
    <div className="relative flex size-full flex-col gap-3 p-5" style={{ background: `linear-gradient(135deg, color-mix(in oklch, ${tint} 28%, var(--pui-surface)), var(--pui-surface))` }}>
      <div className="flex items-center gap-2">
        <span className="grid size-8 place-items-center rounded-pui-md text-pui-primary-foreground shadow-pui-sm" style={{ background: tint }}>
          {icon}
        </span>
        <span className="h-2.5 w-24 rounded-full bg-pui-foreground/15" />
        <span className="ml-auto h-2.5 w-10 rounded-full bg-pui-foreground/10" />
      </div>
      <div className="flex-1 rounded-pui-lg border border-pui-border bg-pui-surface/80 p-3 shadow-pui-sm backdrop-blur-sm">{children}</div>
    </div>
  );
}

const STEPS: StickyRevealItem[] = [
  {
    id: "plan",
    eyebrow: "01 · Plan",
    title: "Sketch the idea together",
    body: "Drop notes, screenshots and links on one canvas. Everyone sees the same board, live, so the plan is never out of date.",
    media: (
      <Screen tint="var(--pui-chart-1)" icon={<PencilIcon />}>
        <div className="grid h-full grid-cols-3 gap-2">
          {["bg-pui-warning/40", "bg-pui-info/40", "bg-pui-success/40", "bg-pui-primary/30", "bg-pui-danger/30", "bg-pui-warning/30"].map((c, i) => (
            <span key={i} className={`rounded-pui-sm ${c} ${i % 2 ? "rotate-2" : "-rotate-2"}`} />
          ))}
        </div>
      </Screen>
    ),
  },
  {
    id: "build",
    eyebrow: "02 · Build",
    title: "Ship code with confidence",
    body: "Every branch gets a preview, checks run in parallel and reviews land inline right next to the diff.",
    media: (
      <Screen tint="var(--pui-chart-2)" icon={<CodeIcon />}>
        <div className="flex flex-col gap-1.5 font-pui-mono text-[11px] leading-5">
          {[
            ["text-pui-primary-text", "export function ", "ship", "()"],
            ["text-pui-success-text", "  + ", "preview ready", ""],
            ["text-pui-success-text", "  ✓ ", "142 checks passed", ""],
            ["text-pui-muted-foreground", "  // ", "reviewed by 2", ""],
          ].map(([tone, a, b, c], i) => (
            <span key={i} className="truncate text-pui-surface-foreground">
              <span className={tone}>{a}</span>
              {b}
              {c}
            </span>
          ))}
        </div>
      </Screen>
    ),
  },
  {
    id: "learn",
    eyebrow: "03 · Learn",
    title: "Let the assistant find the pattern",
    body: "Ask a question in plain words. The assistant reads your events and answers with a chart you can keep.",
    media: (
      <Screen tint="var(--pui-chart-3)" icon={<BrainIcon />}>
        <div className="flex h-full flex-col justify-end gap-2">
          <span className="ml-auto max-w-[70%] rounded-pui-lg rounded-br-none bg-pui-primary px-3 py-1.5 text-xs text-pui-primary-foreground">Why did signups jump?</span>
          <span className="max-w-[80%] rounded-pui-lg rounded-bl-none bg-pui-muted px-3 py-1.5 text-xs text-pui-foreground">Tuesday’s launch post: 3.2× more visits from search.</span>
        </div>
      </Screen>
    ),
  },
  {
    id: "measure",
    eyebrow: "04 · Measure",
    title: "Watch it grow",
    body: "Goals, funnels and retention in one view. Share a link and the numbers stay live for everyone.",
    media: (
      <Screen tint="var(--pui-chart-4)" icon={<ChartIcon />}>
        <div className="flex h-full items-end gap-1.5">
          {[30, 42, 38, 55, 61, 58, 72, 80, 77, 92].map((h, i) => (
            <span key={i} className="flex-1 rounded-t-pui-sm" style={{ height: `${h}%`, background: "var(--pui-chart-4)", opacity: 0.45 + i * 0.05 }} />
          ))}
        </div>
      </Screen>
    ),
  },
];

function Preview({ props }: { props: DemoProps }) {
  const [active, setActive] = useState(0);
  return (
    <ScrollStage height="h-[28rem]" hint="Scroll through the story" lead="h-24" tail="h-40">
      {(ref) => (
        <div className="px-5 sm:px-8">
          <p className="m-0 mb-2 text-xs text-pui-muted-foreground" aria-live="polite">
            Active step: <span className="font-medium text-pui-foreground">{active + 1}</span> of {STEPS.length}
          </p>
          <StickyReveal {...props} container={ref} items={STEPS} onActiveChange={setActive} blockClassName="min-h-[20rem]" />
        </div>
      )}
    </ScrollStage>
  );
}

function PhotoStoryDemo() {
  const items = useMemo<StickyRevealItem[]>(
    () =>
      [
        { scene: 0, title: "Dawn ridge", body: "We left before sunrise and caught the first light on the eastern ridge." },
        { scene: 2, title: "Desert dusk", body: "By evening the sand turned copper and the wind finally dropped." },
        { scene: 3, title: "Night valley", body: "Camp under a sky so clear the stars looked close enough to touch." },
      ].map((s) => ({
        id: s.title,
        title: s.title,
        body: s.body,
        media: <img src={landscape(SCENES[s.scene] ?? SCENES[0]!, s.scene + 3, 1200, 900)} alt={s.title} />,
      })),
    [],
  );
  return (
    <ScrollStage height="h-[26rem]" hint="A photo essay" lead="h-16" tail="h-32">
      {(ref) => (
        <div className="px-5">
          <StickyReveal container={ref} items={items} side="left" stickyTop={16} indicator={false} blockClassName="min-h-[18rem]" panelClassName="aspect-[3/4] md:aspect-[4/5]" />
        </div>
      )}
    </ScrollStage>
  );
}

function Mini() {
  return (
    <div className="grid w-44 grid-cols-2 gap-2">
      <div className="flex flex-col gap-2 border-l-2 border-pui-primary pl-2">
        <span className="h-2 w-14 rounded-full bg-pui-foreground/80" />
        <span className="h-1.5 w-16 rounded-full bg-pui-foreground/20" />
        <span className="mt-2 h-2 w-12 rounded-full bg-pui-foreground/25" />
        <span className="h-1.5 w-14 rounded-full bg-pui-foreground/10" />
      </div>
      <div className="aspect-[4/3] rounded-pui-md border border-pui-border shadow-pui-sm" style={{ background: "linear-gradient(135deg, var(--pui-chart-1), var(--pui-chart-2))" }} />
    </div>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) =>
    toJsx<Record<string, unknown>>(
      "StickyReveal",
      { ...props, items: "__ITEMS__" },
      { ...defaults, items: "" },
      undefined,
      controls as ControlSpec<Record<string, unknown>>[],
    ).replace('items="__ITEMS__"', `items={[
  { title: "Sketch the idea", body: "…", media: <img src="/plan.png" alt="Planning board" /> },
  { title: "Ship with confidence", body: "…", media: <img src="/build.png" alt="Preview build" /> },
]}`),
  propsTable: propDocs<StickyRevealProps>()([
    { name: "items", type: "{ id?, eyebrow?, title, body?, media }[]", description: "Story blocks; media shows in the sticky panel.", required: true },
    { name: "container", type: "RefObject<HTMLElement | null>", description: "Scroll box the section lives in; default the window." },
    { name: "side", type: '"left" | "right"', default: '"right"', description: "Panel side on wide screens." },
    { name: "stickyTop", type: "number", default: "24", description: "Px from the top where the panel sticks." },
    { name: "indicator", type: "boolean", default: "true", description: "Progress rail beside the blocks." },
    { name: "onActiveChange", type: "(index: number) => void", description: "Called when the block at the reading line changes." },
    { name: "blockClassName", type: "string", description: "Class for each block (min height sets the pacing)." },
    { name: "panelClassName", type: "string", description: "Class for the sticky media panel." },
  ]),
  a11y: [
    "Each block is a section with a heading, in reading order; the active one gets aria-current=\"step\".",
    "On narrow screens each block shows its own media inline, so nothing depends on the sticky panel.",
    "Give image media alt text; the panel crossfade does not hide anything from assistive tech.",
  ],
  reducedMotion: "The media crossfades in 150ms without the scale-in.",
  examples: [{ title: "Photo essay", description: 'side="left", no rail and a portrait panel.', Demo: PhotoStoryDemo, wide: true }],
};
export default item;
