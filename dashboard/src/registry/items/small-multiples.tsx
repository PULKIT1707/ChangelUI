import { Chart, ChartCrosshair, ChartGrid, LineSeries, ChartTooltip, ReferenceLine, SmallMultiples, XAxis, YAxis, type FacetSort, type SmallMultiplesProps } from "changelui";
import { useMemo, useState } from "react";
import { ChartDemo } from "../../components/chart-demo";
import { monthlyRevenue, regionWeekly, useSeed, type FacetRow } from "../../lib/chart-data";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";
type DemoProps = {
  kind: "area" | "line" | "bar";
  sharedScale: "y" | "both" | "none";
  sort: FacetSort;
  columns: "auto" | "2" | "3" | "4";
  color: "single" | "palette";
  facetHeight: number;
  stats: boolean;
  sync: boolean;
  expandable: boolean;
};
const defaults: DemoProps = { kind: "area", sharedScale: "y", sort: "none", columns: "auto", color: "single", facetHeight: 110, stats: true, sync: true, expandable: true };
const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "kind", label: "Chart", options: ["area", "line", "bar"] },
  { type: "select", prop: "sharedScale", label: "Shared scale", options: ["y", "both", "none"] },
  { type: "select", prop: "sort", label: "Sort", options: ["none", "last", "change", "total", "alpha"] },
  { type: "select", prop: "columns", label: "Columns", options: ["auto", "2", "3", "4"] },
  { type: "select", prop: "color", label: "Color", options: ["single", "palette"] },
  { type: "number", prop: "facetHeight", label: "Facet height", min: 70, max: 200, step: 10 },
  { type: "boolean", prop: "stats", label: "Header stats" },
  { type: "boolean", prop: "sync", label: "Synced crosshair" },
  { type: "boolean", prop: "expandable", label: "Click to expand" },
];
const thousands = (v: number) => `${v.toFixed(1)}K`;
function Preview({ props }: { props: DemoProps }) {
  const [seed, randomize] = useSeed(5);
  const rows = useMemo(() => regionWeekly(seed), [seed]);
  const { columns, kind, ...rest } = props;
  return (
    <ChartDemo onRandomize={randomize} hint="Hover any facet: every facet shows the same week. Click a title (or Enter) to expand it; arrows move between titles.">
      <SmallMultiples<FacetRow>
        {...rest}
        kind={kind}
        columns={columns === "auto" ? "auto" : Number(columns)}
        title="Weekly active users by region"
        description="Thousands, H1 2026"
        data={rows}
        facet="region"
        x="week"
        y="users"
        format={thousands}
        minFacetWidth={200}
      />
    </ChartDemo>
  );
}
function Mini() {
  const rows = useMemo(() => regionWeekly(3, 16).filter((r) => ["North America", "Europe", "India", "Japan"].includes(r.region)), []);
  return <SmallMultiples data={rows} facet="region" x="week" y="users" columns={2} facetHeight={52} stats={false} expandable={false} animation="never" initialWidth={260} className="w-64" />;
}
const PRODUCTS = ["Starter", "Pro", "Team", "Enterprise"];
/** A custom renderer: each product's monthly revenue on the shared axis, with its own plan line. */
function CustomFacets() {
  const [seed, randomize] = useSeed(8);
  const rows = useMemo(() => PRODUCTS.flatMap((p, k) => monthlyRevenue(seed * 5 + k).map((r) => ({ product: p, month: r.month, revenue: r.revenue * (0.4 + k * 0.35), plan: 48_000 * (0.4 + k * 0.35) }))), [seed]);
  const [open, setOpen] = useState<string | null>(null);
  return (
    <ChartDemo onRandomize={randomize} hint="chart={(rows, ctx) => ...} renders anything per facet; ctx carries the shared domain, height and expanded state.">
      <SmallMultiples
        data={rows}
        facet="product"
        x="month"
        y="revenue"
        columns={2}
        expanded={open}
        onExpandedChange={setOpen}
        color="palette"
        format={{ style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 0 }}
        chart={(facetRows, ctx) => (
          <Chart data={facetRows} x="month" height={ctx.height} margin={ctx.expanded ? undefined : { top: 8, right: 8, bottom: 22, left: 8 }} chartLabel={`${ctx.key} revenue`}>
            <ChartGrid />
            <XAxis tickCount={ctx.expanded ? 12 : 4} />
            <YAxis min={ctx.yDomain?.[0]} max={ctx.yDomain?.[1]} hide={!ctx.expanded} format={{ notation: "compact" }} />
            <LineSeries id="revenue" y="revenue" label={ctx.key} color={ctx.color} format={{ style: "currency", currency: "USD", maximumFractionDigits: 0 }} />
            <ReferenceLine y={facetRows[0]?.plan ?? 0} label={ctx.expanded ? "Plan" : undefined} tone="neutral" />
            <ChartCrosshair />
            <ChartTooltip showDelta />
          </Chart>
        )}
      />
      <p className="text-xs text-pui-muted-foreground" aria-live="polite">
        {open ? `Expanded: ${open}` : "Nothing expanded"}
      </p>
    </ChartDemo>
  );
}
function Independent() {
  const [seed, randomize] = useSeed(12);
  const rows = useMemo(() => regionWeekly(seed), [seed]);
  return (
    <ChartDemo onRandomize={randomize} hint='sharedScale="none" lets each facet fit its own range: shapes become comparable, levels do not.'>
      <SmallMultiples data={rows} facet="region" x="week" y="users" kind="line" sharedScale="none" sort="change" columns={4} facetHeight={80} format={thousands} expandable={false} />
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
      "<SmallMultiples",
      "  data={rows}",
      '  facet="region"',
      '  x="week"',
      '  y="users"',
      p.kind !== "area" ? `  kind="${p.kind}"` : null,
      p.sharedScale !== "y" ? `  sharedScale="${p.sharedScale}"` : null,
      p.sort !== "none" ? `  sort="${p.sort}"` : null,
      p.columns !== "auto" ? `  columns={${p.columns}}` : null,
      p.color !== "single" ? `  color="${p.color}"` : null,
      p.facetHeight !== 120 ? `  facetHeight={${p.facetHeight}}` : null,
      p.stats ? null : "  stats={false}",
      p.sync ? null : "  sync={false}",
      p.expandable ? null : "  expandable={false}",
      "/>",
    ]
      .filter(Boolean)
      .join("\n"),
  propsTable: propDocs<SmallMultiplesProps<unknown>>()([
    { name: "data", type: "T[]", required: true, description: "All rows; grouped by facet." },
    { name: "facet", type: "Accessor<T, string>", required: true, description: "Group per row." },
    { name: "x", type: "Accessor<T, XValue>", required: true, description: "x per row." },
    { name: "y", type: "Accessor<T, number>", description: "Value per row: shared scale, header stats and the default mini chart." },
    { name: "kind", type: '"area" | "line" | "bar"', default: '"area"', description: "Default mini chart." },
    { name: "chart", type: "(rows, ctx) => ReactNode", description: "Custom facet renderer (ctx: key, yDomain, xDomain, height, expanded, color)." },
    { name: "sharedScale", type: '"y" | "both" | "none"', default: '"y"', description: "Share the value axis, both axes, or nothing." },
    { name: "sort", type: '"none" | "total" | "last" | "change" | "alpha" | string[]', default: '"none"', description: "Facet order; changes re-flow on a layout spring." },
    { name: "columns", type: '"auto" | number', default: '"auto"', description: "Fixed columns, or as many as fit at minFacetWidth." },
    { name: "expandable", type: "boolean", default: "true", description: "Click a title to grow a facet to full width." },
    { name: "expanded", type: "string | null", description: "Controlled expanded facet (with onExpandedChange)." },
    { name: "sync", type: "boolean", default: "true", description: "One crosshair across all facets." },
    { name: "stats", type: "boolean", default: "true", description: "Latest value and change in each header." },
    { name: "color", type: '"single" | "palette"', default: '"single"', description: "One color, or a palette color per facet." },
  ]),
  keyboard: [
    { keys: "Tab", action: "Focus the facet titles (one tab stop), then each facet's chart" },
    { keys: "\u2190 \u2192 \u2191 \u2193", action: "Move between facet titles in the grid" },
    { keys: "Home / End", action: "First / last facet" },
    { keys: "Enter / Space", action: "Expand or collapse the facet" },
    { keys: "Escape", action: "Collapse the expanded facet" },
  ],
  a11y: [
    "The grid is a labelled list; each facet is its own chart figure with a generated summary.",
    "Titles are toggle buttons with aria-expanded and a roving tab stop.",
    "Keyboard exploration in one facet moves the synced crosshair in the others.",
  ],
  reducedMotion: "Facets appear in place; sorting and expanding re-flow without the layout spring.",
  examples: [
    { title: "Custom facets", description: "Any chart per facet, with a plan line, controlled expansion.", Demo: CustomFacets, wide: true },
    { title: "Independent scales", description: "Compare shapes, sorted by change.", Demo: Independent, wide: true },
  ],
};
export default item;
