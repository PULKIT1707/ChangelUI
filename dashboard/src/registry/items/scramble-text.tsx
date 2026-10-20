import { ScrambleText, type ScrambleTextProps } from "changelui";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  text: string;
  trigger: NonNullable<ScrambleTextProps["trigger"]>;
  duration: number;
  speedMs: number;
};

const defaults: DemoProps = { text: "DECRYPTING CHANGELUI", trigger: "inView", duration: 0.8, speedMs: 40 };

const controls: ControlSpec<DemoProps>[] = [
  { type: "text", prop: "text", label: "Text", maxLength: 40 },
  { type: "select", prop: "trigger", label: "Trigger", options: ["inView", "mount", "hover"] },
  { type: "number", prop: "duration", label: "Duration (s)", min: 0.2, max: 3, step: 0.1 },
  { type: "number", prop: "speedMs", label: "Frame (ms)", min: 16, max: 120, step: 4 },
];

function Preview({ props }: { props: DemoProps }) {
  return <ScrambleText {...props} className="font-mono text-2xl font-semibold tracking-wider text-pui-foreground" />;
}

function Mini() {
  return <ScrambleText text="SCRAMBLE" trigger="mount" className="font-mono text-xl font-semibold text-pui-foreground" />;
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) => toJsx("ScrambleText", props, { ...defaults, text: "" }, undefined, controls),
  propsTable: propDocs<ScrambleTextProps>()([
    { name: "text", type: "string", description: "Final text.", required: true },
    { name: "characters", type: "string", default: '"A-Z 0-9 !@#$%&*"', description: "Random glyph pool." },
    { name: "duration", type: "number", default: "0.8", description: "Total seconds." },
    { name: "speedMs", type: "number", default: "40", description: "Time per scramble frame." },
    { name: "trigger", type: '"mount" | "inView" | "hover"', default: '"inView"', description: '"hover" re-scrambles on pointerenter or focus within.' },
    { name: "once", type: "boolean", default: "true", description: "Scramble only the first time it enters the viewport." },
    { name: "delay", type: "number", default: "0", description: "Seconds before scrambling." },
    { name: "onComplete", type: "() => void", description: "Called when the text has resolved." },
    { name: "as", type: "TextTag", default: '"span"', description: "Rendered tag." },
  ]),
  a11y: [
    "The server render and the first client render output the real text.",
    "Screen readers read the text once from an sr-only copy. Add font-mono to avoid width jitter.",
  ],
  reducedMotion: "The text renders without scrambling.",
};

export default item;
