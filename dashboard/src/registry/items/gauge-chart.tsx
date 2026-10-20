import { GaugeChart, type GaugeBand, type GaugeChartProps } from "changelui";
import { useState } from "react";
import { ChartDemo } from "../../components/chart-demo";
import { useSeed } from "../../lib/chart-data";
import { mulberry32 } from "@pui-src/lib/random";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  variant: "arc" | "needle";
  sweep: "240° dial" | "half" | "300° ring";
  thickness: number;
  ticks: boolean;
  bands: boolean;
  target: boolean;
  editable: boolean;
  size: number;
};
const defaults: DemoProps = { variant: "needle", sweep: "240° dial", thickness: 0.14, ticks: true, bands: true, target: true, editable: false, size: 260 };
const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "variant", label: "Variant", options: ["needle", "arc"] },
  { type: "select", prop: "sweep", label: "Sweep", options: ["240° dial", "half", "300° ring"] },
  { type: "number", prop: "thickness", label: "Thickness", min: 0.06, max: 0.3, step: 0.02 },
  { type: "boolean", prop: "ticks", label: "Tick labels" },
  { type: "boolean", prop: "bands", label: "Bands" },
  { type: "boolean", prop: "target", label: "Target marker" },
  { type: "boolean", prop: "editable", label: "Editable (drag / arrows)" },
  { type: "number", prop: "size", label: "Size (px)", min: 160, max: 360, step: 20 },
];
const SWEEPS: Record<DemoProps["sweep"], [number, number]> = { "240° dial": [-120, 120], half: [-90, 90], "300° ring": [-150, 150] };
const health: GaugeBand[] = [
  { to: 60, tone: "success", label: "Healthy" },
  { to: 85, tone: "warning", label: "Busy" },
  { to: 100, tone: "danger", label: "Saturated" },
];

function useValue(seed: number, lo: number, hi: number) {
  const rand = mulberry32(seed * 977 + 13);
  return Math.round(lo + rand() * (hi - lo));
}

function Preview({ props }: { props: DemoProps }) {
  const [seed, randomize] = useSeed(3);
  const generated = useValue(seed, 18, 96);
  const [edited, setEdited] = useState<number | null>(null);
  const value = props.editable && edited !== null ? edited : generated;
  const [start, end] = SWEEPS[props.sweep];
  return (
    <ChartDemo
      onRandomize={() => {
        setEdited(null);
        randomize();
      }}
      hint={props.editable ? "Drag the dial or use the arrow keys (Page Up / Down for big steps)." : "Randomize: the needle swings with a little overshoot. Hover a band for its range."}
    >
      <div className="flex w-full justify-center">
        <GaugeChart
          value={value}
          variant={props.variant}
          startAngle={start}
          endAngle={end}
          thickness={props.thickness}
          ticks={props.ticks}
          bands={props.bands ? health : undefined}
          target={props.target ? 70 : undefined}
          targetLabel="SLO"
          size={props.size}
          label="CPU load"
          format={{ style: "unit", unit: "percent", maximumFractionDigits: 0 }}
          onValueChange={props.editable ? setEdited : undefined}
          title="Cluster CPU"
          className="w-full"
        />
      </div>
    </ChartDemo>
  );
}

function Mini() {
  return <GaugeChart value={68} bands={health} size={130} animation="never" className="w-32" />;
}

function Thermostat() {
  const [temp, setTemp] = useState(21.5);
  return (
    <div className="flex w-full flex-col items-center gap-2">
      <GaugeChart
        value={temp}
        min={10}
        max={30}
        step={0.5}
        startAngle={-135}
        endAngle={135}
        thickness={0.2}
        bands={[
          { to: 18, color: "var(--pui-chart-6)", label: "Cool" },
          { to: 24, color: "var(--pui-chart-7)", label: "Comfort" },
          { to: 30, color: "var(--pui-chart-4)", label: "Warm" },
        ]}
        format={{ style: "unit", unit: "celsius", maximumFractionDigits: 1 }}
        onValueChange={setTemp}
        gaugeLabel="Living room temperature"
        size={220}
      />
      <p className="text-xs text-pui-muted-foreground" aria-live="polite">
        Heating to {temp.toFixed(1)} °C
      </p>
    </div>
  );
}

function Trio() {
  const [seed, randomize] = useSeed(9);
  const a = useValue(seed, 40, 99);
  const b = useValue(seed + 1, 10, 95);
  const c = useValue(seed + 2, 60, 100);
  return (
    <ChartDemo onRandomize={randomize} hint="Half gauges in a row: arc color follows the band of the value.">
      <div className="grid w-full grid-cols-3 gap-2">
        <GaugeChart value={a} bands={health} startAngle={-90} endAngle={90} size={150} label="CPU" />
        <GaugeChart value={b} bands={health} startAngle={-90} endAngle={90} size={150} label="Memory" />
        <GaugeChart
          value={c}
          startAngle={-90}
          endAngle={90}
          size={150}
          label="Uptime"
          target={99}
          bands={[
            { to: 95, tone: "danger", label: "Breach" },
            { to: 99, tone: "warning", label: "At risk" },
            { to: 100, tone: "success", label: "Within SLO" },
          ]}
          format={{ maximumFractionDigits: 0 }}
        />
      </div>
    </ChartDemo>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (p) => {
    const [s, e] = SWEEPS[p.sweep];
    return [
      "<GaugeChart",
      "  value={cpu}",
      p.variant !== "arc" ? `  variant="${p.variant}"` : null,
      s !== -120 ? `  startAngle={${s}}\n  endAngle={${e}}` : null,
      p.bands ? '  bands={[\n    { to: 60, tone: "success", label: "Healthy" },\n    { to: 85, tone: "warning", label: "Busy" },\n    { to: 100, tone: "danger", label: "Saturated" },\n  ]}' : null,
      p.target ? "  target={70}" : null,
      p.ticks !== (p.variant === "needle") ? `  ticks={${p.ticks}}` : null,
      p.editable ? "  onValueChange={setCpu}" : null,
      '  label="CPU load"',
      "/>",
    ]
      .filter(Boolean)
      .join("\n");
  },
  propsTable: propDocs<GaugeChartProps>()([
    { name: "value", type: "number", required: true, description: "Clamped to min..max." },
    { name: "min", type: "number", default: "0", description: "Scale start." },
    { name: "max", type: "number", default: "100", description: "Scale end." },
    { name: "bands", type: "GaugeBand[]", description: "{ to, tone?, color?, label? } ascending; the arc takes the color of the value's band." },
    { name: "variant", type: '"arc" | "needle"', default: '"arc"', description: "Progress ring with a glowing knob, or a dial with an underdamped needle." },
    { name: "startAngle", type: "number", default: "-120", description: "Degrees, 0 = 12 o'clock." },
    { name: "endAngle", type: "number", default: "120", description: "Degrees; -90 / 90 makes a half gauge." },
    { name: "thickness", type: "number", default: "0.16 (needle 0.12)", description: "Ring thickness as a fraction of the radius." },
    { name: "ticks", type: "boolean | number", default: "needle: true", description: "Tick labels (a count picks nice values)." },
    { name: "target", type: "number", description: "A marker on the scale, with an over / to-go caption." },
    { name: "onValueChange", type: "(value) => void", description: "Makes it a dial slider: drag, arrows, Page Up/Down, Home/End." },
    { name: "step", type: "number", default: "(max - min) / 100", description: "Keyboard and drag step." },
    { name: "format", type: "Intl.NumberFormatOptions", description: "Value and tick format." },
    { name: "size", type: "number", default: "240", description: "Width in px; scales down with the container." },
    { name: "formatValueText", type: "(value, band) => string", description: 'aria-valuetext. Default "62, Healthy".' },
  ]),
  keyboard: [
    { keys: "← / ↓, → / ↑", action: "Editable only: one step down / up" },
    { keys: "Page Up / Page Down", action: "Ten steps" },
    { keys: "Home / End", action: "Min / max" },
  ],
  a11y: [
    'role="meter" with aria-valuemin/max/now and a value text that includes the band label; role="slider" when editable.',
    "The band label sits next to the value in text, so color is not the only cue.",
  ],
  reducedMotion: "No needle swing or arc sweep: the gauge shows the final value at once.",
  examples: [
    { title: "Thermostat dial", description: "Editable: drag around the ring or use the keys.", Demo: Thermostat },
    { title: "Half gauges", description: "Three compact arcs with band-colored progress and a target.", Demo: Trio },
  ],
};
export default item;
