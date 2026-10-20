import { Button, Progress, Starfield, type StarfieldProps } from "changelui";
import { useEffect, useState } from "react";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";
type DemoProps = {
  density: number;
  speed: number;
  warp: boolean;
  interactive: boolean;
  twinkle: boolean;
  mask: NonNullable<StarfieldProps["mask"]>;
};
const defaults: DemoProps = { density: 0.0008, speed: 1, warp: false, interactive: true, twinkle: true, mask: "none" };
const controls: ControlSpec<DemoProps>[] = [
  { type: "number", prop: "density", label: "Density", min: 0.0001, max: 0.004, step: 0.0001 },
  { type: "number", prop: "speed", label: "Speed", min: 0, max: 5, step: 0.1 },
  { type: "boolean", prop: "warp", label: "Warp" },
  { type: "boolean", prop: "interactive", label: "Pointer parallax" },
  { type: "boolean", prop: "twinkle", label: "Twinkle" },
  { type: "select", prop: "mask", label: "Mask", options: ["none", "radial", "fade-x", "fade-y", "fade-bottom"] },
];
function Preview({ props }: { props: DemoProps }) {
  const [hover, setHover] = useState(false);
  return (
    <div className="dark relative isolate flex h-80 w-full max-w-2xl flex-col items-center justify-center gap-4 overflow-hidden rounded-pui-xl border border-pui-border bg-pui-background px-6 text-center">
      <Starfield {...props} warp={props.warp || hover} />
      <h2 className="relative m-0 font-pui-display text-3xl font-bold tracking-tight text-pui-foreground sm:text-4xl">Explore further</h2>
      <p className="relative m-0 max-w-sm text-sm text-pui-muted-foreground">Move the pointer to steer. Hover the button to jump to lightspeed.</p>
      <Button
        className="relative"
        onPointerEnter={() => setHover(true)}
        onPointerLeave={() => setHover(false)}
        onFocus={() => setHover(true)}
        onBlur={() => setHover(false)}
      >
        Engage warp
      </Button>
    </div>
  );
}
function NotFoundDemo() {
  const [warp, setWarp] = useState(false);
  return (
    <div className="dark relative isolate flex h-72 w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-pui-xl border border-pui-border bg-pui-background text-center">
      <Starfield warp={warp} density={0.0012} mask="radial" />
      <p className="relative m-0 font-pui-mono text-6xl font-bold tracking-tighter text-pui-foreground">404</p>
      <p className="relative m-0 text-sm text-pui-muted-foreground">This page drifted out of orbit.</p>
      <Button
        variant="outline"
        className="relative mt-2"
        onPointerEnter={() => setWarp(true)}
        onPointerLeave={() => setWarp(false)}
        onFocus={() => setWarp(true)}
        onBlur={() => setWarp(false)}
      >
        Take me home
      </Button>
    </div>
  );
}
function LoadingDemo() {
  const [value, setValue] = useState(8);
  useEffect(() => {
    const id = window.setInterval(() => setValue((v) => (v >= 100 ? 8 : v + 4)), 220);
    return () => window.clearInterval(id);
  }, []);
  return (
    <div className="dark relative isolate flex h-64 w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-pui-xl border border-pui-border bg-pui-background px-8">
      <Starfield warp speed={1.2} interactive={false} />
      <p className="relative m-0 text-sm font-medium text-pui-foreground">Jumping to your workspace…</p>
      <Progress value={value} aria-label="Loading workspace" className="relative w-full max-w-xs" />
    </div>
  );
}
function LightDemo() {
  return (
    <div className="relative isolate grid h-64 w-full place-items-center overflow-hidden rounded-pui-xl border border-pui-border bg-pui-muted/40">
      <Starfield color="var(--pui-muted-foreground)" accentColor="var(--pui-primary)" speed={0.6} density={0.0016} />
      <div className="relative rounded-pui-lg border border-pui-border bg-pui-surface/80 px-5 py-3 text-center backdrop-blur-sm">
        <p className="m-0 text-sm font-semibold text-pui-surface-foreground">Observatory</p>
        <p className="m-0 text-xs text-pui-muted-foreground">Light mode, muted stars</p>
      </div>
    </div>
  );
}
function Mini() {
  return (
    <div className="dark relative isolate h-28 w-64 max-w-full overflow-hidden rounded-pui-lg bg-pui-background">
      <Starfield density={0.002} speed={2} interactive={false} />
    </div>
  );
}
const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) => toJsx("Starfield", props, defaults, undefined, controls),
  propsTable: propDocs<StarfieldProps>()([
    { name: "density", type: "number", default: "0.0008", description: "Stars per square px (capped at 2000 stars)." },
    { name: "speed", type: "number", default: "1", description: "Cruise speed multiplier." },
    { name: "warp", type: "boolean", default: "false", description: "Hyperspace streaks; toggling eases in and out." },
    { name: "color", type: "string", description: "Star color; default the root's text color (text-pui-foreground)." },
    { name: "accentColor", type: "string", default: '"var(--pui-primary)"', description: "Color for about one star in six." },
    { name: "interactive", type: "boolean", default: "true", description: "The pointer nudges the vanishing point (mouse and pen)." },
    { name: "twinkle", type: "boolean", default: "true", description: "Distant stars shimmer." },
    { name: "mask", type: "PatternMask", default: '"none"', description: "Edge mask." },
  ]),
  a11y: [
    "Decorative and aria-hidden. Pauses offscreen and in background tabs; colors re-resolve on theme changes.",
    "Pointer tracking listens on window, so content above it keeps its own events; touch is ignored.",
  ],
  reducedMotion: "Draws one still frame of dots; warp and the pointer are ignored.",
  examples: [
    { title: "404 with warp on hover", description: "warp follows the CTA's hover and focus.", Demo: NotFoundDemo, wide: true },
    { title: "Loading screen", description: "Always in warp behind a progress bar.", Demo: LoadingDemo },
    { title: "Light mode", description: "Muted stars with primary accents.", Demo: LightDemo },
  ],
};
export default item;
