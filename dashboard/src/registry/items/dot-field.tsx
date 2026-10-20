import { Badge, Button, DotField, type DotFieldProps } from "changelui";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";
type DemoProps = {
  spacing: number;
  dotSize: number;
  radius: number;
  mode: NonNullable<DotFieldProps["mode"]>;
  strength: number;
  clickRipple: boolean;
  ambient: boolean;
  opacity: number;
  mask: NonNullable<DotFieldProps["mask"]>;
};
const defaults: DemoProps = {
  spacing: 24,
  dotSize: 2.5,
  radius: 120,
  mode: "repel",
  strength: 1,
  clickRipple: true,
  ambient: true,
  opacity: 0.45,
  mask: "none",
};
const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "mode", label: "Mode", options: ["repel", "attract", "glow"] },
  { type: "number", prop: "spacing", label: "Spacing", min: 10, max: 60, step: 2 },
  { type: "number", prop: "dotSize", label: "Dot size", min: 1, max: 8, step: 0.5 },
  { type: "number", prop: "radius", label: "Radius", min: 40, max: 300, step: 10 },
  { type: "number", prop: "strength", label: "Strength", min: 0, max: 4, step: 0.1 },
  { type: "boolean", prop: "clickRipple", label: "Click ripple" },
  { type: "boolean", prop: "ambient", label: "Ambient shimmer" },
  { type: "number", prop: "opacity", label: "Opacity", min: 0.1, max: 1, step: 0.05 },
  { type: "select", prop: "mask", label: "Mask", options: ["none", "radial", "fade-x", "fade-y", "fade-bottom"] },
];
function Preview({ props }: { props: DemoProps }) {
  return (
    <div className="relative isolate flex h-80 w-full max-w-2xl flex-col items-center justify-center gap-3 overflow-hidden rounded-pui-xl border border-pui-border bg-pui-background px-6 text-center">
      <DotField {...props} />
      <Badge tone="primary" className="relative">
        Click anywhere
      </Badge>
      <h2 className="relative m-0 font-pui-display text-3xl font-bold tracking-tight text-pui-foreground sm:text-4xl">A field that feels you</h2>
      <p className="relative m-0 max-w-sm text-sm text-pui-muted-foreground">Dots spring out of the pointer's way, light up and ripple on every click.</p>
    </div>
  );
}
function AttractDemo() {
  return (
    <div className="dark relative isolate flex h-64 w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-pui-xl border border-pui-border bg-pui-background text-center">
      <DotField mode="attract" spacing={18} dotSize={2} radius={160} strength={1.4} activeColor="var(--pui-chart-2)" mask="radial" />
      <p className="relative m-0 font-pui-display text-2xl font-bold text-pui-foreground">Gravity well</p>
      <p className="relative m-0 text-sm text-pui-muted-foreground">mode attract pulls dots into the pointer.</p>
    </div>
  );
}
function PricingDemo() {
  return (
    <div className="relative isolate flex h-64 w-full flex-col justify-between overflow-hidden rounded-pui-xl border border-pui-border bg-pui-surface p-6">
      <DotField mode="glow" spacing={16} dotSize={2} radius={100} ambient={false} opacity={0.3} activeColor="var(--pui-primary)" />
      <div className="relative">
        <p className="m-0 text-sm font-medium text-pui-muted-foreground">Team</p>
        <p className="m-0 mt-1 text-4xl font-bold text-pui-surface-foreground">
          $49<span className="text-sm font-normal text-pui-muted-foreground">/mo</span>
        </p>
      </div>
      <Button className="relative w-full">Choose Team</Button>
    </div>
  );
}
function HeroDemo() {
  return (
    <div className="dark relative isolate flex h-72 w-full flex-col items-start justify-end gap-3 overflow-hidden rounded-pui-xl border border-pui-border bg-pui-background p-8">
      <DotField spacing={28} dotSize={3} radius={180} strength={2} activeColor="var(--pui-chart-4)" mask="fade-bottom" />
      <p className="relative m-0 max-w-md font-pui-display text-4xl font-bold tracking-tight text-pui-foreground">Tap to make waves.</p>
      <p className="relative m-0 text-sm text-pui-muted-foreground">Ripples roll out at 600 px/s and push the dots as they pass.</p>
    </div>
  );
}
function Mini() {
  return (
    <div className="relative isolate h-24 w-40 overflow-hidden rounded-pui-lg bg-pui-background">
      <DotField spacing={12} dotSize={2} opacity={0.6} />
    </div>
  );
}
const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) => toJsx("DotField", props, defaults, undefined, controls),
  propsTable: propDocs<DotFieldProps>()([
    { name: "spacing", type: "number", default: "24", description: "Distance between dots in px." },
    { name: "dotSize", type: "number", default: "2.5", description: "Dot diameter in px." },
    { name: "radius", type: "number", default: "120", description: "Pointer influence radius in px." },
    { name: "mode", type: '"repel" | "attract" | "glow"', default: '"repel"', description: "Push dots away, pull them in, or only light them." },
    { name: "strength", type: "number", default: "1", description: "Push strength multiplier." },
    { name: "clickRipple", type: "boolean", default: "true", description: "Clicks and taps inside the box send a ripple ring through the field." },
    { name: "ambient", type: "boolean", default: "true", description: "A slow diagonal shimmer passes over the dots." },
    { name: "color", type: "string", description: "Resting dot color; default the root's text color (text-pui-muted-foreground)." },
    { name: "activeColor", type: "string", default: '"var(--pui-primary)"', description: "Color of dots lit by the pointer or a ripple." },
    { name: "opacity", type: "number", default: "0.45", description: "Resting dot opacity." },
    { name: "mask", type: "PatternMask", default: '"none"', description: "Edge mask." },
  ]),
  a11y: [
    "Decorative and aria-hidden canvas with pointer-events none: clicks reach your content, and the ripple listens on window for presses inside the box.",
    "Dots spring home with stiffness 0.08 and damping 0.85 per 60 fps frame; batched into alpha buckets.",
  ],
  reducedMotion: "A still dot grid: no pointer response, ripples or shimmer.",
  examples: [
    { title: "Gravity well", description: "mode attract with a radial mask.", Demo: AttractDemo },
    { title: "Pricing glow", description: "mode glow on a card, no shimmer.", Demo: PricingDemo },
    { title: "Ripple hero", description: "Big dots, strong push, tap or click to ripple.", Demo: HeroDemo, wide: true },
  ],
};
export default item;
