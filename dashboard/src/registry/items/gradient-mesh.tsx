import { Button, CopyButton, GradientMesh, gradientMeshBackground, type GradientMeshProps } from "changelui";
import { useState } from "react";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";
const PALETTES = {
  gradient: undefined,
  aurora: ["var(--pui-aurora-1)", "var(--pui-aurora-2)", "var(--pui-aurora-3)", "var(--pui-primary)"],
  chart: ["var(--pui-chart-1)", "var(--pui-chart-2)", "var(--pui-chart-3)", "var(--pui-chart-4)", "var(--pui-chart-5)"],
  sunset: ["var(--pui-chart-5)", "var(--pui-gradient-3)", "var(--pui-warning)", "var(--pui-gradient-2)"],
} as const;
type Palette = keyof typeof PALETTES;
type DemoProps = {
  palette: Palette;
  blobs: number;
  speed: number;
  blur: number;
  animate: boolean;
  followPointer: boolean;
  seed: number;
  mask: NonNullable<GradientMeshProps["mask"]>;
};
const defaults: DemoProps = { palette: "gradient", blobs: 5, speed: 1, blur: 60, animate: true, followPointer: true, seed: 7, mask: "none" };
const componentDefaults: DemoProps = { ...defaults, followPointer: false, seed: Number.NaN };
const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "palette", label: "Colors", options: Object.keys(PALETTES) },
  { type: "number", prop: "blobs", label: "Blobs", min: 2, max: 8, step: 1 },
  { type: "number", prop: "speed", label: "Speed", min: 0.2, max: 6, step: 0.1 },
  { type: "number", prop: "blur", label: "Blur (px)", min: 0, max: 140, step: 5 },
  { type: "boolean", prop: "animate", label: "Animate" },
  { type: "boolean", prop: "followPointer", label: "Pointer blob" },
  { type: "number", prop: "seed", label: "Seed", min: 1, max: 60, step: 1 },
  { type: "select", prop: "mask", label: "Mask", options: ["none", "radial", "fade-x", "fade-y", "fade-bottom"] },
];
function colorsOf(palette: Palette): string[] | undefined {
  const colors = PALETTES[palette];
  return colors ? [...colors] : undefined;
}
function Preview({ props }: { props: DemoProps }) {
  const { palette, ...rest } = props;
  return (
    <div className="relative isolate grid h-80 w-full max-w-2xl place-items-center overflow-hidden rounded-pui-xl border border-pui-border bg-pui-background p-6">
      <GradientMesh {...rest} colors={colorsOf(palette)} />
      <div className="relative flex max-w-sm flex-col items-center gap-3 rounded-pui-xl border border-pui-border bg-pui-surface/55 px-6 py-5 text-center shadow-pui-lg backdrop-blur-xl">
        <h2 className="m-0 font-pui-display text-2xl font-bold tracking-tight text-pui-surface-foreground">Color, softly</h2>
        <p className="m-0 text-sm text-pui-muted-foreground">Blobs drift and breathe on their own clocks, in your theme's colors.</p>
        <Button size="sm">Get started</Button>
      </div>
    </div>
  );
}
function CopyCssDemo() {
  const [seed, setSeed] = useState(3);
  const css = gradientMeshBackground({ seed, blobs: 5 });
  return (
    <div className="flex w-full flex-col gap-3">
      <div className="relative isolate h-44 w-full overflow-hidden rounded-pui-xl border border-pui-border bg-pui-background">
        <GradientMesh animate={false} seed={seed} />
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={() => setSeed((s) => (s % 97) + 1)}>
          Shuffle
        </Button>
        <code className="min-w-0 flex-1 truncate rounded-pui-md bg-pui-muted px-2 py-1.5 font-pui-mono text-xs text-pui-muted-foreground">background: {css};</code>
        <CopyButton value={`background: ${css};`} label="Copy mesh CSS" variant="outline" />
      </div>
    </div>
  );
}
function TilesDemo() {
  const tiles: { name: string; colors?: string[] }[] = [
    { name: "Ember", colors: ["var(--pui-chart-5)", "var(--pui-warning)", "var(--pui-gradient-3)"] },
    { name: "Lagoon", colors: ["var(--pui-chart-2)", "var(--pui-chart-1)", "var(--pui-aurora-3)"] },
    { name: "Orchid", colors: ["var(--pui-gradient-2)", "var(--pui-primary)", "var(--pui-gradient-1)"] },
    { name: "Mint", colors: ["var(--pui-success)", "var(--pui-chart-2)", "var(--pui-aurora-1)"] },
  ];
  return (
    <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-4">
      {tiles.map((tile, i) => (
        <div key={tile.name} className="flex flex-col items-center gap-2">
          <div className="relative isolate aspect-square w-full overflow-hidden rounded-[22%] border border-pui-border shadow-pui-md">
            <GradientMesh animate={false} colors={tile.colors} blobs={4} seed={i * 13 + 2} baseColor="var(--pui-surface)" />
          </div>
          <span className="text-xs font-medium text-pui-muted-foreground">{tile.name}</span>
        </div>
      ))}
    </div>
  );
}
function SpotlightDemo() {
  return (
    <div className="dark relative isolate flex h-64 w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-pui-xl border border-pui-border bg-pui-background text-center">
      <GradientMesh colors={[...PALETTES.aurora]} blur={80} speed={0.6} followPointer pointerColor="var(--pui-chart-4)" className="opacity-70" seed={41} />
      <p className="relative m-0 font-pui-display text-3xl font-bold tracking-tight text-pui-foreground">Ambient by design</p>
      <p className="relative m-0 text-sm text-pui-muted-foreground">A warm highlight follows the pointer on a gentle spring.</p>
    </div>
  );
}
function Mini() {
  return (
    <div className="relative isolate h-24 w-40 overflow-hidden rounded-pui-lg bg-pui-background">
      <GradientMesh speed={4} blur={24} seed={5} />
    </div>
  );
}
const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: ({ palette, ...props }) =>
    toJsx<Record<string, unknown>>(
      "GradientMesh",
      { ...props, colors: colorsOf(palette) },
      componentDefaults,
      undefined,
      controls as ControlSpec<Record<string, unknown>>[],
    ),
  propsTable: propDocs<GradientMeshProps>()([
    { name: "colors", type: "string[]", default: "gradient + aurora tokens", description: "Blob colors, cycled." },
    { name: "blobs", type: "number", default: "5", description: "Number of color blobs (2..8)." },
    { name: "speed", type: "number", default: "1", description: "Speed multiplier (about 20s per drift at 1)." },
    { name: "blur", type: "number", default: "60", description: "Softness in px." },
    { name: "baseColor", type: "string", description: "Fill under the blobs; default transparent." },
    { name: "animate", type: "boolean", default: "true", description: "false renders the static CSS mesh (gradientMeshBackground)." },
    { name: "followPointer", type: "boolean", default: "false", description: "A highlight blob springs after the pointer (mouse and pen)." },
    { name: "pointerColor", type: "string", default: '"var(--pui-primary)"', description: "Color of the pointer blob." },
    { name: "seed", type: "number", description: "Layout seed; default derived from the instance id." },
    { name: "mask", type: "PatternMask", default: '"none"', description: "Edge mask." },
  ]),
  a11y: [
    "Decorative and aria-hidden. Pure CSS keyframes (transform only) plus an optional Motion spring for the pointer blob.",
    "gradientMeshBackground(options) returns the static mesh as one CSS background value for stylesheets or style props.",
  ],
  reducedMotion: "Blobs hold still and the pointer blob is off.",
  examples: [
    { title: "Copy as CSS", description: "Static mode plus gradientMeshBackground: shuffle and copy.", Demo: CopyCssDemo, wide: true },
    { title: "App icon tiles", description: "Static meshes on a surface base color.", Demo: TilesDemo },
    { title: "Pointer spotlight", description: "Aurora mesh with a warm pointer blob.", Demo: SpotlightDemo },
  ],
};
export default item;
