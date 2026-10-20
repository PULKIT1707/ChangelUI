import { Particles, type ParticlesProps } from "changelui";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  quantity: number;
  staticity: number;
  ease: number;
  particleSize: number;
  interactive: boolean;
  variant: NonNullable<ParticlesProps["variant"]>;
  linkDistance: number;
};

const defaults: DemoProps = {
  quantity: 80,
  staticity: 50,
  ease: 50,
  particleSize: 0.4,
  interactive: true,
  variant: "dots",
  linkDistance: 100,
};

const controls: ControlSpec<DemoProps>[] = [
  { type: "number", prop: "quantity", label: "Quantity", min: 0, max: 500, step: 10 },
  { type: "number", prop: "staticity", label: "Staticity", min: 10, max: 100, step: 5 },
  { type: "number", prop: "ease", label: "Ease", min: 10, max: 100, step: 5 },
  { type: "number", prop: "particleSize", label: "Size", min: 0.2, max: 2, step: 0.1 },
  { type: "boolean", prop: "interactive", label: "Pointer parallax" },
  { type: "select", prop: "variant", label: "Variant", options: ["dots", "links"] },
  { type: "number", prop: "linkDistance", label: "Link distance", min: 40, max: 200, step: 10 },
];

function Preview({ props }: { props: DemoProps }) {
  return (
    <div className="relative isolate flex h-64 w-full max-w-lg items-center justify-center overflow-hidden rounded-pui-xl border border-pui-border bg-pui-background">
      <Particles {...props} />
      <p className="relative m-0 text-xl font-semibold text-pui-foreground">Particles</p>
    </div>
  );
}

function Mini() {
  return (
    <div className="relative isolate h-20 w-36 overflow-hidden rounded-pui-lg bg-pui-muted">
      <Particles quantity={30} interactive={false} variant="links" linkDistance={60} />
    </div>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) => toJsx("Particles", props, defaults, undefined, controls),
  propsTable: propDocs<ParticlesProps>()([
    { name: "quantity", type: "number", default: "80", description: "Number of particles (0..500)." },
    { name: "staticity", type: "number", default: "50", description: "Higher values react less to the pointer." },
    { name: "ease", type: "number", default: "50", description: "Pointer follow easing (higher is slower)." },
    { name: "particleSize", type: "number", default: "0.4", description: "Particle radius factor." },
    {
      name: "color",
      type: "string",
      description: "CSS color; default the root's text color, text-pui-particle (re-read on theme change).",
    },
    { name: "variant", type: '"dots" | "links"', default: '"dots"', description: "links joins nearby particles with faint lines." },
    { name: "linkDistance", type: "number", default: "100", description: "links: maximum distance in px between joined particles." },
    { name: "vx", type: "number", default: "0", description: "Horizontal drift per frame." },
    { name: "vy", type: "number", default: "0", description: "Vertical drift per frame." },
    { name: "interactive", type: "boolean", default: "true", description: "Pointer parallax." },
    { name: "mask", type: "PatternMask", default: '"none"', description: "Edge mask." },
  ]),
  a11y: [
    "Decorative and aria-hidden. Pauses offscreen and in background tabs.",
    "The window pointermove listener is attached only while the canvas is on screen.",
  ],
  reducedMotion: "Draws one static frame (with links in the links variant).",
};

export default item;
