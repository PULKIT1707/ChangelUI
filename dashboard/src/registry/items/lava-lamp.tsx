import { Button, LavaLamp, type LavaLampProps } from "changelui";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";
type DemoProps = {
  blobs: number;
  speed: number;
  blur: number;
  gooey: boolean;
  size: number;
  mask: NonNullable<LavaLampProps["mask"]>;
};
const defaults: DemoProps = { blobs: 6, speed: 1, blur: 24, gooey: true, size: 0.42, mask: "none" };
const controls: ControlSpec<DemoProps>[] = [
  { type: "number", prop: "blobs", label: "Blobs", min: 1, max: 12, step: 1 },
  { type: "number", prop: "speed", label: "Speed", min: 0.2, max: 5, step: 0.1 },
  { type: "number", prop: "blur", label: "Blur (px)", min: 0, max: 80, step: 2 },
  { type: "boolean", prop: "gooey", label: "Gooey merge" },
  { type: "number", prop: "size", label: "Blob size", min: 0.15, max: 0.8, step: 0.05 },
  { type: "select", prop: "mask", label: "Mask", options: ["none", "radial", "fade-x", "fade-y", "fade-bottom"] },
];
function Preview({ props }: { props: DemoProps }) {
  return (
    <div className="relative isolate grid h-80 w-full max-w-2xl place-items-center overflow-hidden rounded-pui-xl border border-pui-border bg-pui-background p-6">
      <LavaLamp {...props} />
      <div className="relative flex max-w-sm flex-col items-center gap-3 rounded-pui-xl border border-pui-border bg-pui-surface/60 px-6 py-5 text-center shadow-pui-lg backdrop-blur-xl">
        <h2 className="m-0 font-pui-display text-2xl font-bold tracking-tight text-pui-surface-foreground">Mood, on tap</h2>
        <p className="m-0 text-sm text-pui-muted-foreground">Blobs wander on their own x and y periods and melt where they meet.</p>
        <Button size="sm">Try it free</Button>
      </div>
    </div>
  );
}
function LampDemo() {
  return (
    <div className="flex w-full items-end justify-center gap-6 py-2">
      {[
        { colors: ["var(--pui-gradient-3)", "var(--pui-gradient-2)"], speed: 1.6 },
        { colors: ["var(--pui-chart-2)", "var(--pui-chart-1)"], speed: 1.2 },
        { colors: ["var(--pui-chart-4)", "var(--pui-chart-5)"], speed: 2 },
      ].map((lamp, i) => (
        <div key={i} className="flex flex-col items-center">
          <div className="dark relative isolate h-56 w-20 overflow-hidden rounded-t-[2.5rem] rounded-b-pui-lg border border-pui-border bg-pui-background">
            <LavaLamp blobs={5} blur={0} size={0.9} speed={lamp.speed} colors={lamp.colors} seed={i + 11} />
          </div>
          <div className="h-5 w-24 rounded-b-pui-md bg-pui-muted" />
        </div>
      ))}
    </div>
  );
}
function SoftDemo() {
  return (
    <div className="dark relative isolate flex h-56 w-full flex-col justify-end overflow-hidden rounded-pui-xl border border-pui-border bg-pui-background p-6">
      <LavaLamp gooey={false} blur={60} blobs={4} size={0.7} speed={0.6} colors={["var(--pui-aurora-1)", "var(--pui-aurora-2)", "var(--pui-aurora-3)"]} />
      <p className="relative m-0 text-xs font-medium tracking-widest text-pui-muted-foreground uppercase">Now playing</p>
      <p className="relative m-0 mt-1 text-xl font-semibold text-pui-foreground">Midnight Static — Low Tide</p>
    </div>
  );
}
function Mini() {
  return (
    <div className="relative isolate h-24 w-40 overflow-hidden rounded-pui-lg bg-pui-background">
      <LavaLamp blobs={4} blur={4} speed={3} size={0.6} seed={3} />
    </div>
  );
}
const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) => toJsx("LavaLamp", props, defaults, undefined, controls),
  propsTable: propDocs<LavaLampProps>()([
    { name: "blobs", type: "number", default: "6", description: "Number of blobs (1..12)." },
    { name: "speed", type: "number", default: "1", description: "Speed multiplier (14–30s per rise and fall at 1)." },
    { name: "blur", type: "number", default: "24", description: "Extra softness in px; 0 keeps crisp lava edges." },
    { name: "gooey", type: "boolean", default: "true", description: "Merge blobs where they touch (SVG gooey filter)." },
    { name: "colors", type: "string[]", default: "gradient + aurora tokens", description: "Blob colors, cycled." },
    { name: "size", type: "number", default: "0.42", description: "Blob size as a share of the smaller side." },
    { name: "seed", type: "number", description: "Layout seed; defaults to one derived from the instance id." },
    { name: "mask", type: "PatternMask", default: '"none"', description: "Edge mask." },
  ]),
  a11y: ["Decorative and aria-hidden. Server-rendered in full; the gooey filter id is unique per instance."],
  reducedMotion: "Blobs rest at their seeded positions.",
  examples: [
    { title: "Crisp lamps", description: "blur={0} inside capsule shapes: the classic lava look.", Demo: LampDemo, wide: true },
    { title: "Soft glow", description: "gooey off and heavy blur for an ambient card.", Demo: SoftDemo, wide: true },
  ],
};
export default item;
