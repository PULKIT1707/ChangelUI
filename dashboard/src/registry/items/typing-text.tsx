import { TypingText, type TypingTextProps } from "changelui";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  cursor: NonNullable<TypingTextProps["cursor"]>;
  typeSpeedMs: number;
  deleteSpeedMs: number;
  pauseMs: number;
  blinkCursor: boolean;
};

const words = ["Build faster.", "Animate with care.", "Ship small bundles."];
const defaults: DemoProps = { cursor: "line", typeSpeedMs: 50, deleteSpeedMs: 30, pauseMs: 1500, blinkCursor: true };

const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "cursor", label: "Cursor", options: ["line", "block", "underscore", "none"] },
  { type: "number", prop: "typeSpeedMs", label: "Type speed (ms)", min: 10, max: 200, step: 10 },
  { type: "number", prop: "deleteSpeedMs", label: "Delete speed (ms)", min: 10, max: 200, step: 10 },
  { type: "number", prop: "pauseMs", label: "Pause (ms)", min: 200, max: 4000, step: 100 },
  { type: "boolean", prop: "blinkCursor", label: "Blink cursor" },
];

function Preview({ props }: { props: DemoProps }) {
  return <TypingText {...props} text={words} as="h2" className="text-3xl font-bold text-pui-foreground" />;
}

function Mini() {
  return <TypingText text="npm i changelui" trigger="mount" className="font-mono text-sm text-pui-foreground" />;
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) =>
    toJsx<Record<string, unknown>>(
      "TypingText",
      { text: words, ...props },
      { ...defaults, text: undefined },
      undefined,
      controls as ControlSpec<Record<string, unknown>>[],
    ),
  propsTable: propDocs<TypingTextProps>()([
    { name: "text", type: "string | string[]", description: "One string, or several typed in turn.", required: true },
    { name: "typeSpeedMs", type: "number", default: "50", description: "Milliseconds per typed character." },
    { name: "deleteSpeedMs", type: "number", default: "30", description: "Milliseconds per deleted character." },
    { name: "pauseMs", type: "number", default: "1500", description: "Pause on a fully typed item." },
    { name: "loop", type: "boolean", default: "Array.isArray(text)", description: "Start over after the last item." },
    { name: "cursor", type: '"line" | "block" | "underscore" | "none"', default: '"line"', description: "Cursor shape." },
    { name: "blinkCursor", type: "boolean", default: "true", description: "Blink the cursor (motion-safe)." },
    { name: "onComplete", type: "() => void", description: "Called when a non-looping sequence finishes." },
    { name: "trigger", type: '"mount" | "inView"', default: '"inView"', description: "When typing starts." },
    { name: "delay", type: "number", default: "0", description: "Seconds before the first character." },
    { name: "as", type: "TextTag", default: '"span"', description: "Rendered tag." },
  ]),
  a11y: ["The current item is read from an sr-only copy; the typed characters and cursor are aria-hidden."],
  reducedMotion: "The full text shows immediately with a static cursor.",
};

export default item;
