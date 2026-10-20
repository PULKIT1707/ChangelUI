import { TextReveal, type TextRevealProps } from "changelui";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  split: NonNullable<TextRevealProps["split"]>;
  variant: NonNullable<TextRevealProps["variant"]>;
  stagger: number;
  duration: number;
  text: string;
};

const defaults: DemoProps = {
  split: "word",
  variant: "blur",
  stagger: 0.04,
  duration: 0.5,
  text: "Small pieces, carefully animated, ready to drop into any React app.",
};

const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "split", label: "Split", options: ["word", "char"] },
  { type: "select", prop: "variant", label: "Variant", options: ["blur", "fade", "slide-up"] },
  { type: "number", prop: "stagger", label: "Stagger (s)", min: 0.01, max: 0.2, step: 0.01 },
  { type: "number", prop: "duration", label: "Duration (s)", min: 0.1, max: 1.5, step: 0.1 },
  { type: "text", prop: "text", label: "Text", maxLength: 60 },
];

function Preview({ props }: { props: DemoProps }) {
  const { text, ...rest } = props;
  return (
    <TextReveal {...rest} className="max-w-lg text-center text-2xl font-semibold text-pui-foreground">
      {text}
    </TextReveal>
  );
}

function Mini() {
  return (
    <TextReveal trigger="mount" className="text-lg font-semibold text-pui-foreground">
      Reveal every word
    </TextReveal>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: ({ text, ...props }) =>
    toJsx<Record<string, unknown>>("TextReveal", props, { ...defaults, text: undefined }, text, controls),
  propsTable: propDocs<TextRevealProps>()([
    { name: "children", type: "string", description: "Text to reveal.", required: true },
    { name: "split", type: '"word" | "char"', default: '"word"', description: "Segment size." },
    { name: "variant", type: '"fade" | "blur" | "slide-up"', default: '"blur"', description: "Entrance style." },
    { name: "stagger", type: "number", default: "0.04", description: "Seconds between segments." },
    { name: "duration", type: "number", default: "0.5", description: "Seconds per segment." },
    { name: "trigger", type: '"mount" | "inView"', default: '"inView"', description: "When the reveal starts." },
    { name: "once", type: "boolean", default: "true", description: "Reveal only the first time it enters the viewport." },
    { name: "delay", type: "number", default: "0", description: "Seconds before the first segment." },
    { name: "as", type: "TextTag", default: '"p"', description: "Rendered tag." },
  ]),
  a11y: ["The full text is read once from an sr-only copy; the animated segments are aria-hidden."],
  reducedMotion: "The text fades in over 150ms.",
};

export default item;
