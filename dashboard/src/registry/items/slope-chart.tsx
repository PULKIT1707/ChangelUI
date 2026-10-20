import { SlopeChart, type SlopeChartProps } from "changelui";
import { useMemo, useState } from "react";
import { ChartDemo } from "../../components/chart-demo";
import { cityRents, npsShift, useSeed } from "../../lib/chart-data";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  colorBy: "direction" | "category" | "none";
  showValues: boolean;
  showAverage: boolean;
  colorblind: boolean;
};
const defaults: DemoProps = { colorBy: "direction", showValues: true, showAverage: true, colorblind: false };
const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "colorBy", label: "Color by", options: ["direction", "category", "none"] },
  { type: "boolean", prop: "showValues", label: "Values" },
  { type: "boolean", prop: "showAverage", label: "Average slope" },
  { type: "boolean", prop: "colorblind", label: "Colorblind colors" },
];

function Preview({ props }: { props: DemoProps }) {
  const [seed, randomize] = useSeed(3);
  const data = useMemo(() => npsShift(seed), [seed]);
  return (
    <ChartDemo onRandomize={randomize} hint="Hover a line or a label; click to pin. The chips filter rises and falls. Arrows walk items; Enter pins.">
      <SlopeChart
        data={data}
        label="area"
        from="before"
        to="after"
        labels={{ from: "Before redesign", to: "After" }}
        colorBy={props.colorBy}
        showValues={props.showValues}
        showAverage={props.showAverage}
        colorblind={props.colorblind}
        format={{ maximumFractionDigits: 0 }}
        title="NPS by product area"
        description="Labels never collide; leader ticks show where one moved"
        height={380}
        className="w-full"
      />
    </ChartDemo>
  );
}

function Mini() {
  const data = useMemo(() => npsShift(2).slice(0, 6), []);
  return <SlopeChart data={data} label="area" from="before" to="after" showValues={false} height={110} initialWidth={220} animation="never" className="w-56 [&_text]:hidden [&_[role=group]]:hidden" />;
}

function Rents() {
  const [seed, randomize] = useSeed(8);
  const data = useMemo(() => cityRents(seed), [seed]);
  const [pinned, setPinned] = useState<string[]>(["Austin"]);
  return (
    <ChartDemo onRandomize={randomize} hint="Currency format, controlled pins and a visible data table.">
      <SlopeChart
        data={data}
        label="city"
        from="y2020"
        to="y2025"
        labels={{ from: "2020", to: "2025" }}
        pinned={pinned}
        onPinnedChange={setPinned}
        format={{ style: "currency", currency: "USD", maximumFractionDigits: 0 }}
        title="Median rent, 2020 vs 2025"
        height={420}
        tableToggle
        className="w-full"
      />
      <p className="text-xs text-pui-muted-foreground" aria-live="polite">
        Pinned: {pinned.length ? pinned.join(", ") : "none"}
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
      "<SlopeChart",
      "  data={areas} // [{ area, before, after }]",
      '  label="area"',
      '  from="before"',
      '  to="after"',
      '  labels={{ from: "Before", to: "After" }}',
      p.colorBy !== "direction" ? `  colorBy="${p.colorBy}"` : null,
      p.showValues ? null : "  showValues={false}",
      p.showAverage ? "  showAverage" : null,
      p.colorblind ? "  colorblind" : null,
      "/>",
    ]
      .filter(Boolean)
      .join("\n"),
  propsTable: propDocs<SlopeChartProps<unknown>>()([
    { name: "data", type: "readonly T[]", description: "One row per item." },
    { name: "label", type: "keyof T | (row, i) => string", description: "Item name." },
    { name: "from", type: "keyof T | (row, i) => number", description: "Value at the first time point." },
    { name: "to", type: "keyof T | (row, i) => number", description: "Value at the second time point." },
    { name: "labels", type: "{ from?, to? }", default: '"Before" / "After"', description: "Column headers." },
    { name: "colorBy", type: '"direction" | "category" | "none"', default: '"direction"', description: "Rise/fall colors, palette, or one color." },
    { name: "flatThreshold", type: "number", default: "0.005", description: "Relative change treated as flat." },
    { name: "showValues", type: "boolean", default: "true", description: "Values next to the labels." },
    { name: "showAverage", type: "boolean", default: "false", description: "A dashed average slope." },
    { name: "colorblind", type: "boolean", default: "false", description: "Blue / amber instead of green / red." },
    { name: "pinned", type: "string[]", description: "Controlled pinned items (with onPinnedChange)." },
  ]),
  keyboard: [
    { keys: "Tab", action: "Focus the plot" },
    { keys: "↑ / ↓ (or ← / →)", action: "Previous / next item by the second value" },
    { keys: "Home / End", action: "Highest / lowest item" },
    { keys: "Enter / Space", action: "Pin or unpin the focused line" },
    { keys: "Escape", action: "Clear the focus, then the pins" },
    { keys: "T", action: "Show or hide the data table" },
  ],
  a11y: [
    'Announcements read like "Search: 32 to 48, +50%. Rank 2 of 10 by After."',
    "The summary counts rises and falls and names the biggest of each.",
    "Direction chips are aria-pressed filters with counts; values are printed, so color is not the only key.",
  ],
  reducedMotion: "Lines appear in place; updates are instant.",
  examples: [{ title: "Rents", description: "Twelve cities with currency labels and controlled pins.", Demo: Rents, wide: true }],
};
export default item;
