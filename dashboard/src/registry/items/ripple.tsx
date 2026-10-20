import { Ripple, type RippleProps } from "changelui";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  count: number;
  baseSize: number;
  baseOpacity: number;
  duration: number;
};

const defaults: DemoProps = { count: 8, baseSize: 210, baseOpacity: 0.24, duration: 2 };

const controls: ControlSpec<DemoProps>[] = [
  { type: "number", prop: "count", label: "Rings", min: 1, max: 12, step: 1 },
  { type: "number", prop: "baseSize", label: "Base size", min: 60, max: 400, step: 10 },
  { type: "number", prop: "baseOpacity", label: "Base opacity", min: 0.05, max: 0.5, step: 0.01 },
  { type: "number", prop: "duration", label: "Duration (s)", min: 0.5, max: 6, step: 0.5 },
];

function Preview({ props }: { props: DemoProps }) {
  return (
    <div className="relative isolate flex h-64 w-full max-w-lg items-center justify-center overflow-hidden rounded-pui-xl border border-pui-border bg-pui-background">
      <Ripple {...props} />
      <p className="relative m-0 text-xl font-semibold text-pui-foreground">Ripple</p>
    </div>
  );
}

function Mini() {
  return (
    <div className="relative isolate h-20 w-36 overflow-hidden rounded-pui-lg">
      <Ripple count={4} baseSize={40} mask="none" />
    </div>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) => toJsx("Ripple", props, defaults, undefined, controls),
  propsTable: propDocs<RippleProps>()([
    { name: "count", type: "number", default: "8", description: "Number of rings." },
    { name: "baseSize", type: "number", default: "210", description: "Innermost ring diameter in px (+70 per ring)." },
    { name: "baseOpacity", type: "number", default: "0.24", description: "Innermost ring opacity (-0.03 per ring)." },
    { name: "duration", type: "number", default: "2", description: "Seconds per pulse." },
    { name: "mask", type: "PatternMask", default: '"fade-bottom"', description: "Edge mask." },
  ]),
  a11y: ["Decorative and aria-hidden."],
  reducedMotion: "Static rings.",
};

export default item;
