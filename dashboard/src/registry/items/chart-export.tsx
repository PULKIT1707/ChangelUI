import { BarChart, Button, ChartExport, ChartToolbar, FunnelChart, LineChart, chartToSvgString, type ChartExportProps, type ChartExportFormat } from "changelui";
import { useMemo, useRef, useState } from "react";
import { ChartDemo } from "../../components/chart-demo";
import { channels, checkoutFunnel, monthlyRevenue, useSeed } from "../../lib/chart-data";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  toolbar: "hover" | "always";
  placement: "top-end" | "top-start" | "bottom-end" | "bottom-start";
  png: boolean;
  svg: boolean;
  csv: boolean;
  copy: boolean;
  fullscreen: boolean;
};
const defaults: DemoProps = { toolbar: "always", placement: "top-end", png: true, svg: true, csv: true, copy: true, fullscreen: true };
const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "toolbar", label: "Toolbar", options: ["always", "hover"] },
  { type: "select", prop: "placement", label: "Placement", options: ["top-end", "top-start", "bottom-end", "bottom-start"] },
  { type: "boolean", prop: "png", label: "PNG" },
  { type: "boolean", prop: "svg", label: "SVG" },
  { type: "boolean", prop: "csv", label: "CSV" },
  { type: "boolean", prop: "copy", label: "Copy image" },
  { type: "boolean", prop: "fullscreen", label: "Fullscreen" },
];
const formatsOf = (p: DemoProps) => (["png", "svg", "csv", "copy"] as const).filter((f) => p[f]);
const usd = { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 } as const;

function Preview({ props }: { props: DemoProps }) {
  const [seed, randomize] = useSeed(2);
  const data = useMemo(() => monthlyRevenue(seed), [seed]);
  const [last, setLast] = useState<string | null>(null);
  return (
    <ChartDemo onRandomize={randomize} hint="Download the chart as PNG or SVG (styles inlined, theme resolved), its data as CSV, copy it, or go fullscreen.">
      <ChartExport toolbar={props.toolbar} placement={props.placement} formats={formatsOf(props)} fullscreen={props.fullscreen} onExport={(f) => setLast(f)} className="w-full">
        <LineChart
          data={data}
          x="month"
          series={[
            { id: "revenue", y: "revenue", label: "Revenue", format: usd },
            { id: "cost", y: "cost", label: "Cost", format: usd },
          ]}
          area
          height={260}
          title="Revenue vs cost"
          description="Monthly, FY2026"
        />
      </ChartExport>
      <p className="text-xs text-pui-muted-foreground" aria-live="polite">
        {last ? `Last export: ${last}` : "Exports respect the current theme: try it in dark mode."}
      </p>
    </ChartDemo>
  );
}

function Mini() {
  const data = useMemo(() => channels(3, 6), []);
  return (
    <ChartExport toolbar="always" fullscreen={false} formats={["png", "svg", "csv"]} className="pointer-events-none w-56">
      <BarChart data={data} x="month" series={[{ id: "organic", y: "organic" }]} height={110} legend="none" initialWidth={220} animation="never" className="[&_text]:hidden" />
    </ChartExport>
  );
}

function External() {
  const ref = useRef<HTMLDivElement>(null);
  const [seed, randomize] = useSeed(9);
  const data = useMemo(() => channels(seed), [seed]);
  const [log, setLog] = useState<ChartExportFormat | "fullscreen" | null>(null);
  return (
    <ChartDemo onRandomize={randomize} hint="ChartToolbar targets any element by ref, so it can live in a card header.">
      <div className="flex w-full flex-col gap-3 rounded-pui-lg border border-pui-border p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold">Acquisition by channel</span>
          <ChartToolbar target={ref} fullscreen fullscreenTarget={ref} filename="acquisition" onExport={setLog} />
        </div>
        <div ref={ref} className="bg-pui-background">
          <BarChart
            data={data}
            x="month"
            mode="stacked"
            series={[
              { id: "organic", y: "organic", label: "Organic" },
              { id: "paid", y: "paid", label: "Paid" },
              { id: "referral", y: "referral", label: "Referral" },
              { id: "social", y: "social", label: "Social" },
            ]}
            height={240}
          />
        </div>
        <p className="text-xs text-pui-muted-foreground" aria-live="polite">
          {log ? `Exported: ${log}` : "Arrow keys move between the toolbar buttons."}
        </p>
      </div>
    </ChartDemo>
  );
}

function HtmlLabels() {
  const ref = useRef<HTMLDivElement>(null);
  const [seed, randomize] = useSeed(3);
  const steps = useMemo(() => checkoutFunnel(seed), [seed]);
  const [preview, setPreview] = useState<string | null>(null);
  const render = () => {
    if (!ref.current) return;
    setPreview(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(chartToSvgString(ref.current))}`);
  };
  return (
    <ChartDemo onRandomize={randomize} hint="Stage labels and conversion pills are HTML over the SVG; exports turn them into SVG text and rects.">
      <div className="grid w-full gap-4 md:grid-cols-2">
        <ChartExport ref={ref} toolbar="always" formats={["png", "svg"]} fullscreen={false} className="w-full">
          <FunnelChart steps={steps} title="Checkout funnel" description="Sessions per step" className="w-full" />
        </ChartExport>
        <div className="flex flex-col gap-2">
          <Button size="sm" variant="outline" tone="neutral" onClick={render} className="self-start">
            Render SVG export
          </Button>
          <div className="flex min-h-48 items-center justify-center rounded-pui-lg border border-dashed border-pui-border p-2">
            {preview ? <img src={preview} alt="SVG export of the checkout funnel" className="max-h-80 w-full object-contain" /> : <span className="text-xs text-pui-muted-foreground">The exported SVG appears here.</span>}
          </div>
        </div>
      </div>
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
      "<ChartExport",
      p.toolbar !== "hover" ? `  toolbar="${p.toolbar}"` : null,
      p.placement !== "top-end" ? `  placement="${p.placement}"` : null,
      formatsOf(p).length !== 4 ? `  formats={${JSON.stringify(formatsOf(p))}}` : null,
      p.fullscreen ? null : "  fullscreen={false}",
      ">",
      '  <LineChart data={rows} x="month" series={series} title="Revenue vs cost" />',
      "</ChartExport>",
      "",
      "// or imperatively",
      "await exportChartPng(el, { scale: 2 });",
      'exportChartCsv(rows, { columns: [{ key: "month" }, { key: "revenue", label: "Revenue" }] });',
    ]
      .filter((l) => l !== null)
      .join("\n"),
  propsTable: propDocs<ChartExportProps>()([
    { name: "children", type: "ReactNode", description: "Any chart (or element containing an <svg>)." },
    { name: "formats", type: '("png" | "svg" | "csv" | "copy")[]', default: '["png", "svg", "csv", "copy"]', description: "Buttons, in order." },
    { name: "fullscreen", type: "boolean", default: "true", description: "Adds a fullscreen toggle for the wrapper." },
    { name: "toolbar", type: '"hover" | "always"', default: '"hover"', description: "Show on hover and focus (always on touch screens), or always." },
    { name: "placement", type: '"top-end" | "top-start" | "bottom-end" | "bottom-start"', default: '"top-end"', description: "Toolbar corner." },
    { name: "filename", type: "string", description: "File name without extension. Default: the chart title, slugified." },
    { name: "csv", type: "{ rows, columns? }", description: "CSV rows. Default: read from the chart's own data table." },
    { name: "image", type: "{ scale?, background?, includeTitle?, padding? }", description: "PNG/SVG options (scale 2, theme background, title on)." },
    { name: "onExport", type: "(format) => void", description: "Called after a successful export or fullscreen toggle." },
    { name: "labels", type: "Partial<Record<format, string>>", description: "Accessible button labels." },
  ]),
  keyboard: [
    { keys: "Tab", action: "Focus the toolbar (one tab stop)" },
    { keys: "← / →, Home / End", action: "Move between buttons" },
    { keys: "Enter / Space", action: "Run the export" },
    { keys: "Escape", action: "Exit fullscreen (browser)" },
  ],
  a11y: [
    'A role="toolbar" with roving focus and labelled icon buttons.',
    "Results are announced in a polite live region (downloaded, copied, failed, fullscreen on/off).",
    "CSV comes from the chart's accessible data table, so it matches what screen readers get.",
  ],
  reducedMotion: "The success check swaps in without the scale and blur morph; hover reveal has no fade.",
  examples: [
    { title: "Toolbar in a card header", description: "ChartToolbar with a target ref and a custom file name.", Demo: External, wide: true },
    { title: "HTML labels in exports", description: "A funnel's HTML stage labels and pills are captured in the SVG/PNG (includeHtml, on by default).", Demo: HtmlLabels, wide: true },
  ],
};
export default item;
