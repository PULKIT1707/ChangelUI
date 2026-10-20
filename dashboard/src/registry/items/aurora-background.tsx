import { AuroraBackground, type AuroraBackgroundProps } from "changelui";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  intensity: NonNullable<AuroraBackgroundProps["intensity"]>;
  duration: number;
  radialMask: boolean;
};

const defaults: DemoProps = { intensity: "normal", duration: 60, radialMask: true };

const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "intensity", label: "Intensity", options: ["subtle", "normal", "vivid"] },
  { type: "number", prop: "duration", label: "Duration (s)", min: 10, max: 120, step: 10 },
  { type: "boolean", prop: "radialMask", label: "Radial mask" },
];

function Preview({ props }: { props: DemoProps }) {
  return (
    <div className="relative isolate flex h-64 w-full max-w-lg items-center justify-center overflow-hidden rounded-pui-xl border border-pui-border bg-pui-background">
      <AuroraBackground {...props} />
      <p className="relative m-0 text-2xl font-bold text-pui-foreground">Northern lights</p>
    </div>
  );
}

function Mini() {
  return (
    <div className="relative isolate h-20 w-36 overflow-hidden rounded-pui-lg bg-pui-background">
      <AuroraBackground intensity="vivid" duration={20} radialMask={false} />
    </div>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) => toJsx("AuroraBackground", props, defaults, undefined, controls),
  propsTable: propDocs<AuroraBackgroundProps>()([
    { name: "colors", type: "string[]", default: "--pui-aurora-1..3", description: "Band colors." },
    { name: "duration", type: "number", default: "60", description: "Seconds per drift cycle." },
    { name: "intensity", type: '"subtle" | "normal" | "vivid"', default: '"normal"', description: "Opacity and blur." },
    { name: "radialMask", type: "boolean", default: "true", description: "Fade out from the top-right corner." },
    { name: "mask", type: "PatternMask", default: '"none"', description: "Extra edge mask." },
  ]),
  a11y: ["Decorative and aria-hidden. Parent: relative isolate overflow-hidden; content after it: relative."],
  reducedMotion: "A static gradient.",
};

export default item;
