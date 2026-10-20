import { SankeyChart, type SankeyChartProps, type SankeyLinkInfo, type SankeyNodeInfo } from "changelui";
import { useMemo, useState } from "react";
import { ChartDemo } from "../../components/chart-demo";
import { energyFlow, userJourney, useSeed } from "../../lib/chart-data";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  dataset: "energy" | "journey";
  linkColor: "gradient" | "source" | "target" | "neutral";
  align: "justify" | "left" | "right" | "center";
  flowParticles: boolean;
  draggable: boolean;
  nodeWidth: number;
  nodePadding: number;
  height: number;
};
const defaults: DemoProps = { dataset: "energy", linkColor: "gradient", align: "justify", flowParticles: true, draggable: true, nodeWidth: 14, nodePadding: 16, height: 380 };
const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "dataset", label: "Data", options: ["energy", "journey"] },
  { type: "select", prop: "linkColor", label: "Ribbon color", options: ["gradient", "source", "target", "neutral"] },
  { type: "select", prop: "align", label: "Align", options: ["justify", "left", "right", "center"] },
  { type: "boolean", prop: "flowParticles", label: "Flow particles" },
  { type: "boolean", prop: "draggable", label: "Draggable nodes" },
  { type: "number", prop: "nodeWidth", label: "Node width", min: 6, max: 28, step: 2 },
  { type: "number", prop: "nodePadding", label: "Node gap", min: 4, max: 32, step: 2 },
  { type: "number", prop: "height", label: "Height", min: 260, max: 520, step: 20 },
];

const twh = (v: number) => `${Math.round(v)} TWh`;

function Preview({ props }: { props: DemoProps }) {
  const [seed, randomize] = useSeed(1);
  const graph = useMemo(() => (props.dataset === "journey" ? userJourney(seed) : energyFlow(seed)), [props.dataset, seed]);
  return (
    <ChartDemo onRandomize={randomize} hint="Hover a node to light every path through it, hover a ribbon for its share of both ends, drag nodes up and down.">
      <SankeyChart
        nodes={graph.nodes}
        links={graph.links}
        linkColor={props.linkColor}
        align={props.align}
        flowParticles={props.flowParticles}
        draggable={props.draggable}
        nodeWidth={props.nodeWidth}
        nodePadding={props.nodePadding}
        height={props.height}
        format={props.dataset === "energy" ? twh : undefined}
        title={props.dataset === "energy" ? "Energy flow" : "Signup journey"}
        description={props.dataset === "energy" ? "Sources, carriers and end uses, TWh per year" : "Visitors by channel, landing page and outcome, last 30 days"}
        className="w-full"
      />
    </ChartDemo>
  );
}

function Mini() {
  const graph = useMemo(() => energyFlow(2), []);
  return <SankeyChart nodes={graph.nodes} links={graph.links} height={120} initialWidth={240} labels={false} nodeWidth={8} nodePadding={6} animation="never" className="w-60" />;
}

function Journey() {
  const [seed, randomize] = useSeed(3);
  const graph = useMemo(() => userJourney(seed), [seed]);
  const [active, setActive] = useState<{ node: SankeyNodeInfo } | { link: SankeyLinkInfo } | null>(null);
  return (
    <ChartDemo onRandomize={randomize} hint="Source-colored ribbons; onActiveChange feeds the readout. Click a node to pin its paths.">
      <div className="flex w-full flex-col gap-2">
        <SankeyChart nodes={graph.nodes} links={graph.links} linkColor="source" height={320} onActiveChange={setActive} tableToggle className="w-full" />
        <p className="min-h-5 text-sm tabular-nums" aria-live="polite">
          {active === null
            ? "Hover a node or a ribbon."
            : "node" in active
              ? `${active.node.label}: ${active.node.value.toLocaleString("en-US")} visitors (${active.node.inflow ? `${active.node.inflow.toLocaleString("en-US")} in` : "entry"}${active.node.outflow ? `, ${active.node.outflow.toLocaleString("en-US")} out` : ""})`
              : `${active.link.sourceLabel} \u2192 ${active.link.targetLabel}: ${active.link.value.toLocaleString("en-US")} (${Math.round(active.link.ofSource * 100)}% of ${active.link.sourceLabel})`}
        </p>
      </div>
    </ChartDemo>
  );
}

function Budget() {
  const nodes = useMemo(
    () => [
      { id: "salary", label: "Salary", color: "var(--pui-chart-7)" },
      { id: "freelance", label: "Freelance", color: "var(--pui-chart-2)" },
      { id: "income", label: "Income", color: "var(--pui-chart-1)" },
      { id: "needs", label: "Needs" },
      { id: "wants", label: "Wants" },
      { id: "savings", label: "Savings", color: "var(--pui-chart-7)" },
      { id: "rent", label: "Rent" },
      { id: "food", label: "Groceries" },
      { id: "travel", label: "Travel" },
      { id: "fun", label: "Going out" },
      { id: "index", label: "Index funds" },
      { id: "cash", label: "Emergency fund" },
    ],
    [],
  );
  const links = useMemo(
    () => [
      { source: "salary", target: "income", value: 5200 },
      { source: "freelance", target: "income", value: 1300 },
      { source: "income", target: "needs", value: 3100 },
      { source: "income", target: "wants", value: 1700 },
      { source: "income", target: "savings", value: 1700 },
      { source: "needs", target: "rent", value: 2200 },
      { source: "needs", target: "food", value: 900 },
      { source: "wants", target: "travel", value: 900 },
      { source: "wants", target: "fun", value: 800 },
      { source: "savings", target: "index", value: 1200 },
      { source: "savings", target: "cash", value: 500 },
    ],
    [],
  );
  return (
    <SankeyChart
      nodes={nodes}
      links={links}
      linkColor="target"
      flowParticles
      height={300}
      format={{ style: "currency", currency: "USD", maximumFractionDigits: 0 }}
      title="Monthly budget"
      description="Fixed node colors, target-colored ribbons"
      className="w-full"
    />
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (p) =>
    [
      "<SankeyChart",
      '  nodes={[{ id: "solar", label: "Solar" }, { id: "elec", label: "Electricity" }, ...]}',
      '  links={[{ source: "solar", target: "elec", value: 64 }, ...]}',
      p.linkColor !== "gradient" ? `  linkColor="${p.linkColor}"` : null,
      p.align !== "justify" ? `  align="${p.align}"` : null,
      p.flowParticles ? "  flowParticles" : null,
      p.draggable ? null : "  draggable={false}",
      p.nodeWidth !== 14 ? `  nodeWidth={${p.nodeWidth}}` : null,
      p.nodePadding !== 16 ? `  nodePadding={${p.nodePadding}}` : null,
      p.height !== 360 ? `  height={${p.height}}` : null,
      '  title="Energy flow"',
      "/>",
    ]
      .filter(Boolean)
      .join("\n"),
  propsTable: propDocs<SankeyChartProps>()([
    { name: "nodes", type: "{ id, label?, color? }[]", required: true, description: "Nodes; colors default to the palette in order." },
    { name: "links", type: "{ source, target, value }[]", required: true, description: "Flows between node ids (no cycles)." },
    { name: "align", type: '"justify" | "left" | "right" | "center"', default: '"justify"', description: "Column alignment; justify puts sinks in the last column." },
    { name: "linkColor", type: '"gradient" | "source" | "target" | "neutral"', default: '"gradient"', description: "Ribbon color." },
    { name: "flowParticles", type: "boolean", default: "false", description: "Dots streaming along ribbons, faster for bigger flows (off under reduced motion)." },
    { name: "draggable", type: "boolean", default: "true", description: "Drag nodes vertically (or Alt+arrows); ribbons follow." },
    { name: "nodeWidth", type: "number", default: "14", description: "Node bar width in px." },
    { name: "nodePadding", type: "number", default: "16", description: "Gap between nodes in a column." },
    { name: "onNodeClick", type: "(node, event) => void", description: "Click or Enter on a node (also pins its highlight)." },
    { name: "onLinkClick", type: "(link, event) => void", description: "Click on a ribbon." },
    { name: "onActiveChange", type: "({ node } | { link } | null) => void", description: "What the pointer or keyboard is on." },
  ]),
  keyboard: [
    { keys: "Tab", action: "Focus the diagram" },
    { keys: "↑ / ↓", action: "Previous / next node in the column" },
    { keys: "← / →", action: "Nearest node in the previous / next column" },
    { keys: "Alt + ↑ / ↓", action: "Move the node (Shift for bigger steps)" },
    { keys: "Enter / Space", action: "Pin the node's paths" },
    { keys: "Escape", action: "Unpin, then leave the node" },
    { keys: "T", action: "Show or hide the data table" },
  ],
  a11y: [
    "Each node is announced with its value and its biggest inflows and outflows with shares.",
    "The summary names the total and the largest flow; an sr-only table lists every link with both shares.",
    "Highlighting uses opacity and outlines, not color alone.",
  ],
  reducedMotion: "No ribbon draw-in or flow particles; updates jump.",
  examples: [
    { title: "User journey", description: "Source-colored ribbons, onActiveChange readout, data table.", Demo: Journey, wide: true },
    { title: "Monthly budget", description: "Fixed colors, target-colored ribbons, particles.", Demo: Budget, wide: true },
  ],
};
export default item;
