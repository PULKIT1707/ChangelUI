import { CandlestickChart, type CandlestickChartProps, type CandlestickOverlay } from "changelui";
import { useEffect, useMemo, useState } from "react";
import { mulberry32 } from "@pui-src/lib/random";
import { ChartDemo } from "../../components/chart-demo";
import { ohlcSeries, useSeed, type OhlcRow } from "../../lib/chart-data";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = { type: "candle" | "hollow" | "ohlc" | "line"; sma20: boolean; ema50: boolean; bollinger: boolean; volumePane: boolean; navigator: boolean; colorblind: boolean; visible: number };
const defaults: DemoProps = { type: "candle", sma20: true, ema50: true, bollinger: false, volumePane: true, navigator: true, colorblind: false, visible: 90 };
const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "type", label: "Type", options: ["candle", "hollow", "ohlc", "line"] },
  { type: "boolean", prop: "sma20", label: "SMA 20" },
  { type: "boolean", prop: "ema50", label: "EMA 50" },
  { type: "boolean", prop: "bollinger", label: "Bollinger" },
  { type: "boolean", prop: "volumePane", label: "Volume" },
  { type: "boolean", prop: "navigator", label: "Navigator" },
  { type: "boolean", prop: "colorblind", label: "Colorblind" },
  { type: "number", prop: "visible", label: "Visible", min: 20, max: 260, step: 10 },
];

function overlaysOf(p: DemoProps): CandlestickOverlay[] {
  const out: CandlestickOverlay[] = [];
  if (p.sma20) out.push({ type: "sma", period: 20 });
  if (p.ema50) out.push({ type: "ema", period: 50 });
  if (p.bollinger) out.push({ type: "bollinger", period: 20, k: 2 });
  return out;
}

function Preview({ props }: { props: DemoProps }) {
  const [seed, randomize] = useSeed(3);
  const data = useMemo(() => ohlcSeries(seed, 260), [seed]);
  const overlays = useMemo(() => overlaysOf(props), [props]);
  return (
    <ChartDemo onRandomize={randomize} hint="Drag to pan, Ctrl/Cmd + wheel to zoom, drag the navigator window; the legend follows the crosshair.">
      <CandlestickChart
        key={props.visible}
        data={data}
        x="date"
        open="open"
        high="high"
        low="low"
        close="close"
        volume="volume"
        type={props.type}
        overlays={overlays}
        volumePane={props.volumePane}
        navigator={props.navigator}
        colorblind={props.colorblind}
        defaultVisible={props.visible}
        format={{ style: "currency", currency: "USD", minimumFractionDigits: 2 }}
        title="ACME Corp (ACME)"
        description="Daily, trading days only"
        className="w-full"
      />
    </ChartDemo>
  );
}

function Mini() {
  const data = useMemo(() => ohlcSeries(5, 40), []);
  return <CandlestickChart data={data} x="date" open="open" high="high" low="low" close="close" navigator={false} lastPrice={false} height={110} initialWidth={240} animation="never" className="w-60 [&_button]:hidden [&_text]:hidden" />;
}

/** Ticks the last candle every 700 ms and opens a new one every 8 ticks. */
function LiveFeed() {
  const [data, setData] = useState<OhlcRow[]>(() => ohlcSeries(9, 80));
  const [running, setRunning] = useState(true);
  useEffect(() => {
    if (!running) return;
    const rand = mulberry32(Date.now() % 100000);
    let ticks = 0;
    const id = setInterval(() => {
      ticks += 1;
      setData((rows) => {
        const last = rows[rows.length - 1] as OhlcRow;
        if (ticks % 8 === 0) {
          const d = new Date(Date.parse(`${last.date}T00:00:00Z`) + 864e5 * (new Date(`${last.date}T00:00:00Z`).getUTCDay() === 5 ? 3 : 1));
          return [...rows.slice(-160), { date: d.toISOString().slice(0, 10), open: last.close, high: last.close, low: last.close, close: last.close, volume: 200_000 }];
        }
        const close = Math.round(last.close * (1 + (rand() - 0.5) * 0.012) * 100) / 100;
        const next = { ...last, close, high: Math.max(last.high, close), low: Math.min(last.low, close), volume: last.volume + Math.round(rand() * 300_000) };
        return [...rows.slice(0, -1), next];
      });
    }, 700);
    return () => clearInterval(id);
  }, [running]);
  return (
    <ChartDemo hint="The last close tweens on every tick; new candles slide in while the view follows the end.">
      <button type="button" onClick={() => setRunning((r) => !r)} aria-pressed={!running} className="self-start rounded-pui-md border border-pui-border px-2.5 py-1 text-xs hover:bg-pui-muted">
        {running ? "Pause feed" : "Resume feed"}
      </button>
      <CandlestickChart data={data} x="date" open="open" high="high" low="low" close="close" volume="volume" overlays={[{ type: "ema", period: 12 }]} defaultVisible={45} navigator={false} height={260} className="w-full" />
    </ChartDemo>
  );
}

function Bands() {
  const [seed, randomize] = useSeed(12);
  const data = useMemo(() => ohlcSeries(seed, 200, "2025-01-06", 60), [seed]);
  return (
    <ChartDemo onRandomize={randomize} hint="Hollow candles inside Bollinger bands, no volume pane; colorblind up/down.">
      <CandlestickChart data={data} x="date" open="open" high="high" low="low" close="close" type="hollow" colorblind overlays={[{ type: "bollinger", period: 20, k: 2 }]} volumePane={false} defaultVisible={120} height={280} className="w-full" />
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
      "<CandlestickChart",
      "  data={bars} // [{ date, open, high, low, close, volume }]",
      '  x="date" open="open" high="high" low="low" close="close" volume="volume"',
      p.type !== "candle" ? `  type="${p.type}"` : null,
      overlaysOf(p).length ? `  overlays={${JSON.stringify(overlaysOf(p)).replace(/"(\w+)":/g, "$1: ")}}` : null,
      p.volumePane ? null : "  volumePane={false}",
      p.navigator ? null : "  navigator={false}",
      p.colorblind ? "  colorblind" : null,
      p.visible !== 90 ? `  defaultVisible={${p.visible}}` : null,
      "/>",
    ]
      .filter(Boolean)
      .join("\n"),
  propsTable: propDocs<CandlestickChartProps<unknown>>()([
    { name: "data", type: "readonly T[]", required: true, description: "One row per period; the axis is index based, so gaps (weekends) leave no holes." },
    { name: "x", type: "keyof T | (row, i) => number | Date | string", required: true, description: "Period start." },
    { name: "open", type: "keyof T | (row, i) => number", required: true, description: "Open (high, low and close likewise)." },
    { name: "volume", type: "keyof T | (row, i) => number", description: "Volume for the lower pane and the legend." },
    { name: "type", type: '"candle" | "hollow" | "ohlc" | "line"', default: '"candle"', description: "Mark style." },
    { name: "overlays", type: "CandlestickOverlay[]", description: '{ type: "sma" | "ema", period } or { type: "bollinger", period?, k? }; legend chips toggle them.' },
    { name: "volumePane", type: "boolean", default: "true", description: "Volume bars under the price pane." },
    { name: "navigator", type: "boolean", default: "true", description: "Minimap with a draggable, resizable window." },
    { name: "lastPrice", type: "boolean", default: "true", description: "Dashed last-close line with a pill on the axis." },
    { name: "colorblind", type: "boolean", default: "false", description: "Blue / amber instead of green / red." },
    { name: "defaultVisible", type: "number", default: "90", description: "Candles visible at first, from the end." },
    { name: "height", type: "number", default: "320", description: "Price + volume height in px." },
    { name: "onActiveChange", type: "(candle | null) => void", description: "Candle under the crosshair or keyboard focus." },
  ]),
  keyboard: [
    { keys: "Tab", action: "Focus the chart" },
    { keys: "← / →", action: "Previous / next candle (announced as OHLC + change)" },
    { keys: "Shift + ← / →", action: "Pan by 10%" },
    { keys: "+ / −", action: "Zoom in / out around the focused candle" },
    { keys: "0", action: "Reset the zoom" },
    { keys: "Home / End", action: "First / last candle" },
    { keys: "T", action: "Show or hide the data table" },
  ],
  a11y: [
    'Each candle is announced as "Mar 4, 2026: open 182, high 188, low 181, close 187, +2.7%".',
    "Up and down are encoded by color and by fill (hollow mode) or tick side (OHLC mode); a colorblind palette is built in.",
    "The data table lists every period, newest first.",
  ],
  reducedMotion: "No candle grow-in; pans, zooms and live updates jump instead of gliding.",
  examples: [
    { title: "Live feed", description: "Last-candle updates and new candles sliding in.", Demo: LiveFeed, wide: true },
    { title: "Hollow + Bollinger", description: "Colorblind palette, no volume.", Demo: Bands, wide: true },
  ],
};
export default item;
