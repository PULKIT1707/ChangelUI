import { WaffleChart, type WaffleChartProps, type WaffleDatum } from "changelui";
import { mulberry32 } from "@pui-src/lib/random";
import { useState } from "react";
import { ChartDemo } from "../../components/chart-demo";
import { useSeed } from "../../lib/chart-data";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  grid: "10 × 10" | "5 × 20" | "20 × 20";
  shape: "square" | "circle" | "icon";
  fillOrder: "row" | "column";
  gap: number;
  readout: boolean;
  legend: boolean;
  unit: string;
};
const defaults: DemoProps = { grid: "10 × 10", shape: "square", fillOrder: "row", gap: 3, readout: true, legend: true, unit: "visitors" };
const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "grid", label: "Grid (rows × columns)", options: ["10 × 10", "5 × 20", "20 × 20"] },
  { type: "select", prop: "shape", label: "Shape", options: ["square", "circle", "icon"] },
  { type: "select", prop: "fillOrder", label: "Fill order", options: ["row", "column"] },
  { type: "number", prop: "gap", label: "Gap (px)", min: 1, max: 8, step: 1 },
  { type: "boolean", prop: "readout", label: '"3 in 10" readout' },
  { type: "boolean", prop: "legend", label: "Legend" },
  { type: "text", prop: "unit", label: "Unit noun", maxLength: 24 },
];
const GRIDS: Record<DemoProps["grid"], [number, number]> = { "10 × 10": [10, 10], "5 × 20": [5, 20], "20 × 20": [20, 20] };

function PersonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="6.5" r="4" />
      <path d="M4 21.5c0-4.6 3.6-8 8-8s8 3.4 8 8z" />
    </svg>
  );
}

function devices(seed: number): WaffleDatum[] {
  const rand = mulberry32(seed * 7919 + 3);
  const mobile = 46 + rand() * 18;
  const desktop = 24 + rand() * 14;
  const tablet = 4 + rand() * 6;
  const other = 1 + rand() * 3;
  return [
    { label: "Mobile", value: Math.round(mobile * 120) },
    { label: "Desktop", value: Math.round(desktop * 120) },
    { label: "Tablet", value: Math.round(tablet * 120) },
    { label: "Smart TV", value: Math.round(other * 120) },
  ];
}

function Preview({ props }: { props: DemoProps }) {
  const [seed, randomize] = useSeed(2);
  const [rows, columns] = GRIDS[props.grid];
  return (
    <ChartDemo onRandomize={randomize} hint="Hover a unit or a chip to spotlight it; click a chip to pin it. Randomize recolors the units in a wave.">
      <div className="mx-auto w-full max-w-sm">
        <WaffleChart
          title="Visitors by device"
          description="Last 30 days"
          data={devices(seed)}
          rows={rows}
          columns={columns}
          shape={props.shape === "icon" ? <PersonIcon /> : props.shape}
          fillOrder={props.fillOrder}
          gap={props.gap}
          readout={props.readout}
          legend={props.legend}
          unit={props.unit || undefined}
        />
      </div>
    </ChartDemo>
  );
}

function Mini() {
  return (
    <WaffleChart
      data={[
        { label: "Yes", value: 62 },
        { label: "No", value: 38 },
      ]}
      readout={false}
      legend={false}
      gap={2}
      animation="never"
      className="w-28"
    />
  );
}

function Survey() {
  const [active, setActive] = useState<string | null>("Skipped the tour");
  return (
    <WaffleChart
      title="Who skips onboarding?"
      description="Share of new sign-ups in March"
      rows={2}
      columns={10}
      gap={6}
      unit="new users"
      shape={<PersonIcon />}
      data={[
        { label: "Skipped the tour", value: 6, color: "var(--pui-chart-4)" },
        { label: "Finished it", value: 14, color: "var(--pui-chart-2)" },
      ]}
      active={active}
      onActiveChange={setActive}
    />
  );
}

function Storage() {
  const [active, setActive] = useState<string | null>(null);
  const data: WaffleDatum[] = [
    { label: "Photos", value: 74 },
    { label: "Videos", value: 52 },
    { label: "Documents", value: 18 },
    { label: "Backups", value: 21 },
  ];
  const used = data.reduce((a, d) => a + d.value, 0);
  return (
    <div className="flex w-full flex-col gap-2">
      <WaffleChart
        title="Cloud storage"
        description={`${used} of 200 GB used, 1 square = 2 GB`}
        data={data}
        total={200}
        rows={5}
        columns={20}
        gap={2}
        fillOrder="column"
        format={{ style: "unit", unit: "gigabyte", maximumFractionDigits: 0 }}
        active={active}
        onActiveChange={setActive}
      />
      <p className="text-xs text-pui-muted-foreground" aria-live="polite">
        {active ? `Pinned: ${active}. Click the chip again to unpin.` : "Grey squares are free space. Pin a category to review it."}
      </p>
    </div>
  );
}

function Seats() {
  return (
    <WaffleChart
      className="mx-auto max-w-lg"
      title="Council seats"
      description="Filled by column, like a hemicycle read left to right"
      rows={6}
      columns={15}
      shape="circle"
      fillOrder="column"
      gap={4}
      unit="seats"
      data={[
        { label: "Green", value: 31, color: "var(--pui-chart-7)" },
        { label: "Labour", value: 27, color: "var(--pui-chart-4)" },
        { label: "Liberal", value: 18, color: "var(--pui-chart-3)" },
        { label: "Independent", value: 14, color: "var(--pui-chart-8)" },
      ]}
    />
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (p) => {
    const [rows, columns] = GRIDS[p.grid];
    return [
      "<WaffleChart",
      '  title="Visitors by device"',
      "  data={[",
      '    { label: "Mobile", value: 6840 },',
      '    { label: "Desktop", value: 3600 },',
      '    { label: "Tablet", value: 840 },',
      "  ]}",
      rows !== 10 ? `  rows={${rows}}` : null,
      columns !== 10 ? `  columns={${columns}}` : null,
      p.shape === "icon" ? "  shape={<PersonIcon />}" : p.shape !== "square" ? `  shape="${p.shape}"` : null,
      p.fillOrder !== "row" ? `  fillOrder="${p.fillOrder}"` : null,
      p.gap !== 3 ? `  gap={${p.gap}}` : null,
      !p.readout ? "  readout={false}" : null,
      !p.legend ? "  legend={false}" : null,
      p.unit ? `  unit="${p.unit}"` : null,
      "/>",
    ]
      .filter(Boolean)
      .join("\n");
  },
  propsTable: propDocs<WaffleChartProps>()([
    { name: "data", type: "WaffleDatum[]", required: true, description: "{ label, value, key?, color? } in fill order." },
    { name: "rows", type: "number", default: "10", description: "Grid rows." },
    { name: "columns", type: "number", default: "10", description: "Grid columns." },
    { name: "total", type: "number", default: "sum of values", description: "The whole; a larger total leaves empty (muted) units." },
    { name: "shape", type: '"square" | "circle" | ReactElement', default: '"square"', description: "Unit shape, or an icon colored through currentColor." },
    { name: "fillOrder", type: '"row" | "column"', default: '"row"', description: "Fill across rows or down columns." },
    { name: "gap", type: "number", default: "3", description: "Gap between units in px." },
    { name: "unit", type: "string", description: 'Plural noun for the readout: "3 in 10 people".' },
    { name: "readout", type: "boolean", default: "true", description: "Big ratio readout for the spotlighted (or largest) category." },
    { name: "legend", type: "boolean", default: "true", description: "Chips that spotlight on hover/focus and pin on click." },
    { name: "active", type: "string | null", description: "Controlled pinned category (key or label)." },
    { name: "onActiveChange", type: "(key) => void", description: "Called when a chip pins or unpins." },
    { name: "format", type: "Intl.NumberFormatOptions | (v) => string", description: "Value format in the readout, chips and table." },
  ]),
  keyboard: [
    { keys: "Tab", action: "Move between the legend chips (focus spotlights the category)" },
    { keys: "Enter / Space", action: "Pin or unpin the focused category" },
  ],
  a11y: [
    'figure with aria-roledescription="chart", a summary of every share and an sr-only data table.',
    "Units are split with the largest-remainder method, so the counts in the text always add up to the grid.",
    "Legend chips are toggle buttons (aria-pressed) named with the value and the ratio.",
  ],
  reducedMotion: "No pop-in or recolor wave: units render in their final colors.",
  examples: [
    { title: "Icon units", description: "Two rows of people with a pinned category: reads as “3 in 10 new users”.", Demo: Survey },
    { title: "Quota with free space", description: "A total larger than the sum leaves muted units; controlled pinning.", Demo: Storage },
    { title: "Seats by column", description: "Circles filled down columns.", Demo: Seats, wide: true },
  ],
};
export default item;
