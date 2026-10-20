import { VariableProximity, type VariableProximityProps } from "changelui";
import { useRef } from "react";
import { useAutoPointer } from "../../lib/auto-pointer";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  text: string;
  radius: number;
  falloff: NonNullable<VariableProximityProps["falloff"]>;
  range: "thin to black" | "regular to bold" | "black to thin";
  accent: boolean;
  smoothing: number;
};

const ranges: Record<DemoProps["range"], { from: string; to: string }> = {
  "thin to black": { from: "'wght' 200", to: "'wght' 900" },
  "regular to bold": { from: "'wght' 400", to: "'wght' 700" },
  "black to thin": { from: "'wght' 900", to: "'wght' 150" },
};

const defaults: DemoProps = {
  text: "Pressure sensitive type",
  radius: 120,
  falloff: "linear",
  range: "thin to black",
  accent: false,
  smoothing: 0.15,
};

const controls: ControlSpec<DemoProps>[] = [
  { type: "text", prop: "text", label: "Text", maxLength: 40 },
  { type: "number", prop: "radius", label: "Radius (px)", min: 40, max: 300, step: 10 },
  { type: "select", prop: "falloff", label: "Falloff", options: ["linear", "exponential", "gaussian"] },
  { type: "select", prop: "range", label: "Weight range", options: Object.keys(ranges) },
  { type: "boolean", prop: "accent", label: "Accent tint" },
  { type: "number", prop: "smoothing", label: "Smoothing", min: 0.05, max: 1, step: 0.05 },
];

function Preview({ props }: { props: DemoProps }) {
  const { text, range, ...rest } = props;
  return (
    <div className="flex w-full max-w-2xl flex-col items-center gap-4 py-6 text-center">
      <VariableProximity
        as="h2"
        {...rest}
        {...ranges[range]}
        className="text-4xl leading-tight tracking-tight text-pui-foreground sm:text-6xl"
      >
        {text}
      </VariableProximity>
      <p className="m-0 text-xs text-pui-muted-foreground">Move the pointer across the letters. Needs a variable font.</p>
    </div>
  );
}

function NavDemo() {
  const containerRef = useRef<HTMLElement>(null);
  return (
    <nav ref={containerRef} aria-label="Demo" className="flex flex-wrap items-center justify-center gap-6 py-4">
      {["Work", "Studio", "Journal", "Contact"].map((label) => (
        <a
          key={label}
          href="#/text/variable-proximity"
          onClick={(event) => event.preventDefault()}
          className="rounded-pui-sm text-2xl text-pui-foreground no-underline outline-offset-4 focus-visible:outline-2 focus-visible:outline-pui-ring"
        >
          <VariableProximity containerRef={containerRef} radius={70} from="'wght' 300" to="'wght' 800" accent>
            {label}
          </VariableProximity>
        </a>
      ))}
    </nav>
  );
}

function ParagraphDemo() {
  return (
    <p className="m-0 max-w-md text-base leading-relaxed text-pui-muted-foreground">
      <VariableProximity radius={90} falloff="gaussian" from="'wght' 350" to="'wght' 750" smoothing={0.1}>
        Good interfaces respond before you click. Letters lean toward your attention, then settle back when you move on.
      </VariableProximity>
    </p>
  );
}

function DisplayDemo() {
  return (
    <div className="flex flex-col items-center gap-1 py-2">
      <span className="text-xs font-medium tracking-widest text-pui-muted-foreground uppercase">Inverted</span>
      <VariableProximity
        as="p"
        radius={160}
        falloff="exponential"
        from="'wght' 900"
        to="'wght' 120"
        className="text-5xl tracking-tight text-pui-foreground"
      >
        ERASE
      </VariableProximity>
    </div>
  );
}

function Mini() {
  const ref = useRef<HTMLDivElement>(null);
  useAutoPointer(ref, "window");
  return (
    <div ref={ref} className="px-2">
      <VariableProximity radius={60} from="'wght' 200" to="'wght' 900" className="text-2xl text-pui-foreground">
        Proximity
      </VariableProximity>
    </div>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: ({ text, range, ...props }) =>
    toJsx<Record<string, unknown>>(
      "VariableProximity",
      { ...props, ...ranges[range] },
      { radius: 120, falloff: "linear", accent: false, smoothing: 0.15, from: "'wght' 400", to: "'wght' 900" },
      text,
    ),
  propsTable: propDocs<VariableProximityProps>()([
    { name: "children", type: "string", description: "The text; each letter reacts on its own.", required: true },
    { name: "radius", type: "number", default: "120", description: "px around the pointer that letters react within." },
    { name: "from", type: "string", default: "\"'wght' 400\"", description: "font-variation-settings at rest." },
    { name: "to", type: "string", default: "\"'wght' 900\"", description: "Settings right under the pointer." },
    { name: "falloff", type: '"linear" | "exponential" | "gaussian"', default: '"linear"', description: "Curve out to the radius." },
    { name: "accent", type: "boolean", default: "false", description: "Tints the nearest letters toward the primary color." },
    { name: "smoothing", type: "number", default: "0.15", description: "Share of the gap closed per frame (lower is smoother)." },
    { name: "containerRef", type: "RefObject<HTMLElement>", description: "Only react while the pointer is over this element." },
    { name: "as", type: "TextTag", default: '"span"', description: "Rendered tag." },
    { name: "disabled", type: "boolean", default: "false", description: "Renders the `from` settings only." },
  ]),
  a11y: [
    "Screen readers get the plain text once; the per-letter spans are aria-hidden.",
    "Purely visual; it never moves focus or changes the text.",
    "Off for touch and coarse pointers.",
  ],
  reducedMotion: "Renders the `from` settings and ignores the pointer.",
  examples: [
    { title: "Navigation", description: "Scoped to the nav with containerRef, with an accent tint.", Demo: NavDemo },
    { title: "Inverted, exponential", description: "Heavy at rest, thin under the pointer.", Demo: DisplayDemo },
    { title: "Body copy", description: "A gaussian falloff across a paragraph.", Demo: ParagraphDemo, wide: true },
  ],
};

export default item;
