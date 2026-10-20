import { Badge, Button, Halftone, type HalftoneProps } from "changelui";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";
type DemoProps = {
  dotSize: number;
  spacing: number;
  variant: NonNullable<HalftoneProps["variant"]>;
  source: NonNullable<HalftoneProps["source"]>;
  angle: number;
  invert: boolean;
  intensity: number;
  speed: number;
  interactive: boolean;
  radius: number;
  mask: NonNullable<HalftoneProps["mask"]>;
};
const defaults: DemoProps = {
  dotSize: 6,
  spacing: 10,
  variant: "halftone",
  source: "radial",
  angle: 45,
  invert: false,
  intensity: 1,
  speed: 1,
  interactive: true,
  radius: 140,
  mask: "none",
};
const componentDefaults: DemoProps = { ...defaults, interactive: false };
const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "variant", label: "Variant", options: ["halftone", "dither", "lines"] },
  { type: "select", prop: "source", label: "Source", options: ["radial", "linear", "noise", "flat"] },
  { type: "number", prop: "dotSize", label: "Dot size", min: 2, max: 24, step: 1 },
  { type: "number", prop: "spacing", label: "Spacing", min: 4, max: 32, step: 1 },
  { type: "number", prop: "angle", label: "Angle", min: 0, max: 90, step: 5 },
  { type: "boolean", prop: "invert", label: "Invert" },
  { type: "number", prop: "intensity", label: "Intensity", min: 0, max: 2, step: 0.05 },
  { type: "number", prop: "speed", label: "Noise speed", min: 0, max: 4, step: 0.1 },
  { type: "boolean", prop: "interactive", label: "Pointer swell" },
  { type: "number", prop: "radius", label: "Pointer radius", min: 40, max: 320, step: 10 },
  { type: "select", prop: "mask", label: "Mask", options: ["none", "radial", "fade-x", "fade-y", "fade-bottom"] },
];
function Preview({ props }: { props: DemoProps }) {
  return (
    <div className="relative isolate flex h-80 w-full max-w-2xl flex-col items-center justify-center gap-3 overflow-hidden rounded-pui-xl border border-pui-border bg-pui-background px-6 text-center">
      <Halftone {...props} className="opacity-60" />
      <Badge tone="primary" className="relative">
        Print-ready
      </Badge>
      <h2 className="relative m-0 font-pui-display text-3xl font-bold tracking-tight text-pui-foreground sm:text-4xl">Ink meets pixels</h2>
      <p className="relative m-0 max-w-sm text-sm text-pui-muted-foreground">Dots follow the tone and swell around the pointer.</p>
    </div>
  );
}
function ComicDemo() {
  return (
    <div className="relative isolate flex h-64 w-full flex-col justify-end overflow-hidden rounded-pui-xl border-2 border-pui-foreground bg-pui-warning/15 p-6">
      <Halftone origin={[0.85, 0.15]} dotSize={14} spacing={14} color="var(--pui-warning)" angle={20} />
      <p className="relative m-0 w-fit -rotate-3 rounded-pui-md border-2 border-pui-foreground bg-pui-background px-3 py-1 font-pui-display text-3xl font-black tracking-tight text-pui-foreground uppercase">
        Kapow!
      </p>
      <p className="relative m-0 mt-3 text-sm font-medium text-pui-foreground">Issue #12 drops Friday.</p>
    </div>
  );
}
function SunriseDemo() {
  return (
    <div className="dark relative isolate flex h-64 w-full flex-col items-center justify-center overflow-hidden rounded-pui-xl border border-pui-border bg-pui-background text-center">
      <Halftone variant="dither" source="linear" origin={[0.5, 1]} spacing={6} dotSize={6} angle={0} color="var(--pui-chart-4)" />
      <p className="relative m-0 font-pui-mono text-xs tracking-[0.3em] text-pui-muted-foreground uppercase">05:42 local</p>
      <p className="relative m-0 mt-1 font-pui-display text-3xl font-bold text-pui-foreground">Dithered sunrise</p>
    </div>
  );
}
function EngraveDemo() {
  return (
    <div className="relative isolate flex h-56 w-full flex-col justify-between overflow-hidden rounded-pui-xl border border-pui-border bg-pui-surface p-5">
      <Halftone variant="lines" source="noise" spacing={7} dotSize={5} angle={-30} speed={0.6} className="opacity-40" />
      <p className="relative m-0 font-pui-display text-sm font-semibold tracking-widest text-pui-surface-foreground uppercase">Reserve note</p>
      <p className="relative m-0 font-pui-display text-4xl font-black text-pui-surface-foreground">$100</p>
    </div>
  );
}
function RevealDemo() {
  return (
    <div className="relative isolate flex h-56 w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-pui-xl border border-pui-border bg-pui-background text-center">
      <Halftone source="flat" intensity={0} interactive radius={170} dotSize={9} spacing={12} glowColor="var(--pui-primary)" />
      <p className="relative m-0 text-lg font-semibold text-pui-foreground">Move the pointer here</p>
      <Button size="sm" variant="outline" className="relative">
        Dots appear only near it
      </Button>
    </div>
  );
}
function Mini() {
  return (
    <div className="relative isolate h-24 w-40 overflow-hidden rounded-pui-lg bg-pui-background">
      <Halftone dotSize={7} spacing={8} origin={[0.2, 0.3]} color="var(--pui-primary)" />
    </div>
  );
}
const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) => toJsx("Halftone", props, componentDefaults, undefined, controls),
  propsTable: propDocs<HalftoneProps>()([
    { name: "dotSize", type: "number", default: "6", description: "Largest dot (or line) size in px." },
    { name: "spacing", type: "number", default: "10", description: "Distance between dot centers in px." },
    { name: "variant", type: '"halftone" | "dither" | "lines"', default: '"halftone"', description: "Print dots, ordered-dither pixels or engraving strokes." },
    { name: "source", type: '"radial" | "linear" | "noise" | "flat"', default: '"radial"', description: "What drives the tone." },
    { name: "angle", type: "number", default: "45", description: "Screen angle in degrees." },
    { name: "origin", type: "[number, number]", default: "[0.5, 0.5]", description: "Radial center or linear start, as fractions of the box." },
    { name: "invert", type: "boolean", default: "false", description: "Flip light and dark." },
    { name: "intensity", type: "number", default: "1", description: "Tone multiplier (0..2); the tone itself for source flat." },
    { name: "speed", type: "number", default: "1", description: "Noise drift speed (source noise)." },
    { name: "color", type: "string", description: "Dot color; default the root's text color (text-pui-muted-foreground)." },
    { name: "glowColor", type: "string", default: '"var(--pui-primary)"', description: "Color of dots swelled by the pointer." },
    { name: "interactive", type: "boolean", default: "false", description: "Dots grow near the pointer (mouse and pen)." },
    { name: "radius", type: "number", default: "140", description: "Pointer radius in px." },
    { name: "fps", type: "number", default: "30", description: "Redraws per second while animating." },
    { name: "mask", type: "PatternMask", default: '"none"', description: "Edge mask." },
  ]),
  a11y: [
    "Decorative and aria-hidden canvas.",
    "Only animates for source noise or interactive; otherwise it draws once (and again on resize, theme or prop changes).",
  ],
  reducedMotion: "A still screen: no noise drift and no pointer swell.",
  examples: [
    { title: "Comic burst", description: "Big warm dots from a corner origin.", Demo: ComicDemo },
    { title: "Dithered sunrise", description: "Ordered dither on a linear tone from the bottom edge.", Demo: SunriseDemo },
    { title: "Engraving", description: "variant lines over drifting noise.", Demo: EngraveDemo },
    { title: "Pointer reveal", description: "Tone 0 everywhere: dots exist only around the pointer.", Demo: RevealDemo },
  ],
};
export default item;
