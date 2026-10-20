import { Beams, Button, type BeamsProps } from "changelui";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";
type DemoProps = {
  count: number;
  speed: number;
  length: number;
  width: number;
  tilt: number;
  rails: boolean;
  glow: boolean;
  mask: NonNullable<BeamsProps["mask"]>;
};
const defaults: DemoProps = { count: 8, speed: 1, length: 0.35, width: 1, tilt: 0, rails: true, glow: true, mask: "none" };
const controls: ControlSpec<DemoProps>[] = [
  { type: "number", prop: "count", label: "Count", min: 1, max: 40, step: 1 },
  { type: "number", prop: "speed", label: "Speed", min: 0.2, max: 4, step: 0.1 },
  { type: "number", prop: "length", label: "Tail length", min: 0.05, max: 0.8, step: 0.05 },
  { type: "number", prop: "width", label: "Width (px)", min: 1, max: 6, step: 1 },
  { type: "number", prop: "tilt", label: "Tilt (deg)", min: -45, max: 45, step: 5 },
  { type: "boolean", prop: "rails", label: "Rails" },
  { type: "boolean", prop: "glow", label: "Top glow" },
  { type: "select", prop: "mask", label: "Mask", options: ["none", "radial", "fade-x", "fade-y", "fade-bottom"] },
];
function Preview({ props }: { props: DemoProps }) {
  return (
    <div className="dark relative isolate flex h-80 w-full max-w-2xl flex-col items-center justify-center gap-4 overflow-hidden rounded-pui-xl border border-pui-border bg-pui-background px-6 text-center">
      <Beams {...props} />
      <span className="relative rounded-pui-full border border-pui-border bg-pui-surface/70 px-3 py-1 text-xs font-medium text-pui-muted-foreground backdrop-blur-sm">
        v2.0 is live
      </span>
      <h2 className="relative m-0 max-w-md font-pui-display text-3xl font-bold tracking-tight text-pui-foreground sm:text-4xl">
        Ship at the speed of light
      </h2>
      <p className="relative m-0 max-w-sm text-sm text-pui-muted-foreground">Preview deploys in seconds, rollbacks in one click.</p>
      <div className="relative flex gap-2">
        <Button>Start building</Button>
        <Button variant="outline">Read the docs</Button>
      </div>
    </div>
  );
}
function TiltedDemo() {
  return (
    <div className="dark relative isolate flex h-64 w-full items-end overflow-hidden rounded-pui-xl border border-pui-border bg-pui-background p-6">
      <Beams count={16} tilt={-24} width={2} length={0.5} speed={1.4} color="var(--pui-chart-2)" accentColor="var(--pui-chart-4)" mask="fade-bottom" />
      <div className="relative">
        <p className="m-0 font-pui-mono text-xs tracking-widest text-pui-muted-foreground uppercase">Launch week · Day 3</p>
        <p className="m-0 mt-1 text-2xl font-semibold text-pui-foreground">Edge functions, everywhere</p>
      </div>
    </div>
  );
}
function LightDemo() {
  return (
    <div className="relative isolate grid h-56 w-full place-items-center overflow-hidden rounded-pui-xl border border-pui-border bg-pui-muted/40">
      <Beams count={12} rails={false} glow={false} speed={0.7} length={0.25} mask="radial" />
      <div className="relative rounded-pui-lg border border-pui-border bg-pui-surface px-5 py-4 text-center shadow-pui-md">
        <p className="m-0 text-xs text-pui-muted-foreground">Requests streamed</p>
        <p className="m-0 font-pui-mono text-2xl font-semibold text-pui-surface-foreground">1,284,903</p>
      </div>
    </div>
  );
}
function CardDemo() {
  return (
    <div className="grid w-full gap-3 sm:grid-cols-3">
      {["var(--pui-chart-1)", "var(--pui-chart-3)", "var(--pui-chart-5)"].map((color, i) => (
        <div key={color} className="dark relative isolate h-36 overflow-hidden rounded-pui-lg border border-pui-border bg-pui-background p-4">
          <Beams count={4} speed={0.8 + i * 0.3} color={color} accentColor={color} glow={false} seed={i + 3} />
          <p className="relative m-0 text-sm font-semibold text-pui-foreground">{["Ingest", "Transform", "Deliver"][i]}</p>
          <p className="relative m-0 mt-1 text-xs text-pui-muted-foreground">Stage {i + 1} of 3</p>
        </div>
      ))}
    </div>
  );
}
function Mini() {
  return (
    <div className="dark relative isolate h-28 w-64 max-w-full overflow-hidden rounded-pui-lg bg-pui-background">
      <Beams count={7} speed={1.4} seed={4} />
    </div>
  );
}
const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) => toJsx("Beams", props, defaults, undefined, controls),
  propsTable: propDocs<BeamsProps>()([
    { name: "count", type: "number", default: "8", description: "Number of beams (1..40)." },
    { name: "color", type: "string", default: '"var(--pui-beam-from)"', description: "Tail color." },
    { name: "accentColor", type: "string", default: '"var(--pui-beam-to)"', description: "Head color with a soft glow." },
    { name: "speed", type: "number", default: "1", description: "Speed multiplier (4–9s per pass at 1)." },
    { name: "length", type: "number", default: "0.35", description: "Tail length as a fraction of the height." },
    { name: "width", type: "number", default: "1", description: "Beam width in px (1..6)." },
    { name: "tilt", type: "number", default: "0", description: "Tilt of the whole field in degrees (-45..45)." },
    { name: "rails", type: "boolean", default: "true", description: "Faint rails the beams travel on." },
    { name: "glow", type: "boolean", default: "true", description: "Soft glow along the top edge." },
    { name: "seed", type: "number", description: "Layout seed; defaults to one derived from the instance id." },
    { name: "mask", type: "PatternMask", default: '"none"', description: "Edge mask." },
  ]),
  a11y: [
    "Decorative and aria-hidden. Put it first inside a relative isolate overflow-hidden parent and keep text contrast against the parent background.",
    "Layout is seeded from useId, so the server and client render the same beams.",
  ],
  reducedMotion: "Beams stay put at seeded positions along their rails.",
  examples: [
    { title: "Tilted launch banner", description: "tilt, wider beams and chart colors with a bottom fade.", Demo: TiltedDemo, wide: true },
    { title: "Light mode", description: "No rails or glow, radial mask behind a stat card.", Demo: LightDemo },
    { title: "Pipeline cards", description: "Four beams per card, one color each.", Demo: CardDemo },
  ],
};
export default item;
