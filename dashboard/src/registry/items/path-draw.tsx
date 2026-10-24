import { Button, PathDraw, type PathDrawProps } from "changelui";
import { useState } from "react";
import { ScrollStage } from "../../lib/scroll-stage";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";
type DemoProps = {
  trigger: "inView" | "mount";
  duration: number;
  stagger: number;
  delay: number;
  ease: NonNullable<PathDrawProps["ease"]>;
  fill: boolean;
  repeat: boolean;
};
const defaults: DemoProps = { trigger: "inView", duration: 1.4, stagger: 0.12, delay: 0, ease: "inOut", fill: true, repeat: false };
const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "trigger", label: "Trigger", options: ["inView", "mount"] },
  { type: "number", prop: "duration", label: "Duration (s)", min: 0.4, max: 4, step: 0.1 },
  { type: "number", prop: "stagger", label: "Stagger (s)", min: 0, max: 0.6, step: 0.02 },
  { type: "number", prop: "delay", label: "Delay (s)", min: 0, max: 2, step: 0.1 },
  { type: "select", prop: "ease", label: "Ease", options: ["inOut", "out", "outExpo", "emphasized"] },
  { type: "boolean", prop: "fill", label: "Fade fills in" },
  { type: "boolean", prop: "repeat", label: "Redraw on re-entry" },
];
/** Empty-state illustration: a dashboard window whose chart, text lines and dots trace in. */
function WorkspaceArt() {
  return (
    <svg viewBox="0 0 320 200" fill="none" strokeLinecap="round" strokeLinejoin="round" role="img" aria-label="Illustration of an empty analytics dashboard" className="block h-auto w-full">
      <g className="text-pui-border" stroke="currentColor" strokeWidth={2}>
        <rect x="10" y="10" width="300" height="180" rx="14" />
        <path d="M10 42h300" />
      </g>
      <g className="text-pui-muted-foreground" fill="currentColor">
        <circle cx="30" cy="26" r="4" />
        <circle cx="44" cy="26" r="4" />
        <circle cx="58" cy="26" r="4" />
      </g>
      <g className="text-pui-muted-foreground" stroke="currentColor" strokeWidth={5} opacity={0.55}>
        <path d="M34 66h88" />
        <path d="M34 82h52" strokeWidth={4} opacity={0.6} />
      </g>
      <path d="M34 168h252" className="text-pui-border" stroke="currentColor" strokeWidth={2} />
      <g className="text-pui-primary" stroke="currentColor">
        <path d="M34 150c34-8 50-46 84-38s46 40 80 6 52-54 88-50" strokeWidth={3.5} />
        <path d="M34 150c34-8 50-46 84-38s46 40 80 6 52-54 88-50V168H34z" fill="currentColor" fillOpacity={0.12} stroke="none" />
        <circle cx="286" cy="68" r="6" fill="currentColor" strokeWidth={3} />
      </g>
    </svg>
  );
}
function Preview({ props }: { props: DemoProps }) {
  return (
    <div className="flex w-full max-w-md flex-col items-center gap-5 rounded-pui-xl border border-pui-border bg-pui-surface p-6 text-center text-pui-surface-foreground shadow-pui-md">
      <PathDraw {...props} className="w-full max-w-xs">
        <WorkspaceArt />
      </PathDraw>
      <div className="flex flex-col gap-1.5">
        <p className="m-0 text-base font-semibold">Your workspace is ready</p>
        <p className="m-0 text-sm text-pui-muted-foreground">Connect a data source and your first chart draws itself here.</p>
      </div>
      <Button size="sm">Connect a source</Button>
    </div>
  );
}
function SignatureDemo() {
  const [run, setRun] = useState(0);
  const [signed, setSigned] = useState(false);
  return (
    <div className="flex w-full flex-col gap-3 rounded-pui-xl border border-pui-border bg-pui-surface p-4 text-sm text-pui-surface-foreground">
      <p className="m-0 text-xs text-pui-muted-foreground">Signed by Ada Park · Oct 23, 2026</p>
      <PathDraw
        key={run}
        trigger="mount"
        duration={2.2}
        stagger={0.5}
        ease="out"
        onComplete={() => setSigned(true)}
        className="rounded-pui-md border border-dashed border-pui-border bg-pui-background px-4 py-3"
      >
        <svg viewBox="0 0 260 90" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" role="img" aria-label="Signature of Ada Park" className="block h-20 w-full text-pui-foreground">
          <path d="M18 66c14-30 26-52 34-52s-4 40-8 52m-22-18c14-4 26-4 36-2M70 44c-10-4-18 10-10 18 6 6 14-6 16-18-2 10 0 20 8 18 10-2 12-30 16-48-4 18-6 36 2 40 8 2 12-12 18-14-8 0-12 10-6 14 6 4 12-6 14-14 0 8 2 14 8 12" />
          <path d="M148 64c4-18 8-36 14-40 10-6 18 4 10 14s-20 8-20 8m24 6c-6-4-12 6-6 10 6 2 10-8 12-14 0 8 2 14 8 12m6-16c2 8 0 14 0 18 2-10 8-16 14-16m6-14c-2 14-4 26-2 32m-6-12c6-4 12-8 18-8-6 4-10 8-6 14 2 4 8 4 12 0" />
          <path d="M22 78c48 6 124 4 214-10" strokeWidth={1.8} />
        </svg>
      </PathDraw>
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-pui-muted-foreground" role="status">
          {signed ? "Signature drawn, onComplete fired" : "Drawing…"}
        </span>
        <Button
          size="sm"
          variant="ghost"
          tone="neutral"
          onClick={() => {
            setSigned(false);
            setRun((r) => r + 1);
          }}
        >
          Sign again
        </Button>
      </div>
    </div>
  );
}
const FEATURES = [
  {
    title: "Live sync",
    icon: (
      <>
        <path d="M20 12a8 8 0 0 1-14.3 4.9M4 12a8 8 0 0 1 14.3-4.9" />
        <path d="M18.5 3v4.5H14M5.5 21v-4.5H10" />
      </>
    ),
  },
  {
    title: "Private by default",
    icon: (
      <>
        <path d="M12 3 5 6v5c0 4.5 3 8.3 7 10 4-1.7 7-5.5 7-10V6z" fill="currentColor" fillOpacity={0.14} />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
  },
  { title: "Instant search", icon: <path d="M13 2 4 14h7l-1 8 9-12h-7z" fill="currentColor" fillOpacity={0.14} /> },
  {
    title: "Works offline",
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18" />
      </>
    ),
  },
];
function FeatureIconsDemo() {
  return (
    <PathDraw duration={1} stagger={0.08} repeat className="grid w-full grid-cols-2 gap-3 sm:grid-cols-4">
      {FEATURES.map((f) => (
        <div key={f.title} className="flex flex-col items-center gap-2 rounded-pui-lg border border-pui-border bg-pui-surface px-3 py-4 text-center text-sm text-pui-surface-foreground">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="block size-9 text-pui-primary">
            {f.icon}
          </svg>
          <span className="font-medium">{f.title}</span>
        </div>
      ))}
    </PathDraw>
  );
}
function RouteDemo() {
  return (
    <ScrollStage height="h-80" hint="Scroll to follow the route" lead="h-40" tail="h-56">
      {(ref) => (
        <div className="mx-auto w-full max-w-lg px-4">
          <PathDraw trigger="scroll" container={ref} scrollOffset={["start 0.85", "end 0.45"]} duration={1} stagger={0.15} fill={false}>
            <svg viewBox="0 0 320 260" fill="none" strokeLinecap="round" strokeLinejoin="round" role="img" aria-label="Delivery route from the warehouse to Elm Street with two stops" className="block h-auto w-full">
              <path d="M20 236c60-30 20-86 90-100s92-14 72-66 70-56 118-46" className="text-pui-primary" stroke="currentColor" strokeWidth={4} />
              <circle cx="20" cy="236" r="9" className="text-pui-primary" stroke="currentColor" strokeWidth={3} fill="currentColor" fillOpacity={0.2} />
              <circle cx="110" cy="136" r="7" className="text-pui-muted-foreground" stroke="currentColor" strokeWidth={3} />
              <circle cx="182" cy="70" r="7" className="text-pui-muted-foreground" stroke="currentColor" strokeWidth={3} />
              <path d="M300 24c-9 0-14 7-14 13 0 9 14 21 14 21s14-12 14-21c0-6-5-13-14-13z" className="text-pui-success" stroke="currentColor" strokeWidth={3} />
            </svg>
          </PathDraw>
          <ol className="m-0 mt-3 grid list-none grid-cols-3 gap-2 p-0 text-center text-xs text-pui-muted-foreground">
            <li>Warehouse · 9:02</li>
            <li>2 stops · 14 min</li>
            <li className="font-medium text-pui-foreground">Elm St · 9:31</li>
          </ol>
        </div>
      )}
    </ScrollStage>
  );
}
function Mini() {
  return (
    <div aria-hidden="true" className="pointer-events-none w-40">
      <PathDraw trigger="mount" duration={1.6} stagger={0.1}>
        <WorkspaceArt />
      </PathDraw>
    </div>
  );
}
const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) => toJsx("PathDraw", props, defaults, "<svg viewBox=\"0 0 320 200\">…</svg>", controls),
  propsTable: propDocs<PathDrawProps>()([
    { name: "trigger", type: '"inView" | "mount" | "scroll"', default: '"inView"', description: "When to draw; scroll ties progress to the scroll position." },
    { name: "duration", type: "number", default: "1.4", description: "Seconds per stroke (a share of the scroll window for scroll)." },
    { name: "stagger", type: "number", default: "0.12", description: "Seconds between strokes, in document order." },
    { name: "delay", type: "number", default: "0", description: "Seconds before the first stroke." },
    { name: "ease", type: "EasingName", default: '"inOut"', description: "Motion preset easing for time-based drawing." },
    { name: "fill", type: "boolean", default: "true", description: "Fade filled shapes in as their outline finishes, back to their own fill-opacity." },
    { name: "repeat", type: "boolean", default: "false", description: "Redraw each time it re-enters the view." },
    { name: "selector", type: "string", default: '"path, line, polyline, polygon, circle, ellipse, rect"', description: "Which SVG elements draw." },
    { name: "scrollOffset", type: "UseScrollOptions['offset']", default: '["start 0.9", "end 0.6"]', description: "Scroll window for trigger=\"scroll\"." },
    { name: "container", type: "RefObject<HTMLElement>", description: "Scroll container for trigger=\"scroll\". Default: the window." },
    { name: "onComplete", type: "() => void", description: "Every stroke has finished drawing." },
  ]),
  a11y: [
    "Wraps your SVG without changing it: give meaningful drawings role=img and a label, decorative ones aria-hidden.",
    "Only inline styles on the strokes change while drawing; they are cleared when it finishes, so the final SVG is exactly yours.",
  ],
  reducedMotion: "The drawing is shown finished, with no dash or fill animation, in every trigger mode.",
  examples: [
    { title: "Signature", description: "trigger=\"mount\" with onComplete, the moment to reveal a confirmation.", Demo: SignatureDemo },
    { title: "Feature icons", description: "One PathDraw around a grid: every icon in it traces in turn and redraws on re-entry.", Demo: FeatureIconsDemo },
    { title: "Scroll-linked route", description: "trigger=\"scroll\" inside a scroll box: the route follows your scroll and rewinds when you go back.", Demo: RouteDemo, wide: true },
  ],
};
export default item;
