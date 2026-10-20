import { WordRotate, type WordRotateProps } from "changelui";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  variant: NonNullable<WordRotateProps["variant"]>;
  intervalMs: number;
  duration: number;
  paused: boolean;
};

const words = ["components", "effects", "motion"];
const defaults: DemoProps = { variant: "slide", intervalMs: 2500, duration: 0.4, paused: false };

const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "variant", label: "Variant", options: ["slide", "flip", "blur"] },
  { type: "number", prop: "intervalMs", label: "Interval (ms)", min: 800, max: 6000, step: 100 },
  { type: "number", prop: "duration", label: "Duration (s)", min: 0.1, max: 1.2, step: 0.1 },
  { type: "boolean", prop: "paused", label: "Paused" },
];

function Preview({ props }: { props: DemoProps }) {
  return (
    <h2 className="m-0 text-3xl font-bold text-pui-foreground">
      Tiny React <WordRotate {...props} words={words} className="text-pui-primary-text" />
    </h2>
  );
}

function Mini() {
  return <WordRotate words={["fast", "small", "smooth"]} intervalMs={1800} className="text-2xl font-bold text-pui-foreground" />;
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) =>
    toJsx<Record<string, unknown>>(
      "WordRotate",
      { words, ...props },
      { ...defaults, words: undefined },
      undefined,
      controls as ControlSpec<Record<string, unknown>>[],
    ),
  propsTable: propDocs<WordRotateProps>()([
    { name: "words", type: "string[]", description: "Words to cycle through; empty renders nothing.", required: true },
    { name: "intervalMs", type: "number", default: "2500", description: "Time each word stays." },
    { name: "variant", type: '"slide" | "flip" | "blur"', default: '"slide"', description: "Transition style." },
    { name: "duration", type: "number", default: "0.4", description: "Seconds per transition." },
    { name: "paused", type: "boolean", default: "false", description: "Stops rotating (WCAG 2.2.2 pause control)." },
    { name: "onIndexChange", type: "(index: number) => void", description: "Called after each rotation." },
    { name: "as", type: "TextTag", default: '"span"', description: "Rendered tag." },
  ]),
  a11y: [
    "The current word is read from an sr-only copy; the animated word is aria-hidden.",
    "Rotation pauses offscreen and in background tabs. Offer a pause control for long-running rotation.",
  ],
  reducedMotion: "Words swap instantly.",
};

export default item;
