import { Badge, Button, SparklesText, type SparklesTextProps } from "changelui";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  text: string;
  count: number;
  intervalMs: number;
  shape: NonNullable<SparklesTextProps["shape"]>;
  trigger: NonNullable<SparklesTextProps["trigger"]>;
  minSize: number;
  maxSize: number;
};

const defaults: DemoProps = {
  text: "Magic inside",
  count: 10,
  intervalMs: 320,
  shape: "star",
  trigger: "always",
  minSize: 8,
  maxSize: 18,
};

const controls: ControlSpec<DemoProps>[] = [
  { type: "text", prop: "text", label: "Text", maxLength: 40 },
  { type: "number", prop: "count", label: "Max sparkles", min: 1, max: 30, step: 1 },
  { type: "number", prop: "intervalMs", label: "Spawn every (ms)", min: 60, max: 1200, step: 20 },
  { type: "select", prop: "shape", label: "Shape", options: ["star", "diamond", "dot"] },
  { type: "select", prop: "trigger", label: "Trigger", options: ["always", "hover"] },
  { type: "number", prop: "minSize", label: "Min size (px)", min: 4, max: 24, step: 1 },
  { type: "number", prop: "maxSize", label: "Max size (px)", min: 6, max: 36, step: 1 },
];

function Preview({ props }: { props: DemoProps }) {
  const { text, minSize, maxSize, ...rest } = props;
  return (
    <div className="flex w-full flex-col items-center gap-3 py-12">
      <SparklesText
        as="h2"
        {...rest}
        size={[Math.min(minSize, maxSize), Math.max(minSize, maxSize)]}
        className="text-5xl font-black tracking-tight text-pui-foreground sm:text-6xl"
      >
        {text}
      </SparklesText>
      {props.trigger === "hover" ? <p className="m-0 text-xs text-pui-muted-foreground">Hover or focus the heading.</p> : null}
    </div>
  );
}

function PricingDemo() {
  return (
    <div className="flex w-full max-w-sm flex-col gap-3 rounded-pui-xl border border-pui-border bg-pui-surface p-6 text-pui-surface-foreground shadow-pui-md">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">Pro</span>
        <Badge tone="primary" variant="soft">
          <SparklesText count={6} intervalMs={420} size={[6, 11]}>
            Most popular
          </SparklesText>
        </Badge>
      </div>
      <p className="m-0 text-4xl font-bold tracking-tight">
        $24<span className="text-base font-medium text-pui-muted-foreground">/mo</span>
      </p>
      <p className="m-0 text-sm text-pui-muted-foreground">Everything in Free, plus unlimited projects and AI assist.</p>
    </div>
  );
}

function ButtonDemo() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 py-4">
      <Button>
        <SparklesText trigger="hover" count={8} intervalMs={140} size={[6, 12]} colors={["var(--pui-primary-foreground)"]}>
          Generate with AI
        </SparklesText>
      </Button>
      <Button variant="outline" tone="neutral">
        <SparklesText trigger="hover" shape="diamond" count={8} intervalMs={160} size={[5, 10]}>
          Surprise me
        </SparklesText>
      </Button>
    </div>
  );
}

function CelebrationDemo() {
  return (
    <div className="flex w-full flex-col items-center gap-2 py-8 text-center">
      <SparklesText
        as="p"
        count={22}
        intervalMs={110}
        size={[6, 22]}
        colors={["var(--pui-chart-1)", "var(--pui-chart-2)", "var(--pui-chart-3)", "var(--pui-chart-4)", "var(--pui-chart-5)"]}
        className="font-pui-display text-6xl font-black tracking-tight text-pui-foreground"
      >
        1,000,000
      </SparklesText>
      <p className="m-0 text-sm text-pui-muted-foreground">downloads. Thank you, all of you.</p>
    </div>
  );
}

function Mini() {
  return (
    <SparklesText count={6} intervalMs={360} className="text-3xl font-black text-pui-foreground">
      Sparkle
    </SparklesText>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: ({ text, minSize, maxSize, ...props }) =>
    toJsx<Record<string, unknown>>(
      "SparklesText",
      { ...props, size: minSize === 8 && maxSize === 18 ? undefined : [minSize, maxSize] },
      { count: 10, intervalMs: 320, shape: "star", trigger: "always" },
      text,
      controls as ControlSpec<Record<string, unknown>>[],
    ),
  propsTable: propDocs<SparklesTextProps>()([
    { name: "children", type: "ReactNode", description: "The text (or any inline content).", required: true },
    { name: "count", type: "number", default: "10", description: "Most sparkles alive at once." },
    { name: "intervalMs", type: "number", default: "320", description: "A new sparkle every intervalMs." },
    { name: "colors", type: "string[]", default: "primary, chart-2, chart-4", description: "Sparkle colors, picked at random." },
    { name: "size", type: "[number, number]", default: "[8, 18]", description: "Sparkle size range in px." },
    { name: "shape", type: '"star" | "diamond" | "dot"', default: '"star"', description: "Sparkle glyph." },
    { name: "trigger", type: '"always" | "hover"', default: '"always"', description: "Sparkle in view, or only while hovered or focused within." },
    { name: "as", type: "TextTag", default: '"span"', description: "Rendered tag." },
  ]),
  a11y: [
    "Sparkles are aria-hidden and pointer-transparent; the text is untouched.",
    "Spawning stops off-screen and while the tab is hidden.",
  ],
  reducedMotion: "No sparkles are rendered.",
  examples: [
    { title: "Popular badge", description: "Small, slow sparkles on a Badge in a pricing card.", Demo: PricingDemo },
    { title: "Hover buttons", description: 'trigger="hover" with fast spawning and one color.', Demo: ButtonDemo },
    { title: "Milestone", description: "Dense sparkles in every chart color for a celebration number.", Demo: CelebrationDemo, wide: true },
  ],
};
export default item;
