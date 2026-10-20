import { ChartSonify, LineChart, useSonify, type ChartSonifyProps, type SonifyInstrument } from "changelui";
import { useMemo } from "react";
import { ChartDemo } from "../../components/chart-demo";
import { dailyTraffic, monthlyRevenue, useSeed, walk } from "../../lib/chart-data";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";
type DemoProps = {
  durationMs: number;
  instrument: SonifyInstrument;
  volume: number;
  minHz: number;
  maxHz: number;
  pan: boolean;
  thresholdClicks: boolean;
  settings: boolean;
};
const defaults: DemoProps = { durationMs: 4000, instrument: "sine", volume: 0.5, minHz: 220, maxHz: 880, pan: true, thresholdClicks: true, settings: true };
const controls: ControlSpec<DemoProps>[] = [
  { type: "number", prop: "durationMs", label: "Duration (ms)", min: 1500, max: 10000, step: 500 },
  { type: "select", prop: "instrument", label: "Sound", options: ["sine", "triangle", "square", "sawtooth"] },
  { type: "number", prop: "volume", label: "Volume", min: 0.1, max: 1, step: 0.05 },
  { type: "number", prop: "minHz", label: "Low pitch (Hz)", min: 110, max: 330, step: 10 },
  { type: "number", prop: "maxHz", label: "High pitch (Hz)", min: 440, max: 1320, step: 20 },
  { type: "boolean", prop: "pan", label: "Stereo pan" },
  { type: "boolean", prop: "thresholdClicks", label: "Click at target" },
  { type: "boolean", prop: "settings", label: "Speed + sound pickers" },
];
const usd: Intl.NumberFormatOptions = { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 };
function Preview({ props }: { props: DemoProps }) {
  const [seed, randomize] = useSeed(3);
  const rows = useMemo(() => monthlyRevenue(seed, 24).map((r, i) => ({ ...r, i })), [seed]);
  const { thresholdClicks, ...rest } = props;
  return (
    <ChartDemo onRandomize={randomize} hint="Press play: pitch follows revenue, left to right in stereo, with a click each time it crosses the $50K target. The crosshair follows the sound.">
      <LineChart
        title="Revenue, two years"
        data={rows}
        x="i"
        xScale="band"
        formatX={(v) => `${rows[Number(v)]?.month ?? ""} ${Number(v) < 12 ? "2025" : "2026"}`}
        series={[{ id: "revenue", y: "revenue", label: "Revenue", format: usd, area: true }]}
        referenceLines={[{ y: 50_000, label: "$50K", tone: "success" }]}
        legend="none"
        height={280}
        xAxis={{ format: (v) => rows[Number(v)]?.month ?? "" }}
      >
        <ChartSonify {...rest} thresholds={thresholdClicks ? [50_000] : undefined} format={usd} />
      </LineChart>
    </ChartDemo>
  );
}
function Mini() {
  const values = useMemo(() => walk(5, 40), []);
  return <ChartSonify values={values} label="Price" settings={false} previewHeight={64} className="w-64" />;
}
function Standalone() {
  const [seed, randomize] = useSeed(11);
  const values = useMemo(() => walk(seed, 60, 100, 0.006), [seed]);
  return (
    <ChartDemo onRandomize={randomize} hint="Standalone: values only, with its own preview line. Arrow keys on the scrubber play one point at a time.">
      <ChartSonify values={values} labels={values.map((_, i) => `Day ${i + 1}`)} label="Share price" format={{ style: "currency", currency: "USD" }} previewHeight={90} />
    </ChartDemo>
  );
}
function KeyboardTones() {
  const [seed, randomize] = useSeed(6);
  const rows = useMemo(() => dailyTraffic(seed, 30), [seed]);
  return (
    <ChartDemo onRandomize={randomize} hint='Turn on "Hear arrow keys", focus the plot and arrow through the days: each point plays its tone.'>
      <LineChart data={rows} x="date" series={[{ id: "visitors", y: "visitors", label: "Visitors" }, { id: "signups", y: "signups", label: "Signups", hidden: true }]} height={220}>
        <ChartSonify hearNavigation durationMs={3000} settings={false} />
      </LineChart>
    </ChartDemo>
  );
}
/** Headless: useSonify drives a custom one-button control. */
function Headless() {
  const values = useMemo(() => [3, 4, 6, 9, 13, 18, 24, 31, 24, 18, 13, 9, 6, 4, 3], []);
  const s = useSonify({ values, durationMs: 2400, instrument: "triangle" });
  return (
    <div className="flex w-full items-center gap-4">
      <button
        type="button"
        onClick={s.toggle}
        disabled={!s.supported}
        className="rounded-pui-full border border-pui-border px-4 py-2 text-sm font-semibold hover:bg-pui-muted disabled:opacity-50"
      >
        {s.playing ? "Pause" : "Hear the bell curve"}
      </button>
      <div className="flex h-12 flex-1 items-end gap-1" aria-hidden="true">
        {values.map((v, i) => (
          <span key={i} className="flex-1 rounded-t-pui-sm transition-colors duration-150" style={{ height: `${(v / 31) * 100}%`, background: s.index === i ? "var(--pui-primary)" : "color-mix(in oklab, var(--pui-muted-foreground) 30%, transparent)" }} />
        ))}
      </div>
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
      '<LineChart data={rows} x="month" series={[{ id: "revenue", y: "revenue" }]}>',
      "  <ChartSonify",
      p.durationMs !== 4000 ? `    durationMs={${p.durationMs}}` : null,
      p.instrument !== "sine" ? `    instrument="${p.instrument}"` : null,
      p.volume !== 0.5 ? `    volume={${p.volume}}` : null,
      p.minHz !== 220 ? `    minHz={${p.minHz}}` : null,
      p.maxHz !== 880 ? `    maxHz={${p.maxHz}}` : null,
      p.pan ? null : "    pan={false}",
      p.thresholdClicks ? "    thresholds={[50_000]}" : null,
      p.settings ? null : "    settings={false}",
      "  />",
      "</LineChart>",
    ]
      .filter(Boolean)
      .join("\n"),
  propsTable: propDocs<ChartSonifyProps>()([
    { name: "values", type: "number[]", description: "Standalone values. Inside a Chart the series comes from the chart." },
    { name: "seriesId", type: "string", description: "Inside a Chart: the series to play. Default: the first visible one." },
    { name: "durationMs", type: "number", default: "4000", description: "Length of a full playback at 1\u00d7." },
    { name: "instrument", type: '"sine" | "triangle" | "square" | "sawtooth"', default: '"sine"', description: "Starting timbre (the picker can change it)." },
    { name: "minHz", type: "number", default: "220", description: "Pitch of the lowest value (log scale)." },
    { name: "maxHz", type: "number", default: "880", description: "Pitch of the highest value." },
    { name: "volume", type: "number", default: "0.5", description: "0 to 1." },
    { name: "pan", type: "boolean", default: "true", description: "Left-to-right stereo pan along x." },
    { name: "thresholds", type: "number[]", description: "Values that click when the series crosses them." },
    { name: "hearNavigation", type: "boolean", default: "false", description: "Inside a Chart: a tone for each point reached with the arrow keys." },
    { name: "settings", type: "boolean", default: "true", description: "Speed (0.5\u00d7, 1\u00d7, 2\u00d7) and sound pickers." },
    { name: "preview", type: "boolean", default: "true", description: "Standalone: draw the series with a moving playhead." },
    { name: "onIndexChange", type: "(index | null) => void", description: "The point under the playhead." },
  ]),
  keyboard: [
    { keys: "Enter / Space on Play", action: "Play or pause" },
    { keys: "\u2190 / \u2192 on the scrubber", action: "Pause and play the previous / next point" },
    { keys: "Shift + \u2190 / \u2192", action: "Jump five points" },
    { keys: "Home / End", action: "First / last point" },
    { keys: "Space on the scrubber", action: "Play or pause from the playhead" },
  ],
  a11y: [
    "Never autoplays: the AudioContext is created on the first press.",
    "The scrubber is a slider whose value text is the point's label and value.",
    "Play, pause and finish are announced in a polite live region; works the same under reduced motion.",
  ],
  reducedMotion: "Sound is unaffected; the play button's pulse ring and the playhead glide are off.",
  examples: [
    { title: "Standalone", description: "Values only, with its own preview.", Demo: Standalone, wide: true },
    { title: "Hear the arrow keys", description: "Tones synced to the chart's keyboard navigation.", Demo: KeyboardTones },
    { title: "Headless useSonify", description: "Your own control, the same engine.", Demo: Headless },
  ],
};
export default item;
