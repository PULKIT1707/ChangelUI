import {
  Button,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  type SelectProps,
} from "changelui";
import { useId, useState } from "react";
import { BrainIcon, ClockIcon, GlobeIcon, SparkIcon, ZapIcon } from "../../lib/demo-icons";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  size: NonNullable<SelectProps["size"]>;
  placeholder: string;
  groups: boolean;
  descriptions: boolean;
  icons: boolean;
  disabled: boolean;
  invalid: boolean;
  side: "bottom" | "top";
};

const defaults: DemoProps = {
  size: "md",
  placeholder: "Choose a model",
  groups: true,
  descriptions: true,
  icons: true,
  disabled: false,
  invalid: false,
  side: "bottom",
};

const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "size", label: "Size", options: ["sm", "md", "lg"] },
  { type: "text", prop: "placeholder", label: "Placeholder", maxLength: 40 },
  { type: "boolean", prop: "groups", label: "Groups" },
  { type: "boolean", prop: "descriptions", label: "Descriptions" },
  { type: "boolean", prop: "icons", label: "Icons" },
  { type: "select", prop: "side", label: "Side", options: ["bottom", "top"] },
  { type: "boolean", prop: "disabled", label: "Disabled" },
  { type: "boolean", prop: "invalid", label: "Invalid" },
];

const models = [
  { value: "swift", label: "Swift", description: "Fastest replies, light tasks", icon: <ZapIcon />, group: "Everyday" },
  { value: "balanced", label: "Balanced", description: "Good default for most work", icon: <SparkIcon />, group: "Everyday" },
  { value: "deep", label: "Deep reasoning", description: "Slower, plans before answering", icon: <BrainIcon />, group: "Advanced" },
  { value: "long", label: "Long context", description: "Reads whole repositories", icon: <GlobeIcon />, group: "Advanced" },
  { value: "legacy", label: "Legacy (retired)", description: "No longer available", icon: <ClockIcon />, group: "Advanced", disabled: true },
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

function ModelItems({ props }: { props: Pick<DemoProps, "groups" | "descriptions" | "icons"> }) {
  const item = (m: (typeof models)[number]) => (
    <SelectItem
      key={m.value}
      value={m.value}
      disabled={m.disabled}
      icon={props.icons ? m.icon : undefined}
      description={props.descriptions ? m.description : undefined}
    >
      {m.label}
    </SelectItem>
  );
  if (!props.groups) return <>{models.map(item)}</>;
  return (
    <>
      <SelectGroup>
        <SelectLabel>Everyday</SelectLabel>
        {models.filter((m) => m.group === "Everyday").map(item)}
      </SelectGroup>
      <SelectSeparator />
      <SelectGroup>
        <SelectLabel>Advanced</SelectLabel>
        {models.filter((m) => m.group === "Advanced").map(item)}
      </SelectGroup>
    </>
  );
}

function Preview({ props }: { props: DemoProps }) {
  const id = useId();
  const [value, setValue] = useState<string | null>("balanced");
  return (
    <div className="flex w-full max-w-xs flex-col gap-3">
      <Field id={id} label="Model" hint="Type a letter to jump; Home and End work too.">
        <Select
          value={value}
          onValueChange={setValue}
          size={props.size}
          placeholder={props.placeholder || undefined}
          disabled={props.disabled}
          invalid={props.invalid}
        >
          <SelectTrigger id={id} className="w-full" />
          <SelectContent side={props.side}>
            <ModelItems props={props} />
          </SelectContent>
        </Select>
      </Field>
      <p className="m-0 font-mono text-xs text-pui-muted-foreground" aria-live="polite">
        value: {value ?? "null"}
      </p>
    </div>
  );
}

function Mini() {
  return (
    <div aria-hidden="true" className="pointer-events-none flex w-52 flex-col gap-1.5">
      <Select defaultValue="balanced">
        <SelectTrigger tabIndex={-1} aria-label="Model" className="w-full" />
        <SelectContent>
          <SelectItem value="balanced" icon={<SparkIcon />}>
            Balanced
          </SelectItem>
        </SelectContent>
      </Select>
      <div className="flex flex-col gap-0.5 rounded-pui-lg border border-pui-border bg-pui-surface p-1 shadow-pui-lg">
        {models.slice(0, 3).map((m, i) => (
          <div
            key={m.value}
            className={`flex items-center gap-2 rounded-pui-md px-2 py-1.5 text-xs text-pui-surface-foreground ${i === 1 ? "bg-pui-muted" : ""}`}
          >
            <span className="text-pui-muted-foreground">{m.icon}</span>
            <span className="flex-1">{m.label}</span>
            {i === 1 ? <span className="text-pui-primary-text">✓</span> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

const zones = [
  ["America/Los_Angeles", "Pacific Time", "UTC−8"],
  ["America/Denver", "Mountain Time", "UTC−7"],
  ["America/Chicago", "Central Time", "UTC−6"],
  ["America/New_York", "Eastern Time", "UTC−5"],
  ["America/Sao_Paulo", "Brasília", "UTC−3"],
  ["Europe/London", "London", "UTC+0"],
  ["Europe/Berlin", "Berlin", "UTC+1"],
  ["Europe/Athens", "Athens", "UTC+2"],
  ["Africa/Nairobi", "Nairobi", "UTC+3"],
  ["Asia/Dubai", "Dubai", "UTC+4"],
  ["Asia/Kolkata", "India", "UTC+5:30"],
  ["Asia/Singapore", "Singapore", "UTC+8"],
  ["Asia/Tokyo", "Tokyo", "UTC+9"],
  ["Australia/Sydney", "Sydney", "UTC+10"],
  ["Pacific/Auckland", "Auckland", "UTC+12"],
] as const;

/** Settings form: labelled triggers, a long scrolling list, required validation and FormData. */
function SettingsDemo() {
  const langId = useId();
  const zoneId = useId();
  const weekId = useId();
  const [sent, setSent] = useState<string | null>(null);
  return (
    <form
      className="mx-auto flex w-full max-w-lg flex-col gap-4 rounded-pui-xl border border-pui-border bg-pui-surface p-5 text-pui-surface-foreground shadow-pui-sm"
      onSubmit={(event) => {
        event.preventDefault();
        setSent(new URLSearchParams(new FormData(event.currentTarget) as unknown as Record<string, string>).toString());
      }}
      onReset={() => setSent(null)}
    >
      <div>
        <p className="m-0 text-base font-semibold">Preferences</p>
        <p className="m-0 text-xs text-pui-muted-foreground">Native form submit and reset; time zone is required.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={langId} label="Language">
          <Select name="lang" defaultValue="en">
            <SelectTrigger id={langId} className="w-full" />
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="de">Deutsch</SelectItem>
              <SelectItem value="es">Español</SelectItem>
              <SelectItem value="fr">Français</SelectItem>
              <SelectItem value="ja">日本語</SelectItem>
              <SelectItem value="pt">Português</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field id={weekId} label="Week starts on">
          <Select name="week" defaultValue="mon">
            <SelectTrigger id={weekId} className="w-full" />
            <SelectContent>
              <SelectItem value="sat">Saturday</SelectItem>
              <SelectItem value="sun">Sunday</SelectItem>
              <SelectItem value="mon">Monday</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>
      <Field id={zoneId} label="Time zone" hint="15 zones: the list scrolls and typeahead jumps (try “s”, then “s” again).">
        <Select name="tz" required placeholder="Select a time zone">
          <SelectTrigger id={zoneId} icon={<GlobeIcon />} className="w-full" />
          <SelectContent>
            {zones.map(([value, label, offset]) => (
              <SelectItem key={value} value={value} textValue={label}>
                <span className="flex w-full items-center justify-between gap-4">
                  <span>{label}</span>
                  <span className="font-mono text-xs text-pui-muted-foreground">{offset}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="min-w-0 truncate font-mono text-xs text-pui-muted-foreground" aria-live="polite">
          {sent ?? "Submit to see the form data"}
        </span>
        <div className="flex gap-2">
          <Button type="reset" variant="ghost">
            Reset
          </Button>
          <Button type="submit">Save</Button>
        </div>
      </div>
    </form>
  );
}

const statuses = [
  { value: "backlog", label: "Backlog", dot: "border-2 border-dashed border-pui-muted-foreground" },
  { value: "todo", label: "Todo", dot: "border-2 border-pui-muted-foreground" },
  { value: "progress", label: "In progress", dot: "border-2 border-pui-warning bg-[conic-gradient(var(--pui-warning)_50%,transparent_0)]" },
  { value: "review", label: "In review", dot: "border-2 border-pui-info bg-[conic-gradient(var(--pui-info)_75%,transparent_0)]" },
  { value: "done", label: "Done", dot: "border-2 border-pui-success bg-pui-success" },
  { value: "canceled", label: "Canceled", dot: "border-2 border-pui-danger/70 bg-pui-danger/30" },
];

function Dot({ className }: { className: string }) {
  return <span aria-hidden="true" className={`inline-block size-3 shrink-0 rounded-full ${className}`} />;
}

/** Linear-style status pickers: compact triggers with a custom value, one per row. */
function StatusDemo() {
  const [rows, setRows] = useState([
    { id: "PUI-142", title: "Toast deck: swipe to dismiss", status: "progress" },
    { id: "PUI-139", title: "Calendar month picker", status: "review" },
    { id: "PUI-151", title: "Select: typeahead in groups", status: "todo" },
    { id: "PUI-120", title: "Ship theme presets", status: "done" },
  ]);
  return (
    <div className="flex w-full flex-col divide-y divide-pui-border rounded-pui-xl border border-pui-border bg-pui-surface text-pui-surface-foreground">
      {rows.map((row) => (
        <div key={row.id} className="flex items-center gap-3 px-3 py-2">
          <span className="w-16 shrink-0 font-mono text-xs text-pui-muted-foreground">{row.id}</span>
          <span className={`min-w-0 flex-1 truncate text-sm ${row.status === "done" || row.status === "canceled" ? "text-pui-muted-foreground line-through" : ""}`}>
            {row.title}
          </span>
          <Select
            size="sm"
            value={row.status}
            onValueChange={(status) => setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, status } : r)))}
            renderValue={(value, label) => (
              <span className="flex items-center gap-2">
                <Dot className={statuses.find((s) => s.value === value)?.dot ?? ""} />
                {label}
              </span>
            )}
          >
            <SelectTrigger aria-label={`Status of ${row.id}`} className="w-36 shrink-0" />
            <SelectContent align="end">
              {statuses.map((s) => (
                <SelectItem key={s.value} value={s.value} icon={<Dot className={s.dot} />}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ))}
    </div>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) => {
    const root: string[] = ["value={value}", "onValueChange={setValue}"];
    if (props.size !== "md") root.push(`size="${props.size}"`);
    if (props.placeholder) root.push(`placeholder="${props.placeholder}"`);
    if (props.disabled) root.push("disabled");
    if (props.invalid) root.push("invalid");
    const itemLine = (label: string, value: string, extra = "") =>
      `<SelectItem value="${value}"${props.icons ? " icon={<ZapIcon />}" : ""}${props.descriptions ? ` description="${extra}"` : ""}>${label}</SelectItem>`;
    const items = props.groups
      ? [
          "<SelectGroup>",
          "  <SelectLabel>Everyday</SelectLabel>",
          `  ${itemLine("Swift", "swift", "Fastest replies")}`,
          `  ${itemLine("Balanced", "balanced", "Good default")}`,
          "</SelectGroup>",
          "<SelectSeparator />",
          "<SelectGroup>",
          "  <SelectLabel>Advanced</SelectLabel>",
          `  ${itemLine("Deep reasoning", "deep", "Plans first")}`,
          "</SelectGroup>",
        ]
      : [itemLine("Swift", "swift", "Fastest replies"), itemLine("Balanced", "balanced", "Good default"), itemLine("Deep reasoning", "deep", "Plans first")];
    return `const [value, setValue] = useState<string | null>("balanced");

<label htmlFor="model">Model</label>
<Select ${root.join(" ")}>
  <SelectTrigger id="model" />
  <SelectContent${props.side !== "bottom" ? ` side="${props.side}"` : ""}>
    ${items.join("\n    ")}
  </SelectContent>
</Select>`;
  },
  propsTable: propDocs<SelectProps>()([
    { name: "value", type: "string | null", description: "Selected value (defaultValue, onValueChange)." },
    { name: "placeholder", type: "string", default: '"Select…"', description: "Trigger text while nothing is selected." },
    { name: "name", type: "string", description: "Adds a form input with the value; reset restores defaultValue." },
    { name: "required", type: "boolean", default: "false", description: "Blocks form submit until a value is picked, then focuses the trigger." },
    { name: "size", type: '"sm" | "md" | "lg"', default: '"md"', description: "Trigger height 32 / 36 / 44 px." },
    { name: "disabled", type: "boolean", default: "false", description: "Disables the trigger." },
    { name: "invalid", type: "boolean", default: "false", description: "Danger boundary and aria-invalid." },
    { name: "renderValue", type: "(value, label) => ReactNode", description: "Custom trigger content for the selection." },
    { name: "open", type: "boolean", description: "Controlled open state (defaultOpen, onOpenChange)." },
  ]),
  keyboard: [
    { keys: "Enter / Space / ArrowDown / ArrowUp", action: "Open the list (from the trigger)" },
    { keys: "ArrowDown / ArrowUp", action: "Move the highlight" },
    { keys: "Home / End, PageUp / PageDown", action: "First / last, jump 10" },
    { keys: "Type characters", action: "Jump to the matching option (repeat a letter to cycle)" },
    { keys: "Enter / Space", action: "Select and close" },
    { keys: "Escape / Tab", action: "Close" },
  ],
  a11y: [
    "APG select-only combobox: the trigger is role=combobox with aria-expanded and aria-activedescendant; focus never leaves it.",
    "Options are role=option with aria-selected; groups are role=group named by their SelectLabel.",
    "Label the trigger with a <label htmlFor> on its id or an aria-label.",
    "The required form input focuses the trigger when the browser reports it invalid.",
  ],
  reducedMotion: "The list and value fade without scaling or sliding; the highlight jumps and the check appears at once.",
  examples: [
    { title: "Settings form", description: "Labels, a long scrolling list with typeahead, required validation, submit and reset.", Demo: SettingsDemo, wide: true },
    { title: "Status picker", description: "Compact triggers with renderValue and status glyphs, end-aligned lists.", Demo: StatusDemo, wide: true },
  ],
};

export default item;
