import { Button, WavyText, type WavyTextProps } from "changelui";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  text: string;
  trigger: NonNullable<WavyTextProps["trigger"]>;
  amplitude: number;
  speed: number;
  phase: number;
};

const defaults: DemoProps = { text: "Making waves", trigger: "loop", amplitude: 6, speed: 1, phase: 0.4 };

const controls: ControlSpec<DemoProps>[] = [
  { type: "text", prop: "text", label: "Text", maxLength: 40 },
  { type: "select", prop: "trigger", label: "Trigger", options: ["loop", "hover"] },
  { type: "number", prop: "amplitude", label: "Amplitude (px)", min: 1, max: 24, step: 1 },
  { type: "number", prop: "speed", label: "Speed", min: 0.25, max: 3, step: 0.25 },
  { type: "number", prop: "phase", label: "Phase (rad / letter)", min: 0.1, max: 1.6, step: 0.05 },
];

function Preview({ props }: { props: DemoProps }) {
  const { text, ...rest } = props;
  return (
    <div className="flex w-full flex-col items-center gap-3 py-10">
      <WavyText as="h2" {...rest} className="m-0 text-5xl font-bold tracking-tight text-pui-foreground sm:text-6xl">
        {text}
      </WavyText>
      {props.trigger === "hover" ? <p className="m-0 text-xs text-pui-muted-foreground">Hover the text to send a ripple.</p> : null}
    </div>
  );
}

function LoadingDemo() {
  return (
    <div role="status" className="flex items-center gap-3 rounded-pui-lg border border-pui-border bg-pui-surface px-4 py-3 text-sm text-pui-surface-foreground shadow-pui-sm">
      <WavyText amplitude={3} speed={1.4} phase={0.7}>
        Generating your playlist…
      </WavyText>
    </div>
  );
}

function ButtonDemo() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <Button>
        <WavyText trigger="hover" amplitude={4}>
          Say hello
        </WavyText>
      </Button>
      <Button variant="outline" tone="neutral">
        <WavyText trigger="hover" amplitude={4} speed={1.5}>
          Surprise me
        </WavyText>
      </Button>
    </div>
  );
}

function PartyDemo() {
  return (
    <div className="flex w-full flex-col items-center gap-1 py-4">
      <WavyText as="p" amplitude={12} speed={0.75} phase={0.55} className="m-0 text-5xl font-black tracking-tight text-pui-primary">
        It's party time
      </WavyText>
      <WavyText as="p" amplitude={4} speed={0.75} phase={0.55} className="m-0 text-sm font-medium text-pui-muted-foreground">
        Saturday, 9pm, rooftop
      </WavyText>
    </div>
  );
}

function Mini() {
  return (
    <WavyText amplitude={5} className="text-3xl font-bold text-pui-foreground">
      Wavy
    </WavyText>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: ({ text, ...props }) =>
    toJsx<Record<string, unknown>>(
      "WavyText",
      props,
      { trigger: "loop", amplitude: 6, speed: 1, phase: 0.4 },
      text,
      controls as ControlSpec<Record<string, unknown>>[],
    ),
  propsTable: propDocs<WavyTextProps>()([
    { name: "children", type: "string", description: "The text; each letter rides the wave.", required: true },
    { name: "trigger", type: '"loop" | "hover"', default: '"loop"', description: "Continuous wave, or one ripple on pointer enter and focus." },
    { name: "amplitude", type: "number", default: "6", description: "Peak offset per letter in px." },
    { name: "speed", type: "number", default: "1", description: "Waves per 1.6s." },
    { name: "phase", type: "number", default: "0.4", description: "Phase step between neighbouring letters, in radians." },
    { name: "as", type: "TextTag", default: '"span"', description: "Rendered tag." },
  ]),
  a11y: [
    "Screen readers get the text once from an sr-only copy; the letters are aria-hidden.",
    "The loop is pure CSS and pauses while off-screen.",
  ],
  reducedMotion: "Letters stay still; hover ripples are skipped.",
  examples: [
    { title: "Loading label", description: "A small, fast wave for a status message.", Demo: LoadingDemo },
    { title: "Button labels", description: "hover sends a single ripple across the label.", Demo: ButtonDemo },
    { title: "Invitation", description: "A slow, tall wave over a matching small one.", Demo: PartyDemo, wide: true },
  ],
};
export default item;
