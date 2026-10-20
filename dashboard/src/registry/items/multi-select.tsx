import { Badge, Button, MultiSelect, type MultiSelectOption, type MultiSelectProps } from "changelui";
import { useId, useMemo, useState } from "react";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  size: NonNullable<MultiSelectProps["size"]>;
  tone: NonNullable<MultiSelectProps["tone"]>;
  max: number;
  maxVisibleChips: number;
  creatable: boolean;
  closeOnSelect: boolean;
  showFooter: boolean;
  groups: boolean;
  disabled: boolean;
  invalid: boolean;
};

const defaults: DemoProps = {
  size: "md",
  tone: "primary",
  max: 0,
  maxVisibleChips: 0,
  creatable: true,
  closeOnSelect: false,
  showFooter: true,
  groups: true,
  disabled: false,
  invalid: false,
};

const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "size", label: "Size", options: ["sm", "md", "lg"] },
  { type: "select", prop: "tone", label: "Chip tone", options: ["neutral", "primary", "success", "warning", "danger", "info"] },
  { type: "number", prop: "max", label: "Max (0 = none)", min: 0, max: 8, step: 1 },
  { type: "number", prop: "maxVisibleChips", label: "Visible chips (0 = all)", min: 0, max: 6, step: 1 },
  { type: "boolean", prop: "creatable", label: "Creatable" },
  { type: "boolean", prop: "closeOnSelect", label: "Close on select" },
  { type: "boolean", prop: "showFooter", label: "Footer" },
  { type: "boolean", prop: "groups", label: "Groups" },
  { type: "boolean", prop: "disabled", label: "Disabled" },
  { type: "boolean", prop: "invalid", label: "Invalid" },
];

const stack: MultiSelectOption[] = [
  { value: "react", label: "React", group: "Frontend" },
  { value: "vue", label: "Vue", group: "Frontend" },
  { value: "svelte", label: "Svelte", group: "Frontend" },
  { value: "solid", label: "Solid", group: "Frontend" },
  { value: "astro", label: "Astro", group: "Frontend" },
  { value: "node", label: "Node.js", group: "Backend", keywords: ["javascript"] },
  { value: "deno", label: "Deno", group: "Backend" },
  { value: "go", label: "Go", group: "Backend", keywords: ["golang"] },
  { value: "rails", label: "Ruby on Rails", group: "Backend" },
  { value: "django", label: "Django", group: "Backend", keywords: ["python"] },
  { value: "postgres", label: "PostgreSQL", group: "Data", keywords: ["sql"] },
  { value: "sqlite", label: "SQLite", group: "Data", keywords: ["sql"] },
  { value: "redis", label: "Redis", group: "Data", keywords: ["cache"] },
  { value: "duckdb", label: "DuckDB", group: "Data", keywords: ["analytics"] },
];

function Preview({ props }: { props: DemoProps }) {
  const id = useId();
  const [value, setValue] = useState<string[]>(["react", "postgres"]);
  const [extra, setExtra] = useState<MultiSelectOption[]>([]);
  const options = useMemo(
    () => [...stack, ...extra].map((o) => (props.groups ? o : { ...o, group: undefined })),
    [extra, props.groups],
  );
  return (
    <div className="flex w-full max-w-sm flex-col gap-3">
      <label htmlFor={id} className="text-sm font-medium text-pui-foreground">
        Tech stack
      </label>
      <MultiSelect
        options={options}
        value={value}
        onValueChange={setValue}
        size={props.size}
        tone={props.tone}
        max={props.max || undefined}
        maxVisibleChips={props.maxVisibleChips || undefined}
        creatable={props.creatable}
        onCreate={(text) => setExtra((prev) => [...prev, { value: text, label: text, group: "Yours" }])}
        closeOnSelect={props.closeOnSelect}
        showFooter={props.showFooter}
        disabled={props.disabled}
        invalid={props.invalid}
        inputProps={{ id }}
      />
      <p className="m-0 text-xs text-pui-muted-foreground">Backspace in the empty field removes the last chip.</p>
      <p className="m-0 font-mono text-xs text-pui-muted-foreground" aria-live="polite">
        value: [{value.join(", ")}]
      </p>
    </div>
  );
}

function Mini() {
  return (
    <div aria-hidden="true" className="pointer-events-none w-60">
      <MultiSelect
        aria-label="Stack"
        options={stack}
        defaultValue={["react", "go", "postgres", "redis"]}
        maxVisibleChips={3}
        inputProps={{ tabIndex: -1 }}
      />
    </div>
  );
}

const labelColors: Record<string, string> = {
  bug: "bg-pui-danger",
  feature: "bg-pui-primary",
  docs: "bg-pui-info",
  perf: "bg-pui-warning",
  a11y: "bg-pui-success",
  design: "bg-[var(--pui-chart-4,var(--pui-primary))]",
  "good-first": "bg-[var(--pui-chart-2,var(--pui-success))]",
};
const issueLabels: MultiSelectOption[] = [
  { value: "bug", label: "bug", description: "Something isn't working" },
  { value: "feature", label: "feature", description: "New capability" },
  { value: "docs", label: "docs", description: "Documentation only" },
  { value: "perf", label: "performance", description: "Faster or smaller", keywords: ["perf", "speed"] },
  { value: "a11y", label: "accessibility", description: "Keyboard, screen readers, contrast", keywords: ["a11y"] },
  { value: "design", label: "design", description: "Visual polish" },
  { value: "good-first", label: "good first issue", description: "Friendly for newcomers" },
];

/** GitHub-style labels: renderOption with color swatches, max three per issue. */
function LabelsDemo() {
  const id = useId();
  const [value, setValue] = useState<string[]>(["bug", "a11y"]);
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-3 rounded-pui-xl border border-pui-border bg-pui-surface p-4 text-pui-surface-foreground">
      <div className="flex items-baseline justify-between gap-3">
        <p className="m-0 text-sm font-semibold">Combobox loses focus inside dialogs</p>
        <span className="font-mono text-xs text-pui-muted-foreground">#418</span>
      </div>
      <label htmlFor={id} className="text-xs font-medium text-pui-muted-foreground">
        Labels (up to 3)
      </label>
      <MultiSelect
        options={issueLabels}
        value={value}
        onValueChange={setValue}
        max={3}
        tone="neutral"
        inputProps={{ id }}
        placeholder="Add labels…"
        renderOption={(option) => (
          <span className="flex min-w-0 flex-1 items-center gap-2.5">
            <span aria-hidden="true" className={`size-3 shrink-0 rounded-full ${labelColors[option.value] ?? "bg-pui-muted-foreground"}`} />
            <span className="flex min-w-0 flex-col">
              <span className="truncate font-medium">{option.label}</span>
              <span className="truncate text-xs text-pui-muted-foreground">{option.description}</span>
            </span>
          </span>
        )}
      />
      <div className="flex flex-wrap gap-1.5" aria-label="Applied labels">
        {value.map((v) => (
          <span key={v} className="inline-flex items-center gap-1.5 rounded-pui-full border border-pui-border px-2 py-0.5 text-xs">
            <span aria-hidden="true" className={`size-2 rounded-full ${labelColors[v] ?? ""}`} />
            {issueLabels.find((l) => l.value === v)?.label ?? v}
          </span>
        ))}
      </div>
    </div>
  );
}

const projects = [
  { name: "Aurora dashboard", stack: ["react", "node", "postgres"], stars: 1820 },
  { name: "Pocket CMS", stack: ["svelte", "deno", "sqlite"], stars: 940 },
  { name: "Ledger API", stack: ["go", "postgres", "redis"], stars: 2310 },
  { name: "Notebook", stack: ["solid", "duckdb"], stars: 610 },
  { name: "Storefront", stack: ["astro", "rails", "postgres"], stars: 1275 },
  { name: "Realtime chat", stack: ["vue", "node", "redis"], stars: 1490 },
];

/** Filter bar: compact field with a +N overflow chip narrowing a list live. */
function FilterDemo() {
  const id = useId();
  const [value, setValue] = useState<string[]>(["postgres"]);
  const shown = value.length === 0 ? projects : projects.filter((p) => value.every((v) => p.stack.includes(v)));
  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={id} className="text-sm font-medium text-pui-foreground">
          Built with
        </label>
        <div className="min-w-0 flex-1">
          <MultiSelect
            size="sm"
            options={stack}
            value={value}
            onValueChange={setValue}
            maxVisibleChips={2}
            tone="info"
            inputProps={{ id }}
            placeholder="Any technology"
          />
        </div>
        <Button size="sm" variant="ghost" onClick={() => setValue([])} disabled={value.length === 0}>
          Reset
        </Button>
      </div>
      <ul className="m-0 grid list-none gap-2 p-0 sm:grid-cols-2" aria-live="polite">
        {shown.map((p) => (
          <li key={p.name} className="flex items-center justify-between gap-3 rounded-pui-lg border border-pui-border bg-pui-surface px-3 py-2 text-pui-surface-foreground">
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{p.name}</span>
              <span className="block truncate text-xs text-pui-muted-foreground">{p.stack.map((s) => stack.find((o) => o.value === s)?.label).join(" · ")}</span>
            </span>
            <Badge variant="soft">★ {p.stars.toLocaleString("en-US")}</Badge>
          </li>
        ))}
        {shown.length === 0 ? <li className="col-span-full py-6 text-center text-sm text-pui-muted-foreground">No project uses all of these.</li> : null}
      </ul>
    </div>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) => {
    const attrs = ["options={stack}", "value={value}", "onValueChange={setValue}"];
    if (props.size !== "md") attrs.push(`size="${props.size}"`);
    if (props.tone !== "primary") attrs.push(`tone="${props.tone}"`);
    if (props.max) attrs.push(`max={${props.max}}`);
    if (props.maxVisibleChips) attrs.push(`maxVisibleChips={${props.maxVisibleChips}}`);
    if (props.creatable) attrs.push("creatable", "onCreate={(text) => addOption(text)}");
    if (props.closeOnSelect) attrs.push("closeOnSelect");
    if (!props.showFooter) attrs.push("showFooter={false}");
    if (props.disabled) attrs.push("disabled");
    if (props.invalid) attrs.push("invalid");
    return `const stack = [
  { value: "react", label: "React"${props.groups ? ', group: "Frontend"' : ""} },
  { value: "go", label: "Go"${props.groups ? ', group: "Backend"' : ""}, keywords: ["golang"] },
  { value: "postgres", label: "PostgreSQL"${props.groups ? ', group: "Data"' : ""} },
];
const [value, setValue] = useState<string[]>(["react"]);

<label htmlFor="stack">Tech stack</label>
<MultiSelect
  ${attrs.join("\n  ")}
  inputProps={{ id: "stack" }}
/>`;
  },
  propsTable: propDocs<MultiSelectProps>()([
    { name: "options", type: "(string | MultiSelectOption)[]", required: true, description: "{ value, label, description, icon, group, keywords, disabled }." },
    { name: "value", type: "string[]", description: "Picked values (defaultValue, onValueChange)." },
    { name: "max", type: "number", description: "Most values; other options disable at the limit." },
    { name: "maxVisibleChips", type: "number", description: "Chips before a +N overflow chip (its label lists the rest)." },
    { name: "tone", type: "Tone", default: '"primary"', description: "Chip color." },
    { name: "creatable", type: "boolean", default: "false", description: "Add typed text as a value (onCreate)." },
    { name: "closeOnSelect", type: "boolean", default: "false", description: "Close after each pick." },
    { name: "showFooter", type: "boolean", default: "true", description: "Count + Clear footer in the list." },
    { name: "filter", type: "(option, query) => boolean | false", description: "Custom match, or false to filter yourself." },
    { name: "renderOption", type: "(option, state) => ReactNode", description: "Custom option content; the checkbox stays." },
    { name: "removeLabel", type: "(label) => string", default: "`Remove ${label}`", description: "Name of each chip's remove button." },
    { name: "name", type: "string", description: "One hidden form input per value; reset restores defaultValue." },
    { name: "inputProps", type: "InputHTMLAttributes", description: "For the inner input: id (label htmlFor), aria-label, ..." },
    { name: "size", type: '"sm" | "md" | "lg"', default: '"md"', description: "Field height and chip size." },
  ]),
  keyboard: [
    { keys: "Type", action: "Filter and open the list" },
    { keys: "ArrowDown / ArrowUp", action: "Open, then move the highlight" },
    { keys: "Enter", action: "Toggle the highlighted option (the list stays open)" },
    { keys: "Backspace (empty field)", action: "Remove the last chip" },
    { keys: "Backspace / Delete (chip button)", action: "Remove that chip" },
    { keys: "Escape / Tab", action: "Close" },
  ],
  a11y: [
    "The input is role=combobox controlling a listbox with aria-multiselectable; aria-selected reflects each option's state.",
    "Every chip has a labelled 24px remove button; the +N chip names the hidden values.",
    "A polite status announces the selected count and the number of options.",
  ],
  reducedMotion: "Chips appear and reflow without the pop; the list and checkboxes change without motion.",
  examples: [
    { title: "Issue labels", description: "renderOption with swatches and descriptions, max={3}.", Demo: LabelsDemo },
    { title: "Filter bar", description: "Compact size with maxVisibleChips={2}, filtering a list live.", Demo: FilterDemo, wide: true },
  ],
};

export default item;
