import { Button, ChatMessage, MarkdownEditor, type MarkdownEditorMode, type MarkdownEditorProps, type MarkdownTool } from "changelui";
import { useState } from "react";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  defaultMode: MarkdownEditorMode;
  toolbar: "full" | "compact" | "none";
  minRows: number;
  showCount: boolean;
  invalid: boolean;
  disabled: boolean;
};

const defaults: DemoProps = { defaultMode: "write", toolbar: "full", minRows: 7, showCount: true, invalid: false, disabled: false };

const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "defaultMode", label: "Start in", options: ["write", "preview"] },
  { type: "select", prop: "toolbar", label: "Toolbar", options: ["full", "compact", "none"] },
  { type: "number", prop: "minRows", label: "Min rows", min: 3, max: 12, step: 1 },
  { type: "boolean", prop: "showCount", label: "Word count" },
  { type: "boolean", prop: "invalid", label: "Invalid" },
  { type: "boolean", prop: "disabled", label: "Disabled" },
];

const COMPACT: MarkdownTool[] = ["bold", "italic", "link", "bulleted"];
const toolsFor = (t: DemoProps["toolbar"]): MarkdownTool[] | undefined => (t === "compact" ? COMPACT : t === "none" ? [] : undefined);

const RELEASE = `## Faster checkout

Checkout now remembers your **last shipping address** and skips the review step for repeat orders.

- Saved cards show the _expiry month_ up front
- Promo codes apply as you type
- Fixed: the total no longer flickers on slow networks

Read the [migration guide](https://example.com/docs) before you upgrade.`;

function Preview({ props }: { props: DemoProps }) {
  const [value, setValue] = useState(RELEASE);
  return (
    <div className="w-full max-w-2xl">
      <MarkdownEditor
        key={`${props.defaultMode}-${props.minRows}`}
        value={value}
        onValueChange={setValue}
        defaultMode={props.defaultMode}
        tools={toolsFor(props.toolbar)}
        minRows={props.minRows}
        showCount={props.showCount}
        invalid={props.invalid}
        disabled={props.disabled}
        label="Release notes"
      />
    </div>
  );
}

function Mini() {
  return (
    <div aria-hidden="true" className="pointer-events-none w-80 origin-top scale-90">
      <MarkdownEditor defaultValue={"## Ship notes\n\n- **Faster** checkout\n- Promo codes apply as you type"} minRows={4} showCount={false} tabIndex={-1} />
    </div>
  );
}

interface Posted {
  id: number;
  text: string;
}

/** Comment composer: Cmd/Ctrl+Enter posts, lists continue on Enter, and posted comments render with the same markdown. */
function CommentDemo() {
  const [draft, setDraft] = useState("");
  const [posted, setPosted] = useState<Posted[]>([{ id: 0, text: "Looks good. Two nits:\n\n1. Rename `fetchAll` to `fetchPage`\n2. Add a test for the empty response" }]);
  const post = (text: string) => {
    if (!text.trim()) return;
    setPosted((list) => [...list, { id: list.length, text }]);
    setDraft("");
  };
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-3">
      <ol className="flex flex-col gap-2">
        {posted.map((p) => (
          <li key={p.id} className="rounded-pui-lg border border-pui-border bg-pui-surface px-3 py-2">
            <ChatMessage content={p.text} avatar={false} copyText={false} />
          </li>
        ))}
      </ol>
      <MarkdownEditor
        value={draft}
        onValueChange={setDraft}
        onSubmit={post}
        minRows={3}
        maxRows={8}
        label="Add a comment"
        placeholder="Add a comment… (try typing “- ” then Enter)"
        showCount={false}
        footer={
          <Button size="sm" disabled={!draft.trim()} onClick={() => post(draft)}>
            Comment
          </Button>
        }
      />
      <p className="text-xs text-pui-muted-foreground">⌘/Ctrl+Enter posts. Select text and paste a URL to make a link.</p>
    </div>
  );
}

/** Compact toolbar for a support macro, inside a form that submits the markdown by name. */
function FormDemo() {
  const [sent, setSent] = useState<string | null>(null);
  return (
    <form
      className="mx-auto flex w-full max-w-md flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        setSent(String(new FormData(e.currentTarget).get("body") ?? ""));
      }}
    >
      <label htmlFor="macro-body" className="text-sm font-medium text-pui-foreground">
        Reply macro
      </label>
      <MarkdownEditor
        name="body"
        tools={COMPACT}
        minRows={4}
        defaultValue={"Hi {{first_name}},\n\nThanks for reaching out. Here is what to try:\n\n- Sign out and back in\n- Clear the app cache"}
        textareaProps={{ id: "macro-body" }}
        footer={
          <Button size="sm" type="submit" variant="outline" tone="neutral">
            Save macro
          </Button>
        }
      />
      <p role="status" className="min-h-4 text-xs text-pui-muted-foreground">
        {sent === null ? "" : `Saved ${sent.length} characters of markdown.`}
      </p>
    </form>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) =>
    `const [value, setValue] = useState("");\n\n<MarkdownEditor\n  value={value}\n  onValueChange={setValue}${props.defaultMode !== "write" ? `\n  defaultMode="${props.defaultMode}"` : ""}${props.toolbar === "compact" ? `\n  tools={["bold", "italic", "link", "bulleted"]}` : props.toolbar === "none" ? "\n  tools={[]}" : ""}${props.minRows !== 6 ? `\n  minRows={${props.minRows}}` : ""}${props.showCount ? "" : "\n  showCount={false}"}${props.invalid ? "\n  invalid" : ""}${props.disabled ? "\n  disabled" : ""}\n  onSubmit={(md) => save(md)}\n/>`,
  propsTable: propDocs<MarkdownEditorProps>()([
    { name: "value", type: "string", description: "Controlled markdown (defaultValue, onValueChange)." },
    { name: "mode", type: '"write" | "preview"', description: "Controlled tab (defaultMode, onModeChange)." },
    { name: "tools", type: "MarkdownTool[]", default: "all eight", description: "heading, bold, italic, code, link, quote, bulleted, numbered. [] hides the toolbar." },
    { name: "minRows", type: "number", default: "6", description: "Rows before the field grows." },
    { name: "maxRows", type: "number", default: "16", description: "Rows after which it scrolls." },
    { name: "onSubmit", type: "(value: string) => void", description: "Cmd/Ctrl+Enter." },
    { name: "label", type: "string", default: '"Markdown"', description: "Accessible name of the field." },
    { name: "name", type: "string", description: "Form field name; still submits in preview." },
    { name: "placeholder", type: "string", default: '"Write in markdown…"', description: "Empty-field hint." },
    { name: "showCount", type: "boolean", default: "true", description: "Word count in the footer." },
    { name: "footer", type: "ReactNode", description: "Right side of the footer (buttons, status)." },
    { name: "invalid", type: "boolean", default: "false", description: "Danger border and aria-invalid." },
    { name: "disabled", type: "boolean", default: "false", description: "Disables the field and toolbar." },
    { name: "readOnly", type: "boolean", default: "false", description: "Locks the text; preview still works." },
    { name: "emptyPreview", type: "ReactNode", default: '"Nothing to preview"', description: "Shown in an empty preview." },
    { name: "textareaProps", type: "TextareaHTMLAttributes", description: "id, aria-describedby, autoFocus and more for the textarea." },
  ]),
  keyboard: [
    { keys: "⌘/Ctrl + B / I / E", action: "Bold, italic, code (again to unwrap)" },
    { keys: "⌘/Ctrl + K", action: "Link: wraps the selection and selects the URL" },
    { keys: "⌘/Ctrl + Shift + 8 / 7", action: "Bulleted / numbered list" },
    { keys: "Enter", action: "Continue a list or quote; on an empty item, end it" },
    { keys: "⌘/Ctrl + Enter", action: "onSubmit" },
    { keys: "⌘/Ctrl + Shift + P", action: "Switch to Preview" },
    { keys: "← / →", action: "Move between toolbar buttons or tabs" },
  ],
  a11y: [
    "Write / Preview is a tablist; each tab controls its panel, and the preview panel is focusable for scrolling.",
    "The toolbar is a role=toolbar with one tab stop and arrow-key movement; buttons expose aria-keyshortcuts.",
    "Toolbar buttons don’t steal focus, so the selection and caret survive a click.",
    "Edits use insertText where supported, so ⌘/Ctrl+Z undoes a toolbar action like typing.",
  ],
  reducedMotion: "The tab pill jumps, buttons don’t squash and the preview fades without rising.",
  examples: [
    { title: "Comment composer", description: "Cmd/Ctrl+Enter posts; list continuation and paste-a-link.", Demo: CommentDemo },
    { title: "Compact toolbar in a form", description: "Four tools; the markdown submits by name.", Demo: FormDemo },
  ],
};

export default item;
