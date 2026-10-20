import { Badge, FlickeringGrid, type FlickeringGridProps } from "changelui";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";
type DemoProps = {
  squareSize: number;
  gap: number;
  flickerChance: number;
  maxOpacity: number;
  interactive: boolean;
  radius: number;
  text: string;
  fps: number;
  mask: NonNullable<FlickeringGridProps["mask"]>;
};
const defaults: DemoProps = {
  squareSize: 4,
  gap: 6,
  flickerChance: 0.3,
  maxOpacity: 0.3,
  interactive: true,
  radius: 120,
  text: "",
  fps: 24,
  mask: "radial",
};
/** The component's own defaults, so the snippet lists every prop the demo changes. */
const componentDefaults: DemoProps = { ...defaults, interactive: false, mask: "none" };
const controls: ControlSpec<DemoProps>[] = [
  { type: "number", prop: "squareSize", label: "Square (px)", min: 1, max: 16, step: 1 },
  { type: "number", prop: "gap", label: "Gap (px)", min: 0, max: 16, step: 1 },
  { type: "number", prop: "flickerChance", label: "Flicker / s", min: 0, max: 3, step: 0.1 },
  { type: "number", prop: "maxOpacity", label: "Max opacity", min: 0.05, max: 1, step: 0.05 },
  { type: "boolean", prop: "interactive", label: "Pointer glow" },
  { type: "number", prop: "radius", label: "Glow radius", min: 40, max: 300, step: 10 },
  { type: "text", prop: "text", label: "Text", maxLength: 12 },
  { type: "number", prop: "fps", label: "FPS", min: 4, max: 60, step: 2 },
  { type: "select", prop: "mask", label: "Mask", options: ["none", "radial", "fade-x", "fade-y", "fade-bottom"] },
];
function Preview({ props }: { props: DemoProps }) {
  const { text, ...rest } = props;
  return (
    <div className="relative isolate flex h-80 w-full max-w-2xl flex-col items-center justify-center gap-3 overflow-hidden rounded-pui-xl border border-pui-border bg-pui-background px-6 text-center">
      <FlickeringGrid {...rest} text={text || undefined} />
      {text ? (
        <span className="sr-only">{text}</span>
      ) : (
        <>
          <Badge tone="primary" className="relative">
            Now in public beta
          </Badge>
          <h2 className="relative m-0 font-pui-display text-3xl font-bold tracking-tight text-pui-foreground">Signals, not noise</h2>
          <p className="relative m-0 max-w-sm text-sm text-pui-muted-foreground">Move the pointer across the grid to light it up.</p>
        </>
      )}
    </div>
  );
}
function SignDemo() {
  return (
    <div className="dark relative isolate h-56 w-full overflow-hidden rounded-pui-xl border border-pui-border bg-pui-background">
      <FlickeringGrid text="OPEN 24/7" squareSize={5} gap={3} maxOpacity={0.18} flickerChance={0.6} color="var(--pui-chart-4)" textColor="var(--pui-chart-2)" interactive />
      <h3 className="sr-only">Open 24/7</h3>
    </div>
  );
}
function CardDemo() {
  return (
    <div className="grid w-full gap-3 sm:grid-cols-2">
      {[
        { name: "Hobby", price: "$0", color: "var(--pui-muted-foreground)" },
        { name: "Pro", price: "$24", color: "var(--pui-primary)" },
      ].map((tier) => (
        <div key={tier.name} className="relative isolate overflow-hidden rounded-pui-lg border border-pui-border bg-pui-surface p-5">
          <FlickeringGrid color={tier.color} squareSize={3} gap={4} maxOpacity={0.2} interactive radius={90} mask="fade-bottom" />
          <p className="relative m-0 text-sm font-medium text-pui-muted-foreground">{tier.name}</p>
          <p className="relative m-0 mt-1 text-3xl font-bold text-pui-surface-foreground">
            {tier.price}
            <span className="text-sm font-normal text-pui-muted-foreground">/mo</span>
          </p>
        </div>
      ))}
    </div>
  );
}
function TextureDemo() {
  return (
    <div className="relative isolate grid h-48 w-full grid-cols-3 overflow-hidden rounded-pui-xl border border-pui-border bg-pui-muted/30">
      <FlickeringGrid squareSize={2} gap={4} maxOpacity={0.5} flickerChance={1.5} color="var(--pui-muted-foreground)" fps={12} />
      {[
        ["99.99%", "Uptime"],
        ["38 ms", "p95 latency"],
        ["2.1 B", "Events / day"],
      ].map(([value, label]) => (
        <div key={label} className="relative flex flex-col items-center justify-center">
          <span className="font-pui-mono text-2xl font-semibold text-pui-foreground">{value}</span>
          <span className="text-xs text-pui-muted-foreground">{label}</span>
        </div>
      ))}
    </div>
  );
}
function Mini() {
  return (
    <div className="relative isolate h-24 w-40 overflow-hidden rounded-pui-lg bg-pui-background">
      <FlickeringGrid squareSize={3} gap={3} maxOpacity={0.6} flickerChance={1.5} />
    </div>
  );
}
const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: ({ text, ...props }) =>
    toJsx<Record<string, unknown>>(
      "FlickeringGrid",
      text ? { ...props, text } : props,
      componentDefaults,
      undefined,
      controls as ControlSpec<Record<string, unknown>>[],
    ),
  propsTable: propDocs<FlickeringGridProps>()([
    { name: "squareSize", type: "number", default: "4", description: "Square size in px (1..40)." },
    { name: "gap", type: "number", default: "6", description: "Gap between squares in px." },
    { name: "flickerChance", type: "number", default: "0.3", description: "Chance per second that a square changes brightness." },
    { name: "color", type: "string", description: "Square color; default the root's text color (text-pui-primary)." },
    { name: "maxOpacity", type: "number", default: "0.3", description: "Brightest a resting square gets (0..1)." },
    { name: "interactive", type: "boolean", default: "false", description: "Squares near the pointer light up (mouse and pen)." },
    { name: "radius", type: "number", default: "120", description: "Pointer glow radius in px." },
    { name: "text", type: "string", description: "Text spelled out in brighter squares. Decorative: render the real text too." },
    { name: "textColor", type: "string", description: "Color for the text squares; default color." },
    { name: "fontWeight", type: "number", default: "700", description: "Font weight for text (the root's font family)." },
    { name: "fps", type: "number", default: "24", description: "Redraws per second." },
    { name: "mask", type: "PatternMask", default: '"none"', description: "Edge mask." },
  ]),
  a11y: [
    "Decorative and aria-hidden canvas. The text prop is visual only, so render the same words as real text (sr-only is fine).",
    "Draws in batched alpha buckets and pauses offscreen and in background tabs.",
  ],
  reducedMotion: "One still frame: no flicker and no pointer glow (text squares still show).",
  examples: [
    { title: "Dot-matrix sign", description: "text with its own color and a pointer glow.", Demo: SignDemo, wide: true },
    { title: "Pricing cards", description: "Per-card colors with a bottom fade.", Demo: CardDemo },
    { title: "Stats texture", description: "Tiny muted squares at 12 fps.", Demo: TextureDemo },
  ],
};
export default item;
