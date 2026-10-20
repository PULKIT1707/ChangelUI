import { BarList, type BarListItem, type BarListProps } from "changelui";
import { useMemo, useState } from "react";
import { ChartDemo } from "../../components/chart-demo";
import { countryUsers, topPages, trafficSources, useSeed } from "../../lib/chart-data";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  sortBy: "value" | "label" | "none";
  order: "desc" | "asc";
  max: number;
  showShare: boolean;
  changes: boolean;
  links: boolean;
  header: boolean;
  rowHeight: number;
};
const defaults: DemoProps = { sortBy: "value", order: "desc", max: 6, showShare: false, changes: true, links: true, header: true, rowHeight: 32 };
const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "sortBy", label: "Sort by", options: ["value", "label", "none"] },
  { type: "select", prop: "order", label: "Order", options: ["desc", "asc"] },
  { type: "number", prop: "max", label: "Rows before Show more", min: 2, max: 12, step: 1 },
  { type: "boolean", prop: "showShare", label: "Share of total" },
  { type: "boolean", prop: "changes", label: "Change badges" },
  { type: "boolean", prop: "links", label: "Rows are links" },
  { type: "boolean", prop: "header", label: "Header" },
  { type: "number", prop: "rowHeight", label: "Row height", min: 24, max: 48, step: 2 },
];

function Preview({ props }: { props: DemoProps }) {
  const [seed, randomize] = useSeed(5);
  const pages = useMemo(() => topPages(seed, 12), [seed]);
  const items: BarListItem[] = pages.map((p) => ({ label: p.label, value: p.value, previous: props.changes ? p.previous : undefined, href: props.links ? p.href : undefined }));
  return (
    <ChartDemo onRandomize={randomize} hint="Randomize: rows re-rank with a layout spring. Show more expands in place.">
      <BarList
        items={items}
        sortBy={props.sortBy}
        order={props.order}
        max={props.max}
        showShare={props.showShare}
        rowHeight={props.rowHeight}
        header={props.header ? ["Page", "Views"] : undefined}
        listLabel="Top pages"
        className="w-full max-w-xl"
      />
    </ChartDemo>
  );
}

function Mini() {
  const items = useMemo(() => topPages(2, 4).map((p) => ({ label: p.label, value: p.value })), []);
  return <BarList items={items} rowHeight={22} animation="never" className="w-52 text-xs" />;
}

function CodeBadge({ code }: { code: string }) {
  return <span className="inline-flex h-4 w-5 items-center justify-center rounded-[3px] bg-pui-muted text-[9px] font-bold text-pui-muted-foreground">{code}</span>;
}

function Countries() {
  const [seed, randomize] = useSeed(8);
  const items = useMemo(() => countryUsers(seed).map((c) => ({ label: c.label, value: c.value, icon: <CodeBadge code={c.code} /> })), [seed]);
  return (
    <ChartDemo onRandomize={randomize} hint="Icons, share of total and a custom bar color.">
      <BarList items={items} showShare color="var(--pui-chart-2)" header={["Country", "Users"]} listLabel="Users by country" className="w-full" />
    </ChartDemo>
  );
}

function Filter() {
  const sources = useMemo(() => trafficSources(6, 7), []);
  const [selected, setSelected] = useState<string | null>("Social");
  const pick = sources.find((s) => s.name === selected);
  return (
    <div className="flex w-full flex-col gap-3">
      <BarList
        items={sources.map((s, i) => ({ label: s.name, value: s.value, color: `var(--pui-chart-${(i % 8) + 1})` }))}
        onItemClick={(it) => setSelected(selected === it.label ? null : it.label)}
        selected={selected}
        listLabel="Traffic sources"
        className="w-full"
      />
      <p className="text-sm" aria-live="polite">
        {pick ? (
          <>
            Filtering the dashboard by <strong>{pick.name}</strong> ({pick.value.toLocaleString("en-US")} sessions)
          </>
        ) : (
          "Click a row to filter"
        )}
      </p>
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
      "<BarList",
      "  items={pages} // [{ label, value, href?, icon?, previous? }]",
      p.sortBy !== "value" ? `  sortBy="${p.sortBy}"` : null,
      p.order !== "desc" ? `  order="${p.order}"` : null,
      `  max={${p.max}}`,
      p.showShare ? "  showShare" : null,
      p.header ? '  header={["Page", "Views"]}' : null,
      p.rowHeight !== 32 ? `  rowHeight={${p.rowHeight}}` : null,
      '  listLabel="Top pages"',
      "/>",
    ]
      .filter(Boolean)
      .join("\n"),
  propsTable: propDocs<BarListProps>()([
    { name: "items", type: "BarListItem[]", required: true, description: "{ label, value, key?, href?, icon?, color?, previous?, description? }" },
    { name: "sortBy", type: '"value" | "label" | "none"', default: '"value"', description: "Ranking key." },
    { name: "order", type: '"desc" | "asc"', default: '"desc"', description: "Sort direction." },
    { name: "max", type: "number", description: 'Rows shown before "Show N more".' },
    { name: "expanded", type: "boolean", description: "Controlled expansion (with onExpandedChange)." },
    { name: "showShare", type: "boolean", default: "false", description: "Share of the total after each value." },
    { name: "invertDelta", type: "boolean", default: "false", description: "Lower is better for the change badges." },
    { name: "onItemClick", type: "(item, index) => void", description: "Makes rows buttons (aria-pressed with selected)." },
    { name: "selected", type: "string | null", description: "Highlighted row key or label." },
    { name: "header", type: "[ReactNode, ReactNode]", description: "Column headers." },
    { name: "format", type: "Intl.NumberFormatOptions | (v) => string", description: "Value format. Default compact." },
    { name: "color", type: "string", description: "Bar color for every row (items can override)." },
    { name: "rowHeight", type: "number", default: "32", description: "Row height in px." },
    { name: "listLabel", type: "string", description: "Accessible name of the list." },
  ]),
  keyboard: [
    { keys: "Tab", action: "Each link or button row, then Show more" },
    { keys: "Enter / Space", action: "Open the link or toggle the row" },
  ],
  a11y: [
    "A real <ul>: values and changes are in text, so screen readers read the ranking without a chart model.",
    "Rows are native links or toggle buttons (aria-pressed); Show more has aria-expanded.",
    "Change badges use an arrow and a sign, never color alone.",
  ],
  reducedMotion: "No width grow or re-order spring: rows and bars update in place.",
  examples: [
    { title: "Users by country", description: "Icons, share of total and a custom color.", Demo: Countries },
    { title: "Click to filter", description: "onItemClick + selected turn rows into toggle buttons.", Demo: Filter },
  ],
};
export default item;
