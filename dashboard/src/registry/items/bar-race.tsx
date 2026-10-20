import { BarRace, type BarRaceProps } from "changelui";
import { useMemo, useState } from "react";
import { ChartDemo } from "../../components/chart-demo";
import { featureRace, regionRace, useSeed } from "../../lib/chart-data";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  topN: number;
  frameDurationMs: number;
  loop: boolean;
  autoPlay: boolean;
  height: number;
};
const defaults: DemoProps = { topN: 8, frameDurationMs: 900, loop: false, autoPlay: false, height: 300 };
const controls: ControlSpec<DemoProps>[] = [
  { type: "number", prop: "topN", label: "Bars (topN)", min: 3, max: 12, step: 1 },
  { type: "number", prop: "frameDurationMs", label: "Frame duration (ms)", min: 300, max: 2400, step: 100 },
  { type: "boolean", prop: "loop", label: "Loop" },
  { type: "boolean", prop: "autoPlay", label: "Autoplay in view" },
  { type: "number", prop: "height", label: "Height (px)", min: 160, max: 480, step: 20 },
];

function Preview({ props }: { props: DemoProps }) {
  const [seed, randomize] = useSeed(1);
  const frames = useMemo(() => featureRace(seed), [seed]);
  return (
    <ChartDemo onRandomize={randomize} hint="Press Play, scrub the timeline, or focus the chart: Space plays, ← / → step weeks, ↑ / ↓ read the ranking.">
      <BarRace
        key={props.autoPlay ? "auto" : "manual"}
        title="Most-used features"
        description="Weekly active users per feature"
        frames={frames}
        topN={props.topN}
        frameDurationMs={props.frameDurationMs}
        loop={props.loop}
        autoPlay={props.autoPlay}
        height={props.height}
        className="w-full"
      />
    </ChartDemo>
  );
}

function Mini() {
  const frames = useMemo(() => featureRace(3, 12), []);
  return (
    <div className="pointer-events-none w-56">
      <BarRace frames={frames} topN={4} height={110} initialWidth={224} defaultFrame={11} animation="never" />
    </div>
  );
}

function Regions() {
  const [seed, randomize] = useSeed(2);
  const frames = useMemo(() => regionRace(seed), [seed]);
  return (
    <ChartDemo onRandomize={randomize} hint="Yearly frames, currency values and a looping replay.">
      <BarRace
        frames={frames}
        topN={6}
        frameDurationMs={1100}
        loop
        format={{ style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 }}
        formatTime={(t) => String(t)}
        height={240}
      />
    </ChartDemo>
  );
}

function Controlled() {
  const frames = useMemo(() => featureRace(6, 16), []);
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-pui-muted-foreground" aria-live="polite">
        {playing ? "Playing" : "Paused"} at {frames[frame]?.time}. frame / onFrameChange and playing / onPlayingChange are controlled.
      </p>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Jump to week">
        {[0, 5, 10, 15].map((f) => (
          <button key={f} type="button" onClick={() => setFrame(f)} className="rounded-pui-full border border-pui-border px-2.5 py-0.5 text-xs hover:bg-pui-muted">
            {frames[f]?.time}
          </button>
        ))}
      </div>
      <BarRace frames={frames} topN={5} frame={frame} onFrameChange={setFrame} playing={playing} onPlayingChange={setPlaying} height={200} colors={(k) => (k === "Search" ? "var(--pui-primary)" : "var(--pui-muted-foreground)")} />
    </div>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: ({ topN, frameDurationMs, loop, autoPlay, height }) =>
    [
      `// frames: [{ time: "W1", values: { Search: 4200, Alerts: 1800, ... } }, ...]`,
      `<BarRace`,
      `  title="Most-used features"`,
      `  frames={frames}`,
      ...(topN !== 10 ? [`  topN={${topN}}`] : []),
      ...(frameDurationMs !== 1200 ? [`  frameDurationMs={${frameDurationMs}}`] : []),
      ...(loop ? [`  loop`] : []),
      ...(autoPlay ? [`  autoPlay`] : []),
      `  height={${height}}`,
      `/>`,
    ].join("\n"),
  propsTable: propDocs<BarRaceProps>()([
    { name: "frames", type: "readonly { time; values: Record<string, number> }[]", required: true, description: "One frame per time step; missing keys count as 0." },
    { name: "topN", type: "number", default: "10", description: "Bars shown at once; others wait below and slide up when they enter." },
    { name: "frameDurationMs", type: "number", default: "1200", description: "Milliseconds per frame at 1x (the speed button offers 0.5x / 1x / 2x)." },
    { name: "playing", type: "boolean", description: "Controlled play state (with onPlayingChange)." },
    { name: "defaultPlaying", type: "boolean", default: "false", description: "Initial play state." },
    { name: "frame", type: "number", description: "Controlled frame index: the playhead seeks to it." },
    { name: "onFrameChange", type: "(frame) => void", description: "The playhead reached a new frame." },
    { name: "autoPlay", type: "boolean", default: "false", description: "Start once in view (never under reduced motion)." },
    { name: "loop", type: "boolean", default: "false", description: "Restart from the first frame at the end." },
    { name: "colors", type: "Record<string, string> | (key) => string", description: "Per-key colors. Default: the palette by first appearance." },
    { name: "format", type: "Intl.NumberFormatOptions | (v) => string", default: "compact", description: "Value format." },
    { name: "formatTime", type: "(time) => string", default: "String", description: "Time label format." },
    { name: "height", type: "number", default: "topN * 34 + 16", description: "Plot height in px." },
  ]),
  keyboard: [
    { keys: "Space", action: "Play / pause (the leader is announced on pause)" },
    { keys: "← / →", action: "Previous / next frame" },
    { keys: "Home / End", action: "First / last frame" },
    { keys: "↑ / ↓", action: "Read the ranking one bar at a time" },
    { keys: "Escape", action: "Leave the ranking" },
  ],
  a11y: [
    'One tab stop (role="application") with a generated summary of the race and its final leader.',
    "The scrubber is a native range input with the time as its value text; ← / → step whole frames.",
    "No autoplay unless asked, and never under reduced motion (WCAG 2.2.2); a screen-reader table lists the current ranking.",
  ],
  reducedMotion: "Plays in whole-frame steps and re-orders instantly; autoplay is off.",
  examples: [
    { title: "Regions by year", description: "Currency values, yearly frames and loop.", Demo: Regions, wide: true },
    { title: "Controlled playhead", description: "frame, playing and a colors function that spotlights one bar.", Demo: Controlled },
  ],
};
export default item;
