import { Button, Kbd, RetroGrid, type RetroGridProps } from "changelui";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";
type DemoProps = {
  angle: number;
  cellSize: number;
  lineWidth: number;
  horizon: number;
  sun: boolean;
  speed: number;
  mask: NonNullable<RetroGridProps["mask"]>;
};
const defaults: DemoProps = { angle: 65, cellSize: 60, lineWidth: 1, horizon: 0.5, sun: true, speed: 0.7, mask: "none" };
const controls: ControlSpec<DemoProps>[] = [
  { type: "number", prop: "angle", label: "Angle (deg)", min: 30, max: 85, step: 1 },
  { type: "number", prop: "cellSize", label: "Cell (px)", min: 20, max: 160, step: 5 },
  { type: "number", prop: "lineWidth", label: "Line (px)", min: 1, max: 4, step: 1 },
  { type: "number", prop: "horizon", label: "Horizon", min: 0.15, max: 0.85, step: 0.05 },
  { type: "boolean", prop: "sun", label: "Sun" },
  { type: "number", prop: "speed", label: "Cells / s", min: 0, max: 4, step: 0.1 },
  { type: "select", prop: "mask", label: "Mask", options: ["none", "radial", "fade-x", "fade-y", "fade-bottom"] },
];
function Preview({ props }: { props: DemoProps }) {
  return (
    <div className="dark relative isolate flex h-80 w-full max-w-2xl flex-col items-center overflow-hidden rounded-pui-xl border border-pui-border bg-pui-background px-6 pt-10 text-center">
      <RetroGrid {...props} />
      <h2 className="relative m-0 bg-linear-to-b from-pui-foreground to-pui-muted-foreground bg-clip-text font-pui-display text-4xl font-black tracking-tight text-transparent italic">
        NIGHT DRIVE
      </h2>
      {/* Sits on the sun, so it gets the light foreground plus a dark halo from the background token. */}
      <p className="relative m-0 mt-1 font-pui-mono text-xs font-semibold tracking-[0.3em] text-pui-foreground uppercase [text-shadow:0_0_2px_var(--pui-background),0_1px_8px_var(--pui-background)]">
        Press start
      </p>
    </div>
  );
}
function LightDemo() {
  return (
    <div className="relative isolate flex h-64 w-full flex-col items-center justify-start gap-2 overflow-hidden rounded-pui-xl border border-pui-border bg-pui-background pt-10 text-center">
      <RetroGrid sun={false} lineColor="color-mix(in oklab, var(--pui-primary) 45%, transparent)" horizon={0.42} angle={72} cellSize={44} speed={0.4} />
      <p className="relative m-0 text-2xl font-semibold tracking-tight text-pui-foreground">Build on solid ground</p>
      <Button size="sm" className="relative">
        Get started
      </Button>
    </div>
  );
}
function ArcadeDemo() {
  return (
    <div className="dark relative isolate flex h-64 w-full flex-col items-center justify-center overflow-hidden rounded-pui-xl border border-pui-border bg-pui-background">
      <RetroGrid
        lineColor="var(--pui-chart-2)"
        sunColors={["var(--pui-chart-4)", "var(--pui-chart-5)"]}
        horizon={0.62}
        lineWidth={2}
        cellSize={80}
        speed={1.6}
      />
      <div className="relative -mt-16 flex flex-col items-center gap-2">
        <p className="m-0 font-pui-mono text-sm font-bold tracking-widest text-pui-foreground">HI-SCORE 0042910</p>
        <p className="m-0 text-xs text-pui-muted-foreground">
          Press <Kbd>Space</Kbd> to continue
        </p>
      </div>
    </div>
  );
}
function Mini() {
  return (
    <div className="dark relative isolate h-28 w-64 max-w-full overflow-hidden rounded-pui-lg bg-pui-background">
      <RetroGrid cellSize={24} speed={1.2} />
    </div>
  );
}
const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) => toJsx("RetroGrid", props, defaults, undefined, controls),
  propsTable: propDocs<RetroGridProps>()([
    { name: "angle", type: "number", default: "65", description: "Tilt of the floor in degrees (30..85)." },
    { name: "cellSize", type: "number", default: "60", description: "Cell size in px at the near edge." },
    { name: "lineWidth", type: "number", default: "1", description: "Line width in px (1..4)." },
    { name: "lineColor", type: "string", default: '"var(--pui-gradient-2)"', description: "Line and horizon color." },
    { name: "horizon", type: "number", default: "0.5", description: "Horizon height as a fraction from the top." },
    { name: "sun", type: "boolean", default: "true", description: "Striped sun sinking into the horizon." },
    { name: "sunColors", type: "[top: string, bottom: string]", default: "gradient-3 → gradient-2", description: "Sun gradient." },
    { name: "speed", type: "number", default: "0.7", description: "Cells scrolled per second; 0 stops it." },
    { name: "mask", type: "PatternMask", default: '"none"', description: "Edge mask." },
  ]),
  a11y: ["Decorative and aria-hidden. Pure CSS (3D transform + gradients), server-rendered in full."],
  reducedMotion: "The floor stops scrolling; the scene stays.",
  examples: [
    { title: "Light mode floor", description: "No sun, primary lines at 45% and a lower horizon.", Demo: LightDemo },
    { title: "Arcade", description: "Chart colors, thicker lines and a faster floor.", Demo: ArcadeDemo },
  ],
};
export default item;
