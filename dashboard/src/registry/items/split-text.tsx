import { Button, SplitText, type SplitTextProps } from "changelui";
import { useState } from "react";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  text: string;
  by: NonNullable<SplitTextProps["by"]>;
  preset: NonNullable<SplitTextProps["preset"]>;
  from: NonNullable<SplitTextProps["from"]>;
  stagger: number;
  duration: number;
};

const defaults: DemoProps = {
  text: "Motion that feels considered, never decorative",
  by: "word",
  preset: "maskUp",
  from: "first",
  stagger: 0.05,
  duration: 0,
};

const controls: ControlSpec<DemoProps>[] = [
  { type: "text", prop: "text", label: "Text", maxLength: 80 },
  { type: "select", prop: "by", label: "Split by", options: ["char", "word", "line"] },
  { type: "select", prop: "preset", label: "Preset", options: ["maskUp", "fadeUp", "blurIn", "rotateIn", "popIn", "slideLeft"] },
  { type: "select", prop: "from", label: "Stagger from", options: ["first", "last", "center", "edges"] },
  { type: "number", prop: "stagger", label: "Stagger (s)", min: 0, max: 0.2, step: 0.01 },
  { type: "number", prop: "duration", label: "Duration (s, 0 = preset)", min: 0, max: 2, step: 0.05 },
];

function Preview({ props }: { props: DemoProps }) {
  const { text, duration, ...rest } = props;
  // Remount on every prop change so the new settings play from the start.
  const key = JSON.stringify(props);
  return (
    <div className="flex w-full max-w-3xl flex-col items-center gap-3 py-6 text-center">
      <SplitText
        key={key}
        as="h2"
        trigger="mount"
        {...rest}
        duration={duration > 0 ? duration : undefined}
        className="m-0 text-4xl leading-[1.1] font-semibold tracking-tight text-balance text-pui-foreground sm:text-5xl"
      >
        {text}
      </SplitText>
    </div>
  );
}

function HeroDemo() {
  const [run, setRun] = useState(0);
  return (
    <div className="flex w-full flex-col items-start gap-4 py-2" key={run}>
      <SplitText as="span" by="char" preset="fadeUp" stagger={0.03} className="text-xs font-semibold tracking-[0.2em] text-pui-primary uppercase">
        New in 2.0
      </SplitText>
      <SplitText
        as="h3"
        by="line"
        preset="maskUp"
        delay={0.15}
        className="m-0 max-w-md text-3xl leading-tight font-semibold tracking-tight text-pui-foreground"
      >
        Ship interfaces that move with intent and settle with care
      </SplitText>
      <SplitText
        as="p"
        by="word"
        preset="blurIn"
        stagger={0.015}
        delay={0.55}
        className="m-0 max-w-md text-sm leading-relaxed text-pui-muted-foreground"
      >
        Lines rise from a mask, the body copy blurs in after them, and every unit follows the same motion presets as the rest of the library.
      </SplitText>
      <Button size="sm" variant="soft" onClick={() => setRun((n) => n + 1)}>
        Replay
      </Button>
    </div>
  );
}

function PopDemo() {
  const [run, setRun] = useState(0);
  return (
    <button
      type="button"
      onClick={() => setRun((n) => n + 1)}
      className="flex w-full cursor-pointer flex-col items-center gap-2 rounded-pui-lg border-0 bg-transparent py-4 outline-offset-4 focus-visible:outline-2 focus-visible:outline-pui-ring"
    >
      <SplitText
        key={run}
        as="span"
        by="char"
        preset="popIn"
        from="center"
        stagger={0.035}
        className="text-5xl font-black tracking-tight text-pui-primary"
      >
        Hooray!
      </SplitText>
      <span className="text-xs text-pui-muted-foreground">Click to pop again</span>
    </button>
  );
}

function EditorialDemo() {
  const [run, setRun] = useState(0);
  return (
    <div className="grid w-full gap-6 py-2 sm:grid-cols-[1fr_2fr]" key={run}>
      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium tracking-widest text-pui-muted-foreground uppercase">Chapter 03</span>
        <Button size="sm" variant="outline" tone="neutral" className="self-start" onClick={() => setRun((n) => n + 1)}>
          Replay
        </Button>
      </div>
      <SplitText
        as="p"
        by="line"
        preset="rotateIn"
        stagger={0.12}
        className="m-0 font-pui-display text-2xl leading-snug text-pui-foreground"
      >
        Every great interface hides a thousand small decisions. Timing is one of them: how long a thing waits, how fast it arrives and how softly it lands.
      </SplitText>
    </div>
  );
}

function Mini() {
  return (
    <SplitText as="span" trigger="mount" by="char" preset="maskUp" stagger={0.04} className="text-3xl font-semibold tracking-tight text-pui-foreground">
      Kinetic
    </SplitText>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: ({ text, duration, ...props }) =>
    toJsx<Record<string, unknown>>(
      "SplitText",
      { as: "h2", ...props, duration: duration > 0 ? duration : undefined },
      { by: "word", preset: "maskUp", from: "first", stagger: undefined, duration: undefined },
      text,
      controls as ControlSpec<Record<string, unknown>>[],
    ),
  propsTable: propDocs<SplitTextProps>()([
    { name: "children", type: "string", description: "The text to split.", required: true },
    { name: "by", type: '"char" | "word" | "line"', default: '"word"', description: "Unit that animates. Lines are measured after mount and regroup on resize." },
    { name: "preset", type: '"maskUp" | "fadeUp" | "blurIn" | "rotateIn" | "popIn" | "slideLeft"', default: '"maskUp"', description: "Entrance style for each unit." },
    { name: "from", type: '"first" | "last" | "center" | "edges"', default: '"first"', description: "Which units start first." },
    { name: "stagger", type: "number", default: "0.04", description: "Seconds between units (0.02 for chars, 0.1 for lines)." },
    { name: "duration", type: "number", description: "Seconds per unit. Defaults to the preset; popIn uses a spring when unset." },
    { name: "delay", type: "number", default: "0", description: "Seconds before the first unit." },
    { name: "trigger", type: '"mount" | "inView"', default: '"inView"', description: "When the entrance starts." },
    { name: "once", type: "boolean", default: "true", description: "Run once, or every time it enters the viewport." },
    { name: "as", type: "TextTag", default: '"p"', description: "Rendered tag." },
    { name: "onComplete", type: "() => void", description: "Called when every unit has finished." },
  ]),
  a11y: [
    "Screen readers get the full text once from an sr-only copy; the split units are aria-hidden.",
    "Characters stay grouped per word, so words never break mid-way while animating.",
  ],
  reducedMotion: "Shows the final text with a 150ms fade; no movement, blur or rotation.",
  examples: [
    { title: "Hero intro", description: "Eyebrow by char, headline by line, body by word, chained with delay.", Demo: HeroDemo, wide: true },
    { title: "Pop from the center", description: "popIn on a spring, staggered outward from the middle character.", Demo: PopDemo },
    { title: "Editorial lines", description: "rotateIn by line on a serif paragraph; resize and the lines regroup.", Demo: EditorialDemo },
  ],
};
export default item;
