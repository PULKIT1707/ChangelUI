import { ParallelCoordinates, type ParallelBrushes, type ParallelCoordinatesProps, type ParallelDimension } from "changelui";
import { useMemo, useState } from "react";
import { ChartDemo } from "../../components/chart-demo";
import { cityLife, laptops, useSeed, type CityRow, type LaptopRow } from "../../lib/chart-data";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = { rows: number; curve: "smooth" | "linear"; histograms: boolean; colorBy: "brand" | "price" | "none"; height: number };
const defaults: DemoProps = { rows: 160, curve: "smooth", histograms: true, colorBy: "brand", height: 380 };
const controls: ControlSpec<DemoProps>[] = [
  { type: "number", prop: "rows", label: "Rows", min: 20, max: 400, step: 20 },
  { type: "select", prop: "curve", label: "Curve", options: ["smooth", "linear"] },
  { type: "select", prop: "colorBy", label: "Color", options: ["brand", "price", "none"] },
  { type: "boolean", prop: "histograms", label: "Histograms" },
  { type: "number", prop: "height", label: "Height", min: 260, max: 520, step: 20 },
];

const usd = { style: "currency", currency: "USD", maximumFractionDigits: 0 } as const;
const LAPTOP_DIMS: ParallelDimension<LaptopRow>[] = [
  { key: "price", label: "Price", format: usd },
  { key: "performance", label: "Performance" },
  { key: "battery", label: "Battery (h)" },
  { key: "weight", label: "Weight (kg)", reverse: true, format: { maximumFractionDigits: 2 } },
  { key: "screen", label: "Screen (in)", format: { maximumFractionDigits: 1 } },
  { key: "rating", label: "Rating", format: { maximumFractionDigits: 1 } },
];

function Preview({ props }: { props: DemoProps }) {
  const [seed, randomize] = useSeed(1);
  const data = useMemo(() => laptops(seed, props.rows), [seed, props.rows]);
  const [matching, setMatching] = useState<number | null>(null);
  return (
    <ChartDemo onRandomize={randomize} hint="Drag along an axis to filter, drag a title to reorder, double-click a title to flip it.">
      <ParallelCoordinates
        data={data}
        dimensions={LAPTOP_DIMS}
        label="model"
        colorBy={props.colorBy === "brand" ? "brand" : props.colorBy === "price" ? { dimension: "price" } : undefined}
        defaultBrushes={{ battery: [9, 16] }}
        onBrushChange={(_, rows) => setMatching(rows.length)}
        curve={props.curve}
        histograms={props.histograms}
        height={props.height}
        title="Find a laptop"
        description="Weight is flipped so lighter is higher"
        className="w-full"
      />
      <p className="text-xs text-pui-muted-foreground" aria-live="polite">
        {matching === null ? "Brushes combine with AND; legend chips hide brands." : `${matching} laptops match.`}
      </p>
    </ChartDemo>
  );
}

function Mini() {
  const data = useMemo(() => laptops(3, 50), []);
  return <ParallelCoordinates data={data} dimensions={LAPTOP_DIMS.slice(0, 4)} colorBy="brand" histograms={false} height={130} initialWidth={240} animation="never" className="w-60 [&_button]:hidden [&_text]:hidden" />;
}

const CITY_DIMS: ParallelDimension<CityRow>[] = [
  { key: "rent", label: "Rent", format: usd, reverse: true },
  { key: "salary", label: "Salary (k)", format: { maximumFractionDigits: 0 } },
  { key: "commute", label: "Commute (min)", reverse: true },
  { key: "sunshine", label: "Sun (h/yr)", format: { notation: "compact" } },
  { key: "safety", label: "Safety" },
];

function Controlled() {
  const [seed, randomize] = useSeed(2);
  const data = useMemo(() => cityLife(seed), [seed]);
  const [brushes, setBrushes] = useState<ParallelBrushes>({});
  const picks = data
    .filter((row) => Object.entries(brushes).every(([k, [lo, hi]]) => (row[k as keyof CityRow] as number) >= lo && (row[k as keyof CityRow] as number) <= hi))
    .map((r) => r.city);
  return (
    <ChartDemo onRandomize={randomize} hint="Controlled brushes; presets set them, the list shows the matching rows.">
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["Cheap + sunny", { rent: [700, 1600], sunshine: [2400, 3100] }],
            ["Short commute", { commute: [18, 30] }],
            ["Clear", {}],
          ] as const
        ).map(([name, b]) => (
          <button key={name} type="button" onClick={() => setBrushes(b as ParallelBrushes)} className="rounded-pui-md border border-pui-border px-2.5 py-1 text-xs hover:bg-pui-muted">
            {name}
          </button>
        ))}
      </div>
      <ParallelCoordinates
        data={data}
        dimensions={CITY_DIMS}
        label="city"
        colorBy="region"
        brushes={brushes}
        onBrushChange={setBrushes}
        height={320}
        className="w-full"
      />
      <p className="text-sm" aria-live="polite">
        {picks.length && Object.keys(brushes).length ? picks.join(", ") : "Brush an axis to shortlist cities"}
      </p>
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
      "<ParallelCoordinates",
      "  data={laptops}",
      "  dimensions={[",
      '    { key: "price", label: "Price", format: { style: "currency", currency: "USD" } },',
      '    { key: "battery", label: "Battery (h)" },',
      '    { key: "weight", label: "Weight (kg)", reverse: true },',
      "  ]}",
      '  label="model"',
      p.colorBy === "brand" ? '  colorBy="brand"' : p.colorBy === "price" ? '  colorBy={{ dimension: "price" }}' : null,
      "  onBrushChange={(brushes, rows) => setShortlist(rows)}",
      p.curve !== "smooth" ? `  curve="${p.curve}"` : null,
      p.histograms ? null : "  histograms={false}",
      p.height !== 380 ? `  height={${p.height}}` : null,
      "/>",
    ]
      .filter(Boolean)
      .join("\n"),
  propsTable: propDocs<ParallelCoordinatesProps<unknown>>()([
    { name: "data", type: "readonly T[]", required: true, description: "One polyline per row." },
    { name: "dimensions", type: "ParallelDimension<T>[]", required: true, description: "{ key, label?, value?, format?, domain?, reverse? } per axis." },
    { name: "label", type: "keyof T | (row, i) => string", description: "Row name in the tooltip and table." },
    { name: "colorBy", type: "keyof T | fn | { dimension }", description: "Category (palette + toggle chips) or a dimension (sequential ramp)." },
    { name: "brushes", type: "Record<key, [lo, hi]>", description: "Controlled brushes (defaultBrushes for uncontrolled). AND across axes." },
    { name: "onBrushChange", type: "(brushes, matching) => void", description: "New brushes and the matching rows." },
    { name: "order", type: "string[]", description: "Controlled axis order (defaultOrder / onOrderChange); drag titles to reorder." },
    { name: "curve", type: '"smooth" | "linear"', default: '"smooth"', description: "Line shape between axes." },
    { name: "histograms", type: "boolean", default: "true", description: "Live histogram of the matching rows on every axis." },
    { name: "height", type: "number", default: "380", description: "Chart height in px." },
    { name: "onRowClick", type: "(row, index, event) => void", description: "Click the hovered line." },
  ]),
  keyboard: [
    { keys: "Tab", action: "Focus the chart" },
    { keys: "← / →", action: "Pick an axis (announces its filter)" },
    { keys: "↑ / ↓", action: "Create or move the axis filter (announces the matching count)" },
    { keys: "Shift + ↑ / ↓", action: "Widen / narrow the filter" },
    { keys: "Delete", action: "Clear the axis filter" },
    { keys: "Escape", action: "Clear all filters" },
    { keys: "Alt + ← / →", action: "Move the axis left / right" },
    { keys: "R", action: "Flip the axis" },
    { keys: "T", action: "Show or hide the table of matching rows" },
  ],
  a11y: [
    "Every brush change is announced with the axis range and the number of matching rows.",
    "Category chips are toggle buttons; the table lists the matching rows with every measure.",
  ],
  reducedMotion: "Lines appear without drawing in; reorders and filters apply instantly.",
  examples: [{ title: "Controlled brushes", description: "Presets drive the filter, the list shows the result.", Demo: Controlled, wide: true }],
};
export default item;
