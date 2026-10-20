import { Avatar, Combobox, type ComboboxOption, type ComboboxProps } from "changelui";
import { useEffect, useId, useMemo, useState } from "react";
import { CodeIcon, PinIcon, SearchIcon, UserIcon } from "../../lib/demo-icons";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  size: NonNullable<ComboboxProps["size"]>;
  groups: boolean;
  creatable: boolean;
  clearable: boolean;
  openOnFocus: boolean;
  limit: number;
  disabled: boolean;
  invalid: boolean;
  placeholder: string;
};

const defaults: DemoProps = {
  size: "md",
  groups: true,
  creatable: false,
  clearable: true,
  openOnFocus: false,
  limit: 0,
  disabled: false,
  invalid: false,
  placeholder: "Search languages…",
};

const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "size", label: "Size", options: ["sm", "md", "lg"] },
  { type: "boolean", prop: "groups", label: "Groups" },
  { type: "boolean", prop: "creatable", label: "Creatable" },
  { type: "boolean", prop: "clearable", label: "Clearable" },
  { type: "boolean", prop: "openOnFocus", label: "Open on focus" },
  { type: "number", prop: "limit", label: "Limit (0 = all)", min: 0, max: 10, step: 1 },
  { type: "text", prop: "placeholder", label: "Placeholder", maxLength: 40 },
  { type: "boolean", prop: "disabled", label: "Disabled" },
  { type: "boolean", prop: "invalid", label: "Invalid" },
];

const languages: ComboboxOption[] = [
  { value: "ts", label: "TypeScript", group: "Web", keywords: ["js", "tsx"], description: "Typed JavaScript" },
  { value: "js", label: "JavaScript", group: "Web", keywords: ["ecmascript", "node"] },
  { value: "css", label: "CSS", group: "Web", keywords: ["styles"] },
  { value: "html", label: "HTML", group: "Web" },
  { value: "rust", label: "Rust", group: "Systems", description: "Memory safety without GC" },
  { value: "go", label: "Go", group: "Systems", keywords: ["golang"] },
  { value: "c", label: "C", group: "Systems" },
  { value: "cpp", label: "C++", group: "Systems", keywords: ["cplusplus"] },
  { value: "zig", label: "Zig", group: "Systems" },
  { value: "python", label: "Python", group: "Data", keywords: ["py", "pandas"], description: "Data and scripting" },
  { value: "r", label: "R", group: "Data" },
  { value: "julia", label: "Julia", group: "Data" },
  { value: "sql", label: "SQL", group: "Data", keywords: ["postgres", "query"] },
  { value: "kotlin", label: "Kotlin", group: "Mobile" },
  { value: "swift", label: "Swift", group: "Mobile", keywords: ["ios"] },
  { value: "dart", label: "Dart", group: "Mobile", keywords: ["flutter"] },
  { value: "elixir", label: "Elixir", group: "Functional" },
  { value: "haskell", label: "Haskell", group: "Functional" },
  { value: "ocaml", label: "OCaml", group: "Functional", disabled: true, description: "Coming soon" },
];

function Field({ id, label, hint, children }: { id: string; label: string; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex w-full flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-pui-foreground">
        {label}
      </label>
      {children}
      {hint ? <p className="m-0 text-xs text-pui-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function Preview({ props }: { props: DemoProps }) {
  const id = useId();
  const [extra, setExtra] = useState<ComboboxOption[]>([]);
  const [value, setValue] = useState<string | null>(null);
  const options = useMemo(
    () => [...languages, ...extra].map((o) => (props.groups ? o : { ...o, group: undefined })),
    [extra, props.groups],
  );
  return (
    <div className="flex w-full max-w-xs flex-col gap-3">
      <Field id={id} label="Primary language" hint="Matches labels and keywords (“golang”, “flutter”), accents ignored.">
        <Combobox
          id={id}
          options={options}
          value={value}
          onValueChange={setValue}
          size={props.size}
          creatable={props.creatable}
          onCreate={(input) => setExtra((prev) => [...prev, { value: input, label: input, group: "Added" }])}
          clearable={props.clearable}
          openOnFocus={props.openOnFocus}
          limit={props.limit || undefined}
          disabled={props.disabled}
          invalid={props.invalid}
          placeholder={props.placeholder || undefined}
          leadingIcon={<CodeIcon />}
        />
      </Field>
      <p className="m-0 font-mono text-xs text-pui-muted-foreground" aria-live="polite">
        value: {value ?? "null"}
      </p>
    </div>
  );
}

function Mini() {
  return (
    <div aria-hidden="true" className="pointer-events-none flex w-56 flex-col gap-1.5">
      <Combobox aria-label="Language" tabIndex={-1} options={languages} defaultInputValue="ty" leadingIcon={<SearchIcon />} clearable={false} />
      <div className="flex flex-col gap-0.5 rounded-pui-lg border border-pui-border bg-pui-surface p-1 shadow-pui-lg">
        {["TypeScript", "Python", "Kotlin"].map((label, i) => (
          <div key={label} className={`rounded-pui-md px-2 py-1.5 text-xs text-pui-surface-foreground ${i === 0 ? "bg-pui-muted" : ""}`}>
            {i === 0 ? (
              <>
                <mark className="rounded-[2px] bg-pui-primary/15 font-semibold text-inherit">Ty</mark>peScript
              </>
            ) : (
              label
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const cities: ComboboxOption[] = [
  ["Amsterdam", "Netherlands"],
  ["Athens", "Greece"],
  ["Austin", "United States"],
  ["Bangalore", "India"],
  ["Barcelona", "Spain"],
  ["Berlin", "Germany"],
  ["Bogotá", "Colombia"],
  ["Boston", "United States"],
  ["Buenos Aires", "Argentina"],
  ["Cape Town", "South Africa"],
  ["Copenhagen", "Denmark"],
  ["Dublin", "Ireland"],
  ["Helsinki", "Finland"],
  ["Istanbul", "Türkiye"],
  ["Kyoto", "Japan"],
  ["Lagos", "Nigeria"],
  ["Lisbon", "Portugal"],
  ["London", "United Kingdom"],
  ["Melbourne", "Australia"],
  ["Mexico City", "Mexico"],
  ["Montréal", "Canada"],
  ["Mumbai", "India"],
  ["Nairobi", "Kenya"],
  ["Oslo", "Norway"],
  ["Paris", "France"],
  ["Prague", "Czechia"],
  ["Reykjavík", "Iceland"],
  ["Seoul", "South Korea"],
  ["Singapore", "Singapore"],
  ["Stockholm", "Sweden"],
  ["Santiago", "Chile"],
  ["Tokyo", "Japan"],
  ["Toronto", "Canada"],
  ["Vienna", "Austria"],
  ["Zürich", "Switzerland"],
].map(([label, country]) => ({ value: label as string, label: label as string, description: country, icon: <PinIcon /> }));

function fold(text: string) {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

/** Server-style search: filter={false}, a 450 ms fake request and a loading row. */
function AsyncDemo() {
  const id = useId();
  const [input, setInput] = useState("");
  const [results, setResults] = useState<ComboboxOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [value, setValue] = useState<string | null>(null);
  useEffect(() => {
    const query = fold(input.trim());
    if (!query || cities.some((c) => c.label === input)) return;
    const start = setTimeout(() => setLoading(true), 0);
    const done = setTimeout(() => {
      setResults(cities.filter((c) => fold(c.label ?? c.value).includes(query) || fold(String(c.description)).includes(query)).slice(0, 8));
      setLoading(false);
    }, 450);
    return () => {
      clearTimeout(start);
      clearTimeout(done);
    };
  }, [input]);
  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-3">
      <Field id={id} label="Destination" hint="Results arrive after a simulated 450 ms request; try “an” or a country.">
        <Combobox
          id={id}
          options={input.trim() ? results : []}
          filter={false}
          loading={loading}
          inputValue={input}
          onInputValueChange={setInput}
          value={value}
          onValueChange={setValue}
          placeholder="Search 35 cities…"
          leadingIcon={<SearchIcon />}
          emptyLabel={input.trim() ? "No cities found" : "Start typing to search"}
        />
      </Field>
      <p className="m-0 text-xs text-pui-muted-foreground" aria-live="polite">
        {value ? `Flying to ${value}` : "No destination yet"}
      </p>
    </div>
  );
}

const people = [
  { value: "ada", label: "Ada Park", email: "ada@studio.dev", role: "Design" },
  { value: "bo", label: "Bo Lindqvist", email: "bo@studio.dev", role: "Engineering" },
  { value: "cam", label: "Camila Reyes", email: "camila@studio.dev", role: "Product" },
  { value: "dev", label: "Dev Malhotra", email: "dev@studio.dev", role: "Engineering" },
  { value: "eli", label: "Eli Okafor", email: "eli@studio.dev", role: "Research" },
  { value: "fen", label: "Fen Wu", email: "fen@studio.dev", role: "Design" },
];

/** Assignee picker: renderOption with avatars and roles, and a create row that invites by name. */
function AssigneeDemo() {
  const id = useId();
  const [invited, setInvited] = useState<string[]>([]);
  const [value, setValue] = useState<string | null>("cam");
  const options: ComboboxOption[] = [
    ...people.map((p) => ({ value: p.value, label: p.label, keywords: [p.email, p.role], description: p.email })),
    ...invited.map((name) => ({ value: name, label: name, description: "Invite pending" })),
  ];
  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-3 rounded-pui-xl border border-pui-border bg-pui-surface p-4 text-pui-surface-foreground">
      <div className="flex items-center gap-2 text-sm font-medium">
        <UserIcon />
        Assignee
      </div>
      <label htmlFor={id} className="sr-only">
        Assignee
      </label>
      <Combobox
        id={id}
        options={options}
        value={value}
        onValueChange={setValue}
        creatable
        onCreate={(name) => setInvited((prev) => [...prev, name])}
        createLabel={(name) => `Invite “${name}”`}
        placeholder="Search by name, email or role"
        renderOption={(option) => {
          const person = people.find((p) => p.value === option.value);
          return (
            <span className="flex min-w-0 flex-1 items-center gap-2.5">
              <Avatar size="xs" name={option.label ?? option.value} aria-hidden="true" />
              <span className="flex min-w-0 flex-col">
                <span className="truncate font-medium">{option.label}</span>
                <span className="truncate text-xs text-pui-muted-foreground">
                  {person ? `${person.role} · ${person.email}` : "Invite pending"}
                </span>
              </span>
            </span>
          );
        }}
      />
      <p className="m-0 text-xs text-pui-muted-foreground">Try “eng” (matches the role keyword) or type a new name.</p>
    </div>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) => {
    const attrs = ["options={languages}", "value={value}", "onValueChange={setValue}"];
    if (props.size !== "md") attrs.push(`size="${props.size}"`);
    if (props.creatable) attrs.push("creatable", "onCreate={(text) => addLanguage(text)}");
    if (!props.clearable) attrs.push("clearable={false}");
    if (props.openOnFocus) attrs.push("openOnFocus");
    if (props.limit) attrs.push(`limit={${props.limit}}`);
    if (props.placeholder) attrs.push(`placeholder="${props.placeholder}"`);
    if (props.disabled) attrs.push("disabled");
    if (props.invalid) attrs.push("invalid");
    return `const languages = [
  { value: "ts", label: "TypeScript", group: ${props.groups ? '"Web"' : "undefined"}, keywords: ["js"] },
  { value: "rust", label: "Rust", group: ${props.groups ? '"Systems"' : "undefined"}, description: "Memory safety without GC" },
  "Go", // strings work too
];
const [value, setValue] = useState<string | null>(null);

<label htmlFor="lang">Primary language</label>
<Combobox
  id="lang"
  ${attrs.join("\n  ")}
/>`;
  },
  propsTable: propDocs<ComboboxProps>()([
    { name: "options", type: "(string | ComboboxOption)[]", required: true, description: "{ value, label, description, icon, group, keywords, disabled }." },
    { name: "value", type: "string | null", description: "Selected value (defaultValue, onValueChange(value, option))." },
    { name: "inputValue", type: "string", description: "Field text (defaultInputValue, onInputValueChange)." },
    { name: "filter", type: "(option, query) => boolean | false", default: "label/keyword match", description: "false shows options as given, for async results." },
    { name: "loading", type: "boolean", default: "false", description: "Shows a loading row and announces it." },
    { name: "emptyLabel", type: "ReactNode", default: '"No results"', description: "Shown when nothing matches." },
    { name: "creatable", type: "boolean", default: "false", description: "Adds a create row for unmatched text (onCreate, createLabel)." },
    { name: "limit", type: "number", description: "Most options rendered at once." },
    { name: "renderOption", type: "(option, { selected, active, query }) => ReactNode", description: "Custom option content." },
    { name: "openOnFocus", type: "boolean", default: "false", description: "Open when the field gains focus." },
    { name: "clearable", type: "boolean", default: "true", description: "Clear button while there is text; Escape clears too." },
    { name: "size", type: '"sm" | "md" | "lg"', default: '"md"', description: "Field height 32 / 36 / 44 px." },
    { name: "leadingIcon", type: "ReactNode", description: "Icon at the start of the field." },
    { name: "name", type: "string", description: "Adds a hidden input with the value." },
  ]),
  keyboard: [
    { keys: "Type", action: "Filter and open the list; the first match is highlighted" },
    { keys: "ArrowDown / ArrowUp", action: "Open, then move the highlight" },
    { keys: "PageDown / PageUp", action: "Jump 10 options" },
    { keys: "Enter", action: "Pick the highlighted option (or create)" },
    { keys: "Escape", action: "Close and restore the text; when closed, clear the field" },
    { keys: "Alt + ArrowUp", action: "Close" },
  ],
  a11y: [
    "APG combobox with a listbox popup: aria-autocomplete=list, aria-expanded, aria-activedescendant; focus stays in the input.",
    "A polite status region announces the result count, loading and the create option.",
    "Groups are role=group with a heading; the clear and toggle buttons are labelled and skip the tab order.",
  ],
  reducedMotion: "The list fades in without scaling; height changes and the result stagger are off; the highlight jumps.",
  examples: [
    { title: "Async search", description: "filter={false} with a debounced fake request, loading row and empty states.", Demo: AsyncDemo },
    { title: "Assignee picker", description: "renderOption with avatars, keyword search on email and role, invite via create.", Demo: AssigneeDemo },
  ],
};

export default item;
