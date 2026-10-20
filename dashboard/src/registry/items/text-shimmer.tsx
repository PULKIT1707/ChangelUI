import { TextShimmer, type TextShimmerProps } from "changelui";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  duration: number;
  spread: number;
  text: string;
};

const defaults: DemoProps = { duration: 2, spread: 2, text: "Generating your summary..." };

const controls: ControlSpec<DemoProps>[] = [
  { type: "number", prop: "duration", label: "Duration (s)", min: 0.5, max: 6, step: 0.5 },
  { type: "number", prop: "spread", label: "Spread", min: 1, max: 6, step: 1 },
  { type: "text", prop: "text", label: "Text", maxLength: 60 },
];

function Preview({ props }: { props: DemoProps }) {
  const { text, ...rest } = props;
  return (
    <TextShimmer {...rest} className="text-lg font-medium">
      {text}
    </TextShimmer>
  );
}

function Mini() {
  return <TextShimmer className="text-base font-medium">Thinking...</TextShimmer>;
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: ({ text, ...props }) =>
    toJsx<Record<string, unknown>>("TextShimmer", props, { ...defaults, text: undefined }, text, controls),
  propsTable: propDocs<TextShimmerProps>()([
    { name: "children", type: "string", description: "Text to shimmer.", required: true },
    { name: "duration", type: "number", default: "2", description: "Seconds per sweep." },
    { name: "spread", type: "number", default: "2", description: "Band width in px per character." },
    { name: "delay", type: "number", default: "0", description: "Animation delay in seconds." },
    { name: "as", type: "TextTag", default: '"span"', description: "Rendered tag." },
  ]),
  a11y: ["Pair with a role=\"status\" region if the text announces progress."],
  reducedMotion: "Static muted text.",
};

export default item;
