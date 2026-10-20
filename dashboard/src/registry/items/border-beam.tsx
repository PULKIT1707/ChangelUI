import { BorderBeam, type BorderBeamProps } from "changelui";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  beamSize: number;
  duration: number;
  borderWidth: number;
  reverse: boolean;
  glow: boolean;
};

const defaults: DemoProps = { beamSize: 80, duration: 6, borderWidth: 1, reverse: false, glow: true };

const controls: ControlSpec<DemoProps>[] = [
  { type: "number", prop: "beamSize", label: "Beam size", min: 20, max: 200, step: 10 },
  { type: "number", prop: "duration", label: "Duration (s)", min: 1, max: 20, step: 1 },
  { type: "number", prop: "borderWidth", label: "Border width", min: 1, max: 4, step: 1 },
  { type: "boolean", prop: "reverse", label: "Reverse" },
  { type: "boolean", prop: "glow", label: "Glow" },
];

function Preview({ props }: { props: DemoProps }) {
  return (
    <div className="relative w-72 rounded-pui-xl border border-pui-border bg-pui-surface p-6 text-pui-surface-foreground">
      <p className="m-0 text-base font-semibold">Pro plan</p>
      <p className="m-0 mt-1 text-sm text-pui-muted-foreground">Everything in Free, plus priority support.</p>
      <BorderBeam {...props} />
    </div>
  );
}

function Mini() {
  return (
    <div className="relative h-20 w-36 rounded-pui-lg border border-pui-border bg-pui-surface">
      <BorderBeam beamSize={40} duration={4} />
    </div>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) => toJsx("BorderBeam", props, defaults, undefined, controls),
  propsTable: propDocs<BorderBeamProps>()([
    { name: "beamSize", type: "number", default: "80", description: "Beam length in px." },
    { name: "duration", type: "number", default: "6", description: "Seconds per lap." },
    { name: "delay", type: "number", default: "0", description: "Seconds before the first lap." },
    { name: "colorFrom", type: "string", default: '"var(--pui-beam-from)"', description: "Beam head color." },
    { name: "colorTo", type: "string", default: '"var(--pui-beam-to)"', description: "Beam tail color." },
    { name: "borderWidth", type: "number", default: "1", description: "Border ring width in px." },
    { name: "reverse", type: "boolean", default: "false", description: "Travel counter-clockwise." },
    { name: "initialOffset", type: "number", default: "0", description: "Start position along the border (%)." },
    { name: "radius", type: "number", description: "Corner radius in px; default reads the parent's radius." },
    { name: "glow", type: "boolean", default: "true", description: "Soft blurred halo that follows the beam." },
  ]),
  a11y: [
    "Decorative and aria-hidden. Place it last inside a relative, rounded parent.",
    "Needs offset-path: rect() (Chrome 116, Safari 17.2, Firefox 122, from memory). Older browsers show no beam.",
  ],
  reducedMotion: "Renders nothing.",
};

export default item;
