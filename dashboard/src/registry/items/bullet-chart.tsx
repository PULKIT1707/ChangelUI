import { BulletChart, type BulletChartProps } from "changelui";
import { mulberry32 } from "@pui-src/lib/random";
import { ChartDemo } from "../../components/chart-demo";
import { useSeed } from "../../lib/chart-data";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  orientation: "horizontal" | "vertical";
  bands: boolean;
  target: boolean;
  previous: boolean;
  ticks: boolean;
  toneByTarget: boolean;
  size: number;
};
const defaults: DemoProps = { orientation: "horizontal", bands: true, target: true, previous: true, ticks: true, toneByTarget: false, size: 22 };
const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "orientation", label: "Orientation", options: ["horizontal", "vertical"] },
  { type: "boolean", prop: "bands", label: "Qualitative bands" },
  { type: "boolean", prop: "target", label: "Target tick" },
  { type: "boolean", prop: "previous", label: "Previous period ghost" },
  { type: "boolean", prop: "ticks", label: "Axis ticks" },
  { type: "boolean", prop: "toneByTarget", label: "Color by target" },
  { type: "number", prop: "size", label: "Thickness (px)", min: 12, max: 36, step: 2 },
];

interface Kpi {
  label: string;
  sublabel: string;
  value: number;
  target: number;
  previous: number;
  bands: number[];
  format?: Intl.NumberFormatOptions;
}

function kpis(seed: number): Kpi[] {
  const rand = mulberry32(seed * 4093 + 11);
  const around = (base: number, spread: number) => Math.round(base * (1 - spread + rand() * spread * 2));
  return [
    { label: "Revenue", sublabel: "USD, thousands", value: around(268, 0.18), target: 250, previous: around(231, 0.08), bands: [150, 225, 300] },
    { label: "Profit", sublabel: "%", value: around(21, 0.3), target: 26, previous: around(19, 0.1), bands: [20, 25, 30], format: { maximumFractionDigits: 0 } },
    { label: "Avg order", sublabel: "USD", value: around(318, 0.15), target: 350, previous: around(305, 0.06), bands: [350, 500, 600], format: { style: "currency", currency: "USD", maximumFractionDigits: 0 } },
    { label: "New customers", sublabel: "count", value: around(1640, 0.2), target: 1750, previous: around(1480, 0.08), bands: [1400, 2000, 2500] },
    { label: "Satisfaction", sublabel: "top score 5", value: Math.round((3.6 + rand() * 1.1) * 10) / 10, target: 4.4, previous: 4.1, bands: [3.5, 4.25, 5], format: { maximumFractionDigits: 1 } },
  ];
}

function Preview({ props }: { props: DemoProps }) {
  const [seed, randomize] = useSeed(4);
  const vertical = props.orientation === "vertical";
  return (
    <ChartDemo onRandomize={randomize} hint="Hover a row for value, target and gap. The hollow dot is last quarter.">
      <div className={vertical ? "flex w-full flex-wrap items-end justify-center gap-6" : "flex w-full flex-col gap-4"}>
        {kpis(seed).map((k) => (
          <BulletChart
            key={k.label}
            label={k.label}
            sublabel={k.sublabel}
            value={k.value}
            target={props.target ? k.target : undefined}
            previous={props.previous ? k.previous : undefined}
            bands={props.bands ? k.bands : undefined}
            max={k.bands[k.bands.length - 1]}
            format={k.format}
            orientation={props.orientation}
            ticks={props.ticks}
            toneByTarget={props.toneByTarget}
            size={props.size}
            labelWidth={116}
            height={190}
          />
        ))}
      </div>
    </ChartDemo>
  );
}

function Mini() {
  return (
    <div className="flex w-40 flex-col gap-2">
      <BulletChart value={72} target={80} bands={[50, 75, 100]} size={12} showValue={false} animation="never" />
      <BulletChart value={88} target={70} bands={[50, 75, 100]} size={12} showValue={false} animation="never" />
    </div>
  );
}

function Latency() {
  return (
    <div className="flex w-full flex-col gap-4">
      {[
        { label: "Checkout API", value: 182, previous: 240 },
        { label: "Search", value: 96, previous: 88 },
        { label: "Login", value: 312, previous: 290 },
      ].map((s) => (
        <BulletChart
          key={s.label}
          label={s.label}
          sublabel="p95, ms"
          value={s.value}
          previous={s.previous}
          target={250}
          invert
          toneByTarget
          bands={[
            { to: 150, label: "Fast" },
            { to: 300, label: "Acceptable" },
            { to: 400, label: "Slow" },
          ]}
          format={{ maximumFractionDigits: 0 }}
          labelWidth={104}
          ticks
        />
      ))}
    </div>
  );
}

function Quarterly() {
  const regions = [
    { label: "North", value: 82, target: 90 },
    { label: "South", value: 104, target: 95 },
    { label: "East", value: 67, target: 80 },
    { label: "West", value: 91, target: 85 },
  ];
  return (
    <div className="flex w-full flex-wrap items-end justify-center gap-5">
      {regions.map((r) => (
        <BulletChart key={r.label} orientation="vertical" label={r.label} sublabel="$k" value={r.value} target={r.target} bands={[60, 90, 120]} size={20} height={150} ticks={r.label === "North"} />
      ))}
    </div>
  );
}

function InSentence() {
  return (
    <div className="w-full rounded-pui-lg border border-pui-border p-4">
      <p className="text-sm font-medium">Sprint 42 progress</p>
      <p className="mt-0.5 text-xs text-pui-muted-foreground">Story points closed against the commitment, with last sprint as the dot.</p>
      <BulletChart className="mt-3" value={34} target={40} previous={38} bands={[20, 32, 48]} size={16} chartLabel="Story points" toneByTarget />
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
      "<BulletChart",
      '  label="Revenue"',
      '  sublabel="USD, thousands"',
      "  value={268}",
      p.target ? "  target={250}" : null,
      p.previous ? "  previous={231}" : null,
      p.bands ? "  bands={[150, 225, 300]}" : null,
      p.orientation !== "horizontal" ? `  orientation="${p.orientation}"` : null,
      p.ticks ? "  ticks" : null,
      p.toneByTarget ? "  toneByTarget" : null,
      p.size !== 22 ? `  size={${p.size}}` : null,
      "/>",
    ]
      .filter(Boolean)
      .join("\n"),
  propsTable: propDocs<BulletChartProps>()([
    { name: "value", type: "number", required: true, description: "The measure." },
    { name: "target", type: "number", description: "Goal tick; adds the gap to the badge, card and value text." },
    { name: "previous", type: "number", description: "Last period as a hollow ghost marker." },
    { name: "bands", type: "(number | { to, label? })[]", description: "Qualitative ranges, ascending; shaded from the foreground so both themes work." },
    { name: "min", type: "number", default: "0", description: "Scale start." },
    { name: "max", type: "number", default: "last band / nice max", description: "Scale end." },
    { name: "orientation", type: '"horizontal" | "vertical"', default: '"horizontal"', description: "Row or column." },
    { name: "label", type: "ReactNode", description: "Row title (also the accessible name when it is a string)." },
    { name: "sublabel", type: "ReactNode", description: "Muted units line under the label." },
    { name: "labelWidth", type: "number", default: "120", description: "Label column width so stacked bullets line up." },
    { name: "invert", type: "boolean", default: "false", description: "Lower is better: bands shade the other way and going over is bad." },
    { name: "toneByTarget", type: "boolean", default: "false", description: "Measure turns success or danger by whether it meets the target." },
    { name: "ticks", type: "boolean", default: "false", description: "Axis tick labels." },
    { name: "showValue", type: "boolean", default: "true", description: "Value and gap badge at the end." },
    { name: "size", type: "number", default: "22", description: "Bar thickness in px." },
    { name: "height", type: "number", default: "180", description: "Vertical plot height in px." },
    { name: "format", type: "Intl.NumberFormatOptions | (v) => string", description: "Number format everywhere." },
  ]),
  a11y: [
    'role="meter" with aria-valuetext like "62, target 70, 8 to target, Good, previous 58".',
    "The value and the signed gap are printed as text, so color is never the only cue.",
  ],
  reducedMotion: "The measure, target and ghost appear in place without growing or dropping in.",
  examples: [
    { title: "Latency budget", description: "invert + toneByTarget: lower is better, over budget turns red.", Demo: Latency },
    { title: "Vertical, by region", description: "Columns share one axis on the first chart.", Demo: Quarterly },
    { title: "Inside a card", description: "No label: the bar fills the width under its own copy.", Demo: InSentence, wide: true },
  ],
};
export default item;
