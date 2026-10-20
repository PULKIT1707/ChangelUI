import { Button, PixelReveal, type PixelRevealProps } from "changelui";
import { useMemo, useState } from "react";
import { landscape, SCENES } from "../../lib/demo-art";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  pattern: NonNullable<PixelRevealProps["pattern"]>;
  trigger: "inView" | "hover";
  cols: number;
  rows: number;
  duration: number;
  shrink: boolean;
  color: string;
};
const defaults: DemoProps = { pattern: "random", trigger: "inView", cols: 16, rows: 10, duration: 0.8, shrink: true, color: "primary" };
const COLORS: Record<string, string> = {
  primary: "var(--pui-primary)",
  foreground: "var(--pui-foreground)",
  muted: "var(--pui-muted)",
  "chart-2": "var(--pui-chart-2)",
  "chart-4": "var(--pui-chart-4)",
};
const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "pattern", label: "Pattern", options: ["random", "wipe", "radial", "diagonal", "rain"] },
  { type: "select", prop: "trigger", label: "Trigger", options: ["inView", "hover"] },
  { type: "number", prop: "cols", label: "Columns", min: 4, max: 40, step: 1 },
  { type: "number", prop: "rows", label: "Rows", min: 3, max: 28, step: 1 },
  { type: "number", prop: "duration", label: "Duration (s)", min: 0.2, max: 2.5, step: 0.1 },
  { type: "boolean", prop: "shrink", label: "Shrink to dots" },
  { type: "select", prop: "color", label: "Cover color", options: Object.keys(COLORS) },
];

function useArt(index: number, seed: number) {
  return useMemo(() => landscape(SCENES[index] ?? SCENES[0]!, seed, 1200, 750), [index, seed]);
}

function Preview({ props }: { props: DemoProps }) {
  const { color, ...rest } = props;
  const src = useArt(4, 5);
  return (
    <figure className="m-0 flex w-full max-w-lg flex-col gap-2">
      <PixelReveal key={JSON.stringify(props)} {...rest} color={COLORS[color]} className="aspect-[16/10] w-full rounded-pui-xl border border-pui-border shadow-pui-lg">
        <img src={src} alt="A teal lagoon between green hills" className="block size-full object-cover" />
      </PixelReveal>
      <figcaption className="text-center text-xs text-pui-muted-foreground">
        {rest.trigger === "hover" ? "Hover or focus to dissolve the cover" : "Dissolves when it scrolls into view. Press Replay to run it again."}
      </figcaption>
    </figure>
  );
}

function ManualDemo() {
  const [revealed, setRevealed] = useState(false);
  const [count, setCount] = useState(0);
  return (
    <div className="flex w-full flex-col items-center gap-4">
      <PixelReveal
        trigger="manual"
        revealed={revealed}
        pattern="radial"
        cols={20}
        rows={12}
        duration={0.7}
        color="var(--pui-foreground)"
        onRevealed={() => setCount((c) => c + 1)}
        className="aspect-[5/3] w-full max-w-md rounded-pui-xl border border-pui-border bg-pui-surface"
      >
        <div className="flex size-full flex-col items-center justify-center gap-1 p-6 text-center">
          <span className="text-xs font-semibold tracking-widest text-pui-primary-text uppercase">You unlocked</span>
          <span className="font-pui-display text-4xl font-bold tracking-tight text-pui-surface-foreground">30% off</span>
          <span className="font-pui-mono text-sm text-pui-muted-foreground">CODE: PIXEL30</span>
        </div>
      </PixelReveal>
      <div className="flex items-center gap-3">
        <Button onClick={() => setRevealed((r) => !r)} aria-pressed={revealed}>
          {revealed ? "Cover again" : "Scratch to reveal"}
        </Button>
        <span className="text-xs text-pui-muted-foreground" aria-live="polite">
          Revealed {count} {count === 1 ? "time" : "times"}
        </span>
      </div>
    </div>
  );
}

function HoverGalleryDemo() {
  const tiles = [
    { scene: 0, pattern: "wipe" as const, color: "var(--pui-chart-1)" },
    { scene: 3, pattern: "rain" as const, color: "var(--pui-chart-2)" },
    { scene: 5, pattern: "diagonal" as const, color: "var(--pui-chart-5)" },
  ];
  return (
    <div className="grid w-full grid-cols-3 gap-3">
      {tiles.map((t) => (
        <PixelReveal
          key={t.scene}
          trigger="hover"
          pattern={t.pattern}
          cols={10}
          rows={12}
          duration={0.5}
          color={t.color}
          tabIndex={0}
          aria-label={`${SCENES[t.scene]?.name ?? "Photo"}, ${t.pattern} pattern`}
          className="aspect-[3/4] rounded-pui-lg outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pui-ring"
        >
          <img src={landscape(SCENES[t.scene] ?? SCENES[0]!, t.scene + 9, 600, 800)} alt="" className="block size-full object-cover" />
          <span className="absolute inset-x-2 bottom-2 z-20 rounded-pui-sm bg-pui-surface/85 px-2 py-1 text-center text-xs font-medium text-pui-surface-foreground backdrop-blur-sm">
            {t.pattern}
          </span>
        </PixelReveal>
      ))}
    </div>
  );
}

function Mini() {
  const cells = Array.from({ length: 48 }, (_, i) => ((i * 37) % 11) / 10);
  return (
    <div className="relative grid h-24 w-40 grid-cols-8 grid-rows-6 overflow-hidden rounded-pui-md border border-pui-border" style={{ background: "linear-gradient(135deg, var(--pui-chart-2), var(--pui-chart-1))" }}>
      {cells.map((v, i) => (
        <span key={i} className="bg-pui-primary" style={{ opacity: v > 0.45 ? 1 : 0, transform: `scale(${v > 0.45 ? 1 : 0.4})` }} />
      ))}
    </div>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: ({ color, ...props }) =>
    toJsx<Record<string, unknown>>(
      "PixelReveal",
      { ...props, color: COLORS[color] },
      { ...defaults, color: COLORS.primary },
      '<img src="/cover.jpg" alt="Lagoon at dawn" />',
      controls as ControlSpec<Record<string, unknown>>[],
    ),
  propsTable: propDocs<PixelRevealProps>()([
    { name: "cols", type: "number", default: "16", description: "Grid columns (max 64)." },
    { name: "rows", type: "number", default: "10", description: "Grid rows (max 64)." },
    { name: "pattern", type: '"random" | "wipe" | "radial" | "diagonal" | "rain"', default: '"random"', description: "Order in which cells dissolve." },
    { name: "duration", type: "number", default: "0.8", description: "Seconds from the first cell to the last." },
    { name: "cellDuration", type: "number", default: "0.22", description: "Seconds each cell takes to fade." },
    { name: "delay", type: "number", default: "0", description: "Seconds before the reveal starts." },
    { name: "trigger", type: '"inView" | "mount" | "hover" | "manual"', default: '"inView"', description: "What starts the reveal; hover covers again on leave." },
    { name: "revealed", type: "boolean", description: 'Controlled state for trigger="manual".' },
    { name: "color", type: "string", default: '"var(--pui-primary)"', description: "Cover color." },
    { name: "shrink", type: "boolean", default: "true", description: "Cells shrink into dots as they fade." },
    { name: "seed", type: "number", default: "7", description: "Seed for the random order." },
    { name: "onRevealed", type: "() => void", description: "Called once the last cell has faded." },
  ]),
  a11y: [
    "The content is in the DOM from the start and the pixel cover is aria-hidden, so assistive tech reads it immediately.",
    'With trigger="hover", focus also reveals; add tabIndex and an aria-label when the content itself is not focusable.',
  ],
  reducedMotion: "No cover at all: the content shows directly.",
  examples: [
    { title: "Manual reveal", description: 'trigger="manual" with a radial pattern and onRevealed.', Demo: ManualDemo, wide: true },
    { title: "Hover gallery", description: "wipe, rain and diagonal patterns that cover again on leave.", Demo: HoverGalleryDemo, wide: true },
  ],
};
export default item;
