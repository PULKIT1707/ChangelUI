import { InlineCitation, Sources, type CitationSource, type InlineCitationProps } from "changelui";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";
type DemoProps = {
  numbered: boolean;
  grouped: boolean;
  sourcesOpen: boolean;
};
const defaults: DemoProps = { numbered: true, grouped: true, sourcesOpen: false };
const controls: ControlSpec<DemoProps>[] = [
  { type: "boolean", prop: "numbered", label: "Numbered chips" },
  { type: "boolean", prop: "grouped", label: "Group sources on one claim" },
  { type: "boolean", prop: "sourcesOpen", label: "Sources open" },
];
const sources: CitationSource[] = [
  {
    title: "Heat pumps: how they work and what they cost to run",
    url: "https://energy.example.org/guides/heat-pumps",
    site: "energy.example.org",
    date: "Feb 2026",
    snippet: "A typical air-source heat pump delivers 3 to 4 units of heat for every unit of electricity it uses.",
  },
  {
    title: "Cold-climate performance of air-source heat pumps",
    url: "https://lab.example.edu/reports/cold-climate",
    site: "lab.example.edu",
    date: "Nov 2025",
    snippet: "Modern units kept a coefficient of performance above 2 at outdoor temperatures down to −15 °C.",
  },
  {
    title: "Installer survey: average quotes by region",
    url: "https://news.example.com/heat-pump-prices",
    snippet: "Quotes for a whole-home system ranged from $9,000 to $16,000 before incentives.",
  },
  {
    title: "Home energy rebates 2026",
    url: "https://www.example.gov/rebates",
    date: "Jan 2026",
    snippet: "Households can claim up to 30% of installation costs, capped at $2,000 per year.",
  },
];
function Preview({ props }: { props: DemoProps }) {
  const [a, b, d, c] = sources as [CitationSource, CitationSource, CitationSource, CitationSource];
  const n = (i: number) => (props.numbered ? i : undefined);
  return (
    <article className="flex w-full max-w-xl flex-col gap-4 rounded-pui-lg border border-pui-border bg-pui-surface p-5 text-[0.95rem] leading-7 shadow-pui-xs">
      <p className="m-0 text-pui-foreground">
        Yes. A heat pump usually costs less to run than a gas furnace, because it moves heat instead of making it: you get
        3 to 4 units of heat per unit of electricity
        <InlineCitation index={n(1)} source={props.grouped ? [a, b] : a} />. Newer models still work well in cold winters
        {props.grouped ? null : <InlineCitation index={n(2)} source={b} />}.
      </p>
      <p className="m-0 text-pui-foreground">
        Installed systems typically cost $9,000 to $16,000
        <InlineCitation index={n(3)} source={d} />, and rebates can cover up to 30%
        <InlineCitation index={n(4)} source={c} />.
      </p>
      <Sources key={String(props.sourcesOpen)} sources={sources} defaultOpen={props.sourcesOpen} />
    </article>
  );
}
function Mini() {
  return (
    <div aria-hidden="true" className="pointer-events-none flex w-64 flex-col gap-2 text-xs leading-6 text-pui-foreground">
      <p className="m-0">
        Heat pumps deliver 3–4 units of heat per unit of power
        <InlineCitation index={1} source={sources[0]!} tabIndex={-1} />, even in cold climates
        <InlineCitation index={2} source={sources[1]!} tabIndex={-1} />.
      </p>
    </div>
  );
}
/** Site-name chips read like a news app or research tool. */
function SiteChipsDemo() {
  return (
    <p className="m-0 text-sm leading-7 text-pui-foreground">
      Rebates cover up to 30% of installation
      <InlineCitation source={sources[3]!} />, and cold-climate models keep working below −15 °C
      <InlineCitation source={sources[1]!} />.
    </p>
  );
}
/** Just the sources strip, open, under a chat answer. */
function SourcesDemo() {
  return <Sources sources={sources} defaultOpen />;
}
const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) =>
    [
      "<p>",
      "  Heat pumps deliver 3 to 4 units of heat per unit of electricity",
      props.grouped ? `  <InlineCitation${props.numbered ? " index={1}" : ""} source={[guide, labReport]} />.` : `  <InlineCitation${props.numbered ? " index={1}" : ""} source={guide} />.`,
      "</p>",
      `<Sources sources={sources}${props.sourcesOpen ? " defaultOpen" : ""} />`,
    ].join("\n"),
  propsTable: propDocs<InlineCitationProps>()([
    { name: "source", type: "CitationSource | CitationSource[]", required: true, description: "{ title, url, snippet?, site?, icon?, date? }; several sources page inside the preview." },
    { name: "index", type: "number", description: "Number in the chip; without it the chip shows the site name." },
    { name: "openDelayMs", type: "number", default: "200", description: "Hover or keyboard-focus delay before the preview opens." },
  ]),
  keyboard: [
    { keys: "Tab", action: "Focus a citation; its preview opens after a short delay" },
    { keys: "Tab (again)", action: "Move into the preview: title link, pager, Open source" },
    { keys: "Enter", action: "Open the source in a new tab" },
    { keys: "Escape", action: "Close the preview" },
  ],
  a11y: [
    "Each chip is a real link named “Source 2: {title}”, so it makes sense out of context.",
    "Links open in a new tab with rel=noopener noreferrer; “Open source” says so to screen readers.",
    "Sources is a disclosure button with aria-expanded and a numbered list.",
  ],
  reducedMotion: "The preview pages and the source list appear without sliding.",
  examples: [
    { title: "Site chips", description: "Without index, the chip names the site.", Demo: SiteChipsDemo },
    { title: "Sources strip", description: "Numbered to match the chips.", Demo: SourcesDemo },
  ],
};
export default item;
