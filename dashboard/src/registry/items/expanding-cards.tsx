import { ExpandingCards, type ExpandingCardsItem, type ExpandingCardsProps } from "changelui";
import { useMemo, useState } from "react";
import { landscape, SCENES } from "../../lib/demo-art";
import { BrainIcon, ChartIcon, CodeIcon, LockIcon, ZapIcon } from "../../lib/demo-icons";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  trigger: NonNullable<ExpandingCardsProps["trigger"]>;
  orientation: NonNullable<ExpandingCardsProps["orientation"]>;
  grow: number;
  count: number;
};
const defaults: DemoProps = { trigger: "hover", orientation: "horizontal", grow: 4, count: 5 };
const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "trigger", label: "Trigger", options: ["hover", "click"] },
  { type: "select", prop: "orientation", label: "Orientation", options: ["horizontal", "vertical"] },
  { type: "number", prop: "grow", label: "Grow", min: 2, max: 8, step: 0.5 },
  { type: "number", prop: "count", label: "Panels", min: 2, max: 7, step: 1 },
];

const PLACES = [
  { scene: 0, title: "Dawn ridge", content: "A 6 km climb to the eastern lookout. Leave by 5am for first light." },
  { scene: 4, title: "Lagoon", content: "Clear shallow water, kayaks for rent and a reef 200 m out." },
  { scene: 2, title: "Desert dusk", content: "Dune camp with a copper sunset and zero light pollution." },
  { scene: 3, title: "Night valley", content: "Stargazing tours every clear night from October to March." },
  { scene: 6, title: "Arctic", content: "Glacier walks with a guide, crampons included." },
  { scene: 5, title: "Rose hills", content: "Spring bloom trails, best in the second week of April." },
  { scene: 7, title: "Aurora", content: "Northern lights forecast sent to your phone each evening." },
];

function usePlaces(): ExpandingCardsItem[] {
  return useMemo(
    () =>
      PLACES.map((p, i) => ({
        id: p.title,
        title: p.title,
        content: p.content,
        image: landscape(SCENES[p.scene] ?? SCENES[0]!, i + 31, 900, 1100),
        imageAlt: "",
      })),
    [],
  );
}

function Preview({ props }: { props: DemoProps }) {
  const { count, ...rest } = props;
  const places = usePlaces();
  const [index, setIndex] = useState(0);
  return (
    <div className="flex w-full max-w-3xl flex-col gap-3">
      <ExpandingCards {...rest} items={places.slice(0, count)} index={Math.min(index, count - 1)} onIndexChange={setIndex} />
      <p className="m-0 text-center text-xs text-pui-muted-foreground" aria-live="polite">
        Showing <span className="font-medium text-pui-foreground">{places[Math.min(index, count - 1)]?.title}</span>
      </p>
    </div>
  );
}

const FEATURES: ExpandingCardsItem[] = [
  { id: "speed", title: "Speed", icon: <ZapIcon />, content: "Edge rendering keeps every page under 100ms worldwide." },
  { id: "ai", title: "Assistant", icon: <BrainIcon />, content: "Ask questions about your data in plain words." },
  { id: "code", title: "API", icon: <CodeIcon />, content: "Typed SDKs for TypeScript, Python and Go." },
  { id: "security", title: "Security", icon: <LockIcon />, content: "SSO, audit logs and per-field encryption." },
  { id: "insights", title: "Insights", icon: <ChartIcon />, content: "Funnels, cohorts and retention, out of the box." },
];

function FeaturePanelsDemo() {
  const items = FEATURES.map((f, i) => ({ ...f, accent: `var(--pui-chart-${i + 1})` }));
  return <ExpandingCards items={items} defaultIndex={1} className="h-64 w-full" />;
}

function VerticalDemo() {
  const places = usePlaces().slice(0, 4);
  return <ExpandingCards items={places} orientation="vertical" trigger="click" defaultIndex={2} className="h-[26rem] w-full max-w-md" grow={5} />;
}

function Mini() {
  return (
    <div className="flex h-20 w-40 gap-1">
      {[1, 3.5, 1, 1].map((g, i) => (
        <span key={i} className="rounded-pui-sm border border-pui-border shadow-pui-xs" style={{ flexGrow: g, flexBasis: 0, background: `linear-gradient(180deg, var(--pui-chart-${i + 1}), color-mix(in oklch, var(--pui-chart-${i + 1}) 50%, var(--pui-surface)))` }} />
      ))}
    </div>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: ({ count: _count, ...props }) =>
    toJsx<Record<string, unknown>>(
      "ExpandingCards",
      { ...props, items: "__ITEMS__" },
      { trigger: "hover", orientation: "horizontal", grow: 4, items: "" },
      undefined,
      controls as ControlSpec<Record<string, unknown>>[],
    ).replace('items="__ITEMS__"', 'items={[{ title: "Lagoon", image: "/lagoon.jpg", content: "Kayaks and a reef" }, …]}'),
  propsTable: propDocs<ExpandingCardsProps>()([
    { name: "items", type: "{ id?, title, image?, imageAlt?, content?, icon?, accent? }[]", description: "Panels; content shows while expanded.", required: true },
    { name: "index", type: "number", description: "Controlled expanded index." },
    { name: "defaultIndex", type: "number", default: "0", description: "Initially expanded panel." },
    { name: "onIndexChange", type: "(index: number) => void", description: "Called when another panel expands." },
    { name: "trigger", type: '"hover" | "click"', default: '"hover"', description: "Hover expands on hover and focus; click waits for a press." },
    { name: "orientation", type: '"horizontal" | "vertical"', default: '"horizontal"', description: "Row of columns or a stack of rows." },
    { name: "grow", type: "number", default: "4", description: "flex-grow of the expanded panel (others are 1)." },
    { name: "panelClassName", type: "string", description: "Class for each panel button." },
  ]),
  keyboard: [
    { keys: "Arrow keys", action: "Move between panels (and expand with trigger=\"hover\")" },
    { keys: "Home / End", action: "First / last panel" },
    { keys: "Enter / Space", action: "Expand the focused panel" },
  ],
  a11y: [
    "Each panel is a button with aria-expanded; only the expanded one is in the Tab order (roving focus).",
    "Collapsed panels keep their title visible and in the accessible name.",
    "Keep content non-interactive: it lives inside the panel button.",
  ],
  reducedMotion: "Panels resize instantly; the caption fades in 150ms without sliding.",
  examples: [
    { title: "Feature panels", description: "No images: icons on accent-tinted panels.", Demo: FeaturePanelsDemo, wide: true },
    { title: "Vertical, click to open", description: 'orientation="vertical" with trigger="click".', Demo: VerticalDemo },
  ],
};
export default item;
