import { Badge, Button, Topography, type TopographyProps } from "changelui";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";
type DemoProps = {
  lines: number;
  speed: number;
  strokeWidth: number;
  indexEvery: number;
  scale: number;
  resolution: number;
  opacity: number;
  interactive: boolean;
  radius: number;
  seed: number;
  mask: NonNullable<TopographyProps["mask"]>;
};
const defaults: DemoProps = {
  lines: 12,
  speed: 1,
  strokeWidth: 1,
  indexEvery: 5,
  scale: 320,
  resolution: 10,
  opacity: 0.5,
  interactive: true,
  radius: 140,
  seed: 3,
  mask: "none",
};
const componentDefaults: DemoProps = { ...defaults, interactive: false };
const controls: ControlSpec<DemoProps>[] = [
  { type: "number", prop: "lines", label: "Lines", min: 2, max: 32, step: 1 },
  { type: "number", prop: "speed", label: "Speed", min: 0, max: 5, step: 0.1 },
  { type: "number", prop: "strokeWidth", label: "Stroke", min: 0.25, max: 3, step: 0.25 },
  { type: "number", prop: "indexEvery", label: "Index every", min: 0, max: 10, step: 1 },
  { type: "number", prop: "scale", label: "Feature size", min: 80, max: 900, step: 20 },
  { type: "number", prop: "resolution", label: "Resolution", min: 4, max: 24, step: 1 },
  { type: "number", prop: "opacity", label: "Opacity", min: 0.1, max: 1, step: 0.05 },
  { type: "boolean", prop: "interactive", label: "Pointer summit" },
  { type: "number", prop: "radius", label: "Summit radius", min: 60, max: 300, step: 10 },
  { type: "number", prop: "seed", label: "Seed", min: 1, max: 50, step: 1 },
  { type: "select", prop: "mask", label: "Mask", options: ["none", "radial", "fade-x", "fade-y", "fade-bottom"] },
];
function Preview({ props }: { props: DemoProps }) {
  return (
    <div className="relative isolate flex h-80 w-full max-w-2xl flex-col items-center justify-center gap-3 overflow-hidden rounded-pui-xl border border-pui-border bg-pui-background px-6 text-center">
      <Topography {...props} accentColor="var(--pui-primary)" />
      <Badge tone="primary" className="relative">
        Field notes
      </Badge>
      <h2 className="relative m-0 font-pui-display text-3xl font-bold tracking-tight text-pui-foreground sm:text-4xl">Every line, a level</h2>
      <p className="relative m-0 max-w-sm text-sm text-pui-muted-foreground">The terrain morphs slowly. Hover to raise a summit the contours wrap around.</p>
    </div>
  );
}
function TrailDemo() {
  return (
    <div className="relative isolate grid h-64 w-full grid-cols-3 items-end overflow-hidden rounded-pui-xl border border-pui-border bg-pui-surface p-5">
      <Topography lines={18} indexEvery={4} scale={220} color="var(--pui-success)" accentColor="var(--pui-success)" opacity={0.35} interactive radius={110} seed={8} />
      {[
        ["2,431 m", "Summit"],
        ["14.2 km", "Distance"],
        ["+1,180 m", "Elevation gain"],
      ].map(([value, label]) => (
        <div key={label} className="relative">
          <p className="m-0 font-pui-mono text-xl font-semibold text-pui-surface-foreground">{value}</p>
          <p className="m-0 text-xs text-pui-muted-foreground">{label}</p>
        </div>
      ))}
    </div>
  );
}
function HeroDemo() {
  return (
    <div className="dark relative isolate flex h-64 w-full flex-col items-start justify-center gap-3 overflow-hidden rounded-pui-xl border border-pui-border bg-pui-background p-8">
      <Topography lines={10} indexEvery={0} strokeWidth={1.25} color="var(--pui-chart-2)" opacity={0.6} speed={1.6} scale={420} mask="fade-x" seed={12} />
      <p className="relative m-0 max-w-xs font-pui-display text-3xl font-bold tracking-tight text-pui-foreground">Map the unknown.</p>
      <Button size="sm" className="relative">
        Start surveying
      </Button>
    </div>
  );
}
function FooterDemo() {
  return (
    <div className="relative isolate flex h-40 w-full items-end justify-between overflow-hidden rounded-pui-xl border border-pui-border bg-pui-muted/30 p-5">
      <Topography lines={24} indexEvery={6} strokeWidth={0.75} scale={160} opacity={0.3} speed={0.4} mask="fade-y" seed={30} />
      <p className="relative m-0 text-sm font-semibold text-pui-foreground">Basecamp</p>
      <p className="relative m-0 text-xs text-pui-muted-foreground">© 2026 · Trails · Gear · Journal</p>
    </div>
  );
}
function Mini() {
  return (
    <div className="relative isolate h-24 w-40 overflow-hidden rounded-pui-lg bg-pui-background">
      <Topography lines={10} speed={3} scale={120} resolution={6} accentColor="var(--pui-primary)" opacity={0.7} />
    </div>
  );
}
const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) => toJsx<Record<string, unknown>>("Topography", { ...props, accentColor: "var(--pui-primary)" }, componentDefaults, undefined, controls as ControlSpec<Record<string, unknown>>[]),
  propsTable: propDocs<TopographyProps>()([
    { name: "lines", type: "number", default: "12", description: "Contour levels (2..40)." },
    { name: "speed", type: "number", default: "1", description: "Terrain morph speed multiplier." },
    { name: "color", type: "string", description: "Line color; default the root's text color (text-pui-muted-foreground)." },
    { name: "accentColor", type: "string", description: "Color of the thicker index contours; default color." },
    { name: "strokeWidth", type: "number", default: "1", description: "Line width in px." },
    { name: "indexEvery", type: "number", default: "5", description: "Every nth contour is drawn thicker and brighter; 0 turns that off." },
    { name: "scale", type: "number", default: "320", description: "Terrain feature size in px." },
    { name: "resolution", type: "number", default: "10", description: "Sampling cell in px: smaller is smoother and costlier." },
    { name: "opacity", type: "number", default: "0.5", description: "Line opacity." },
    { name: "interactive", type: "boolean", default: "false", description: "The pointer raises a summit the contours wrap around (mouse and pen)." },
    { name: "radius", type: "number", default: "140", description: "Summit radius in px." },
    { name: "seed", type: "number", default: "3", description: "Terrain seed." },
    { name: "fps", type: "number", default: "20", description: "Redraws per second." },
    { name: "mask", type: "PatternMask", default: '"none"', description: "Edge mask." },
  ]),
  a11y: ["Decorative and aria-hidden canvas.", "Marching squares into two batched paths per frame at 20 fps; pauses offscreen and in background tabs."],
  reducedMotion: "One still map: no morphing and no pointer summit.",
  examples: [
    { title: "Trail stats", description: "Dense success-colored contours with a pointer summit.", Demo: TrailDemo, wide: true },
    { title: "Dark hero", description: "Fewer, bolder lines with a side fade.", Demo: HeroDemo },
    { title: "Footer texture", description: "Fine lines, slow drift, muted.", Demo: FooterDemo },
  ],
};
export default item;
