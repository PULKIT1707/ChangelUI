import { Button, HistogramRange, SegmentedControl, SegmentedControlItem, Switch, type HistogramRangeProps } from "changelui";
import { useMemo, useState } from "react";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";
type DemoProps = {
  bins: number;
  height: number;
  step: number;
  size: NonNullable<HistogramRangeProps["size"]>;
  tone: NonNullable<HistogramRangeProps["tone"]>;
  inputs: boolean;
  disabled: boolean;
};
const defaults: DemoProps = { bins: 36, height: 72, step: 5, size: "md", tone: "primary", inputs: true, disabled: false };
const controls: ControlSpec<DemoProps>[] = [
  { type: "number", prop: "bins", label: "Bins", min: 8, max: 64, step: 2 },
  { type: "number", prop: "height", label: "Height (px)", min: 40, max: 140, step: 4 },
  { type: "number", prop: "step", label: "Step ($)", min: 1, max: 25, step: 1 },
  { type: "select", prop: "size", label: "Size", options: ["sm", "md", "lg"] },
  { type: "select", prop: "tone", label: "Tone", options: ["primary", "neutral", "info", "success"] },
  { type: "boolean", prop: "inputs", label: "Min / max fields" },
  { type: "boolean", prop: "disabled", label: "Disabled" },
];
/** Deterministic pseudo-random numbers so demos look the same on every load. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function normal(r: () => number) {
  return Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());
}
/** Nightly prices: a lognormal body with a luxury tail, capped at $500+ like most rental filters. */
function nightlyPrices(seed: number, n: number, city: "lisbon" | "tokyo") {
  const r = rng(seed);
  const mu = city === "lisbon" ? 4.75 : 5.05;
  return Array.from({ length: n }, () => Math.round(Math.min(500, Math.max(25, Math.exp(mu + 0.5 * normal(r))))));
}
const usd = (v: number) => `$${v.toLocaleString("en-US")}${v >= 500 ? "+" : ""}`;
function Preview({ props }: { props: DemoProps }) {
  const [city, setCity] = useState<"lisbon" | "tokyo">("lisbon");
  const prices = useMemo(() => nightlyPrices(city === "lisbon" ? 7 : 19, 1240, city), [city]);
  const [range, setRange] = useState<[number, number]>([60, 260]);
  const matches = prices.filter((p) => p >= range[0] && p <= range[1]).length;
  return (
    <div className="flex w-full max-w-md flex-col rounded-pui-xl border border-pui-border bg-pui-surface text-pui-surface-foreground shadow-pui-md">
      <div className="flex items-center justify-between gap-3 border-b border-pui-border px-5 py-3.5">
        <p className="m-0 text-base font-semibold">Filters</p>
        <SegmentedControl size="sm" value={city} onValueChange={(v) => setCity(v as "lisbon" | "tokyo")} aria-label="City">
          <SegmentedControlItem value="lisbon">Lisbon</SegmentedControlItem>
          <SegmentedControlItem value="tokyo">Tokyo</SegmentedControlItem>
        </SegmentedControl>
      </div>
      <div className="px-5 pt-5 pb-6">
        <p className="m-0 mb-3 text-xs text-pui-muted-foreground">Nightly prices before fees and taxes</p>
        <HistogramRange
          {...props}
          key={city}
          label="Price per night"
          data={prices}
          min={0}
          max={500}
          value={range}
          onValueChange={setRange}
          formatValue={usd}
          countLabel={(c, t) => (
            <>
              <span className="font-semibold text-pui-foreground">{c.toLocaleString("en-US")}</span> of {t.toLocaleString("en-US")} stays
            </>
          )}
          countMessage={(c) => `${c} stays match`}
        />
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-pui-border bg-pui-muted/40 px-5 py-3">
        <Button variant="ghost" tone="neutral" size="sm" onClick={() => setRange([0, 500])}>
          Clear
        </Button>
        <Button size="sm" disabled={matches === 0}>
          {matches === 0 ? "No stays in this range" : `Show ${matches.toLocaleString("en-US")} stays`}
        </Button>
      </div>
    </div>
  );
}
const minutes = (v: number) => `${Math.floor(v / 60)}h ${String(v % 60).padStart(2, "0")}m`;
function FlightsDemo() {
  const durations = useMemo(() => {
    const r = rng(42);
    // Nonstops cluster near 7h, one-stops near 11h: a bimodal market the bars make obvious.
    return Array.from({ length: 420 }, () => Math.round(r() < 0.35 ? 420 + normal(r) * 25 : 660 + normal(r) * 70));
  }, []);
  const [nonstop, setNonstop] = useState(false);
  return (
    <div className="flex w-full flex-col gap-4 rounded-pui-xl border border-pui-border bg-pui-surface p-4 text-sm text-pui-surface-foreground">
      <HistogramRange
        key={String(nonstop)}
        label="Flight duration"
        data={nonstop ? durations.filter((d) => d < 520) : durations}
        size="sm"
        step={5}
        bins={28}
        height={56}
        inputs={false}
        tone="info"
        formatValue={minutes}
        countLabel={(c) => `${c} flights`}
      />
      <label className="flex items-center justify-between gap-3 text-xs">
        <span>Nonstop only</span>
        <Switch size="sm" checked={nonstop} onCheckedChange={setNonstop} />
      </label>
    </div>
  );
}
const PRESETS: { id: string; label: string; range: [number, number] }[] = [
  { id: "any", label: "Any", range: [0, 2000] },
  { id: "small", label: "Under 400 sq ft", range: [0, 400] },
  { id: "mid", label: "400–900", range: [400, 900] },
  { id: "large", label: "900+", range: [900, 2000] },
];
function PresetsDemo() {
  const sizes = useMemo(() => {
    const r = rng(5);
    return Array.from({ length: 860 }, () => Math.round(Math.min(2000, Math.max(180, Math.exp(6.5 + 0.42 * normal(r))))));
  }, []);
  const [range, setRange] = useState<[number, number]>([0, 2000]);
  const preset = PRESETS.find((p) => p.range[0] === range[0] && p.range[1] === range[1])?.id ?? "";
  return (
    <div className="grid w-full items-start gap-6 rounded-pui-xl border border-pui-border bg-pui-surface p-5 text-sm text-pui-surface-foreground md:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
      <div className="flex flex-col gap-2">
        <p className="m-0 font-medium">Apartment size</p>
        <p className="m-0 text-xs text-pui-muted-foreground">Quick picks drive the controlled value; dragging clears them.</p>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <Button key={p.id} size="sm" variant={preset === p.id ? "solid" : "outline"} tone="neutral" aria-pressed={preset === p.id} onClick={() => setRange(p.range)}>
              {p.label}
            </Button>
          ))}
        </div>
      </div>
      <HistogramRange
        label="Floor area"
        data={sizes}
        min={0}
        max={2000}
        step={10}
        bins={40}
        tone="success"
        value={range}
        onValueChange={setRange}
        formatValue={(v) => `${v.toLocaleString("en-US")} sq ft`}
        countLabel={(c, t) => `${c} of ${t} listings`}
      />
    </div>
  );
}
function Mini() {
  const data = useMemo(() => nightlyPrices(3, 400, "lisbon"), []);
  return (
    <div aria-hidden="true" inert className="pointer-events-none w-52">
      <HistogramRange data={data} min={0} max={500} defaultValue={[70, 240]} bins={24} height={48} size="sm" inputs={false} label="Price" formatValue={usd} />
    </div>
  );
}
const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) =>
    toJsx("HistogramRange", props, defaults, undefined, controls).replace(
      "<HistogramRange",
      '<HistogramRange label="Price per night" data={prices} value={range} onValueChange={setRange} formatValue={(v) => `$${v}`}',
    ),
  propsTable: propDocs<HistogramRangeProps>()([
    { name: "data", type: "number[]", required: true, description: "The values being filtered; drives the bars and the count." },
    { name: "bins", type: "number", default: "32", description: "Number of bars." },
    { name: "min", type: "number", description: "Lower bound. Default: the smallest value rounded down to a step." },
    { name: "max", type: "number", description: "Upper bound. Default: the largest value rounded up to a step." },
    { name: "step", type: "number", default: "1", description: "Thumb and field step." },
    { name: "value", type: "[number, number]", description: "Controlled range; pair with onValueChange." },
    { name: "defaultValue", type: "[number, number]", default: "[min, max]", description: "Starting range when uncontrolled." },
    { name: "onValueChange", type: "(value) => void", description: "Every change, including while dragging." },
    { name: "onValueCommit", type: "(value) => void", description: "Drag end, key press or an applied field: the moment to refetch." },
    { name: "label", type: "ReactNode", description: "Visible label; also names the slider." },
    { name: "formatValue", type: "(value) => string", default: "en-US grouping", description: "Text for fields, tooltips and aria-valuetext." },
    { name: "countLabel", type: "(count, total) => ReactNode", description: 'Matching-count text. Default "{count} of {total}".' },
    { name: "countMessage", type: "(count, total) => string", description: "Screen-reader summary after each committed change." },
    { name: "height", type: "number", default: "72", description: "Histogram height in px." },
    { name: "inputs", type: "boolean", default: "true", description: "Typed minimum and maximum fields." },
    { name: "thumbLabels", type: "[string, string]", default: '["Minimum", "Maximum"]', description: "Thumb and field names." },
    { name: "tone", type: "Tone", default: '"primary"', description: "Bar and track color." },
    { name: "size", type: '"sm" | "md" | "lg"', default: '"md"', description: "Thumb, track and field size." },
    { name: "disabled", type: "boolean", default: "false", description: "Locks the thumbs and fields." },
    { name: "name", type: "string", description: "Adds hidden inputs `${name}-min` and `${name}-max` for forms." },
  ]),
  keyboard: [
    { keys: "← / → or ↓ / ↑", action: "Move the focused thumb by one step" },
    { keys: "Page Up / Page Down", action: "Move by ten steps" },
    { keys: "Home / End", action: "Jump to the bound (thumbs never cross)" },
    { keys: "Enter (in a field)", action: "Apply the typed value; Escape restores it" },
  ],
  a11y: [
    "Two role=slider thumbs inside a group named by the label, with formatted aria-valuetext.",
    "The histogram is decorative (aria-hidden); the matching count is announced politely after each committed change, not on every drag frame.",
    "Typed fields are labelled text inputs with inputMode=decimal; values are clamped to the bounds and the other thumb.",
  ],
  reducedMotion: "Bars change height instantly when the data changes; the rest has no motion.",
  examples: [
    { title: "Bimodal durations", description: "Nonstop and one-stop flights form two humps; small, no fields.", Demo: FlightsDemo },
    { title: "Controlled with presets", description: "Quick picks set the value; the bars show why the buckets were chosen.", Demo: PresetsDemo, wide: true },
  ],
};
export default item;
