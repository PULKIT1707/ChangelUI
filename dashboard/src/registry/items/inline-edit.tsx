import { Badge, InlineEdit, type InlineEditProps } from "changelui";
import { useState } from "react";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";
type DemoProps = {
  multiline: boolean;
  saveOnBlur: boolean;
  selectOnEdit: boolean;
  failSave: boolean;
  disabled: boolean;
};
const defaults: DemoProps = { multiline: false, saveOnBlur: true, selectOnEdit: true, failSave: false, disabled: false };
const controls: ControlSpec<DemoProps>[] = [
  { type: "boolean", prop: "multiline", label: "Multiline" },
  { type: "boolean", prop: "saveOnBlur", label: "Save on blur" },
  { type: "boolean", prop: "selectOnEdit", label: "Select on edit" },
  { type: "boolean", prop: "failSave", label: "Simulate save error" },
  { type: "boolean", prop: "disabled", label: "Disabled" },
];
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
function Preview({ props }: { props: DemoProps }) {
  const [title, setTitle] = useState("Q4 launch plan");
  return (
    <div className="w-full max-w-md rounded-pui-xl border border-pui-border bg-pui-surface p-5 text-pui-surface-foreground shadow-pui-sm">
      <p className="m-0 mb-1 text-xs font-medium uppercase tracking-wide text-pui-muted-foreground">Project</p>
      <h3 className="m-0 text-xl font-semibold">
        <InlineEdit
          label="Project name"
          value={title}
          onValueChange={setTitle}
          multiline={props.multiline}
          saveOnBlur={props.saveOnBlur}
          selectOnEdit={props.selectOnEdit}
          disabled={props.disabled}
          validate={(v) => v.length > 0 || "Name can't be empty"}
          onSave={async (v) => {
            await wait(700);
            if (props.failSave) throw new Error("Network error. Your change wasn't saved.");
            if (v.toLowerCase() === "untitled") throw new Error("That name is reserved.");
          }}
        />
      </h3>
      <p className="m-0 mt-3 text-xs text-pui-muted-foreground">Click the title. Enter saves, Escape reverts. Try “untitled” to see a rollback.</p>
    </div>
  );
}
function Mini() {
  return (
    <div aria-hidden="true" className="pointer-events-none flex w-56 flex-col gap-1">
      <span className="text-[0.65rem] uppercase tracking-wide text-pui-muted-foreground">Project</span>
      <span className="text-base font-semibold">
        <InlineEdit label="Name" defaultValue="Q4 launch plan" />
      </span>
    </div>
  );
}
const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
/** Table cells: price formatted for display, raw number in the editor, validation. */
function TableDemo() {
  const [rows, setRows] = useState([
    { sku: "TEE-BLK-M", name: "Logo tee", price: "32" },
    { sku: "MUG-WHT", name: "Ceramic mug", price: "18.5" },
    { sku: "HOOD-GRY-L", name: "Zip hoodie", price: "46" },
  ]);
  const update = (i: number, key: "name" | "price", v: string) => setRows((r) => r.map((row, j) => (j === i ? { ...row, [key]: v } : row)));
  return (
    <div className="mx-auto w-full max-w-lg overflow-hidden rounded-pui-xl border border-pui-border bg-pui-surface text-sm text-pui-surface-foreground">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-pui-border text-start text-xs text-pui-muted-foreground">
            <th className="px-4 py-2 text-start font-medium">SKU</th>
            <th className="px-4 py-2 text-start font-medium">Name</th>
            <th className="px-4 py-2 text-end font-medium">Price</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.sku} className="border-b border-pui-border last:border-0">
              <td className="px-4 py-2 font-mono text-xs text-pui-muted-foreground">{row.sku}</td>
              <td className="px-4 py-2">
                <InlineEdit label={`Name of ${row.sku}`} value={row.name} onValueChange={(v) => update(i, "name", v)} validate={(v) => v.length > 0 || "Required"} />
              </td>
              <td className="px-4 py-2 text-end tabular-nums">
                <InlineEdit
                  label={`Price of ${row.sku}`}
                  value={row.price}
                  onValueChange={(v) => update(i, "price", v)}
                  formatDisplay={(v) => usd.format(Number(v))}
                  validate={(v) => (/^\d+(\.\d{1,2})?$/.test(v) && Number(v) > 0) || "Enter a price like 19.99"}
                  inputProps={{ inputMode: "decimal", className: "text-end" }}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
/** Profile: multiline bio with Shift+Enter, empty placeholder. */
function ProfileDemo() {
  const [bio, setBio] = useState("");
  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-3 rounded-pui-xl border border-pui-border bg-pui-surface p-5 text-pui-surface-foreground">
      <div className="flex items-center gap-2">
        <span className="text-base font-semibold">
          <InlineEdit label="Display name" defaultValue="Riley Chen" />
        </span>
        <Badge size="sm" variant="soft" tone="success">
          Online
        </Badge>
      </div>
      <div className="text-sm text-pui-muted-foreground">
        <InlineEdit label="Bio" value={bio} onValueChange={setBio} multiline placeholder="Add a short bio…" inputProps={{ maxLength: 160 }} />
      </div>
    </div>
  );
}
/** Settings rows: saveOnBlur off, so clicking away cancels; a slug normalized by validate. */
function SettingsDemo() {
  return (
    <dl className="mx-auto m-0 grid w-full max-w-sm grid-cols-[auto_1fr] gap-x-6 gap-y-3 rounded-pui-xl border border-pui-border bg-pui-surface p-5 text-sm text-pui-surface-foreground">
      <dt className="text-pui-muted-foreground">Workspace</dt>
      <dd className="m-0">
        <InlineEdit label="Workspace name" defaultValue="Northwind" saveOnBlur={false} />
      </dd>
      <dt className="text-pui-muted-foreground">URL</dt>
      <dd className="m-0 font-mono text-xs">
        <InlineEdit
          label="Workspace URL"
          defaultValue="northwind"
          saveOnBlur={false}
          validate={(v) => /^[a-z0-9-]{3,24}$/.test(v) || "3–24 lowercase letters, digits or dashes"}
          formatDisplay={(v) => `app.example.com/${v}`}
        />
      </dd>
    </dl>
  );
}
const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) => {
    const attrs = ['label="Project name"', "value={title}", "onValueChange={setTitle}", "onSave={(v) => api.rename(id, v)}"];
    if (props.multiline) attrs.push("multiline");
    if (!props.saveOnBlur) attrs.push("saveOnBlur={false}");
    if (!props.selectOnEdit) attrs.push("selectOnEdit={false}");
    if (props.disabled) attrs.push("disabled");
    return `const [title, setTitle] = useState("Q4 launch plan");
<h3>
  <InlineEdit
    ${attrs.join("\n    ")}
  />
</h3>`;
  },
  propsTable: propDocs<InlineEditProps>()([
    { name: "label", type: "string", required: true, description: "Accessible name of the trigger and the editor." },
    { name: "value", type: "string", description: "The saved value (defaultValue, onValueChange)." },
    { name: "onSave", type: "(value) => void | Promise<void>", description: "Persist; throw or reject to roll back and show the message." },
    { name: "validate", type: "(value) => boolean | string", description: "Block the save with false or a message." },
    { name: "placeholder", type: "string", default: '"Empty"', description: "Shown when the value is empty." },
    { name: "multiline", type: "boolean", default: "false", description: "Textarea editor; Shift+Enter adds a line." },
    { name: "saveOnBlur", type: "boolean", default: "true", description: "Otherwise leaving the field cancels." },
    { name: "selectOnEdit", type: "boolean", default: "true", description: "Select the text when editing starts." },
    { name: "formatDisplay", type: "(value) => ReactNode", description: "Display format; the editor shows the raw value." },
    { name: "inputProps", type: "InputHTMLAttributes", description: "inputMode, maxLength, className, ..." },
    { name: "onEditingChange", type: "(editing) => void", description: "When the editor opens or closes." },
  ]),
  keyboard: [
    { keys: "Enter / Space (trigger)", action: "Start editing" },
    { keys: "Enter", action: "Save" },
    { keys: "Shift+Enter", action: "New line (multiline)" },
    { keys: "Escape", action: "Revert and close" },
  ],
  a11y: [
    'The value is a real button named "Label: value. Edit"; the editor is named by the same label.',
    "Saving, saved and errors are announced in a polite status; errors link to the field via aria-describedby.",
    "Focus returns to the trigger after Enter or Escape.",
  ],
  reducedMotion: "No shake on invalid input; the pending spinner keeps turning, slower.",
  examples: [
    { title: "Editable table cells", description: "formatDisplay for currency, validate, inputMode.", Demo: TableDemo, wide: true },
    { title: "Profile card", description: "Multiline bio with an empty placeholder.", Demo: ProfileDemo },
    { title: "Settings rows", description: "saveOnBlur={false}: clicking away cancels.", Demo: SettingsDemo },
  ],
};
export default item;
