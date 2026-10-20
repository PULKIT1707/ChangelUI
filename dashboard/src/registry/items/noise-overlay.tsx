import { Button, GradientMesh, NoiseOverlay, type NoiseOverlayProps } from "changelui";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";
type DemoProps = {
  opacity: number;
  baseFrequency: number;
  octaves: number;
  variant: NonNullable<NoiseOverlayProps["variant"]>;
  blend: NonNullable<NoiseOverlayProps["blend"]>;
  animate: boolean;
  fps: number;
  seed: number;
};
const defaults: DemoProps = { opacity: 0.25, baseFrequency: 0.8, octaves: 3, variant: "film", blend: "overlay", animate: true, fps: 8, seed: 0 };
const componentDefaults: DemoProps = { ...defaults, opacity: 0.08, blend: "normal", animate: false };
const controls: ControlSpec<DemoProps>[] = [
  { type: "number", prop: "opacity", label: "Opacity", min: 0.02, max: 1, step: 0.01 },
  { type: "number", prop: "baseFrequency", label: "Frequency", min: 0.1, max: 2, step: 0.05 },
  { type: "number", prop: "octaves", label: "Octaves", min: 1, max: 6, step: 1 },
  { type: "select", prop: "variant", label: "Variant", options: ["film", "color", "ink"] },
  { type: "select", prop: "blend", label: "Blend", options: ["normal", "overlay", "soft-light", "multiply", "screen"] },
  { type: "boolean", prop: "animate", label: "Animate" },
  { type: "number", prop: "fps", label: "Jitter FPS", min: 1, max: 24, step: 1 },
  { type: "number", prop: "seed", label: "Seed", min: 0, max: 50, step: 1 },
];
function Preview({ props }: { props: DemoProps }) {
  return (
    <div className="relative isolate flex h-80 w-full max-w-2xl flex-col items-center justify-center gap-3 overflow-hidden rounded-pui-xl border border-pui-border bg-pui-background px-6 text-center">
      <GradientMesh animate={false} seed={11} blobs={5} />
      <NoiseOverlay {...props} />
      <h2 className="relative m-0 font-pui-display text-3xl font-bold tracking-tight text-pui-foreground sm:text-4xl">Add some texture</h2>
      <p className="relative m-0 max-w-sm text-sm text-pui-foreground/80">Grain breaks up banding in soft gradients and makes flat surfaces feel physical.</p>
    </div>
  );
}
function FilmDemo() {
  return (
    <div className="dark relative isolate flex h-64 w-full flex-col justify-end overflow-hidden rounded-pui-xl border border-pui-border bg-pui-background p-6">
      <svg className="absolute inset-0 size-full" viewBox="0 0 400 260" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="noise-demo-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--pui-chart-1)" />
            <stop offset="0.65" stopColor="var(--pui-chart-5)" />
            <stop offset="1" stopColor="var(--pui-warning)" />
          </linearGradient>
        </defs>
        <rect width="400" height="260" fill="url(#noise-demo-sky)" />
        <circle cx="280" cy="168" r="44" fill="var(--pui-warning)" opacity="0.9" />
        <path d="M0 200 L70 150 L130 190 L210 120 L300 200 L360 160 L400 190 L400 260 L0 260 Z" fill="var(--pui-background)" opacity="0.85" />
      </svg>
      <NoiseOverlay animate opacity={0.35} blend="overlay" baseFrequency={0.9} />
      <p className="relative m-0 font-pui-mono text-xs tracking-widest text-pui-foreground/80 uppercase">Kodak hour · 35 mm</p>
      <p className="relative m-0 mt-1 font-pui-display text-2xl font-semibold text-pui-foreground">Golden ridge</p>
    </div>
  );
}
function PaperDemo() {
  return (
    <div className="relative isolate flex h-64 w-full flex-col gap-2 overflow-hidden rounded-pui-xl border border-pui-border bg-pui-surface p-6">
      <NoiseOverlay variant="ink" opacity={0.18} baseFrequency={0.65} octaves={4} />
      <p className="relative m-0 font-pui-display text-xs tracking-widest text-pui-muted-foreground uppercase">Letter No. 3</p>
      <p className="relative m-0 font-pui-display text-xl font-semibold text-pui-surface-foreground">Dear reader,</p>
      <p className="relative m-0 text-sm leading-relaxed text-pui-muted-foreground">
        The ink variant floods the grain with the text color, so the texture follows light and dark mode like paper fibers.
      </p>
    </div>
  );
}
function ButtonDemo() {
  return (
    <div className="flex w-full flex-wrap items-center justify-center gap-4 py-6">
      <Button size="lg" className="relative isolate overflow-hidden bg-[linear-gradient(120deg,var(--pui-gradient-1),var(--pui-gradient-2),var(--pui-gradient-3))]">
        <NoiseOverlay opacity={0.4} blend="overlay" baseFrequency={1.2} />
        <span className="relative">Grainy gradient</span>
      </Button>
      <Button size="lg" variant="outline" className="relative isolate overflow-hidden">
        <NoiseOverlay variant="ink" opacity={0.12} />
        <span className="relative">Textured outline</span>
      </Button>
    </div>
  );
}
function Mini() {
  return (
    <div className="relative isolate h-24 w-40 overflow-hidden rounded-pui-lg bg-pui-background">
      <GradientMesh animate={false} seed={4} />
      <NoiseOverlay animate opacity={0.45} blend="overlay" />
    </div>
  );
}
const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) => toJsx("NoiseOverlay", props, componentDefaults, undefined, controls),
  propsTable: propDocs<NoiseOverlayProps>()([
    { name: "opacity", type: "number", default: "0.08", description: "Grain strength (0..1)." },
    { name: "baseFrequency", type: "number", default: "0.8", description: "Grain fineness: higher is finer." },
    { name: "octaves", type: "number", default: "3", description: "Noise layers (1..6)." },
    { name: "variant", type: '"film" | "color" | "ink"', default: '"film"', description: "Gray grain, RGB sensor noise, or grain in the root's text color." },
    { name: "blend", type: '"normal" | "overlay" | "soft-light" | "multiply" | "screen"', default: '"normal"', description: "How the grain mixes with what's below." },
    { name: "animate", type: "boolean", default: "false", description: "Jitter the grain like projected film (stepped, compositor-only)." },
    { name: "fps", type: "number", default: "8", description: "Jitter steps per second when animating." },
    { name: "seed", type: "number", default: "0", description: "Turbulence seed." },
    { name: "mask", type: "PatternMask", default: '"none"', description: "Edge mask." },
  ]),
  a11y: [
    "Decorative and aria-hidden SVG with a unique filter id per instance; renders fully on the server.",
    "Animation moves one oversized, pre-rendered layer in steps (transform only), so the filter is not recomputed per frame.",
  ],
  reducedMotion: "The grain holds still.",
  examples: [
    { title: "Film photo", description: "Animated overlay grain over a gradient landscape.", Demo: FilmDemo, wide: true },
    { title: "Paper", description: "variant ink in the text color on a surface.", Demo: PaperDemo },
    { title: "Grainy buttons", description: "Grain inside Button surfaces.", Demo: ButtonDemo },
  ],
};
export default item;
