import { ScrollVelocityText, type ScrollVelocityTextProps } from "changelui";
import { useRef, type ReactNode, type RefObject } from "react";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  baseVelocity: number;
  velocityFactor: number;
  skew: boolean;
  maxSkew: number;
  alternate: boolean;
  directional: boolean;
  pauseOnHover: boolean;
};

const defaults: DemoProps = {
  baseVelocity: 40,
  velocityFactor: 1,
  skew: true,
  maxSkew: 12,
  alternate: true,
  directional: true,
  pauseOnHover: false,
};

const controls: ControlSpec<DemoProps>[] = [
  { type: "number", prop: "baseVelocity", label: "Drift (px/s)", min: 0, max: 160, step: 10 },
  { type: "number", prop: "velocityFactor", label: "Scroll boost", min: 0, max: 3, step: 0.25 },
  { type: "boolean", prop: "skew", label: "Skew" },
  { type: "number", prop: "maxSkew", label: "Max skew (deg)", min: 2, max: 24, step: 1 },
  { type: "boolean", prop: "alternate", label: "Alternate rows" },
  { type: "boolean", prop: "directional", label: "Reverse on scroll up" },
  { type: "boolean", prop: "pauseOnHover", label: "Pause on hover" },
];

const ROWS = ["Design in motion", "Ship with feeling"];

/** A scroll box so the demo reacts without moving the whole page. */
function ScrollStage({ children, hint = "Scroll inside this box" }: { children: (ref: RefObject<HTMLDivElement | null>) => ReactNode; hint?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={ref}
      tabIndex={0}
      aria-label="Scrollable demo"
      className="relative h-80 w-full overflow-y-auto rounded-pui-lg border border-pui-border bg-pui-background outline-none focus-visible:outline-2 focus-visible:outline-pui-ring"
    >
      <div className="flex h-40 items-end justify-center pb-4 text-xs text-pui-muted-foreground">{hint} ↓</div>
      {children(ref)}
      <div className="h-[28rem]" />
    </div>
  );
}

function Preview({ props }: { props: DemoProps }) {
  return (
    <ScrollStage>
      {(ref) => (
        <ScrollVelocityText
          {...props}
          container={ref}
          rows={ROWS}
          rowClassName="text-5xl font-black tracking-tight text-pui-foreground sm:text-6xl"
          className="gap-2 py-6"
        />
      )}
    </ScrollStage>
  );
}

function OutlineDemo() {
  return (
    <ScrollStage hint="Scroll fast, then slowly">
      {(ref) => (
        <div className="flex flex-col py-4">
          <ScrollVelocityText
            container={ref}
            rows={["Outline studio"]}
            baseVelocity={30}
            maxSkew={18}
            separator={<span aria-hidden="true" className="px-6 text-3xl text-pui-primary">✦</span>}
            rowClassName="text-6xl font-black uppercase tracking-tighter text-transparent [-webkit-text-stroke:1.5px_var(--pui-foreground)]"
          />
          <ScrollVelocityText
            container={ref}
            rows={["Filled studio"]}
            baseVelocity={-30}
            maxSkew={18}
            velocityFactor={1.5}
            separator={<span aria-hidden="true" className="px-6 text-3xl text-pui-foreground">✦</span>}
            rowClassName="text-6xl font-black uppercase tracking-tighter text-pui-primary"
          />
        </div>
      )}
    </ScrollStage>
  );
}

function TickerDemo() {
  return (
    <div className="w-full overflow-hidden rounded-pui-lg border border-pui-border bg-pui-primary text-pui-primary-foreground">
      <ScrollVelocityText
        rows={["Spring sale: 30% off every plan, today only"]}
        baseVelocity={60}
        skew={false}
        pauseOnHover
        separator={<span aria-hidden="true" className="px-4 opacity-60">●</span>}
        rowClassName="py-2 text-sm font-semibold"
      />
    </div>
  );
}

function StackDemo() {
  return (
    <ScrollStage hint="Three rows, three speeds">
      {(ref) => (
        <div className="flex flex-col gap-1 py-6">
          <ScrollVelocityText container={ref} rows={["Typography"]} baseVelocity={20} rowClassName="text-4xl font-light italic text-pui-muted-foreground" />
          <ScrollVelocityText container={ref} rows={["Motion"]} baseVelocity={-50} rowClassName="text-6xl font-black text-pui-foreground" />
          <ScrollVelocityText container={ref} rows={["Color · Rhythm · Space"]} baseVelocity={35} rowClassName="text-3xl font-semibold text-pui-primary-text" />
        </div>
      )}
    </ScrollStage>
  );
}

function Mini() {
  return (
    <ScrollVelocityText
      rows={["Velocity", "Velocity"]}
      baseVelocity={30}
      rowClassName="text-2xl font-black text-pui-foreground"
      className="w-48"
    />
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) =>
    toJsx<Record<string, unknown>>(
      "ScrollVelocityText",
      { rows: ROWS, ...props, rowClassName: "text-6xl font-black" },
      { ...defaults },
      undefined,
      controls as ControlSpec<Record<string, unknown>>[],
    ),
  propsTable: propDocs<ScrollVelocityTextProps>()([
    { name: "rows", type: "string[]", description: "One marquee per string, stacked.", required: true },
    { name: "baseVelocity", type: "number", default: "40", description: "Resting drift in px per second." },
    { name: "velocityFactor", type: "number", default: "1", description: "How strongly scroll speed adds to the drift; 0 ignores scrolling." },
    { name: "skew", type: "boolean", default: "true", description: "Lean the letters with scroll speed." },
    { name: "maxSkew", type: "number", default: "12", description: "Largest lean in degrees." },
    { name: "alternate", type: "boolean", default: "true", description: "Every other row runs the opposite way." },
    { name: "directional", type: "boolean", default: "true", description: "Scrolling back up reverses the drift." },
    { name: "pauseOnHover", type: "boolean", default: "false", description: "Ease the drift to a stop under the pointer." },
    { name: "separator", type: "ReactNode", default: "·", description: "Placed between repeats of a row." },
    { name: "container", type: "RefObject<HTMLElement | null>", description: "Scroll box to follow; default the window." },
    { name: "rowClassName", type: "string", description: "Class for every row (typography, colors)." },
  ]),
  a11y: [
    "Each row is read once from an sr-only copy; the moving repeats are aria-hidden.",
    "Rows pause off-screen and while the tab is hidden.",
  ],
  reducedMotion: "Rows stay still with no skew.",
  examples: [
    { title: "Outline and filled", description: "Text stroke on one row, the primary fill on the other, a star separator.", Demo: OutlineDemo, wide: true },
    { title: "Announcement ticker", description: "skew off, a single fast row that eases to a stop on hover.", Demo: TickerDemo, wide: true },
    { title: "Layered speeds", description: "Three rows with their own drift and weight, all following one scroll box.", Demo: StackDemo, wide: true },
  ],
};
export default item;
