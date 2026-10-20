import { NetworkGraph, type NetworkGraphProps, type NetworkNodeInfo } from "changelui";
import { useMemo, useState } from "react";
import { ChartDemo } from "../../components/chart-demo";
import { collaboration, dependencyGraph, useSeed } from "../../lib/chart-data";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  dataset: "team" | "modules";
  labels: "auto" | "all" | "none";
  search: boolean;
  draggable: boolean;
  zoomable: boolean;
  linkDistance: number;
  charge: number;
  height: number;
};
const defaults: DemoProps = { dataset: "team", labels: "auto", search: true, draggable: true, zoomable: true, linkDistance: 54, charge: -170, height: 440 };
const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "dataset", label: "Data", options: ["team", "modules"] },
  { type: "select", prop: "labels", label: "Labels", options: ["auto", "all", "none"] },
  { type: "boolean", prop: "search", label: "Search box" },
  { type: "boolean", prop: "draggable", label: "Drag to pin" },
  { type: "boolean", prop: "zoomable", label: "Zoom and pan" },
  { type: "number", prop: "linkDistance", label: "Link distance", min: 24, max: 120, step: 6 },
  { type: "number", prop: "charge", label: "Repulsion", min: -400, max: -40, step: 20 },
  { type: "number", prop: "height", label: "Height", min: 300, max: 600, step: 20 },
];

function Preview({ props }: { props: DemoProps }) {
  const [seed, randomize] = useSeed(1);
  const graph = useMemo(() => (props.dataset === "modules" ? dependencyGraph(seed) : collaboration(seed)), [props.dataset, seed]);
  return (
    <ChartDemo onRandomize={randomize} hint="Hover to light a node's neighbors, drag a node to pin it (double-click releases), Ctrl/Cmd + scroll to zoom, search to fly to a node.">
      <NetworkGraph
        nodes={graph.nodes}
        links={graph.links}
        labels={props.labels}
        search={props.search}
        draggable={props.draggable}
        zoomable={props.zoomable}
        linkDistance={props.linkDistance}
        charge={props.charge}
        height={props.height}
        title={props.dataset === "modules" ? "Module imports" : "Who works with whom"}
        description={props.dataset === "modules" ? "Sized by connections, colored by layer" : "Six teams, sized by collaborators, links weighted by shared projects"}
        className="w-full"
      />
    </ChartDemo>
  );
}

function Mini() {
  const graph = useMemo(() => collaboration(2, 30), []);
  return <NetworkGraph nodes={graph.nodes} links={graph.links} height={130} initialWidth={240} labels="none" zoomable={false} animation="never" className="w-60" />;
}

function Inspector() {
  const [seed, randomize] = useSeed(4);
  const graph = useMemo(() => dependencyGraph(seed), [seed]);
  const [node, setNode] = useState<NetworkNodeInfo | null>(null);
  const [clicked, setClicked] = useState<NetworkNodeInfo | null>(null);
  const shown = node ?? clicked;
  return (
    <ChartDemo onRandomize={randomize} hint="onActiveNodeChange and onNodeClick feed the inspector.">
      <div className="flex w-full flex-col gap-3 md:flex-row">
        <NetworkGraph nodes={graph.nodes} links={graph.links} labels="all" height={340} onActiveNodeChange={setNode} onNodeClick={setClicked} tableToggle className="min-w-0 flex-1" />
        <div className="flex w-full flex-col gap-1.5 rounded-pui-lg border border-pui-border p-4 text-sm md:w-56" aria-live="polite">
          {shown ? (
            <>
              <span className="font-mono text-base font-semibold">{shown.label}</span>
              <span className="text-xs text-pui-muted-foreground">layer: {shown.group}</span>
              <span className="tabular-nums">{shown.degree} connections</span>
              <span className="text-xs text-pui-muted-foreground">{shown.neighbors.join(", ")}</span>
              {shown.pinned ? <span className="text-xs">Pinned</span> : null}
            </>
          ) : (
            <span className="text-pui-muted-foreground">Hover or click a module.</span>
          )}
        </div>
      </div>
    </ChartDemo>
  );
}

function Small() {
  const nodes = useMemo(
    () => [
      { id: "you", label: "You", group: "me", value: 8 },
      { id: "a", label: "Design", group: "team" },
      { id: "b", label: "Eng", group: "team" },
      { id: "c", label: "PM", group: "team" },
      { id: "d", label: "Legal", group: "partner" },
      { id: "e", label: "Sales", group: "partner" },
      { id: "f", label: "Support", group: "partner" },
    ],
    [],
  );
  const links = useMemo(
    () => [
      { source: "you", target: "a", value: 5 },
      { source: "you", target: "b", value: 8 },
      { source: "you", target: "c", value: 6 },
      { source: "c", target: "d", value: 2 },
      { source: "c", target: "e", value: 3 },
      { source: "b", target: "f", value: 2 },
      { source: "a", target: "b", value: 4 },
    ],
    [],
  );
  return <NetworkGraph nodes={nodes} links={links} labels="all" height={260} nodeSize={[8, 20]} linkDistance={70} title="Your working circle" zoomable={false} className="w-full" />;
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (p) =>
    [
      "<NetworkGraph",
      '  nodes={[{ id: "ava", label: "Ava", group: "Design" }, ...]}',
      '  links={[{ source: "ava", target: "ben", value: 3 }, ...]}',
      p.labels !== "auto" ? `  labels="${p.labels}"` : null,
      p.search ? "  search" : null,
      p.draggable ? null : "  draggable={false}",
      p.zoomable ? null : "  zoomable={false}",
      p.linkDistance !== 54 ? `  linkDistance={${p.linkDistance}}` : null,
      p.charge !== -170 ? `  charge={${p.charge}}` : null,
      p.height !== 420 ? `  height={${p.height}}` : null,
      '  title="Who works with whom"',
      "/>",
    ]
      .filter(Boolean)
      .join("\n"),
  propsTable: propDocs<NetworkGraphProps>()([
    { name: "nodes", type: "{ id, label?, group?, value? }[]", required: true, description: "Nodes; group picks the palette color, value the size (default: degree)." },
    { name: "links", type: "{ source, target, value? }[]", required: true, description: "Undirected links; value thickens the link and shortens its spring." },
    { name: "nodeSize", type: "[min, max]", default: "[5, 18]", description: "Radius range in px, by sqrt(value)." },
    { name: "linkDistance", type: "number", default: "54", description: "Spring rest length." },
    { name: "charge", type: "number", default: "-170", description: "Repulsion per node." },
    { name: "labels", type: '"auto" | "all" | "none"', default: '"auto"', description: "Auto labels the biggest nodes plus the hovered node's neighbors." },
    { name: "search", type: "boolean", default: "false", description: "Search box: highlights matches, Enter flies to the next one." },
    { name: "draggable", type: "boolean", default: "true", description: "Drag to pin (the graph reacts live); double-click or Enter releases." },
    { name: "zoomable", type: "boolean", default: "true", description: "Ctrl/Cmd+wheel zoom, drag-to-pan, zoom and fit buttons." },
    { name: "onNodeClick", type: "(node, event) => void", description: "Click or Enter on a node." },
    { name: "onActiveNodeChange", type: "(node | null) => void", description: "Node under the pointer or keyboard focus." },
  ]),
  keyboard: [
    { keys: "Tab", action: "Focus the graph" },
    { keys: "Arrow keys", action: "Jump to the connected node in that direction (else the nearest node)" },
    { keys: "Home", action: "The biggest node" },
    { keys: "Enter / Space", action: "Pin or release the node" },
    { keys: "+ / - / 0", action: "Zoom in, out, fit" },
    { keys: "T", action: "Show or hide the links table" },
  ],
  a11y: [
    "Each node is announced with its group, number of connections and its neighbors by name.",
    "The summary names the most connected nodes; an sr-only table lists every link.",
    "The layout is seeded, so the server and the client render the same settled graph.",
  ],
  reducedMotion: "Shows the settled layout only: no live settle, and dragging moves just the dragged node.",
  examples: [
    { title: "Module inspector", description: "Labels on, onActiveNodeChange + onNodeClick, links table.", Demo: Inspector, wide: true },
    { title: "Small graph", description: "Custom sizes and distance, no zoom.", Demo: Small },
  ],
};
export default item;
