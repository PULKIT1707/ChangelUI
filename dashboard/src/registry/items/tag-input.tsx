import { Button, TagInput, type TagInputProps } from "changelui";
import { useId, useState } from "react";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  size: NonNullable<TagInputProps["size"]>;
  tone: "neutral" | "primary" | "success" | "warning" | "danger" | "info";
  max: number;
  allowDuplicates: boolean;
  suggestions: boolean;
  addOnBlur: boolean;
  disabled: boolean;
  invalid: boolean;
};

const defaults: DemoProps = {
  size: "md",
  tone: "primary",
  max: 0,
  allowDuplicates: false,
  suggestions: true,
  addOnBlur: false,
  disabled: false,
  invalid: false,
};

const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "size", label: "Size", options: ["sm", "md", "lg"] },
  { type: "select", prop: "tone", label: "Tone", options: ["neutral", "primary", "success", "warning", "danger", "info"] },
  { type: "number", prop: "max", label: "Max (0 = none)", min: 0, max: 10, step: 1 },
  { type: "boolean", prop: "allowDuplicates", label: "Allow duplicates" },
  { type: "boolean", prop: "suggestions", label: "Ghost suggestions" },
  { type: "boolean", prop: "addOnBlur", label: "Add on blur" },
  { type: "boolean", prop: "disabled", label: "Disabled" },
  { type: "boolean", prop: "invalid", label: "Invalid" },
];

const topics = [
  "accessibility",
  "animation",
  "react",
  "react-native",
  "design-systems",
  "typescript",
  "tailwind",
  "testing",
  "performance",
  "server-components",
];

function Preview({ props }: { props: DemoProps }) {
  const id = useId();
  const [value, setValue] = useState(["react", "animation"]);
  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      <label htmlFor={id} className="text-sm font-medium text-pui-foreground">
        Topics
      </label>
      <TagInput
        inputProps={{ id }}
        value={value}
        onValueChange={setValue}
        size={props.size}
        tone={props.tone}
        max={props.max || undefined}
        allowDuplicates={props.allowDuplicates}
        suggestions={props.suggestions ? topics : undefined}
        addOnBlur={props.addOnBlur}
        disabled={props.disabled}
        invalid={props.invalid}
      />
      <p className="m-0 text-xs text-pui-muted-foreground">
        Enter or comma adds. Paste “a, b, c” to add many. Backspace edits the last tag. Try typing “ty” then Tab.
      </p>
      <p className="m-0 font-mono text-xs text-pui-muted-foreground" aria-live="polite">
        value: [{value.join(", ")}]
      </p>
    </div>
  );
}

function Mini() {
  return (
    <div aria-hidden="true" className="pointer-events-none w-60">
      <TagInput defaultValue={["design", "motion", "a11y"]} inputProps={{ tabIndex: -1 }} placeholder="Add tag" />
    </div>
  );
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Recipients: email validation (invalid text shakes and stays), external domains tinted warning. */
function RecipientsDemo() {
  const id = useId();
  const [to, setTo] = useState(["alex@acme.dev", "jordan@partner.io"]);
  const [error, setError] = useState<string | null>(null);
  const external = to.filter((e) => !e.endsWith("@acme.dev")).length;
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-3 rounded-pui-xl border border-pui-border bg-pui-surface p-4 text-pui-surface-foreground">
      <div className="flex items-start gap-3">
        <label htmlFor={id} className="mt-2 w-10 shrink-0 text-sm text-pui-muted-foreground">
          To
        </label>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <TagInput
            inputProps={{ id, "aria-describedby": `${id}-hint`, inputMode: "email" }}
            listLabel="Recipients"
            value={to}
            onValueChange={(v) => {
              setTo(v);
              setError(null);
            }}
            separators={[",", ";", " ", "Enter", "Tab"]}
            normalize={(raw) => raw.trim().toLowerCase()}
            validate={(tag) => EMAIL.test(tag) || "Enter a valid email address"}
            onReject={(_, reason, message) => setError(reason === "duplicate" ? "Already a recipient" : (message ?? null))}
            tone={(tag) => (tag.endsWith("@acme.dev") ? "neutral" : "warning")}
            removeLabel={(tag) => `Remove recipient ${tag}`}
            addOnBlur
            placeholder="name@company.com"
          />
          <p id={`${id}-hint`} className={`m-0 text-xs ${error ? "text-pui-danger-text" : "text-pui-muted-foreground"}`}>
            {error ?? (external > 0 ? `${external} external ${external === 1 ? "recipient" : "recipients"} outside acme.dev` : "Space, comma or semicolon separates addresses.")}
          </p>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={() => setTo([])}>
          Clear
        </Button>
        <Button size="sm" disabled={to.length === 0}>
          Send to {to.length}
        </Button>
      </div>
    </div>
  );
}

const keywords = [
  "component library",
  "react components",
  "react animation",
  "motion design",
  "design tokens",
  "dark mode",
  "accessible ui",
  "open source",
  "tailwind css",
];

/** SEO keywords: ghost completion from known keywords and a max of 6 with a counter. */
function KeywordsDemo() {
  const id = useId();
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium text-pui-foreground">
        Keywords
      </label>
      <TagInput
        inputProps={{ id }}
        defaultValue={["react components", "open source"]}
        suggestions={keywords}
        max={6}
        tone="info"
        normalize={(raw) => raw.trim().toLowerCase()}
        placeholder="Type “mo”, then Tab"
      />
      <p className="m-0 text-xs text-pui-muted-foreground">Duplicates flash the existing chip instead of being added.</p>
    </div>
  );
}

/** Hashtags: space commits, normalize adds the # and strips symbols. */
function HashtagsDemo() {
  const id = useId();
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-3 rounded-pui-xl border border-pui-border bg-pui-surface p-4 text-pui-surface-foreground">
      <p className="m-0 text-sm leading-relaxed">Shipped the new rolling-number odometer today. Every digit is a wheel.</p>
      <label htmlFor={id} className="sr-only">
        Hashtags
      </label>
      <TagInput
        inputProps={{ id }}
        listLabel="Hashtags"
        defaultValue={["#buildinpublic", "#react"]}
        separators={[" ", ",", "Enter"]}
        normalize={(raw) => {
          const word = raw.replace(/[^\p{L}\p{N}_]/gu, "").toLowerCase();
          return word ? `#${word}` : "";
        }}
        tone="neutral"
        size="sm"
        max={5}
        placeholder="#hashtag"
      />
    </div>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) => {
    const attrs = ["value={tags}", "onValueChange={setTags}"];
    if (props.size !== "md") attrs.push(`size="${props.size}"`);
    if (props.tone !== "primary") attrs.push(`tone="${props.tone}"`);
    if (props.max) attrs.push(`max={${props.max}}`);
    if (props.allowDuplicates) attrs.push("allowDuplicates");
    if (props.suggestions) attrs.push('suggestions={["react", "typescript", "testing"]}');
    if (props.addOnBlur) attrs.push("addOnBlur");
    if (props.disabled) attrs.push("disabled");
    if (props.invalid) attrs.push("invalid");
    return `const [tags, setTags] = useState(["react"]);

<label htmlFor="topics">Topics</label>
<TagInput
  inputProps={{ id: "topics" }}
  ${attrs.join("\n  ")}
/>`;
  },
  propsTable: propDocs<TagInputProps>()([
    { name: "value", type: "string[]", description: "The tags (defaultValue, onValueChange)." },
    { name: "separators", type: "string[]", default: '[",", "Enter"]', description: 'Keys ("Enter", "Tab") or characters that commit; characters also split pastes.' },
    { name: "validate", type: "(tag, tags) => boolean | string", description: "Reject with false or an error message; the text stays and shakes." },
    { name: "normalize", type: "(raw) => string", default: "trim", description: "Turn typed text into the stored tag." },
    { name: "max", type: "number", description: "Most tags, with an n/max counter." },
    { name: "allowDuplicates", type: "boolean", default: "false", description: "Otherwise the existing chip flashes." },
    { name: "suggestions", type: "string[]", description: "Inline ghost completion; Tab or ArrowRight accepts." },
    { name: "addOnBlur", type: "boolean", default: "false", description: "Commit the text when focus leaves." },
    { name: "onReject", type: '(tag, "duplicate" | "invalid" | "max", message?) => void', description: "Show your own error text." },
    { name: "tone", type: "Tone | (tag) => Tone", default: '"primary"', description: "Chip color, per tag if you like." },
    { name: "name", type: "string", description: "One hidden input per tag; reset restores defaultValue." },
    { name: "removeLabel", type: "(tag) => string", default: "`Remove ${tag}`", description: "Name of each remove button." },
    { name: "inputProps", type: "InputHTMLAttributes", description: "For the text input: id, aria-describedby, inputMode, ..." },
  ]),
  keyboard: [
    { keys: "Enter / comma", action: "Add the typed text as a tag" },
    { keys: "Tab / ArrowRight", action: "Accept the ghost suggestion" },
    { keys: "Backspace (empty field)", action: "Pull the last tag back into the field to edit it" },
    { keys: "Backspace / Delete (remove button)", action: "Remove that tag" },
    { keys: "Escape", action: "Clear the typed text and the error" },
  ],
  a11y: [
    "Tags are a labelled role=list of chips; every chip has a labelled 24px remove button.",
    "A polite status announces additions, removals and why a tag was rejected.",
    "Invalid text sets aria-invalid on the input until it changes.",
  ],
  reducedMotion: "Chips appear and leave without the pop, and the shake and duplicate flash are off.",
  examples: [
    { title: "Email recipients", description: "validate, normalize, tone per tag, space/semicolon separators, addOnBlur.", Demo: RecipientsDemo, wide: true },
    { title: "Keywords", description: "Ghost suggestions with max={6}.", Demo: KeywordsDemo },
    { title: "Hashtags", description: "Space commits; normalize adds the #.", Demo: HashtagsDemo },
  ],
};

export default item;
