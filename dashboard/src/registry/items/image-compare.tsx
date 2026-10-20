import { ImageCompare, type ImageCompareProps } from "changelui";
import { useMemo, useState } from "react";
import { landscape, SCENES } from "../../lib/demo-art";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  mode: NonNullable<ImageCompareProps["mode"]>;
  orientation: NonNullable<ImageCompareProps["orientation"]>;
  defaultPosition: number;
  showLabels: boolean;
  beforeLabel: string;
  afterLabel: string;
};

const defaults: DemoProps = {
  mode: "drag",
  orientation: "horizontal",
  defaultPosition: 50,
  showLabels: true,
  beforeLabel: "Original",
  afterLabel: "Graded",
};

const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "mode", label: "Mode", options: ["drag", "hover"] },
  { type: "select", prop: "orientation", label: "Orientation", options: ["horizontal", "vertical"] },
  { type: "number", prop: "defaultPosition", label: "Start position", min: 0, max: 100, step: 5 },
  { type: "boolean", prop: "showLabels", label: "Labels" },
  { type: "text", prop: "beforeLabel", label: "Before label", maxLength: 20 },
  { type: "text", prop: "afterLabel", label: "After label", maxLength: 20 },
];

const SCENE = SCENES[2] ?? SCENES[0]!;

/** The same artwork, "ungraded" via CSS filters, so it reads like a photo edit. */
function Photo({ graded }: { graded: boolean }) {
  const src = useMemo(() => landscape(SCENE, 4), []);
  return (
    <img
      src={src}
      alt={graded ? "Desert dusk, color graded" : "Desert dusk, flat original"}
      draggable={false}
      className="block size-full object-cover"
      style={graded ? { filter: "saturate(1.35) contrast(1.08)" } : { filter: "grayscale(0.85) contrast(0.85) brightness(1.08)" }}
    />
  );
}

function Preview({ props }: { props: DemoProps }) {
  const [pos, setPos] = useState(props.defaultPosition);
  return (
    <div className="flex w-full max-w-2xl flex-col gap-3">
      <ImageCompare
        key={`${props.mode}-${props.orientation}-${props.defaultPosition}`}
        {...props}
        onPositionChange={setPos}
        before={<Photo graded={false} />}
        after={<Photo graded />}
        className="shadow-pui-lg"
      />
      <p className="m-0 text-center text-xs tabular-nums text-pui-muted-foreground">
        Divider at {pos}% · {props.mode === "hover" ? "move the pointer" : "drag, click to jump, or use the arrow keys (Shift for 10)"}
      </p>
    </div>
  );
}

function Wireframe() {
  return (
    <div className="flex size-full flex-col gap-3 bg-pui-muted p-5">
      <div className="h-4 w-24 rounded bg-pui-border" />
      <div className="h-8 w-3/4 rounded bg-pui-border" />
      <div className="h-3 w-2/3 rounded bg-pui-border" />
      <div className="mt-auto grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-16 rounded-md border-2 border-dashed border-pui-border" />
        ))}
      </div>
    </div>
  );
}

function Polished() {
  return (
    <div className="flex size-full flex-col gap-3 bg-[radial-gradient(120%_100%_at_0%_0%,color-mix(in_oklch,var(--pui-primary)_22%,var(--pui-surface)),var(--pui-surface))] p-5 text-pui-surface-foreground">
      <span className="w-fit rounded-full bg-pui-primary/15 px-2 py-0.5 text-[0.65rem] font-semibold text-pui-primary-text">New · v2.0</span>
      <p className="m-0 text-xl font-semibold tracking-tight">Ship interfaces that feel alive</p>
      <p className="m-0 text-xs text-pui-muted-foreground">Motion-first components with keyboard support built in.</p>
      <div className="mt-auto grid grid-cols-3 gap-3">
        {["var(--pui-chart-1)", "var(--pui-chart-2)", "var(--pui-chart-3)"].map((c) => (
          <div key={c} className="h-16 rounded-md border border-pui-border bg-pui-surface shadow-pui-sm" style={{ backgroundImage: `linear-gradient(135deg, ${c}, transparent 70%)` }} />
        ))}
      </div>
    </div>
  );
}

function Redesign() {
  return <ImageCompare before={<Wireframe />} after={<Polished />} beforeLabel="Wireframe" afterLabel="Shipped" defaultPosition={42} />;
}

function ThemeCard({ theme }: { theme: "light" | "dark" }) {
  return (
    <div className={`${theme} flex size-full items-center justify-center bg-pui-background p-6 text-pui-foreground`}>
      <div className="w-full max-w-56 rounded-pui-xl border border-pui-border bg-pui-surface p-4 text-pui-surface-foreground shadow-pui-md">
        <p className="m-0 text-xs text-pui-muted-foreground">Revenue</p>
        <p className="m-0 text-2xl font-semibold tabular-nums">$48.2K</p>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-pui-muted">
          <div className="h-full w-2/3 rounded-full bg-pui-primary" />
        </div>
      </div>
    </div>
  );
}

function Themes() {
  return (
    <ImageCompare
      orientation="vertical"
      mode="hover"
      before={<ThemeCard theme="light" />}
      after={<ThemeCard theme="dark" />}
      beforeLabel="Light"
      afterLabel="Dark"
    />
  );
}

function Mini() {
  return (
    <div aria-hidden="true" className="pointer-events-none w-64">
      <ImageCompare before={<Photo graded={false} />} after={<Photo graded />} defaultPosition={45} tabIndex={-1} />
    </div>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) =>
    toJsx<Record<string, unknown>>(
      "ImageCompare",
      { before: "/photo-raw.jpg", after: "/photo-graded.jpg", ...props },
      { mode: "drag", orientation: "horizontal", defaultPosition: 50, showLabels: true, beforeLabel: "Before", afterLabel: "After" },
      undefined,
      controls as ControlSpec<Record<string, unknown>>[],
    ),
  propsTable: propDocs<ImageCompareProps>()([
    { name: "before", type: "ReactNode | string", description: "Image URL (alt = beforeLabel) or any node. Start side.", required: true },
    { name: "after", type: "ReactNode | string", description: "Image URL or any node. End side.", required: true },
    { name: "beforeLabel", type: "string", default: '"Before"', description: "Corner label and alt text." },
    { name: "afterLabel", type: "string", default: '"After"', description: "Corner label and alt text." },
    { name: "position", type: "number", description: "Controlled divider position, 0-100." },
    { name: "defaultPosition", type: "number", default: "50", description: "Initial position; also the server render." },
    { name: "onPositionChange", type: "(position: number) => void", description: "Whole-percent changes." },
    { name: "mode", type: '"drag" | "hover"', default: '"drag"', description: "Drag and click to jump, or follow the pointer." },
    { name: "orientation", type: '"horizontal" | "vertical"', default: '"horizontal"', description: "Left/right or top/bottom split." },
    { name: "showLabels", type: "boolean", default: "true", description: "Corner labels that fade near the divider." },
    { name: "handleLabel", type: "string", default: '"Comparison divider"', description: "Accessible name of the handle." },
  ]),
  keyboard: [
    { keys: "Arrow keys", action: "Move the divider 1%" },
    { keys: "Shift + Arrow / PageUp / PageDown", action: "Move 10%" },
    { keys: "Home / End", action: "Show all before / all after" },
  ],
  a11y: [
    "The handle is a role=slider whose value text names both sides, e.g. “40% Before, 60% After”.",
    "String sources render images with the labels as alt text.",
  ],
  reducedMotion: "Hover mode follows the pointer directly instead of on a spring, and the handle doesn't grow while dragging.",
  examples: [
    { title: "Redesign reveal", description: "Any nodes work, not only images.", Demo: Redesign },
    { title: "Light vs dark", description: 'orientation="vertical" with mode="hover".', Demo: Themes },
  ],
};

export default item;
