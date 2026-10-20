import { Badge, Button, FlowField, type FlowFieldProps } from "changelui";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";
const PALETTES = {
  chart: undefined,
  aurora: ["var(--pui-aurora-1)", "var(--pui-aurora-2)", "var(--pui-aurora-3)"],
  sunset: ["var(--pui-gradient-1)", "var(--pui-gradient-2)", "var(--pui-gradient-3)"],
  primary: ["var(--pui-primary)"],
  mono: ["var(--pui-muted-foreground)", "var(--pui-foreground)"],
} as const;
type Palette = keyof typeof PALETTES;
type DemoProps = {
  palette: Palette;
  particles: number;
  noiseScale: number;
  speed: number;
  trail: number;
  lineWidth: number;
  opacity: number;
  evolve: number;
  interactive: boolean;
  radius: number;
  seed: number;
  mask: NonNullable<FlowFieldProps["mask"]>;
};
const defaults: DemoProps = {
  palette: "chart",
  particles: 800,
  noiseScale: 0.0035,
  speed: 1,
  trail: 0.08,
  lineWidth: 1,
  opacity: 0.7,
  evolve: 1,
  interactive: true,
  radius: 160,
  seed: 1,
  mask: "none",
};
const componentDefaults: DemoProps = { ...defaults, interactive: false };
const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "palette", label: "Colors", options: Object.keys(PALETTES) },
  { type: "number", prop: "particles", label: "Particles", min: 50, max: 3000, step: 50 },
  { type: "number", prop: "noiseScale", label: "Noise scale", min: 0.0005, max: 0.012, step: 0.0005 },
  { type: "number", prop: "speed", label: "Speed", min: 0, max: 4, step: 0.1 },
  { type: "number", prop: "trail", label: "Trail fade", min: 0.01, max: 0.4, step: 0.01 },
  { type: "number", prop: "lineWidth", label: "Line width", min: 0.25, max: 4, step: 0.25 },
  { type: "number", prop: "opacity", label: "Opacity", min: 0.1, max: 1, step: 0.05 },
  { type: "number", prop: "evolve", label: "Evolve", min: 0, max: 4, step: 0.1 },
  { type: "boolean", prop: "interactive", label: "Pointer swirl" },
  { type: "number", prop: "radius", label: "Swirl radius", min: 60, max: 320, step: 10 },
  { type: "number", prop: "seed", label: "Seed", min: 1, max: 50, step: 1 },
  { type: "select", prop: "mask", label: "Mask", options: ["none", "radial", "fade-x", "fade-y", "fade-bottom"] },
];
function toComponentProps({ palette, ...rest }: DemoProps): FlowFieldProps {
  const colors = PALETTES[palette];
  return colors ? { ...rest, colors: [...colors] } : rest;
}
function Preview({ props }: { props: DemoProps }) {
  return (
    <div className="relative isolate flex h-80 w-full max-w-2xl flex-col items-center justify-center gap-3 overflow-hidden rounded-pui-xl border border-pui-border bg-pui-background px-6 text-center">
      <FlowField {...toComponentProps(props)} />
      <Badge tone="primary" className="relative">
        Generative
      </Badge>
      <h2 className="relative m-0 font-pui-display text-3xl font-bold tracking-tight text-pui-foreground sm:text-4xl">Go with the flow</h2>
      <p className="relative m-0 max-w-sm text-sm text-pui-muted-foreground">Particles ride a slowly morphing noise field. Move the pointer to stir a vortex.</p>
    </div>
  );
}
function SilkDemo() {
  return (
    <div className="dark relative isolate flex h-72 w-full items-end overflow-hidden rounded-pui-xl border border-pui-border bg-pui-background p-6">
      <FlowField
        particles={1600}
        trail={0.025}
        lineWidth={0.6}
        opacity={0.55}
        noiseScale={0.0018}
        speed={0.7}
        evolve={0.6}
        seed={9}
        colors={["var(--pui-aurora-1)", "var(--pui-aurora-2)", "var(--pui-aurora-3)"]}
        mask="fade-bottom"
      />
      <div className="relative">
        <p className="m-0 text-xs font-medium tracking-widest text-pui-muted-foreground uppercase">Collection 04</p>
        <p className="m-0 mt-1 font-pui-display text-2xl font-semibold text-pui-foreground">Silk currents</p>
      </div>
    </div>
  );
}
function SwirlDemo() {
  return (
    <div className="relative isolate flex h-64 w-full flex-col items-start justify-end gap-3 overflow-hidden rounded-pui-xl border border-pui-border bg-pui-surface p-6">
      <FlowField interactive radius={200} particles={900} speed={1.4} colors={["var(--pui-primary)"]} opacity={0.45} trail={0.06} mask="fade-y" seed={4} />
      <p className="relative m-0 max-w-xs text-lg font-semibold text-pui-surface-foreground">Every visitor leaves a different pattern.</p>
      <Button size="sm" className="relative">
        Start drawing
      </Button>
    </div>
  );
}
function PosterDemo() {
  return (
    <div className="light relative isolate grid h-64 w-full place-items-center overflow-hidden rounded-pui-xl border border-pui-border bg-pui-background">
      <FlowField
        particles={500}
        trail={0.012}
        lineWidth={1.4}
        opacity={0.5}
        noiseScale={0.006}
        speed={0.5}
        colors={["var(--pui-gradient-1)", "var(--pui-gradient-2)", "var(--pui-gradient-3)"]}
        mask="radial"
        seed={21}
      />
      <p className="relative m-0 font-pui-display text-5xl font-black tracking-tighter text-pui-foreground">FLUX</p>
    </div>
  );
}
function Mini() {
  return (
    <div className="relative isolate h-24 w-56 overflow-hidden rounded-pui-lg bg-pui-background">
      <FlowField particles={1200} trail={0.04} speed={1.4} lineWidth={0.8} />
    </div>
  );
}
const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) => {
    const { palette, ...rest } = props;
    const colors = PALETTES[palette];
    return toJsx<Record<string, unknown>>(
      "FlowField",
      colors ? { ...rest, colors: [...colors] } : rest,
      componentDefaults,
      undefined,
      controls as ControlSpec<Record<string, unknown>>[],
    );
  },
  propsTable: propDocs<FlowFieldProps>()([
    { name: "particles", type: "number", default: "800", description: "Particles per 1000x600 px of area (scales with the container)." },
    { name: "noiseScale", type: "number", default: "0.0035", description: "Noise frequency: smaller is wider, calmer currents." },
    { name: "speed", type: "number", default: "1", description: "Travel speed multiplier." },
    { name: "trail", type: "number", default: "0.08", description: "Trail fade per frame; small values leave long silky trails." },
    { name: "colors", type: "string[]", default: "chart tokens 1–3", description: "Particle colors, cycled." },
    { name: "lineWidth", type: "number", default: "1", description: "Stroke width in px." },
    { name: "opacity", type: "number", default: "0.7", description: "Stroke opacity." },
    { name: "evolve", type: "number", default: "1", description: "How quickly the field itself morphs." },
    { name: "interactive", type: "boolean", default: "false", description: "The pointer stirs a swirl into the field (mouse and pen)." },
    { name: "radius", type: "number", default: "160", description: "Swirl radius in px." },
    { name: "seed", type: "number", default: "1", description: "Field seed." },
    { name: "mask", type: "PatternMask", default: '"none"', description: "Edge mask." },
  ]),
  a11y: [
    "Decorative and aria-hidden canvas behind your content.",
    "Trails fade to transparent (destination-out), so it composes on any surface in light and dark mode; pauses offscreen and in background tabs.",
  ],
  reducedMotion: "Draws one still artwork (each particle's short path) and no pointer swirl.",
  examples: [
    { title: "Silk", description: "1600 thin strands, very long trails, aurora tokens.", Demo: SilkDemo, wide: true },
    { title: "Pointer swirl", description: "interactive with a wide radius in one color.", Demo: SwirlDemo },
    { title: "Light poster", description: "Thick, slow strokes in a light island.", Demo: PosterDemo },
  ],
};
export default item;
