import { Meteors, type MeteorsProps } from "changelui";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  count: number;
  angle: number;
};

const defaults: DemoProps = { count: 20, angle: 215 };

const controls: ControlSpec<DemoProps>[] = [
  { type: "number", prop: "count", label: "Count", min: 0, max: 100, step: 5 },
  { type: "number", prop: "angle", label: "Angle (deg)", min: 180, max: 270, step: 5 },
];

function Preview({ props }: { props: DemoProps }) {
  return (
    <div className="relative isolate flex h-64 w-full max-w-lg items-center justify-center overflow-hidden rounded-pui-xl border border-pui-border bg-pui-background">
      <Meteors {...props} />
      <p className="relative m-0 text-xl font-semibold text-pui-foreground">Make a wish</p>
    </div>
  );
}

function Mini() {
  return (
    <div className="relative isolate h-20 w-36 overflow-hidden rounded-pui-lg bg-pui-muted">
      <Meteors count={8} />
    </div>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) => toJsx("Meteors", props, defaults, undefined, controls),
  propsTable: propDocs<MeteorsProps>()([
    { name: "count", type: "number", default: "20", description: "Number of meteors (0..100)." },
    { name: "angle", type: "number", default: "215", description: "Travel angle in degrees." },
    { name: "duration", type: "[min: number, max: number]", default: "[2, 8]", description: "Seconds per fall." },
    { name: "delay", type: "[min: number, max: number]", default: "[0, 1]", description: "Seconds of start delay." },
    { name: "mask", type: "PatternMask", default: '"none"', description: "Edge mask." },
  ]),
  a11y: ["Decorative and aria-hidden. The layout is seeded per instance and rendered after mount (no hydration mismatch)."],
  reducedMotion: "Renders nothing.",
};

export default item;
