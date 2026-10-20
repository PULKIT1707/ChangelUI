import { ExpandableSearch, type ExpandableSearchProps } from "changelui";
import { useMemo, useState } from "react";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  width: number;
  size: NonNullable<ExpandableSearchProps["size"]>;
  placeholder: string;
  collapseOnBlur: boolean;
  suggestions: boolean;
};

const defaults: DemoProps = { width: 260, size: "md", placeholder: "Search projects", collapseOnBlur: true, suggestions: true };

const controls: ControlSpec<DemoProps>[] = [
  { type: "number", prop: "width", label: "Width", min: 160, max: 420, step: 10 },
  { type: "select", prop: "size", label: "Size", options: ["sm", "md", "lg"] },
  { type: "text", prop: "placeholder", label: "Placeholder", maxLength: 32 },
  { type: "boolean", prop: "collapseOnBlur", label: "Collapse on blur" },
  { type: "boolean", prop: "suggestions", label: "Recent suggestions" },
];

const RECENT = ["Billing dashboard", "Onboarding flow v3", "Design tokens", "Release notes", "Q4 roadmap"];

function Logo() {
  return (
    <span className="flex items-center gap-2 text-sm font-semibold">
      <span aria-hidden="true" className="grid size-6 place-items-center rounded-pui-md bg-pui-primary text-[0.65rem] text-pui-primary-foreground">
        A
      </span>
      Acme
    </span>
  );
}

function Preview({ props }: { props: DemoProps }) {
  const [last, setLast] = useState<string | null>(null);
  const { suggestions, ...rest } = props;
  return (
    <div className="flex w-full max-w-2xl flex-col gap-4">
      <header className="flex h-14 items-center gap-4 rounded-pui-xl border border-pui-border bg-pui-surface px-4 text-pui-surface-foreground shadow-pui-sm">
        <Logo />
        <nav aria-label="Demo" className="hidden gap-4 text-sm text-pui-muted-foreground sm:flex">
          <span className="text-pui-foreground">Projects</span>
          <span>Team</span>
          <span>Settings</span>
        </nav>
        <div className="ms-auto flex items-center gap-3">
          <ExpandableSearch {...rest} suggestions={suggestions ? RECENT : undefined} onSubmit={setLast} />
          <span aria-hidden="true" className="size-8 shrink-0 rounded-full bg-[linear-gradient(135deg,var(--pui-chart-1),var(--pui-chart-3))]" />
        </div>
      </header>
      <p className="m-0 text-center text-xs text-pui-muted-foreground" aria-live="polite">
        {last ? `Searched for “${last}”` : "Click the magnifier, type and press Enter. Escape clears, then collapses."}
      </p>
    </div>
  );
}

const DOCS = [
  "Installation",
  "Theming",
  "Dark mode",
  "Motion presets",
  "Dialog",
  "Drawer",
  "Command menu",
  "Date picker",
  "Carousel",
  "Sortable list",
];

function DocsHeader() {
  const [query, setQuery] = useState("");
  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex h-12 items-center justify-between rounded-pui-lg border border-pui-border bg-pui-surface px-3">
        <span className="text-sm font-semibold">Docs</span>
        <ExpandableSearch
          value={query}
          onValueChange={setQuery}
          shortcut="s"
          size="sm"
          width={220}
          placeholder="Search docs"
          suggestions={DOCS}
          suggestionsLabel="Pages"
          collapseOnBlur={false}
        />
      </div>
      <p className="m-0 text-xs text-pui-muted-foreground">
        Press <kbd className="rounded border border-pui-border bg-pui-muted px-1 font-mono">s</kbd> anywhere on the page (this
        site already uses / for its sidebar filter). Arrow keys pick a page.
      </p>
    </div>
  );
}

const ROWS = [
  { name: "Ada Lovelace", role: "Engineering", status: "Active" },
  { name: "Grace Hopper", role: "Platform", status: "Away" },
  { name: "Alan Turing", role: "Research", status: "Active" },
  { name: "Katherine Johnson", role: "Analytics", status: "Active" },
  { name: "Linus Torvalds", role: "Kernel", status: "Offline" },
];

function TableToolbar() {
  const [query, setQuery] = useState("");
  const rows = useMemo(
    () => ROWS.filter((r) => `${r.name} ${r.role}`.toLowerCase().includes(query.trim().toLowerCase())),
    [query],
  );
  return (
    <div className="w-full overflow-hidden rounded-pui-lg border border-pui-border bg-pui-surface text-sm">
      <div className="flex h-12 items-center justify-between gap-2 border-b border-pui-border px-3">
        <span className="font-medium">
          Members <span className="text-pui-muted-foreground tabular-nums">({rows.length})</span>
        </span>
        <ExpandableSearch value={query} onValueChange={setQuery} size="sm" width={200} placeholder="Filter members" label="Filter members" />
      </div>
      <ul className="m-0 list-none p-0">
        {rows.map((r) => (
          <li key={r.name} className="flex items-center justify-between border-b border-pui-border px-3 py-2 last:border-b-0">
            <span>{r.name}</span>
            <span className="text-xs text-pui-muted-foreground">{r.role}</span>
          </li>
        ))}
        {rows.length === 0 ? <li className="px-3 py-6 text-center text-xs text-pui-muted-foreground">No members match.</li> : null}
      </ul>
    </div>
  );
}

function Mini() {
  return (
    <div aria-hidden="true" className="pointer-events-none flex w-60 justify-end">
      <ExpandableSearch defaultExpanded defaultValue="Design tok" width={220} tabIndex={-1} />
    </div>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: ({ suggestions, ...props }) =>
    toJsx<Record<string, unknown>>(
      "ExpandableSearch",
      { ...props, ...(suggestions ? { suggestions: "{recent}" } : {}), onSubmit: "{search}" },
      { width: 240, size: "md", placeholder: "Search", collapseOnBlur: true },
      undefined,
      controls as ControlSpec<Record<string, unknown>>[],
    )
      .replace('suggestions="{recent}"', "suggestions={recent}")
      .replace('onSubmit="{search}"', "onSubmit={search}"),
  propsTable: propDocs<ExpandableSearchProps>()([
    { name: "value", type: "string", description: "Controlled query." },
    { name: "defaultValue", type: "string", default: '""', description: "Initial query (uncontrolled)." },
    { name: "onValueChange", type: "(value: string) => void", description: "Every keystroke." },
    { name: "expanded", type: "boolean", description: "Controlled open state." },
    { name: "defaultExpanded", type: "boolean", default: "false", description: "Start expanded." },
    { name: "onExpandedChange", type: "(expanded: boolean) => void", description: "Open state changes." },
    { name: "onSubmit", type: "(value: string) => void", description: "Enter, or picking a suggestion." },
    { name: "width", type: "number", default: "240", description: "Expanded width in px." },
    { name: "size", type: '"sm" | "md" | "lg"', default: '"md"', description: "Height 32 / 36 / 44 px." },
    { name: "placeholder", type: "string", default: '"Search"', description: "Field placeholder." },
    { name: "suggestions", type: "string[]", description: "Recent searches shown while focused, filtered as you type." },
    { name: "suggestionsLabel", type: "string", default: '"Recent"', description: "Heading and listbox name." },
    { name: "shortcut", type: "string", description: 'A single key, e.g. "/", that opens the field from anywhere.' },
    { name: "collapseOnBlur", type: "boolean", default: "true", description: "Collapse when focus leaves an empty field." },
    { name: "label", type: "string", default: '"Search"', description: "Name of the toggle and the field." },
    { name: "closeLabel", type: "string", default: '"Close search"', description: "Name of the close button." },
    { name: "inputProps", type: "InputHTMLAttributes", description: "Passed to the input (name, autoFocus, ...)." },
  ]),
  keyboard: [
    { keys: "Enter / Space (toggle)", action: "Expand and focus the field" },
    { keys: "ArrowDown / ArrowUp", action: "Move through suggestions" },
    { keys: "Enter", action: "Search, or pick the highlighted suggestion" },
    { keys: "Escape", action: "Clear the field, then collapse and return focus" },
    { keys: "shortcut", action: "Open from anywhere (ignored while typing elsewhere)" },
  ],
  a11y: [
    "role=search landmark. The toggle has aria-expanded and aria-controls.",
    "With suggestions, the field is a combobox using aria-activedescendant, so focus never leaves it.",
    "Collapsing returns focus to the toggle.",
  ],
  reducedMotion: "The width changes instantly; the field and suggestions only fade.",
  examples: [
    { title: "Docs header with a keyboard shortcut", description: "Controlled value, suggestions as page links.", Demo: DocsHeader },
    { title: "Table toolbar filter", description: "Filters rows as you type.", Demo: TableToolbar },
  ],
};

export default item;
