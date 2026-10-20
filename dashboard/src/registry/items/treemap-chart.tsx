import { TreemapChart, type TreemapChartProps } from "changelui";
import { useMemo, useState } from "react";
import { ChartDemo } from "../../components/chart-demo";
import { bundleTree, marketMap, orgBudget, useSeed, type TreeDatum } from "../../lib/chart-data";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  dataset: "market" | "budget" | "bundle";
  color: "category" | "value" | "diverging";
  tile: "squarify" | "binary" | "slice" | "dice" | "sliceDice";
  maxDepth: number;
  headers: boolean;
  padding: number;
  height: number;
};
const defaults: DemoProps = { dataset: "market", color: "diverging", tile: "squarify", maxDepth: 2, headers: true, padding: 2, height: 420 };
const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "dataset", label: "Data", options: ["market", "budget", "bundle"] },
  { type: "select", prop: "color", label: "Color", options: ["category", "value", "diverging"] },
  { type: "select", prop: "tile", label: "Tiling", options: ["squarify", "binary", "slice", "dice", "sliceDice"] },
  { type: "number", prop: "maxDepth", label: "Levels shown", min: 1, max: 3, step: 1 },
  { type: "boolean", prop: "headers", label: "Group headers" },
  { type: "number", prop: "padding", label: "Gap (px)", min: 0, max: 6, step: 1 },
  { type: "number", prop: "height", label: "Height", min: 260, max: 560, step: 20 },
];

const signedPct = (v: number) => `${v > 0 ? "+" : ""}${v.toFixed(2)}%`;
const change = (d: TreeDatum) => d.change;
/** Market caps are in $B. */
const cap = (v: number) => (v >= 1000 ? `$${(v / 1000).toFixed(2)}T` : `$${Math.round(v)}B`);

function datasetFor(kind: DemoProps["dataset"], seed: number): { data: TreeDatum; title: string; description: string; format: Intl.NumberFormatOptions | ((v: number) => string) } {
  if (kind === "budget") return { data: orgBudget(seed), title: "Annual budget", description: "Department, team and line item ($K)", format: { style: "currency", currency: "USD", maximumFractionDigits: 0 } };
  if (kind === "bundle") return { data: bundleTree(seed), title: "Bundle size", description: "app.js by folder, kB gzip", format: { maximumFractionDigits: 1, style: "unit", unit: "kilobyte" } };
  return { data: marketMap(seed), title: "Market map", description: "Market cap, colored by today's change", format: cap };
}

function Preview({ props }: { props: DemoProps }) {
  const [seed, randomize] = useSeed(1);
  const set = useMemo(() => datasetFor(props.dataset, seed), [props.dataset, seed]);
  const diverging = props.color === "diverging" && props.dataset === "market";
  return (
    <ChartDemo
      onRandomize={randomize}
      hint="Hover a cell, click a group to zoom in, Escape or the breadcrumb to go back. Randomize to watch every rectangle re-tile."
    >
      <TreemapChart<TreeDatum>
        data={set.data}
        value="value"
        label="name"
        color={props.color === "diverging" && !diverging ? "value" : props.color}
        colorValue={diverging ? change : undefined}
        formatColorValue={diverging ? signedPct : undefined}
        colorValueLabel="Today"
        tile={props.tile}
        maxDepth={props.maxDepth}
        headers={props.headers}
        padding={props.padding}
        height={props.height}
        format={set.format}
        rootLabel={set.data.name}
        title={set.title}
        description={set.description}
        className="w-full"
      />
    </ChartDemo>
  );
}

function Mini() {
  const data = useMemo(() => marketMap(2), []);
  return (
    <TreemapChart<TreeDatum>
      data={data}
      value="value"
      label="name"
      color="diverging"
      colorValue={change}
      height={130}
      initialWidth={240}
      headers={false}
      breadcrumb={false}
      animation="never"
      className="w-60"
    />
  );
}

function BudgetDrill() {
  const [seed, randomize] = useSeed(4);
  const data = useMemo(() => orgBudget(seed), [seed]);
  const [path, setPath] = useState<string[]>(["Engineering"]);
  return (
    <ChartDemo onRandomize={randomize} hint="Controlled path: the chart opens on Engineering; jump with the buttons or drill on the chart.">
      <div className="flex w-full flex-col gap-3">
        <div className="flex flex-wrap gap-1.5">
          {[[], ["Engineering"], ["Engineering", "Engineering/Product"], ["Sales"], ["Marketing"]].map((p) => (
            <button
              key={p.join(">") || "all"}
              type="button"
              onClick={() => setPath(p)}
              aria-pressed={p.join(">") === path.join(">")}
              className="rounded-pui-md border border-pui-border px-2 py-1 text-xs text-pui-muted-foreground hover:bg-pui-muted aria-pressed:bg-pui-muted aria-pressed:text-pui-foreground"
            >
              {p.length ? (p[p.length - 1] as string).split("/").pop() : "All"}
            </button>
          ))}
        </div>
        <TreemapChart<TreeDatum>
          data={data}
          value="value"
          label="name"
          path={path}
          onPathChange={setPath}
          rootLabel="Budget"
          format={{ style: "currency", currency: "USD", maximumFractionDigits: 0 }}
          height={360}
          tableToggle
          className="w-full"
        />
        <p className="text-xs text-pui-muted-foreground">
          path = <code className="font-mono">{JSON.stringify(path)}</code>
        </p>
      </div>
    </ChartDemo>
  );
}

function StableMarket() {
  const [seed, randomize] = useSeed(9);
  const data = useMemo(() => marketMap(seed), [seed]);
  return (
    <ChartDemo onRandomize={randomize} hint="Binary tiling keeps neighbors in place, so live updates read as growth, not shuffling.">
      <TreemapChart<TreeDatum>
        data={data}
        value="value"
        label="name"
        tile="binary"
        color="diverging"
        colorValue={change}
        formatColorValue={signedPct}
        colorValueLabel="Today"
        maxDepth={1}
        headers={false}
        padding={1}
        height={300}
        format={cap}
        breadcrumb={false}
        className="w-full"
      />
    </ChartDemo>
  );
}

function Bundle() {
  const [seed, randomize] = useSeed(2);
  const data = useMemo(() => bundleTree(seed), [seed]);
  return (
    <ChartDemo onRandomize={randomize} hint="Three levels at once, colored by size on the sequential ramp.">
      <TreemapChart<TreeDatum>
        data={data}
        value="value"
        label="name"
        color="value"
        maxDepth={3}
        height={360}
        rootLabel="app.js"
        format={{ maximumFractionDigits: 1, style: "unit", unit: "kilobyte" }}
        title="What's in the bundle"
        className="w-full"
      />
    </ChartDemo>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (p) =>
    [
      "<TreemapChart",
      "  data={market} // { name, children: [{ name, value, change }] }",
      '  value="value"',
      '  label="name"',
      p.color !== "category" ? `  color="${p.color}"` : null,
      p.color === "diverging" ? "  colorValue={(d) => d.change}" : null,
      p.tile !== "squarify" ? `  tile="${p.tile}"` : null,
      p.maxDepth !== 2 ? `  maxDepth={${p.maxDepth}}` : null,
      p.headers ? null : "  headers={false}",
      p.padding !== 2 ? `  padding={${p.padding}}` : null,
      p.height !== 380 ? `  height={${p.height}}` : null,
      '  title="Market map"',
      "/>",
    ]
      .filter(Boolean)
      .join("\n"),
  propsTable: propDocs<TreemapChartProps<unknown>>()([
    { name: "data", type: "T | T[]", required: true, description: "A nested root (children in d.children), an array of roots, or flat rows with parentId." },
    { name: "value", type: "keyof T | (d) => number", required: true, description: "Leaf size; parents sum their children." },
    { name: "label", type: "keyof T | (d) => string", required: true, description: "Cell name." },
    { name: "getChildren", type: "(d) => T[]", description: "Children of a nested datum. Default d.children." },
    { name: "getId", type: "(d) => string", description: "Stable ids (required for flat rows). Default: the label path." },
    { name: "parentId", type: "(d) => string | null", description: "Flat rows: the parent's id." },
    { name: "color", type: '"category" | "value" | "diverging" | (node) => string', default: '"category"', description: "Palette per top-level group, sequential by value, or diverging around 0." },
    { name: "colorValue", type: "(d) => number", description: "Value for value/diverging color (e.g. % change)." },
    { name: "tile", type: '"squarify" | "binary" | "slice" | "dice" | "sliceDice"', default: '"squarify"', description: "Tiling; binary keeps neighbors stable across updates." },
    { name: "maxDepth", type: "number", default: "2", description: "Levels drawn below the current view." },
    { name: "headers", type: "boolean", default: "true", description: "Group headers with label and value." },
    { name: "path", type: "string[]", description: "Drill path (ids below the root); controlled with onPathChange." },
    { name: "onNodeClick", type: "(node, event) => void", description: "Click or Enter on a cell." },
    { name: "breadcrumb", type: "boolean", default: "true", description: "The drill breadcrumb above the chart." },
  ]),
  keyboard: [
    { keys: "Tab", action: "Focus the treemap" },
    { keys: "Arrow keys", action: "Move to the nearest cell in that direction" },
    { keys: "Home / End", action: "First / last cell" },
    { keys: "Enter / Space", action: "Open the cell's group" },
    { keys: "Escape / Backspace", action: "Up one level" },
    { keys: "T", action: "Show or hide the data table" },
  ],
  a11y: [
    "Every cell is announced with its path, value and shares of the view and its parent.",
    "The breadcrumb is a nav with aria-current on the current level.",
    "An sr-only table lists every visible cell; the summary names the largest groups.",
  ],
  reducedMotion: "Drills and updates jump to the new layout; labels appear without fading.",
  examples: [
    { title: "Controlled drill path", description: "path + onPathChange, jump buttons and a visible data table.", Demo: BudgetDrill, wide: true },
    { title: "Stable market map", description: "Binary tiling, diverging color, one level.", Demo: StableMarket },
    { title: "Bundle explorer", description: "Three levels, sequential color.", Demo: Bundle },
  ],
};
export default item;
