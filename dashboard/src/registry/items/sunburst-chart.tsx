import { SunburstChart, type SunburstChartProps, type SunburstNodeInfo } from "changelui";
import { useMemo, useState } from "react";
import { ChartDemo } from "../../components/chart-demo";
import { bundleTree, orgBudget, useSeed, type TreeDatum } from "../../lib/chart-data";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  dataset: "bundle" | "budget";
  maxDepth: number;
  centerRadius: number;
  cornerRadius: number;
  padding: number;
  labels: boolean;
  size: number;
};
const defaults: DemoProps = { dataset: "bundle", maxDepth: 3, centerRadius: 0.28, cornerRadius: 3, padding: 1.5, labels: true, size: 400 };
const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "dataset", label: "Data", options: ["bundle", "budget"] },
  { type: "number", prop: "maxDepth", label: "Rings", min: 1, max: 4, step: 1 },
  { type: "number", prop: "centerRadius", label: "Center size", min: 0.14, max: 0.45, step: 0.02 },
  { type: "number", prop: "cornerRadius", label: "Corner radius", min: 0, max: 8, step: 1 },
  { type: "number", prop: "padding", label: "Gap (px)", min: 0, max: 4, step: 0.5 },
  { type: "boolean", prop: "labels", label: "Arc labels" },
  { type: "number", prop: "size", label: "Size", min: 260, max: 520, step: 20 },
];

const kb = { maximumFractionDigits: 1, style: "unit", unit: "kilobyte" } as const;
const usdK = (v: number) => (v >= 1000 ? `$${(v / 1000).toFixed(1)}M` : `$${Math.round(v)}K`);

function Preview({ props }: { props: DemoProps }) {
  const [seed, randomize] = useSeed(1);
  const data = useMemo(() => (props.dataset === "budget" ? orgBudget(seed) : bundleTree(seed)), [props.dataset, seed]);
  return (
    <ChartDemo onRandomize={randomize} hint="Hover an arc to light its path from the center. Click to zoom in, click the center (or Escape) to go up.">
      <SunburstChart<TreeDatum>
        data={data}
        value="value"
        label="name"
        rootLabel={data.name}
        maxDepth={props.maxDepth}
        centerRadius={props.centerRadius}
        cornerRadius={props.cornerRadius}
        padding={props.padding}
        labels={props.labels}
        size={props.size}
        format={props.dataset === "budget" ? usdK : kb}
        title={props.dataset === "budget" ? "Where the budget goes" : "Bundle composition"}
        description={props.dataset === "budget" ? "Department, team and line item" : "kB gzip by folder and package"}
        className="w-full"
      />
    </ChartDemo>
  );
}

function Mini() {
  const data = useMemo(() => bundleTree(3), []);
  return <SunburstChart<TreeDatum> data={data} value="value" label="name" size={140} labels={false} breadcrumb={false} animation="never" className="w-36" />;
}

function Readout() {
  const [seed, randomize] = useSeed(6);
  const data = useMemo(() => orgBudget(seed), [seed]);
  const [node, setNode] = useState<SunburstNodeInfo<TreeDatum> | null>(null);
  const [path, setPath] = useState<string[]>([]);
  return (
    <ChartDemo onRandomize={randomize} hint="onActiveNodeChange drives the side panel; onPathChange reports drills.">
      <div className="flex w-full flex-col items-center gap-4 sm:flex-row sm:items-start">
        <SunburstChart<TreeDatum>
          data={data}
          value="value"
          label="name"
          rootLabel="Budget"
          maxDepth={2}
          size={300}
          format={usdK}
          onActiveNodeChange={setNode}
          onPathChange={setPath}
          tableToggle
          className="w-full max-w-80"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-2 rounded-pui-lg border border-pui-border p-4 text-sm" aria-live="polite">
          <span className="text-xs text-pui-muted-foreground">Viewing: {path.length ? path[path.length - 1] : "Budget"}</span>
          {node ? (
            <>
              <span className="text-xs text-pui-muted-foreground">{node.trail.join(" \u203a ")}</span>
              <span className="text-2xl font-semibold tabular-nums">{usdK(node.value)}</span>
              <span className="tabular-nums">{Math.round(node.shareOfView * 1000) / 10}% of this view</span>
              {node.childCount ? <span className="text-xs text-pui-muted-foreground">{node.childCount} sub-items, click to open</span> : null}
            </>
          ) : (
            <span className="text-pui-muted-foreground">Hover or arrow through the rings.</span>
          )}
        </div>
      </div>
    </ChartDemo>
  );
}

function Flat() {
  const rows = useMemo(
    () => [
      { id: "web", parent: null, name: "Web", visits: 0 },
      { id: "web-blog", parent: "web", name: "Blog", visits: 4200 },
      { id: "web-docs", parent: "web", name: "Docs", visits: 6100 },
      { id: "web-docs-api", parent: "web-docs", name: "API", visits: 2600 },
      { id: "web-docs-guides", parent: "web-docs", name: "Guides", visits: 1900 },
      { id: "web-pricing", parent: "web", name: "Pricing", visits: 2300 },
      { id: "app", parent: null, name: "App", visits: 0 },
      { id: "app-dash", parent: "app", name: "Dashboard", visits: 8800 },
      { id: "app-reports", parent: "app", name: "Reports", visits: 3400 },
      { id: "app-settings", parent: "app", name: "Settings", visits: 1200 },
    ],
    [],
  );
  return (
    <SunburstChart
      data={rows}
      getId={(d) => d.id}
      parentId={(d) => d.parent}
      value="visits"
      label="name"
      rootLabel="Site"
      size={300}
      cornerRadius={6}
      padding={3}
      title="Visits by section"
      description="Flat rows with id / parentId"
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
      "<SunburstChart",
      "  data={bundle} // { name, children: [{ name, value }] }",
      '  value="value"',
      '  label="name"',
      p.maxDepth !== 3 ? `  maxDepth={${p.maxDepth}}` : null,
      p.centerRadius !== 0.28 ? `  centerRadius={${p.centerRadius}}` : null,
      p.cornerRadius !== 3 ? `  cornerRadius={${p.cornerRadius}}` : null,
      p.padding !== 1.5 ? `  padding={${p.padding}}` : null,
      p.labels ? null : "  labels={false}",
      p.size !== 360 ? `  size={${p.size}}` : null,
      '  title="Bundle composition"',
      "/>",
    ]
      .filter(Boolean)
      .join("\n"),
  propsTable: propDocs<SunburstChartProps<unknown>>()([
    { name: "data", type: "T | T[]", required: true, description: "A nested root, an array of roots, or flat rows with parentId." },
    { name: "value", type: "keyof T | (d) => number", required: true, description: "Leaf size; parents sum their children." },
    { name: "label", type: "keyof T | (d) => string", required: true, description: "Arc name." },
    { name: "getId", type: "(d) => string", description: "Stable ids (required for flat rows). Default: the label path." },
    { name: "parentId", type: "(d) => string | null", description: "Flat rows: the parent's id." },
    { name: "color", type: "(node) => string", description: "Color per node. Default: a palette hue per top-level branch, lighter with depth." },
    { name: "maxDepth", type: "number", default: "3", description: "Rings drawn around the center." },
    { name: "centerRadius", type: "number", default: "0.28", description: "Center disc radius as a fraction of the outer radius." },
    { name: "cornerRadius", type: "number", default: "3", description: "Rounded arc corners in px." },
    { name: "padding", type: "number", default: "1.5", description: "Gap between arcs in px." },
    { name: "labels", type: "boolean", default: "true", description: "Labels on arcs that are big enough." },
    { name: "size", type: "number", default: "360", description: "Chart size in px (square)." },
    { name: "path", type: "string[]", description: "Drill path; controlled with onPathChange." },
    { name: "onActiveNodeChange", type: "(node | null) => void", description: "Arc under the pointer or keyboard focus." },
  ]),
  keyboard: [
    { keys: "Tab", action: "Focus the sunburst" },
    { keys: "← / →", action: "Previous / next sibling" },
    { keys: "↑ / ↓", action: "Parent ring / first child" },
    { keys: "Enter / Space", action: "Zoom into the arc" },
    { keys: "Escape / Backspace", action: "Up one level (focus returns to where you were)" },
    { keys: "T", action: "Show or hide the data table" },
  ],
  a11y: [
    "Arcs are announced with their path from the root and shares of the view.",
    "The center disc and the breadcrumb both go up; the breadcrumb is a nav with aria-current.",
    "An sr-only table lists every visible arc.",
  ],
  reducedMotion: "No sweep entrance; zooms jump to the new rings.",
  examples: [
    { title: "Linked readout", description: "onActiveNodeChange and onPathChange drive a side panel.", Demo: Readout, wide: true },
    { title: "Flat rows", description: "id / parentId instead of nesting, rounder arcs.", Demo: Flat },
  ],
};
export default item;
