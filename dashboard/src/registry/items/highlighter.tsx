import { Highlighter, type HighlighterProps } from "changelui";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  variant: NonNullable<HighlighterProps["variant"]>;
  strokeWidth: number;
  duration: number;
};

const defaults: DemoProps = { variant: "highlight", strokeWidth: 2, duration: 0.6 };

const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "variant", label: "Variant", options: ["highlight", "underline", "strike", "box"] },
  { type: "number", prop: "strokeWidth", label: "Stroke width", min: 1, max: 6, step: 1 },
  { type: "number", prop: "duration", label: "Duration (s)", min: 0.2, max: 2, step: 0.1 },
];

function Preview({ props }: { props: DemoProps }) {
  return (
    <p className="max-w-md text-lg leading-relaxed text-pui-foreground">
      Small components that are <Highlighter {...props}>easy to import</Highlighter> into any React project.
    </p>
  );
}

function Mini() {
  return (
    <p className="text-base text-pui-foreground">
      Make it <Highlighter trigger="mount">pop</Highlighter>
    </p>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) => toJsx("Highlighter", props, defaults, "easy to import", controls),
  propsTable: propDocs<HighlighterProps>()([
    { name: "children", type: "ReactNode", description: "Marked content.", required: true },
    { name: "variant", type: '"highlight" | "underline" | "strike" | "box"', default: '"highlight"', description: "Mark style." },
    { name: "color", type: "string", default: '"var(--pui-highlight)"', description: "Mark color." },
    { name: "strokeWidth", type: "number", default: "2", description: "Line width in px (underline, strike, box)." },
    { name: "duration", type: "number", default: "0.6", description: "Seconds to draw." },
    { name: "trigger", type: '"mount" | "inView"', default: '"inView"', description: "When the mark draws." },
    { name: "once", type: "boolean", default: "true", description: "Draw only the first time it enters the viewport." },
    { name: "delay", type: "number", default: "0", description: "Seconds before drawing." },
    { name: "as", type: "TextTag", default: '"span"', description: "Rendered tag." },
  ]),
  a11y: ["Plain-text children are read once from an sr-only copy; the visual mark is decorative."],
  reducedMotion: "The mark renders fully drawn.",
};

export default item;
