import { GradientText, type GradientTextProps } from "changelui";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  animate: boolean;
  duration: number;
  angle: number;
  text: string;
};

const defaults: DemoProps = { animate: true, duration: 8, angle: 90, text: "Ship delightful interfaces" };

const controls: ControlSpec<DemoProps>[] = [
  { type: "boolean", prop: "animate", label: "Animate" },
  { type: "number", prop: "duration", label: "Duration (s)", min: 2, max: 20, step: 1 },
  { type: "number", prop: "angle", label: "Angle", min: 0, max: 360, step: 15 },
  { type: "text", prop: "text", label: "Text", maxLength: 60 },
];

function Preview({ props }: { props: DemoProps }) {
  const { text, ...rest } = props;
  return (
    <GradientText as="h2" className="text-4xl font-bold tracking-tight" {...rest}>
      {text}
    </GradientText>
  );
}

function Mini() {
  return <GradientText className="text-2xl font-bold">Gradient</GradientText>;
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: ({ text, ...props }) =>
    toJsx<Record<string, unknown>>("GradientText", props, { ...defaults, text: undefined }, text, controls),
  propsTable: propDocs<GradientTextProps>()([
    { name: "children", type: "ReactNode", description: "Content painted with the gradient.", required: true },
    { name: "colors", type: "string[]", default: "--pui-gradient-1..3", description: "Gradient stops (any CSS color)." },
    { name: "animate", type: "boolean", default: "true", description: "Pan the gradient (motion-safe)." },
    { name: "duration", type: "number", default: "8", description: "Seconds per pan cycle." },
    { name: "angle", type: "number", default: "90", description: "Gradient angle in degrees." },
    { name: "as", type: "TextTag", default: '"span"', description: "Rendered tag." },
    { name: "delay", type: "number", default: "0", description: "Animation delay in seconds." },
  ]),
  a11y: ["The text stays real text; pick colors that keep enough contrast with the background."],
  reducedMotion: "The gradient is static.",
};

export default item;
