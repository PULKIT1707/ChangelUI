import { LiveChart, useChartStream, type LiveChartProps, type LiveDatum } from "changelui";
import { useEffect, useRef } from "react";
import { mulberry32 } from "@pui-src/lib/random";
import { ChartDemo } from "../../components/chart-demo";
import { useSeed } from "../../lib/chart-data";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = { mode: "scroll" | "sweep"; intervalMs: number; windowSeconds: number; threshold: boolean; area: boolean; pauseOnHover: boolean; height: number };
const defaults: DemoProps = { mode: "scroll", intervalMs: 500, windowSeconds: 30, threshold: true, area: true, pauseOnHover: true, height: 200 };
const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "mode", label: "Mode", options: ["scroll", "sweep"] },
  { type: "number", prop: "intervalMs", label: "Interval (ms)", min: 100, max: 2000, step: 100 },
  { type: "number", prop: "windowSeconds", label: "Window (s)", min: 5, max: 120, step: 5 },
  { type: "boolean", prop: "threshold", label: "Threshold" },
  { type: "boolean", prop: "area", label: "Area" },
  { type: "boolean", prop: "pauseOnHover", label: "Pause on hover" },
  { type: "number", prop: "height", label: "Height", min: 120, max: 320, step: 20 },
];

/** A deterministic-by-seed signal generator: a mean-reverting walk with bursts. */
function useSimulatedStream(seed: number, intervalMs: number, windowMs: number, make: (rand: () => number, t: number, prev: LiveDatum | undefined) => LiveDatum) {
  const stream = useChartStream({ capacity: 2000, windowMs });
  const makeRef = useRef(make);
  makeRef.current = make;
  const { push, clear } = stream;
  useEffect(() => {
    const rand = mulberry32(seed * 977 + 1);
    clear();
    // Backfill one window so the chart starts full.
    const now = Date.now();
    let prev: LiveDatum | undefined;
    const backfill: LiveDatum[] = [];
    for (let t = now - windowMs; t <= now; t += intervalMs) {
      prev = makeRef.current(rand, t, prev);
      backfill.push(prev);
    }
    push(backfill);
    const id = setInterval(() => {
      prev = makeRef.current(rand, Date.now(), prev);
      push(prev);
    }, intervalMs);
    return () => clearInterval(id);
  }, [seed, intervalMs, windowMs, push, clear]);
  return stream.data;
}

const cpu = (rand: () => number, t: number, prev: LiveDatum | undefined): LiveDatum => {
  const last = prev?.value ?? 42;
  const burst = rand() > 0.97 ? 25 + rand() * 20 : 0;
  return { t, value: Math.max(2, Math.min(99, last + (45 - last) * 0.08 + (rand() - 0.5) * 9 + burst)) };
};

function Preview({ props }: { props: DemoProps }) {
  const [seed, randomize] = useSeed(1);
  const windowMs = props.windowSeconds * 1000;
  const data = useSimulatedStream(seed, props.intervalMs, windowMs, cpu);
  return (
    <ChartDemo onRandomize={randomize} hint="Hover to pause and explore; Space toggles pause; the +N badge counts points that arrived meanwhile.">
      <LiveChart
        data={data}
        series={[{ key: "value", label: "CPU" }]}
        mode={props.mode}
        intervalMs={props.intervalMs}
        windowMs={windowMs}
        threshold={props.threshold ? 75 : undefined}
        thresholdLabel="Alert at 75%"
        area={props.area}
        pauseOnHover={props.pauseOnHover}
        height={props.height}
        format={{ maximumFractionDigits: 1 }}
        yDomain={[0, 100]}
        timeZone="UTC"
        title="api-7 CPU"
        description="Percent, sampled live"
        className="w-full"
      />
    </ChartDemo>
  );
}

function Mini() {
  const data: LiveDatum[] = Array.from({ length: 40 }, (_, i) => ({ t: i * 500, value: 50 + 20 * Math.sin(i / 3) + (i % 5) * 3 }));
  return <LiveChart data={data} windowMs={20000} intervalMs={500} stats={false} height={110} initialWidth={240} animation="never" className="w-60 [&_text]:hidden" />;
}

const ecg = (rand: () => number, t: number): LiveDatum => {
  const phase = (t % 900) / 900;
  const spike = phase > 0.42 && phase < 0.46 ? 1.8 : phase > 0.46 && phase < 0.5 ? -0.6 : 0;
  const p = Math.exp(-(((phase - 0.25) / 0.04) ** 2)) * 0.25 + Math.exp(-(((phase - 0.7) / 0.06) ** 2)) * 0.35;
  return { t, value: Math.round((spike + p + (rand() - 0.5) * 0.05) * 1000) / 1000 };
};

function Monitor() {
  const data = useSimulatedStream(3, 30, 4000, ecg);
  return (
    <ChartDemo hint="Sweep mode: the cursor wraps and erases ahead of itself, like a patient monitor.">
      <LiveChart data={data} series={[{ key: "value", label: "Lead II", color: "var(--pui-chart-7)" }]} mode="sweep" windowMs={4000} intervalMs={30} area={false} yDomain={[-1, 2.2]} format={{ maximumFractionDigits: 2 }} height={180} timeFormat={{ minute: "2-digit", second: "2-digit" }} className="w-full" />
    </ChartDemo>
  );
}

const traffic = (rand: () => number, t: number, prev: LiveDatum | undefined): LiveDatum => {
  const r = prev?.requests ?? 1200;
  const e = prev?.errors ?? 30;
  return { t, requests: Math.max(200, r + (1200 - r) * 0.1 + (rand() - 0.5) * 220), errors: Math.max(0, e + (30 - e) * 0.15 + (rand() - 0.5) * 18 + (rand() > 0.96 ? 80 : 0)) };
};

function MultiSeries() {
  const [seed, randomize] = useSeed(4);
  const data = useSimulatedStream(seed, 1000, 60000, traffic);
  return (
    <ChartDemo onRandomize={randomize} hint="Two series, one head dot each; the stats strip tracks the first.">
      <LiveChart
        data={data}
        series={[
          { key: "requests", label: "Requests/s" },
          { key: "errors", label: "Errors/s", color: "var(--pui-chart-4)" },
        ]}
        windowMs={60000}
        intervalMs={1000}
        area={false}
        format={{ maximumFractionDigits: 0 }}
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
      `const stream = useChartStream({ capacity: 2000, windowMs: ${p.windowSeconds * 1000} });`,
      "// elsewhere: stream.push({ t: Date.now(), value })",
      "",
      "<LiveChart",
      "  data={stream.data}",
      p.mode !== "scroll" ? `  mode="${p.mode}"` : null,
      `  intervalMs={${p.intervalMs}}`,
      `  windowMs={${p.windowSeconds * 1000}}`,
      p.threshold ? '  threshold={75}\n  thresholdLabel="Alert at 75%"' : null,
      p.area ? null : "  area={false}",
      p.pauseOnHover ? null : "  pauseOnHover={false}",
      p.height !== 200 ? `  height={${p.height}}` : null,
      "/>",
    ]
      .filter((l) => l !== null)
      .join("\n"),
  propsTable: propDocs<LiveChartProps>()([
    { name: "data", type: "LiveDatum[]", required: true, description: "{ t, ...seriesKeys } samples; useChartStream() keeps a bounded buffer." },
    { name: "series", type: "LiveSeries[]", default: '[{ key: "value" }]', description: "{ key, label?, color? } per line." },
    { name: "mode", type: '"scroll" | "sweep"', default: '"scroll"', description: "Ticker that glides left, or an oscilloscope sweep." },
    { name: "windowMs", type: "number", default: "30000", description: "Visible time span." },
    { name: "intervalMs", type: "number", default: "1000", description: "Expected push interval (sets the glide speed)." },
    { name: "yDomain", type: '"auto" | [min, max]', default: '"auto"', description: "Auto fits the window and glides." },
    { name: "threshold", type: "number", description: "Values above it turn the danger color; counted in the stats." },
    { name: "paused", type: "boolean", description: "Controlled pause (defaultPaused / onPausedChange)." },
    { name: "pauseOnHover", type: "boolean", default: "true", description: "Hover or focus freezes the view for exploring." },
    { name: "stats", type: "boolean", default: "true", description: "Current value, change, min / avg / max and the pause button." },
    { name: "announce", type: "boolean", default: "true", description: "Polite update at most every 5 seconds." },
  ]),
  keyboard: [
    { keys: "Tab", action: "Focus the chart (pauses the view)" },
    { keys: "Space / P", action: "Pause or resume the stream" },
    { keys: "← / →", action: "While paused: previous / next point (announced)" },
    { keys: "Home / End", action: "While paused: first / last point" },
  ],
  a11y: [
    "A visible Pause button and pause on hover and focus meet WCAG 2.2.2 (Pause, Stop, Hide).",
    "The live region speaks at most once every 5 seconds, so streams never flood a screen reader.",
  ],
  reducedMotion: "No glide or glowing pulse: points append in place.",
  examples: [
    { title: "Patient monitor", description: "Sweep mode at 33 samples per second.", Demo: Monitor, wide: true },
    { title: "Two series", description: "Requests and errors on one axis.", Demo: MultiSeries, wide: true },
  ],
};
export default item;
