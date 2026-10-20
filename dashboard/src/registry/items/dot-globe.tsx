import { DotGlobe, type DotGlobeArc, type DotGlobeMarker, type DotGlobeProps } from "changelui";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  speed: number;
  dots: string;
  density: number;
  dotSize: number;
  tilt: number;
  draggable: boolean;
  showLabels: boolean;
  glow: boolean;
};

const defaults: DemoProps = {
  speed: 0.15,
  dots: "land",
  density: 6000,
  dotSize: 1.1,
  tilt: 18,
  draggable: true,
  showLabels: true,
  glow: true,
};

const controls: ControlSpec<DemoProps>[] = [
  { type: "number", prop: "speed", label: "Speed (rad/s)", min: 0, max: 1, step: 0.05 },
  { type: "select", prop: "dots", label: "Dots", options: ["land", "sphere"] },
  { type: "number", prop: "density", label: "Density", min: 1000, max: 14000, step: 500 },
  { type: "number", prop: "dotSize", label: "Dot size", min: 0.5, max: 2.5, step: 0.1 },
  { type: "number", prop: "tilt", label: "Tilt (°)", min: -40, max: 40, step: 2 },
  { type: "boolean", prop: "draggable", label: "Draggable" },
  { type: "boolean", prop: "showLabels", label: "Labels" },
  { type: "boolean", prop: "glow", label: "Rim glow" },
];

const cities = {
  london: { lat: 51.5, lon: -0.1, label: "London" },
  newYork: { lat: 40.7, lon: -74, label: "New York" },
  sanFrancisco: { lat: 37.8, lon: -122.4, label: "San Francisco" },
  saoPaulo: { lat: -23.5, lon: -46.6, label: "São Paulo" },
  lagos: { lat: 6.5, lon: 3.4, label: "Lagos" },
  mumbai: { lat: 19.1, lon: 72.9, label: "Mumbai" },
  singapore: { lat: 1.35, lon: 103.8, label: "Singapore" },
  tokyo: { lat: 35.7, lon: 139.7, label: "Tokyo" },
  sydney: { lat: -33.9, lon: 151.2, label: "Sydney" },
} satisfies Record<string, DotGlobeMarker>;

const markers: DotGlobeMarker[] = Object.values(cities);
const arcs: DotGlobeArc[] = [
  { from: cities.london, to: cities.newYork },
  { from: cities.newYork, to: cities.sanFrancisco },
  { from: cities.london, to: cities.mumbai },
  { from: cities.mumbai, to: cities.singapore },
  { from: cities.singapore, to: cities.sydney },
  { from: cities.sanFrancisco, to: cities.tokyo },
  { from: cities.newYork, to: cities.saoPaulo },
  { from: cities.london, to: cities.lagos },
];

function Preview({ props }: { props: DemoProps }) {
  return (
    <div className="flex w-full justify-center">
      <DotGlobe
        {...props}
        dots={props.dots as DotGlobeProps["dots"]}
        markers={markers}
        arcs={arcs}
        label="Globe with nine offices connected by arcs"
        className="max-w-md"
      />
    </div>
  );
}

function StatusDemo() {
  const regions = [
    { name: "us-east", latency: "18 ms" },
    { name: "eu-west", latency: "24 ms" },
    { name: "ap-south", latency: "41 ms" },
  ];
  return (
    <div className="grid w-full items-center gap-4 rounded-pui-xl border border-pui-border bg-pui-surface p-5 text-pui-surface-foreground shadow-pui-md sm:grid-cols-[1fr_auto]">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-pui-full bg-pui-success shadow-[0_0_0_4px_color-mix(in_oklab,var(--pui-success)_25%,transparent)]" aria-hidden="true" />
          <span className="text-sm font-semibold">All systems operational</span>
        </div>
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {regions.map((r) => (
            <li key={r.name} className="flex justify-between gap-8 text-xs">
              <span className="font-mono text-pui-muted-foreground">{r.name}</span>
              <span className="tabular-nums">{r.latency}</span>
            </li>
          ))}
        </ul>
      </div>
      <DotGlobe
        className="w-40 justify-self-center"
        density={3500}
        dotSize={1}
        markers={[cities.newYork, cities.london, cities.mumbai]}
        arcs={[
          { from: cities.newYork, to: cities.london },
          { from: cities.london, to: cities.mumbai },
        ]}
        showLabels={false}
        arcColor="var(--pui-success)"
        initialLon={-20}
      />
    </div>
  );
}

function HorizonDemo() {
  return (
    <div className="relative h-64 w-full overflow-hidden rounded-pui-xl border border-pui-border bg-pui-background">
      <div className="relative z-10 flex flex-col items-center gap-1 pt-8 text-center">
        <span className="text-xs font-semibold uppercase tracking-widest text-pui-primary">Global edge</span>
        <span className="text-xl font-semibold tracking-tight text-pui-foreground">Ship close to every user</span>
      </div>
      <DotGlobe
        className="absolute left-1/2 top-24 w-[34rem] -translate-x-1/2"
        dots="sphere"
        density={9000}
        dotSize={0.9}
        tilt={28}
        speed={0.08}
        markers={markers.map((m) => ({ ...m, label: undefined }))}
        arcs={arcs}
        draggable={false}
      />
    </div>
  );
}

function Mini() {
  return <DotGlobe className="w-28" density={2600} dotSize={0.9} markers={markers.slice(0, 4)} arcs={arcs.slice(0, 3)} showLabels={false} draggable={false} />;
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) =>
    toJsx<Record<string, unknown>>(
      "DotGlobe",
      { markers: "{[{ lat: 51.5, lon: -0.1, label: \"London\" }, …]}", arcs: "{[{ from: london, to: newYork }, …]}", ...props },
      defaults,
      undefined,
      controls as ControlSpec<Record<string, unknown>>[],
    ).replace(/="(\{[^"]*\})"/g, "=$1"),
  propsTable: propDocs<DotGlobeProps>()([
    { name: "markers", type: "{ lat, lon, label?, size? }[]", description: "Points with a pulse ring and optional label." },
    { name: "arcs", type: "{ from: { lat, lon }, to: { lat, lon } }[]", description: "Great-circle arcs with a traveling comet." },
    { name: "speed", type: "number", default: "0.15", description: "Auto-rotation in radians per second; 0 stops it." },
    { name: "dots", type: '"land" | "sphere"', default: '"land"', description: "Continents only, or the whole sphere." },
    { name: "density", type: "number", default: "6000", description: "Sample points over the sphere (500..20000)." },
    { name: "dotSize", type: "number", default: "1.1", description: "Dot radius in px at the center." },
    { name: "dotColor", type: "string", default: "var(--pui-foreground)", description: "CSS color of the dots." },
    { name: "arcColor", type: "string", default: "var(--pui-primary)", description: "CSS color of arcs and the rim glow." },
    { name: "markerColor", type: "string", description: "CSS color of markers; defaults to arcColor." },
    { name: "draggable", type: "boolean", default: "true", description: "Drag to spin with inertia; vertical drag tilts." },
    { name: "initialLon", type: "number", default: "10", description: "Longitude facing the viewer at first." },
    { name: "tilt", type: "number", default: "18", description: "Degrees the north pole leans toward you." },
    { name: "showLabels", type: "boolean", default: "true", description: "Draw marker labels." },
    { name: "glow", type: "boolean", default: "true", description: "Soft rim glow." },
    { name: "label", type: "string", description: 'Accessible description; makes the globe role="img".' },
  ]),
  a11y: [
    'Decorative (aria-hidden) unless you pass label, which makes it role="img" with that name.',
    "Drag is a pointer enhancement only; nothing depends on it.",
  ],
  reducedMotion: "A still frame: no auto-rotation, comets or pulses. Dragging still turns the globe, without inertia.",
  examples: [
    { title: "Status card", description: "A small globe beside live region stats, recolored with arcColor.", Demo: StatusDemo },
    { title: "Horizon hero", description: "An oversized sphere of dots cropped by its container.", Demo: HorizonDemo, wide: true },
  ],
};

export default item;
