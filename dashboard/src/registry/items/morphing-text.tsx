import { Button, MorphingText, type MorphingTextProps } from "changelui";
import { useState } from "react";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  words: string;
  intervalMs: number;
  morphMs: number;
  threshold: number;
  align: NonNullable<MorphingTextProps["align"]>;
  paused: boolean;
};

const defaults: DemoProps = {
  words: "Design, Prototype, Animate, Ship",
  intervalMs: 2000,
  morphMs: 1000,
  threshold: 6,
  align: "center",
  paused: false,
};

const controls: ControlSpec<DemoProps>[] = [
  { type: "text", prop: "words", label: "Words (comma separated)", maxLength: 80 },
  { type: "number", prop: "intervalMs", label: "Rest (ms)", min: 500, max: 5000, step: 100 },
  { type: "number", prop: "morphMs", label: "Morph (ms)", min: 300, max: 3000, step: 100 },
  { type: "number", prop: "threshold", label: "Threshold", min: 1, max: 10, step: 1 },
  { type: "select", prop: "align", label: "Align", options: ["start", "center", "end"] },
  { type: "boolean", prop: "paused", label: "Paused" },
];

const toWords = (value: string) =>
  value
    .split(",")
    .map((w) => w.trim())
    .filter(Boolean);

function Preview({ props }: { props: DemoProps }) {
  const { words, ...rest } = props;
  const list = toWords(words);
  return (
    <div className="flex w-full flex-col items-center gap-3 py-8">
      <MorphingText
        as="h2"
        words={list.length > 0 ? list : ["Morph"]}
        {...rest}
        className="m-0 text-5xl font-bold tracking-tight text-pui-foreground sm:text-7xl"
      />
    </div>
  );
}

function SentenceDemo() {
  return (
    <p className="m-0 text-center text-3xl leading-tight font-semibold tracking-tight text-pui-foreground">
      Built for{" "}
      <MorphingText words={["designers", "developers", "founders", "everyone"]} align="start" className="text-pui-primary" />
    </p>
  );
}

function StatusDemo() {
  const [paused, setPaused] = useState(false);
  return (
    <div className="flex w-full flex-col items-center gap-4">
      <div className="flex items-center gap-3 rounded-pui-full border border-pui-border bg-pui-surface px-4 py-2 shadow-pui-sm">
        <span aria-hidden="true" className="size-2 animate-pulse rounded-pui-full bg-pui-primary" />
        <MorphingText
          words={["Reading files", "Planning", "Writing code", "Running checks"]}
          intervalMs={1400}
          morphMs={700}
          align="start"
          paused={paused}
          className="text-sm font-medium text-pui-surface-foreground"
        />
      </div>
      <Button size="sm" variant="outline" tone="neutral" aria-pressed={paused} onClick={() => setPaused((p) => !p)}>
        {paused ? "Resume" : "Pause"}
      </Button>
    </div>
  );
}

function NumberDemo() {
  return (
    <div className="flex w-full items-end justify-center gap-4 py-2">
      <MorphingText
        words={["01", "02", "03", "04"]}
        intervalMs={1600}
        threshold={9}
        className="font-pui-mono text-7xl leading-none font-black text-pui-foreground"
      />
      <span className="pb-2 text-sm text-pui-muted-foreground">steps to launch</span>
    </div>
  );
}

function Mini() {
  return (
    <MorphingText words={["Liquid", "Morph", "Melt"]} intervalMs={1200} className="text-3xl font-bold text-pui-foreground" />
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: ({ words, ...props }) =>
    toJsx<Record<string, unknown>>(
      "MorphingText",
      { words: "{words}", ...props },
      { words: undefined, intervalMs: 2500, morphMs: 1000, threshold: 6, align: "center", paused: false },
      undefined,
      controls as ControlSpec<Record<string, unknown>>[],
    ).replace('words="{words}"', `words={${JSON.stringify(toWords(words))}}`),
  propsTable: propDocs<MorphingTextProps>()([
    { name: "words", type: "string[]", description: "Words to morph between, in order.", required: true },
    { name: "intervalMs", type: "number", default: "2500", description: "Time each word rests before morphing." },
    { name: "morphMs", type: "number", default: "1000", description: "Length of one morph." },
    { name: "threshold", type: "number", default: "6", description: "Edge hardness of the liquid threshold, 1 (soft) to 10 (blobby)." },
    { name: "align", type: '"start" | "center" | "end"', default: '"center"', description: "Alignment inside the reserved width of the longest word." },
    { name: "paused", type: "boolean", default: "false", description: "Stops on the current word (WCAG 2.2.2 pause control)." },
    { name: "delay", type: "number", default: "0", description: "Seconds before the first morph." },
    { name: "as", type: "TextTag", default: '"span"', description: "Rendered tag." },
    { name: "onIndexChange", type: "(index: number) => void", description: "Called after each morph." },
  ]),
  a11y: [
    "Screen readers read the current word from an sr-only copy; the morphing layers are aria-hidden.",
    "The box reserves the widest word, so surrounding text never reflows.",
    "Pauses off-screen and in background tabs; pass paused for a user-facing pause control.",
  ],
  reducedMotion: "Words swap instantly at each interval with no blur or threshold filter.",
  examples: [
    { title: "In a sentence", description: "Start-aligned so the morph hugs the preceding text.", Demo: SentenceDemo, wide: true },
    { title: "Agent status", description: "Fast morphs in a status pill, with a pause control.", Demo: StatusDemo },
    { title: "Numbers", description: "A high threshold gives a blobby, ink-like merge.", Demo: NumberDemo },
  ],
};
export default item;
