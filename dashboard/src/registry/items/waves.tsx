import { Button, Waves, type WavesProps } from "changelui";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";
type DemoProps = {
  layers: number;
  amplitude: number;
  crests: number;
  height: number;
  speed: number;
  variant: NonNullable<WavesProps["variant"]>;
  position: NonNullable<WavesProps["position"]>;
  depth: number;
};
const defaults: DemoProps = { layers: 3, amplitude: 18, crests: 2, height: 180, speed: 1, variant: "fill", position: "bottom", depth: 0.35 };
const controls: ControlSpec<DemoProps>[] = [
  { type: "number", prop: "layers", label: "Layers", min: 1, max: 12, step: 1 },
  { type: "number", prop: "amplitude", label: "Amplitude (px)", min: 0, max: 60, step: 2 },
  { type: "number", prop: "crests", label: "Crests", min: 1, max: 8, step: 1 },
  { type: "number", prop: "height", label: "Height (px)", min: 60, max: 320, step: 10 },
  { type: "number", prop: "speed", label: "Speed", min: 0.2, max: 4, step: 0.1 },
  { type: "select", prop: "variant", label: "Variant", options: ["fill", "line"] },
  { type: "select", prop: "position", label: "Position", options: ["bottom", "top"] },
  { type: "number", prop: "depth", label: "Back opacity", min: 0, max: 1, step: 0.05 },
];
function Preview({ props }: { props: DemoProps }) {
  return (
    <div className="relative isolate flex h-80 w-full max-w-2xl flex-col items-center justify-center gap-3 overflow-hidden rounded-pui-xl border border-pui-border bg-pui-background px-6 text-center">
      <Waves {...props} />
      <h2 className="relative m-0 font-pui-display text-3xl font-bold tracking-tight text-pui-foreground">Ride the next wave</h2>
      <p className="relative m-0 max-w-sm text-sm text-pui-muted-foreground">Three layers drifting at their own pace, all from CSS.</p>
      <Button className="relative">Join the beta</Button>
    </div>
  );
}
const FOOTER_COLORS = [
  "color-mix(in oklab, var(--pui-primary) 25%, var(--pui-muted))",
  "color-mix(in oklab, var(--pui-primary) 45%, var(--pui-muted))",
  "var(--pui-primary)",
];
function FooterDemo() {
  return (
    <div className="relative isolate w-full overflow-hidden rounded-pui-xl border border-pui-border bg-pui-background">
      <div className="px-6 pt-6 pb-28">
        <p className="m-0 text-lg font-semibold text-pui-foreground">Stay in the loop</p>
        <p className="m-0 mt-1 text-sm text-pui-muted-foreground">One email a month. No noise.</p>
      </div>
      <Waves layers={3} height={110} amplitude={12} crests={3} colors={FOOTER_COLORS} depth={1} />
      <div className="absolute inset-x-0 bottom-0 flex justify-between px-6 pb-3 text-xs font-medium text-pui-primary-foreground">
        <span>© Lagoon Labs</span>
        <span>Privacy · Terms</span>
      </div>
    </div>
  );
}
function SilkDemo() {
  return (
    <div className="dark relative isolate grid h-64 w-full place-items-center overflow-hidden rounded-pui-xl border border-pui-border bg-pui-background">
      <Waves
        variant="line"
        layers={12}
        height={256}
        amplitude={48}
        crests={1}
        speed={0.6}
        depth={0.2}
        colors={["var(--pui-chart-1)", "var(--pui-chart-2)", "var(--pui-chart-5)"]}
        mask="fade-x"
      />
      <p className="relative m-0 font-pui-display text-2xl font-semibold text-pui-foreground">Silk</p>
    </div>
  );
}
function TopDemo() {
  return (
    <div className="relative isolate h-64 w-full overflow-hidden rounded-pui-xl border border-pui-border bg-pui-muted/40">
      <Waves position="top" layers={4} height={120} amplitude={14} crests={2} speed={0.8} colors={["var(--pui-aurora-1)", "var(--pui-aurora-2)", "var(--pui-aurora-3)"]} />
      <div className="absolute inset-x-6 bottom-6">
        <p className="m-0 text-sm font-semibold text-pui-foreground">Ocean report</p>
        <p className="m-0 mt-1 text-xs text-pui-muted-foreground">Swell 1.8 m · period 11 s · water 19 °C</p>
      </div>
    </div>
  );
}
function Mini() {
  return (
    <div className="relative isolate h-28 w-64 max-w-full overflow-hidden rounded-pui-lg bg-pui-muted/40">
      <Waves layers={3} height={56} amplitude={8} speed={2} />
    </div>
  );
}
const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) => toJsx("Waves", props, defaults, undefined, controls),
  propsTable: propDocs<WavesProps>()([
    { name: "layers", type: "number", default: "3", description: "Number of layers (1..12)." },
    { name: "amplitude", type: "number", default: "18", description: "Peak height of the front layer in px." },
    { name: "crests", type: "number", default: "2", description: "Crests across the width (whole numbers loop seamlessly)." },
    { name: "height", type: "number", default: "180", description: "Height of the wave band in px." },
    { name: "speed", type: "number", default: "1", description: "Speed multiplier (14–40s per loop at 1)." },
    { name: "colors", type: "string[]", default: "gradient tokens", description: "Layer colors from back to front, cycled." },
    { name: "variant", type: '"fill" | "line"', default: '"fill"', description: "Solid hills or thin flowing strands." },
    { name: "position", type: '"bottom" | "top"', default: '"bottom"', description: "Edge the band sits on; top mirrors it." },
    { name: "depth", type: "number", default: "0.35", description: "Opacity of the back layer, ramping to 1 at the front." },
    { name: "mask", type: "PatternMask", default: '"none"', description: "Edge mask." },
  ]),
  a11y: ["Decorative and aria-hidden SVG. Server-rendered in full, so there is no layout shift."],
  reducedMotion: "The layers stop drifting and stay in place.",
  examples: [
    { title: "Footer edge", description: "Primary-tinted layers at full opacity with text on top.", Demo: FooterDemo, wide: true },
    { title: "Silk lines", description: 'variant="line" with 12 strands in a dark island.', Demo: SilkDemo },
    { title: "Top edge", description: 'position="top" with aurora tokens.', Demo: TopDemo },
  ],
};
export default item;
