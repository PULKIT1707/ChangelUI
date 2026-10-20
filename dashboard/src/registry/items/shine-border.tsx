import { ShineBorder, type ShineBorderProps } from "changelui";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  borderWidth: number;
  duration: number;
};

const defaults: DemoProps = { borderWidth: 1, duration: 14 };

const controls: ControlSpec<DemoProps>[] = [
  { type: "number", prop: "borderWidth", label: "Border width", min: 1, max: 6, step: 1 },
  { type: "number", prop: "duration", label: "Duration (s)", min: 2, max: 30, step: 1 },
];

function Preview({ props }: { props: DemoProps }) {
  return (
    <div className="relative w-72 rounded-pui-xl bg-pui-surface p-6 text-pui-surface-foreground">
      <ShineBorder {...props} />
      <p className="m-0 text-base font-semibold">Shine border</p>
      <p className="m-0 mt-1 text-sm text-pui-muted-foreground">A gradient ring that slowly travels.</p>
    </div>
  );
}

function Mini() {
  return (
    <div className="relative h-20 w-36 rounded-pui-lg bg-pui-surface">
      <ShineBorder borderWidth={2} duration={6} />
    </div>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) => toJsx("ShineBorder", props, defaults, undefined, controls),
  propsTable: propDocs<ShineBorderProps>()([
    { name: "borderWidth", type: "number", default: "1", description: "Ring width in px." },
    { name: "duration", type: "number", default: "14", description: "Seconds per cycle." },
    { name: "colors", type: "string[]", default: "--pui-beam-from, --pui-beam-to", description: "Gradient colors." },
  ]),
  a11y: ["Decorative and aria-hidden. Place it inside a relative, rounded parent."],
  reducedMotion: "A static gradient border.",
};

export default item;
