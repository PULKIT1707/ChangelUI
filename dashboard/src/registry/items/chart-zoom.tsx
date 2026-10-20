import {
  AreaChart,
  ChartBrush,
  ChartNavigator,
  ChartSyncGroup,
  ChartZoom,
  LineChart,
  type ChartBrushProps,
  type ChartNavigatorProps,
  type ChartZoomProps,
} from "changelui";
import { useMemo, useState } from "react";
import { ChartDemo } from "../../components/chart-demo";
import { dailyTraffic, priceHistory, useSeed } from "../../lib/chart-data";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  wheel: "modifier" | "always" | "off";
  drag: "pan" | "brush";
  navigator: boolean;
  resetButton: boolean;
  fitYToZoom: boolean;
  area: boolean;
  height: number;
};
const defaults: DemoProps = { wheel: "modifier", drag: "pan", navigator: true, resetButton: true, fitYToZoom: true, area: true, height: 300 };
const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "wheel", label: "Wheel", options: ["modifier", "always", "off"] },
  { type: "select", prop: "drag", label: "Drag", options: ["pan", "brush"] },
  { type: "boolean", prop: "navigator", label: "Navigator minimap" },
  { type: "boolean", prop: "resetButton", label: "Reset button" },
  { type: "boolean", prop: "fitYToZoom", label: "Fit y to the window" },
  { type: "boolean", prop: "area", label: "Gradient area" },
  { type: "number", prop: "height", label: "Height (px)", min: 200, max: 480, step: 20 },
];
const usd: Intl.NumberFormatOptions = { style: "currency", currency: "USD", maximumFractionDigits: 2 };

function Preview({ props }: { props: DemoProps }) {
  const [seed, randomize] = useSeed(1);
  const data = useMemo(() => priceHistory(seed), [seed]);
  const { wheel, drag, navigator, resetButton, fitYToZoom, area, height } = props;
  return (
    <ChartDemo onRandomize={randomize} hint="Drag across the chart to zoom, then drag to pan. Ctrl/⌘ + scroll or pinch zooms; double-click or 0 resets.">
      <LineChart
        title="ACME share price"
        description="Two years, daily close"
        data={data}
        x="date"
        height={height}
        area={area}
        markers={false}
        legend="none"
        fitYToZoom={fitYToZoom}
        series={[{ id: "price", y: "price", label: "Close", format: usd }]}
        yAxis={{ format: { style: "currency", currency: "USD", maximumFractionDigits: 0 } }}
      >
        <ChartZoom wheel={wheel === "off" ? false : wheel} drag={drag} resetButton={resetButton} />
        {navigator ? <ChartNavigator /> : null}
      </LineChart>
    </ChartDemo>
  );
}

function Mini() {
  const data = useMemo(() => priceHistory(3, 200), []);
  return (
    <LineChart
      className="w-52"
      data={data}
      x="date"
      height={84}
      interactive={false}
      animation="never"
      legend="none"
      grid={false}
      markers={false}
      area
      xAxis={{ hide: true }}
      yAxis={{ hide: true }}
      defaultXDomain={[+(data[60]?.date ?? 0), +(data[140]?.date ?? 0)]}
      series={[{ id: "price", y: "price" }]}
    />
  );
}

function BrushStats() {
  const [seed, randomize] = useSeed(4);
  const data = useMemo(() => dailyTraffic(seed, 120), [seed]);
  const [range, setRange] = useState<readonly [number, number] | null>(null);
  const rows = range ? data.filter((d) => +d.date >= range[0] && +d.date <= range[1]) : data;
  const total = rows.reduce((a, r) => a + r.visitors, 0);
  return (
    <ChartDemo onRandomize={randomize} hint="ChartBrush selects without zooming; Escape clears.">
      <AreaChart data={data} x="date" height={220} legend="none" series={[{ id: "visitors", y: "visitors", label: "Visitors" }]}>
        <ChartBrush onValueChange={setRange} />
      </AreaChart>
      <p className="text-sm" aria-live="polite">
        {range ? "Selection" : "All 120 days"}: <strong className="tabular-nums">{total.toLocaleString("en-US")}</strong> visitors over {rows.length} days
      </p>
    </ChartDemo>
  );
}

function SyncedZoom() {
  const data = useMemo(() => priceHistory(8, 365), []);
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-pui-muted-foreground">ChartSyncGroup with syncZoom: zoom one chart and both follow (the hover crosshair is shared too).</p>
      <ChartSyncGroup id="zoom" syncZoom>
        <LineChart data={data} x="date" height={180} legend="none" markers={false} title="Price" series={[{ id: "price", y: "price", label: "Price", format: usd }]}>
          <ChartZoom />
        </LineChart>
        <AreaChart data={data} x="date" height={120} legend="none" title="Volume" series={[{ id: "volume", y: "volume", label: "Volume", format: { notation: "compact" } }]}>
          <ChartZoom resetButton={false} />
        </AreaChart>
      </ChartSyncGroup>
    </div>
  );
}

function Controlled() {
  const data = useMemo(() => dailyTraffic(2, 90), []);
  const [domain, setDomain] = useState<readonly [number, number] | null>(null);
  const presets: Array<[string, number]> = [
    ["7d", 7],
    ["30d", 30],
    ["90d", 90],
  ];
  const end = +(data[data.length - 1]?.date ?? 0);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-1" role="group" aria-label="Range">
        {presets.map(([name, days]) => (
          <button
            key={name}
            type="button"
            onClick={() => setDomain(days >= 90 ? null : [end - (days - 1) * 864e5, end])}
            className="rounded-pui-md border border-pui-border px-2.5 py-1 text-xs font-medium hover:bg-pui-muted"
          >
            {name}
          </button>
        ))}
      </div>
      <LineChart
        data={data}
        x="date"
        height={220}
        legend="none"
        xDomain={domain}
        onXDomainChange={setDomain}
        series={[
          { id: "visitors", y: "visitors", label: "Visitors", area: true },
          { id: "sessions", y: "sessions", label: "Sessions" },
        ]}
      >
        <ChartZoom />
      </LineChart>
    </div>
  );
}

type AllProps = ChartZoomProps & ChartNavigatorProps & ChartBrushProps;
const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: ({ wheel, drag, navigator, resetButton, fitYToZoom, area, height }) => {
    const zoomProps = [wheel !== "modifier" ? `wheel=${wheel === "off" ? "{false}" : `"${wheel}"`}` : "", drag !== "pan" ? `drag="${drag}"` : "", resetButton ? "" : "resetButton={false}"].filter(Boolean).join(" ");
    return [
      `import { ChartNavigator, ChartZoom, LineChart } from "changelui";`,
      ``,
      `<LineChart`,
      `  data={prices}`,
      `  x="date"`,
      `  series={[{ id: "price", y: "price", label: "Close" }]}`,
      area ? `  area` : "",
      `  markers={false}`,
      fitYToZoom ? "" : `  fitYToZoom={false}`,
      height !== 300 ? `  height={${height}}` : "",
      `>`,
      `  <ChartZoom${zoomProps ? ` ${zoomProps}` : ""} />`,
      navigator ? `  <ChartNavigator />` : "",
      `</LineChart>`,
    ]
      .filter((l, i) => l !== "" || i === 1)
      .join("\n");
  },
  propsTable: propDocs<AllProps>()([
    { name: "wheel", type: '"modifier" | "always" | false', default: '"modifier"', description: "ChartZoom: Ctrl/⌘ + wheel (or a trackpad pinch) zooms; the page never scroll-jacks." },
    { name: "drag", type: '"pan" | "brush"', default: '"pan"', description: "ChartZoom: plain drag pans when zoomed (brushes at full extent); Shift does the other." },
    { name: "pinch", type: "boolean", default: "true", description: "ChartZoom: two-finger pinch on touch screens." },
    { name: "minSpan", type: "number", default: "2 data steps", description: "ChartZoom: smallest window in x units." },
    { name: "resetOnDoubleClick", type: "boolean", default: "true", description: "ChartZoom: double-click resets." },
    { name: "resetButton", type: "boolean", default: "true", description: "ChartZoom: Reset button and zoom factor while zoomed." },
    { name: "height", type: "number", default: "48", description: "ChartNavigator: minimap height." },
    { name: "seriesId", type: "string", description: "ChartNavigator: series to draw (default: the first line or area)." },
    { name: "onValueChange", type: "(range | null) => void", description: "ChartBrush: fires while dragging." },
    { name: "onBrushEnd", type: "(range | null) => void", description: "ChartBrush: fires on release." },
    { name: "formatLabel", type: "(range, count) => string", description: "ChartBrush: the range pill text." },
  ]),
  keyboard: [
    { keys: "+ / −", action: "Zoom in / out around the focused point" },
    { keys: "0", action: "Reset the zoom" },
    { keys: "Shift + ← / →", action: "Pan a tenth of the window" },
    { keys: "Escape", action: "Reset the zoom (after clearing a selection)" },
    { keys: "← / → on a navigator handle", action: "Move the window edge one step (Shift: 10%)" },
  ],
  a11y: [
    "Zoom changes are announced in the chart's live region with the new date range.",
    'Navigator handles are role="slider" with aria-valuetext dates and keyboard steps.',
    "The keyboard help text lists the zoom keys whenever ChartZoom is present.",
  ],
  reducedMotion: "Zoom and pan apply instantly (no gliding domain tween); hints and buttons don't scale in.",
  examples: [
    { title: "Brush for stats", description: "ChartBrush reports a range; the pill shows count and average.", Demo: BrushStats, wide: true },
    { title: "Synced zoom", description: "Two charts share one window via ChartSyncGroup syncZoom.", Demo: SyncedZoom },
    { title: "Controlled range", description: "xDomain + onXDomainChange with 7d / 30d / 90d presets.", Demo: Controlled },
  ],
};
export default item;
