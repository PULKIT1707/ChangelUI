import { Button, LiquidGauge, type LiquidGaugeProps } from "changelui";
import { useState } from "react";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  value: number;
  shape: "circle" | "square";
  display: "percent" | "value";
  waves: "1" | "2";
  waveAmplitude: number;
  waveSpeed: number;
  bubbles: boolean;
  size: number;
};
const defaults: DemoProps = { value: 64, shape: "circle", display: "percent", waves: "2", waveAmplitude: 4, waveSpeed: 3, bubbles: true, size: 260 };
const controls: ControlSpec<DemoProps>[] = [
  { type: "number", prop: "value", label: "Value (GB of 256)", min: 0, max: 256, step: 4 },
  { type: "select", prop: "shape", label: "Shape", options: ["circle", "square"] },
  { type: "select", prop: "display", label: "Readout", options: ["percent", "value"] },
  { type: "select", prop: "waves", label: "Waves", options: ["1", "2"] },
  { type: "number", prop: "waveAmplitude", label: "Wave height", min: 0, max: 10, step: 1 },
  { type: "number", prop: "waveSpeed", label: "Seconds per wave", min: 1, max: 8, step: 0.5 },
  { type: "boolean", prop: "bubbles", label: "Bubbles" },
  { type: "number", prop: "size", label: "Size (px)", min: 120, max: 320, step: 10 },
];

function Preview({ props }: { props: DemoProps }) {
  return (
    <div className="flex w-full flex-col items-center gap-3">
      <p className="pe-8 text-xs text-pui-muted-foreground">Change the value to watch the level settle and slosh. The text inverts under the liquid.</p>
      <LiquidGauge
        value={props.value}
        max={256}
        shape={props.shape}
        display={props.display}
        waves={props.waves === "1" ? 1 : 2}
        waveAmplitude={props.waveAmplitude}
        waveSpeed={props.waveSpeed}
        bubbles={props.bubbles}
        size={props.size}
        label="Storage used"
        format={{ style: "unit", unit: "gigabyte", maximumFractionDigits: 0 }}
      />
      <dl className="grid w-full max-w-xs grid-cols-3 gap-2 text-center text-xs">
        {[
          ["Used", `${props.value} GB`],
          ["Free", `${256 - props.value} GB`],
          ["Plan", "256 GB"],
        ].map(([k, v]) => (
          <div key={k} className="rounded-pui-md border border-pui-border px-2 py-1.5">
            <dt className="text-pui-muted-foreground">{k}</dt>
            <dd className="font-semibold tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Mini() {
  return <LiquidGauge value={62} size={96} animation="never" />;
}

function Hydration() {
  const [ml, setMl] = useState(1250);
  const goal = 2500;
  return (
    <div className="flex w-full flex-col items-center gap-3">
      <LiquidGauge value={ml} max={goal} shape="square" size={170} label="Water today" color="var(--pui-chart-6)" format={{ style: "unit", unit: "milliliter", maximumFractionDigits: 0 }} gaugeLabel="Water intake" />
      <div className="flex gap-2">
        <Button size="sm" variant="outline" tone="neutral" onClick={() => setMl((v) => Math.max(0, v - 250))}>
          Undo glass
        </Button>
        <Button size="sm" onClick={() => setMl((v) => Math.min(goal, v + 250))}>
          Add a glass
        </Button>
      </div>
      <p className="text-xs text-pui-muted-foreground" aria-live="polite">
        {ml >= goal ? "Goal reached for today." : `${goal - ml} ml to go`}
      </p>
    </div>
  );
}

function Fundraiser() {
  return (
    <LiquidGauge
      value={38_400}
      max={50_000}
      display="value"
      size={180}
      label="of $50k raised"
      color="var(--pui-chart-7)"
      format={{ style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 }}
      gaugeLabel="Fundraising progress"
      bubbles
    />
  );
}

function Battery() {
  const levels = [14, 46, 88];
  const tone = (r: number) => (r < 0.2 ? "var(--pui-danger)" : r < 0.5 ? "var(--pui-warning)" : "var(--pui-success)");
  return (
    <div className="grid w-full grid-cols-3 gap-3">
      {levels.map((l, i) => (
        <div key={l} className="flex flex-col items-center gap-1">
          <LiquidGauge value={l} size={120} color={tone} waves={1} waveAmplitude={3} gaugeLabel={`Device ${i + 1} battery`} />
          <span className="text-xs text-pui-muted-foreground">{["Headphones", "Tablet", "Watch"][i]}</span>
        </div>
      ))}
    </div>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (p) =>
    [
      "<LiquidGauge",
      `  value={${p.value}}`,
      "  max={256}",
      '  label="Storage used"',
      p.shape !== "circle" ? `  shape="${p.shape}"` : null,
      p.display !== "percent" ? `  display="${p.display}"` : null,
      p.waves !== "2" ? "  waves={1}" : null,
      p.waveAmplitude !== 4 ? `  waveAmplitude={${p.waveAmplitude}}` : null,
      p.waveSpeed !== 3 ? `  waveSpeed={${p.waveSpeed}}` : null,
      p.bubbles ? "  bubbles" : null,
      p.size !== 180 ? `  size={${p.size}}` : null,
      "/>",
    ]
      .filter(Boolean)
      .join("\n"),
  propsTable: propDocs<LiquidGaugeProps>()([
    { name: "value", type: "number", required: true, description: "Clamped to min..max." },
    { name: "min", type: "number", default: "0", description: "Empty level." },
    { name: "max", type: "number", default: "100", description: "Full level." },
    { name: "display", type: '"percent" | "value"', default: '"percent"', description: "Readout in the middle." },
    { name: "label", type: "string", description: "Caption under the readout (also the accessible name)." },
    { name: "color", type: "string | (ratio) => string", default: "chart-1", description: "Liquid color, or a function of the fill ratio (red when low)." },
    { name: "shape", type: '"circle" | "square"', default: '"circle"', description: "Round or rounded-square tank." },
    { name: "size", type: "number", default: "180", description: "Width in px; scales down with the container." },
    { name: "waveAmplitude", type: "number", default: "4", description: "Wave height in viewBox units (tank = 100)." },
    { name: "waveSpeed", type: "number", default: "3", description: "Seconds per wave cycle." },
    { name: "waves", type: "1 | 2", default: "2", description: "One wave, or two offset waves for depth." },
    { name: "bubbles", type: "boolean", default: "false", description: "Tiny bubbles rising through the liquid." },
    { name: "format", type: "Intl.NumberFormatOptions | (v) => string", description: "Value format (readout, hover card, value text)." },
    { name: "formatValueText", type: "(value, ratio) => string", description: 'aria-valuetext. Default "62 of 100 (62%)".' },
  ]),
  a11y: ['role="meter" with min, max, now and a value text that includes the share.', "The readout is real text in both colors, so it stays legible over the liquid and the empty tank."],
  reducedMotion: "Flat, still surface: no wave loop, no slosh, no bubbles. The level jumps to the value.",
  examples: [
    { title: "Water intake", description: "Square tank; each glass sloshes the level.", Demo: Hydration },
    { title: "Fundraising goal", description: "Value readout with compact currency and bubbles.", Demo: Fundraiser },
    { title: "Color by level", description: "color as a function: red under 20%, amber under 50%.", Demo: Battery, wide: true },
  ],
};
export default item;
