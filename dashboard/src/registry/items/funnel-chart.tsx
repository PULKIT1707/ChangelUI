import { FunnelChart, type FunnelChartProps, type FunnelStageInfo } from "changelui";
import { useMemo, useState } from "react";
import { ChartDemo } from "../../components/chart-demo";
import { checkoutFunnel, productFunnel, useSeed } from "../../lib/chart-data";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  orientation: "horizontal" | "vertical";
  curve: "smooth" | "linear";
  showConversion: boolean;
  highlightDrop: boolean;
  size: number;
};
const defaults: DemoProps = { orientation: "horizontal", curve: "smooth", showConversion: true, highlightDrop: true, size: 180 };
const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "orientation", label: "Orientation", options: ["horizontal", "vertical"] },
  { type: "select", prop: "curve", label: "Curve", options: ["smooth", "linear"] },
  { type: "boolean", prop: "showConversion", label: "Conversion pills" },
  { type: "boolean", prop: "highlightDrop", label: "Flag biggest drop" },
  { type: "number", prop: "size", label: "Size", min: 100, max: 280, step: 20 },
];

function Preview({ props }: { props: DemoProps }) {
  const [seed, randomize] = useSeed(1);
  const steps = useMemo(() => productFunnel(seed), [seed]);
  return (
    <ChartDemo onRandomize={randomize} hint="Hover a stage: the rest fade and the people lost since the previous step are hatched. Randomize to see the stages morph.">
      <FunnelChart
        steps={steps}
        orientation={props.orientation}
        curve={props.curve}
        showConversion={props.showConversion}
        highlightDrop={props.highlightDrop}
        size={props.size}
        title="Signup funnel"
        description="Last 30 days, all channels"
        className="w-full"
      />
    </ChartDemo>
  );
}

function Mini() {
  const steps = useMemo(() => productFunnel(3), []);
  return <FunnelChart steps={steps} size={80} showConversion={false} initialWidth={220} animation="never" className="w-56 [&_figure>div>div:first-child]:hidden" />;
}

function Checkout() {
  const [seed, randomize] = useSeed(5);
  const steps = useMemo(() => checkoutFunnel(seed), [seed]);
  const [stage, setStage] = useState<FunnelStageInfo | null>(null);
  return (
    <ChartDemo onRandomize={randomize} hint="Vertical, straight tapers, custom colors; click a stage.">
      <div className="flex w-full flex-col gap-2">
        <FunnelChart steps={steps} orientation="vertical" curve="linear" colors={["var(--pui-chart-3)", "var(--pui-chart-6)"]} onStageClick={setStage} className="w-full" />
        <p className="text-sm" aria-live="polite">
          {stage ? (
            <>
              <strong>{stage.label}</strong>: {stage.value.toLocaleString("en-US")} people, {Math.round(stage.ofPrevious * 100)}% of the previous step
            </>
          ) : (
            "Click a stage (or press Enter on it)."
          )}
        </p>
      </div>
    </ChartDemo>
  );
}

function Compact() {
  const steps = useMemo(
    () => [
      { label: "Applied", value: 1840, description: "All sources" },
      { label: "Screened", value: 620 },
      { label: "Interviewed", value: 148 },
      { label: "Offer", value: 31 },
      { label: "Hired", value: 24 },
    ],
    [],
  );
  return <FunnelChart steps={steps} size={120} title="Hiring pipeline" description="Q3, engineering" tableToggle className="w-full" />;
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (p) =>
    [
      "<FunnelChart",
      "  steps={[",
      '    { label: "Visited", value: 24000 },',
      '    { label: "Signed up", value: 7600, previous: 7100 },',
      '    { label: "Paid", value: 980 },',
      "  ]}",
      p.orientation !== "horizontal" ? `  orientation="${p.orientation}"` : null,
      p.curve !== "smooth" ? `  curve="${p.curve}"` : null,
      p.showConversion ? null : "  showConversion={false}",
      p.highlightDrop ? null : "  highlightDrop={false}",
      p.size !== 180 ? `  size={${p.size}}` : null,
      '  title="Signup funnel"',
      "/>",
    ]
      .filter(Boolean)
      .join("\n"),
  propsTable: propDocs<FunnelChartProps>()([
    { name: "steps", type: "{ label, value, previous?, description? }[]", required: true, description: "Stages in order; previous adds a vs-last-period row." },
    { name: "orientation", type: '"horizontal" | "vertical"', default: '"horizontal"', description: "Left to right, or top to bottom with labels on the side." },
    { name: "curve", type: '"smooth" | "linear"', default: '"smooth"', description: "Tapers between stages." },
    { name: "showConversion", type: "boolean", default: "true", description: "Step-conversion pills on the boundaries." },
    { name: "highlightDrop", type: "boolean", default: "true", description: "Flags the step that loses the most." },
    { name: "colors", type: "[string, string]", description: "Gradient stops along the funnel (tokens or CSS colors)." },
    { name: "size", type: "number", default: "180", description: "Shape size across the axis in px." },
    { name: "onStageClick", type: "(stage, event) => void", description: "Click or Enter on a stage." },
    { name: "onActiveStageChange", type: "(stage | null) => void", description: "Stage under the pointer or keyboard focus." },
  ]),
  keyboard: [
    { keys: "Tab", action: "Focus the funnel" },
    { keys: "← / → or ↑ / ↓", action: "Previous / next step (announced with % of start and % of previous)" },
    { keys: "Home / End", action: "First / last step" },
    { keys: "Enter / Space", action: "Activate the step (onStageClick)" },
    { keys: "T", action: "Show or hide the data table" },
  ],
  a11y: [
    "The summary gives overall conversion and the biggest drop in words.",
    "Labels and values are real text; an sr-only table lists every step with both conversion rates.",
    "The flagged drop is labelled 'biggest drop', not shown by color alone.",
  ],
  reducedMotion: "No expand-from-center entrance; updates jump to the new widths.",
  examples: [
    { title: "Vertical checkout", description: "Linear tapers, custom gradient, onStageClick.", Demo: Checkout, wide: true },
    { title: "Hiring pipeline", description: "A steep funnel with a visible data table toggle.", Demo: Compact, wide: true },
  ],
};
export default item;
