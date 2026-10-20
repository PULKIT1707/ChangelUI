import { Button, LightRays, type LightRaysProps } from "changelui";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";
type DemoProps = {
  origin: NonNullable<LightRaysProps["origin"]>;
  rays: number;
  intensity: number;
  spread: number;
  reach: number;
  sway: number;
  speed: number;
  glow: boolean;
  mask: NonNullable<LightRaysProps["mask"]>;
};
const defaults: DemoProps = { origin: "top-left", rays: 6, intensity: 0.5, spread: 70, reach: 1.1, sway: 3, speed: 1, glow: true, mask: "none" };
const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "origin", label: "Origin", options: ["top-left", "top", "top-right", "left", "right", "bottom"] },
  { type: "number", prop: "rays", label: "Rays", min: 1, max: 16, step: 1 },
  { type: "number", prop: "intensity", label: "Intensity", min: 0.1, max: 1, step: 0.05 },
  { type: "number", prop: "spread", label: "Spread (deg)", min: 10, max: 180, step: 5 },
  { type: "number", prop: "reach", label: "Reach", min: 0.3, max: 2, step: 0.1 },
  { type: "number", prop: "sway", label: "Sway (deg)", min: 0, max: 15, step: 1 },
  { type: "number", prop: "speed", label: "Speed", min: 0.2, max: 4, step: 0.1 },
  { type: "boolean", prop: "glow", label: "Source glow" },
  { type: "select", prop: "mask", label: "Mask", options: ["none", "radial", "fade-x", "fade-y", "fade-bottom"] },
];
function Preview({ props }: { props: DemoProps }) {
  return (
    <div className="dark relative isolate flex h-80 w-full max-w-2xl flex-col items-center justify-center gap-3 overflow-hidden rounded-pui-xl border border-pui-border bg-pui-background px-6 text-center">
      <LightRays {...props} />
      <h2 className="relative m-0 font-pui-display text-3xl font-bold tracking-tight text-pui-foreground sm:text-4xl">Step into the light</h2>
      <p className="relative m-0 max-w-sm text-sm text-pui-muted-foreground">Conic rays that sway and breathe on their own clocks.</p>
      <Button className="relative">Get early access</Button>
    </div>
  );
}
function StageDemo() {
  return (
    <div className="dark relative isolate flex h-64 w-full flex-col items-center justify-end overflow-hidden rounded-pui-xl border border-pui-border bg-pui-background pb-8">
      <LightRays origin="top" rays={5} spread={26} reach={1.3} intensity={0.75} sway={2} color="var(--pui-chart-4)" />
      <p className="relative m-0 text-xs font-medium tracking-[0.3em] text-pui-muted-foreground uppercase">Keynote</p>
      <p className="relative m-0 mt-1 text-2xl font-semibold text-pui-foreground">One more thing</p>
    </div>
  );
}
function DualDemo() {
  return (
    <div className="dark relative isolate grid h-64 w-full place-items-center overflow-hidden rounded-pui-xl border border-pui-border bg-pui-background">
      <LightRays origin="top-left" rays={5} color="var(--pui-chart-1)" intensity={0.6} seed={2} />
      <LightRays origin="top-right" rays={5} color="var(--pui-chart-2)" intensity={0.6} seed={9} />
      <p className="relative m-0 font-pui-display text-2xl font-semibold text-pui-foreground">Crossfire</p>
    </div>
  );
}
function SunriseDemo() {
  return (
    <div className="relative isolate flex h-64 w-full flex-col items-center overflow-hidden rounded-pui-xl border border-pui-border bg-pui-background pt-10">
      <LightRays origin="bottom" rays={9} spread={120} reach={0.9} intensity={0.55} color="var(--pui-gradient-3)" />
      <p className="relative m-0 text-2xl font-semibold tracking-tight text-pui-foreground">Good morning, Sam</p>
      <p className="relative m-0 mt-1 text-sm text-pui-muted-foreground">You have 3 meetings and a clear afternoon.</p>
    </div>
  );
}
function Mini() {
  return (
    <div className="dark relative isolate h-24 w-40 overflow-hidden rounded-pui-lg bg-pui-background">
      <LightRays rays={5} intensity={0.8} speed={2.5} seed={5} />
    </div>
  );
}
const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) => toJsx("LightRays", props, defaults, undefined, controls),
  propsTable: propDocs<LightRaysProps>()([
    { name: "origin", type: '"top-left" | "top" | "top-right" | "left" | "right" | "bottom"', default: '"top-left"', description: "Where the light comes from." },
    { name: "rays", type: "number", default: "6", description: "Number of rays (1..16)." },
    { name: "color", type: "string", default: '"var(--pui-primary)"', description: "Ray color." },
    { name: "intensity", type: "number", default: "0.5", description: "Strength of the light (0..1)." },
    { name: "spread", type: "number", default: "70", description: "Width of the fan in degrees." },
    { name: "reach", type: "number", default: "1.1", description: "How far the rays reach, as a share of the larger side." },
    { name: "sway", type: "number", default: "3", description: "Sway amplitude in degrees; 0 holds still." },
    { name: "speed", type: "number", default: "1", description: "Speed multiplier (9–15s per sway at 1)." },
    { name: "glow", type: "boolean", default: "true", description: "Soft glow at the light source." },
    { name: "seed", type: "number", description: "Layout seed; defaults to one derived from the instance id." },
    { name: "mask", type: "PatternMask", default: '"none"', description: "Edge mask." },
  ]),
  a11y: ["Decorative and aria-hidden. Pure CSS conic gradients, server-rendered in full."],
  reducedMotion: "Rays hold still at full strength.",
  examples: [
    { title: "Stage spotlight", description: 'origin="top" with a narrow 26° fan.', Demo: StageDemo, wide: true },
    { title: "Two sources", description: "Stack two instances with different colors.", Demo: DualDemo },
    { title: "Light mode sunrise", description: 'origin="bottom" in a warm gradient token.', Demo: SunriseDemo },
  ],
};
export default item;
