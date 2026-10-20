import { Button, GlitchText, Input, type GlitchTextProps } from "changelui";
import { useId, useState } from "react";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  text: string;
  trigger: NonNullable<GlitchTextProps["trigger"]>;
  intensity: number;
  intervalMs: number;
  burstMs: number;
  active: boolean;
};

const defaults: DemoProps = { text: "SYSTEM FAILURE", trigger: "loop", intensity: 1, intervalMs: 2200, burstMs: 320, active: false };

const controls: ControlSpec<DemoProps>[] = [
  { type: "text", prop: "text", label: "Text", maxLength: 40 },
  { type: "select", prop: "trigger", label: "Trigger", options: ["hover", "loop"] },
  { type: "number", prop: "intensity", label: "Intensity", min: 0.25, max: 3, step: 0.25 },
  { type: "number", prop: "intervalMs", label: "Loop interval (ms)", min: 600, max: 6000, step: 100 },
  { type: "number", prop: "burstMs", label: "Burst (ms)", min: 120, max: 1200, step: 20 },
  { type: "boolean", prop: "active", label: "Active (continuous)" },
];

function Preview({ props }: { props: DemoProps }) {
  const { text, ...rest } = props;
  return (
    <div className="flex w-full flex-col items-center gap-3 py-8">
      <GlitchText as="h2" {...rest} className="m-0 font-pui-mono text-4xl font-black tracking-tight text-pui-foreground sm:text-6xl">
        {text}
      </GlitchText>
      <p className="m-0 text-xs text-pui-muted-foreground">
        {props.trigger === "hover" ? "Hover or focus the text." : "Bursts on a loop while in view."}
      </p>
    </div>
  );
}

function NotFoundDemo() {
  return (
    <div className="flex w-full flex-col items-center gap-3 rounded-pui-lg border border-pui-border bg-pui-surface px-6 py-10 text-center">
      <GlitchText as="h3" trigger="loop" intervalMs={1800} intensity={1.6} className="m-0 text-8xl leading-none font-black tracking-tighter text-pui-surface-foreground">
        404
      </GlitchText>
      <p className="m-0 max-w-xs text-sm text-pui-muted-foreground">This page slipped through a crack in the signal.</p>
      <Button size="sm" variant="soft">
        Take me home
      </Button>
    </div>
  );
}

function FieldDemo() {
  const id = useId();
  const [value, setValue] = useState("hello@");
  const invalid = value.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  return (
    <div className="flex w-full max-w-xs flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-pui-foreground">
        Email
      </label>
      <Input id={id} value={value} invalid={invalid} onChange={(e) => setValue(e.target.value)} aria-describedby={`${id}-msg`} />
      <span id={`${id}-msg`} className="text-xs" aria-live="polite">
        {invalid ? (
          <GlitchText active intensity={0.5} className="font-medium text-pui-danger-text">
            That address doesn't compute
          </GlitchText>
        ) : (
          <span className="text-pui-muted-foreground">Looks good.</span>
        )}
      </span>
    </div>
  );
}

function NavDemo() {
  return (
    <nav aria-label="Demo" className="flex flex-wrap items-center justify-center gap-6 py-2">
      {["Work", "Lab", "Archive", "Contact"].map((label) => (
        <a
          key={label}
          href="#/text/glitch-text"
          onClick={(e) => e.preventDefault()}
          className="rounded-pui-sm font-pui-mono text-lg font-semibold tracking-wide text-pui-foreground uppercase no-underline outline-offset-4 focus-visible:outline-2 focus-visible:outline-pui-ring"
        >
          <GlitchText intensity={0.8}>{label}</GlitchText>
        </a>
      ))}
    </nav>
  );
}

function Mini() {
  return (
    <GlitchText trigger="loop" intervalMs={1500} className="font-pui-mono text-3xl font-black text-pui-foreground">
      GLITCH
    </GlitchText>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: ({ text, ...props }) =>
    toJsx<Record<string, unknown>>(
      "GlitchText",
      props,
      { trigger: "hover", intensity: 1, intervalMs: 3000, burstMs: 320, active: false },
      text,
      controls as ControlSpec<Record<string, unknown>>[],
    ),
  propsTable: propDocs<GlitchTextProps>()([
    { name: "children", type: "string", description: "The text.", required: true },
    { name: "trigger", type: '"hover" | "loop"', default: '"hover"', description: "Glitch on hover and focus inside, or in bursts while in view." },
    { name: "active", type: "boolean", default: "false", description: "Glitches continuously while true (error states)." },
    { name: "intensity", type: "number", default: "1", description: "Scales channel offsets and slice jumps, 0.25 to 3." },
    { name: "intervalMs", type: "number", default: "3000", description: "Time between loop bursts." },
    { name: "burstMs", type: "number", default: "320", description: "Length of one burst, in 60ms steps." },
    { name: "colors", type: "[string, string]", default: "chart-4 and chart-2 tokens", description: "The two split channels." },
    { name: "as", type: "TextTag", default: '"span"', description: "Rendered tag." },
  ]),
  a11y: [
    "The real text stays in place and readable; the two colored channels are aria-hidden copies.",
    "Bursts are short and only shift thin slices; for large display text keep intervalMs long and avoid active on big areas (WCAG 2.3.1).",
  ],
  reducedMotion: "No glitch: the colored channels are not rendered.",
  examples: [
    { title: "Not found", description: "A looping 404 with a higher intensity.", Demo: NotFoundDemo, wide: true },
    { title: "Error message", description: "active while the field is invalid, at a low intensity.", Demo: FieldDemo },
    { title: "Nav links", description: "Hover or Tab through the links.", Demo: NavDemo },
  ],
};
export default item;
