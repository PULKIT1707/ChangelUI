import { CursorTrail, type CursorTrailProps } from "changelui";
import { useRef } from "react";
import { useAutoPointer } from "../../lib/auto-pointer";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type Palette = "gradient" | "chart" | "primary" | "foreground";

type DemoProps = {
  variant: NonNullable<CursorTrailProps["variant"]>;
  length: number;
  size: number;
  smoothing: number;
  idleMs: number;
  glow: boolean;
  global: boolean;
  palette: Palette;
};

const defaults: DemoProps = {
  variant: "ribbon",
  length: 24,
  size: 10,
  smoothing: 0.35,
  idleMs: 600,
  glow: false,
  global: false,
  palette: "gradient",
};

const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "variant", label: "Variant", options: ["ribbon", "dots", "sparkle"] },
  { type: "select", prop: "palette", label: "Colors", options: ["gradient", "chart", "primary", "foreground"] },
  { type: "number", prop: "length", label: "Length", min: 4, max: 80, step: 1 },
  { type: "number", prop: "size", label: "Size (px)", min: 2, max: 30, step: 1 },
  { type: "number", prop: "smoothing", label: "Follow", min: 0.05, max: 1, step: 0.05 },
  { type: "number", prop: "idleMs", label: "Idle fade (ms)", min: 100, max: 3000, step: 100 },
  { type: "boolean", prop: "glow", label: "Additive glow" },
  { type: "boolean", prop: "global", label: "Whole page" },
];

const PALETTES: Record<Palette, string[]> = {
  gradient: ["var(--pui-gradient-1)", "var(--pui-gradient-2)", "var(--pui-gradient-3)"],
  chart: ["var(--pui-chart-1)", "var(--pui-chart-2)", "var(--pui-chart-3)", "var(--pui-chart-4)", "var(--pui-chart-5)"],
  primary: ["var(--pui-primary)"],
  foreground: ["var(--pui-foreground)"],
};

const surface =
  "flex w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-pui-xl border border-pui-border bg-pui-surface text-pui-surface-foreground";

function Preview({ props }: { props: DemoProps }) {
  const { palette, ...rest } = props;
  return (
    <CursorTrail {...rest} colors={PALETTES[palette]} className={`${surface} h-72 max-w-2xl bg-[radial-gradient(var(--pui-pattern)_1px,transparent_1px)] bg-size-[18px_18px]`}>
      <p className="m-0 text-lg font-semibold tracking-tight">{props.global ? "Move anywhere on the page" : "Move your pointer here"}</p>
      <p className="m-0 text-sm text-pui-muted-foreground">The native cursor stays; the loop stops when you rest.</p>
    </CursorTrail>
  );
}

function NightDemo() {
  return (
    <div className="dark">
      <CursorTrail
        glow
        size={14}
        length={36}
        colors={["var(--pui-chart-2)", "var(--pui-chart-1)", "var(--pui-chart-4)"]}
        className={`${surface} h-60 border-transparent bg-pui-background`}
      >
        <p className="m-0 bg-linear-to-r from-pui-chart-2 via-pui-chart-1 to-pui-chart-4 bg-clip-text text-3xl font-bold tracking-tight text-transparent">
          Light painting
        </p>
        <p className="m-0 text-sm text-pui-muted-foreground">Additive blending on a dark island.</p>
      </CursorTrail>
    </div>
  );
}

function SparkleDemo() {
  return (
    <CursorTrail variant="sparkle" size={12} colors={["var(--pui-warning)", "var(--pui-chart-5)", "var(--pui-primary)"]} className={`${surface} h-60`}>
      <span className="text-4xl" aria-hidden="true">
        🪄
      </span>
      <p className="m-0 font-semibold">Magic wand</p>
      <p className="m-0 text-sm text-pui-muted-foreground">Faster strokes shed more sparkles.</p>
    </CursorTrail>
  );
}

function DotsDemo() {
  return (
    <CursorTrail variant="dots" length={14} size={12} smoothing={0.2} colors={["var(--pui-foreground)"]} className={`${surface} h-60`}>
      <p className="m-0 font-mono text-sm text-pui-muted-foreground">variant=&quot;dots&quot; smoothing=0.2</p>
    </CursorTrail>
  );
}

function Mini() {
  const ref = useRef<HTMLDivElement | null>(null);
  useAutoPointer(ref);
  return <CursorTrail ref={ref} length={28} size={8} idleMs={100000} className="h-28 w-full rounded-pui-lg" />;
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) => {
    const { palette, ...rest } = props;
    const restDefaults = { ...defaults } as Partial<DemoProps>;
    delete restDefaults.palette;
    const code = toJsx("CursorTrail", rest, restDefaults as Omit<DemoProps, "palette">, "{children}", controls.filter((c) => c.prop !== "palette") as ControlSpec<Omit<DemoProps, "palette">>[]);
    return palette === "gradient" ? code : code.replace("<CursorTrail", `<CursorTrail colors={${JSON.stringify(PALETTES[palette])}}`);
  },
  propsTable: propDocs<CursorTrailProps>()([
    { name: "variant", type: '"ribbon" | "dots" | "sparkle"', default: '"ribbon"', description: "Tapered gradient ribbon, fading dots, or a sparkle head that sheds sparkles." },
    { name: "length", type: "number", default: "24", description: "Points in the trail." },
    { name: "colors", type: "string[]", default: "gradient tokens", description: "CSS colors blended along the trail; tokens resolve per theme." },
    { name: "size", type: "number", default: "10", description: "Head thickness in px." },
    { name: "smoothing", type: "number", default: "0.35", description: "How quickly the head follows the pointer (0-1)." },
    { name: "global", type: "boolean", default: "false", description: "Track the whole page on a fixed canvas instead of this element." },
    { name: "idleMs", type: "number", default: "600", description: "Fade out after the pointer rests this long; the rAF loop then stops." },
    { name: "glow", type: "boolean", default: "false", description: "Additive (lighter) blending for glowing trails on dark surfaces." },
    { name: "disabled", type: "boolean", default: "false", description: "No canvas, no listeners." },
  ]),
  a11y: [
    "The canvas is aria-hidden and pointer-events: none; children stay interactive.",
    "The native cursor is never hidden.",
    "Touch input is ignored, so scrolling on phones is unaffected.",
  ],
  reducedMotion: "Off: no canvas is rendered.",
  examples: [
    { title: "Light painting", description: "glow on a dark island.", Demo: NightDemo, wide: true },
    { title: "Sparkle wand", Demo: SparkleDemo },
    { title: "Dots", Demo: DotsDemo },
  ],
};

export default item;
