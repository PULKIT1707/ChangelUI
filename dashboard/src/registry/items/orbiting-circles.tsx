import { OrbitingCircles, type OrbitingCirclesProps } from "changelui";
import type { ReactNode } from "react";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  radius: number;
  duration: number;
  reverse: boolean;
  showPath: boolean;
  itemSize: number;
};

const defaults: DemoProps = { radius: 120, duration: 20, reverse: false, showPath: true, itemSize: 32 };

const controls: ControlSpec<DemoProps>[] = [
  { type: "number", prop: "radius", label: "Radius (px)", min: 40, max: 160, step: 10 },
  { type: "number", prop: "duration", label: "Duration (s)", min: 4, max: 60, step: 2 },
  { type: "boolean", prop: "reverse", label: "Reverse" },
  { type: "boolean", prop: "showPath", label: "Show path" },
  { type: "number", prop: "itemSize", label: "Item size", min: 24, max: 56, step: 4 },
];

type Glyph = { name: string; tone: string; path: ReactNode };

// Abstract "integration" glyphs in token colors; decorative, like logos on an orbit.
const glyphs: Glyph[] = [
  { name: "circle", tone: "text-pui-primary-text", path: <circle cx="12" cy="12" r="6" /> },
  { name: "triangle", tone: "text-pui-success-text", path: <path d="M12 5l7 13H5z" /> },
  { name: "square", tone: "text-pui-warning-text", path: <rect x="6" y="6" width="12" height="12" rx="2" /> },
  { name: "hex", tone: "text-pui-info-text", path: <path d="M12 4l7 4v8l-7 4-7-4V8z" /> },
  { name: "diamond", tone: "text-pui-danger-text", path: <path d="M12 3l8 9-8 9-8-9z" /> },
  { name: "plus", tone: "text-pui-primary-text", path: <path d="M10 5h4v5h5v4h-5v5h-4v-5H5v-4h5z" /> },
];

function GlyphTile({ glyph, small = false }: { glyph: Glyph; small?: boolean }) {
  return (
    <span
      className={`flex size-full items-center justify-center rounded-pui-lg border border-pui-border bg-pui-surface shadow-pui-md ${glyph.tone}`}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" className={small ? "size-3.5" : "size-5"} fill="currentColor">
        {glyph.path}
      </svg>
    </span>
  );
}

// Dashed orbit paths: the demo styles the component's own <circle> from the outside.
const dashed = "[&_circle]:[stroke-dasharray:4_6]";

function Preview({ props }: { props: DemoProps }) {
  const inner = Math.max(32, Math.round(props.radius * 0.5));
  return (
    <div className="grid place-items-center [&>*]:[grid-area:1/1]">
      <OrbitingCircles {...props} className={dashed}>
        {glyphs.slice(0, 4).map((glyph) => (
          <GlyphTile key={glyph.name} glyph={glyph} />
        ))}
      </OrbitingCircles>
      <OrbitingCircles
        radius={inner}
        duration={props.duration * 0.75}
        reverse={!props.reverse}
        showPath={props.showPath}
        itemSize={Math.round(props.itemSize * 0.75)}
        startAngle={45}
        className={dashed}
      >
        {glyphs.slice(4).map((glyph) => (
          <GlyphTile key={glyph.name} glyph={glyph} small />
        ))}
      </OrbitingCircles>
      <span className="flex size-12 items-center justify-center rounded-pui-xl bg-pui-primary text-sm font-bold text-pui-primary-foreground shadow-pui-glow">
        UI
      </span>
    </div>
  );
}

function Mini() {
  return (
    <OrbitingCircles radius={44} duration={12} itemSize={24} className={dashed}>
      {glyphs.slice(0, 3).map((glyph) => (
        <GlyphTile key={glyph.name} glyph={glyph} small />
      ))}
    </OrbitingCircles>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) =>
    [
      "{/* Two orbits in opposite directions */}",
      toJsx("OrbitingCircles", props, defaults, "<Logo />\n<Logo />\n<Logo />\n<Logo />", controls),
      `<OrbitingCircles radius={${Math.max(32, Math.round(props.radius * 0.5))}}${props.reverse ? "" : " reverse"}>`,
      "  <Logo />",
      "  <Logo />",
      "</OrbitingCircles>",
    ].join("\n"),
  propsTable: propDocs<OrbitingCirclesProps>()([
    { name: "radius", type: "number", default: "120", description: "Orbit radius in px." },
    { name: "duration", type: "number", default: "20", description: "Seconds per revolution." },
    { name: "reverse", type: "boolean", default: "false", description: "Orbit counter-clockwise." },
    { name: "showPath", type: "boolean", default: "true", description: "Draw the orbit path." },
    { name: "itemSize", type: "number", default: "32", description: "Child wrapper size in px." },
    { name: "startAngle", type: "number", default: "0", description: "Angle of the first child in degrees." },
  ]),
  a11y: ["Children are decorative: do not put focusable controls on the orbit."],
  reducedMotion: "Children sit at their static angles.",
};

export default item;
