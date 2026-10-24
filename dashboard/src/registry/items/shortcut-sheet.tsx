import { Button, Kbd, ShortcutSheet, type ShortcutGroup, type ShortcutSheetProps } from "changelui";
import { useState } from "react";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";
type DemoProps = {
  platform: NonNullable<ShortcutSheetProps["platform"]>;
  hotkey: boolean;
};
const defaults: DemoProps = { platform: "auto", hotkey: true };
const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "platform", label: "Key symbols", options: ["auto", "mac", "other"] },
  { type: "boolean", prop: "hotkey", label: "Open with ?" },
];
const ISSUE_TRACKER: ShortcutGroup[] = [
  {
    title: "General",
    shortcuts: [
      { keys: "mod+k", label: "Open command menu", keywords: ["search", "palette"] },
      { keys: "?", label: "Show keyboard shortcuts", keywords: ["help"] },
      { keys: "mod+/", label: "Toggle sidebar" },
      { keys: ["mod+z", "ctrl+z"], label: "Undo" },
    ],
  },
  {
    title: "Navigation",
    shortcuts: [
      { keys: "g i", label: "Go to inbox", keywords: ["mail", "notifications"] },
      { keys: "g p", label: "Go to projects" },
      { keys: "j", label: "Next issue", keywords: ["down"] },
      { keys: "k", label: "Previous issue", keywords: ["up"] },
    ],
  },
  {
    title: "Issues",
    shortcuts: [
      { keys: "c", label: "Create issue", keywords: ["new"] },
      { keys: "a", label: "Assign to…" },
      { keys: "l", label: "Add label" },
      { keys: "mod+enter", label: "Save and close" },
      { keys: "shift+d", label: "Set due date" },
    ],
  },
  {
    title: "Editor",
    shortcuts: [
      { keys: "mod+b", label: "Bold" },
      { keys: "mod+i", label: "Italic" },
      { keys: "mod+shift+x", label: "Strikethrough" },
      { keys: "mod+e", label: "Inline code" },
    ],
  },
];
function Preview({ props }: { props: DemoProps }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex w-full max-w-xl flex-col items-center gap-5 text-center">
      <div className="flex w-full flex-col gap-2 rounded-pui-xl border border-pui-border bg-pui-surface p-5 text-start text-pui-surface-foreground shadow-pui-sm">
        <div className="flex items-center justify-between gap-3">
          <p className="m-0 text-sm font-semibold">PUI-284 · Checkout button jumps on slow networks</p>
          <span className="shrink-0 rounded-full bg-pui-warning/15 px-2 py-0.5 text-xs font-medium text-pui-warning-text">In review</span>
        </div>
        <p className="m-0 text-sm text-pui-muted-foreground">
          Assigned to Avery · due Friday · 3 comments. Press <Kbd>a</Kbd> to reassign, <Kbd>l</Kbd> to label.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <ShortcutSheet
          groups={ISSUE_TRACKER}
          open={open}
          onOpenChange={setOpen}
          platform={props.platform}
          hotkey={props.hotkey ? "?" : false}
          trigger={<Button variant="outline" tone="neutral">Keyboard shortcuts</Button>}
        />
        {props.hotkey ? (
          <span className="text-sm text-pui-muted-foreground">
            or press <Kbd>?</Kbd> anywhere on this page
          </span>
        ) : null}
      </div>
      <p className="m-0 text-xs text-pui-muted-foreground">Once it is open, hold ⌘/Ctrl + K: the caps light up and the row checks itself.</p>
    </div>
  );
}
/** A small editor with its own sheet: opened from a footer link, no global hotkey. */
function EditorDemo() {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex w-full flex-col overflow-hidden rounded-pui-xl border border-pui-border bg-pui-surface text-pui-surface-foreground">
      <div className="min-h-28 p-4 text-sm leading-relaxed">
        <strong>Release notes</strong> for <code className="rounded bg-pui-muted px-1 font-mono text-xs">v2.4</code>: faster search, saved views and a
        new <em>timeline</em> layout.
      </div>
      <div className="flex items-center justify-between border-t border-pui-border bg-pui-muted/40 px-3 py-2 text-xs text-pui-muted-foreground">
        <span>Markdown supported</span>
        <ShortcutSheet
          groups={ISSUE_TRACKER.slice(3)}
          open={open}
          onOpenChange={setOpen}
          hotkey={false}
          title="Editor shortcuts"
          description="Formatting keys work in every text field."
          trigger={
            <button type="button" className="cursor-pointer rounded-sm border-0 bg-transparent p-0 text-xs font-medium text-pui-primary-text underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-pui-ring">
              Formatting shortcuts
            </button>
          }
        />
      </div>
    </div>
  );
}
/** The sheet is just data: render the same groups as a static reference too. */
function StaticDemo() {
  return (
    <ul className="m-0 flex w-full list-none flex-col gap-1.5 p-0 text-sm">
      {ISSUE_TRACKER[1]!.shortcuts.map((s) => (
        <li key={s.label} className="flex items-center justify-between gap-3 rounded-pui-md border border-pui-border px-3 py-2">
          <span>{s.label}</span>
          <span className="flex gap-1">
            {String(s.keys)
              .split(" ")
              .map((k, i) => (
                <Kbd key={i} size="md">
                  {k.toUpperCase()}
                </Kbd>
              ))}
          </span>
        </li>
      ))}
    </ul>
  );
}
function Mini() {
  return (
    <div className="flex w-full max-w-56 flex-col gap-1.5 rounded-pui-lg border border-pui-border bg-pui-surface p-2.5 text-[11px] text-pui-surface-foreground shadow-pui-sm" aria-hidden="true">
      {[
        ["Command menu", ["⌘", "K"], true],
        ["Go to inbox", ["G", "I"], false],
        ["Create issue", ["C"], false],
      ].map(([label, keys, hit]) => (
        <div key={label as string} className={`flex items-center justify-between rounded-pui-sm px-1.5 py-1 ${hit ? "bg-pui-primary/10" : ""}`}>
          <span>{label as string}</span>
          <span className="flex gap-0.5">
            {(keys as string[]).map((k) => (
              <span
                key={k}
                className={`inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-[4px] border border-b-2 px-1 font-mono text-[10px] ${hit ? "border-pui-primary bg-pui-primary text-pui-primary-foreground" : "border-pui-border bg-pui-muted text-pui-muted-foreground"}`}
              >
                {k}
              </span>
            ))}
          </span>
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
  snippet: ({ platform, hotkey }) => {
    const attrs = [platform !== "auto" ? `platform="${platform}"` : "", hotkey ? "" : "hotkey={false}"].filter(Boolean);
    return `const groups = [
  {
    title: "General",
    shortcuts: [
      { keys: "mod+k", label: "Open command menu" },
      { keys: "g i", label: "Go to inbox" },
      { keys: ["mod+z", "ctrl+z"], label: "Undo" },
    ],
  },
];

<ShortcutSheet
  groups={groups}
  trigger={<Button variant="outline">Keyboard shortcuts</Button>}${attrs.map((a) => `\n  ${a}`).join("")}
/>`;
  },
  propsTable: propDocs<ShortcutSheetProps>()([
    { name: "groups", type: "{ title, shortcuts: { keys, label, keywords? }[] }[]", required: true, description: 'keys: "mod+k" (together), "g i" (sequence), or an array of alternatives.' },
    { name: "open", type: "boolean", description: "Controlled open state." },
    { name: "defaultOpen", type: "boolean", default: "false", description: "Initial open state when uncontrolled." },
    { name: "onOpenChange", type: "(open: boolean) => void", description: "Called when the hotkey, trigger, Escape or overlay changes it." },
    { name: "hotkey", type: "string | false", default: '"?"', description: "Global toggle key, ignored while typing in a field." },
    { name: "trigger", type: "ReactElement", description: "Rendered as the dialog trigger (asChild)." },
    { name: "platform", type: '"auto" | "mac" | "other"', default: '"auto"', description: "⌘ ⌥ ⇧ on Apple devices, Ctrl Alt Shift elsewhere. auto detects after mount." },
    { name: "title", type: "ReactNode", default: '"Keyboard shortcuts"', description: "Dialog heading." },
    { name: "description", type: "ReactNode", description: "Help text under the heading." },
    { name: "searchPlaceholder", type: "string", default: '"Search shortcuts"', description: "Also the search field's label." },
    { name: "emptyText", type: "ReactNode", description: "Shown when nothing matches." },
    { name: "captureKeys", type: "boolean", default: "true", description: "While open, ⌘/Ctrl/Alt combos light up instead of running app shortcuts underneath." },
  ]),
  keyboard: [
    { keys: "?", action: "Open or close the sheet (not while typing)" },
    { keys: "Hold any combo", action: "Light up its keys and check the matching row" },
    { keys: "Type", action: "Filter by name, keyword or key" },
    { keys: "Escape", action: "Close and return focus" },
  ],
  a11y: [
    "Built on Dialog: focus moves to the search field, is trapped inside and returns to the trigger on close.",
    "Each row has a spoken form of its keys (\"Command K\", \"G, then I\"); the visual key caps are hidden from screen readers.",
    "The match count is announced politely as you search.",
    "Sections are labelled by their group title.",
  ],
  reducedMotion: "Key caps change color without the press movement and the check appears without a pop.",
  examples: [
    { title: "Scoped sheet", description: "Opened from a footer link, with no global hotkey.", Demo: EditorDemo },
    { title: "Same data, static", description: "Groups are plain data, so a help page can list them too.", Demo: StaticDemo },
  ],
};
export default item;
