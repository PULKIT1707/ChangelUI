import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
  Kbd,
  Spinner,
  type InputGroupAddonProps,
  type InputGroupButtonProps,
  type InputGroupProps,
  type InputGroupTextareaProps,
} from "changelui";
import { useEffect, useState } from "react";
import { CheckGlyph, CopyGlyph, EyeIcon, ImageIcon, LockIcon, SearchIcon, SendIcon } from "../../lib/demo-icons";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  size: NonNullable<InputGroupProps["size"]>;
  invalid: boolean;
  disabled: boolean;
  prefix: string;
  shortcut: boolean;
};

const defaults: DemoProps = { size: "md", invalid: false, disabled: false, prefix: "https://", shortcut: true };

const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "size", label: "Size", options: ["sm", "md", "lg"] },
  { type: "text", prop: "prefix", label: "Prefix", maxLength: 16 },
  { type: "boolean", prop: "shortcut", label: "Shortcut hint" },
  { type: "boolean", prop: "invalid", label: "Invalid" },
  { type: "boolean", prop: "disabled", label: "Disabled" },
];

function Preview({ props }: { props: DemoProps }) {
  const [query, setQuery] = useState("");
  const shared = { size: props.size, invalid: props.invalid, disabled: props.disabled };
  return (
    <div className="flex w-full max-w-md flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="ig-site" className="text-sm font-medium text-pui-foreground">
          Website
        </label>
        <InputGroup {...shared}>
          {props.prefix ? (
            <InputGroupAddon>
              <InputGroupText>{props.prefix}</InputGroupText>
            </InputGroupAddon>
          ) : null}
          <InputGroupInput id="ig-site" placeholder="acme" defaultValue="acme" />
          <InputGroupAddon align="inline-end">
            <InputGroupText>.com</InputGroupText>
          </InputGroupAddon>
        </InputGroup>
      </div>
      <InputGroup {...shared}>
        <InputGroupAddon>
          <SearchIcon />
        </InputGroupAddon>
        <InputGroupInput aria-label="Search docs" placeholder="Search docs…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <InputGroupAddon align="inline-end">
          {query ? <InputGroupText className="tabular-nums">{Math.max(1, 24 - query.length * 5)} results</InputGroupText> : null}
          {props.shortcut ? <Kbd>⌘K</Kbd> : null}
        </InputGroupAddon>
      </InputGroup>
      <InputGroup {...shared}>
        <InputGroupAddon>
          <InputGroupText>$</InputGroupText>
        </InputGroupAddon>
        <InputGroupInput aria-label="Price" inputMode="decimal" defaultValue="49.00" className="tabular-nums" />
        <InputGroupAddon align="inline-end">
          <InputGroupText>USD / month</InputGroupText>
        </InputGroupAddon>
      </InputGroup>
    </div>
  );
}

function Mini() {
  return (
    <div aria-hidden="true" className="pointer-events-none flex w-60 flex-col gap-2">
      <InputGroup size="sm">
        <InputGroupAddon>
          <InputGroupText>https://</InputGroupText>
        </InputGroupAddon>
        <InputGroupInput tabIndex={-1} defaultValue="acme" />
        <InputGroupAddon align="inline-end">
          <InputGroupText>.com</InputGroupText>
        </InputGroupAddon>
      </InputGroup>
      <InputGroup size="sm">
        <InputGroupAddon>
          <SearchIcon />
        </InputGroupAddon>
        <InputGroupInput tabIndex={-1} placeholder="Search…" />
        <InputGroupAddon align="inline-end">
          <Kbd>⌘K</Kbd>
        </InputGroupAddon>
      </InputGroup>
    </div>
  );
}

/** Composer: the textarea grows; the toolbar below shares the border and the focus ring. */
function ComposerDemo() {
  const [text, setText] = useState("Shipping the new billing page today. Can someone review the copy on the upgrade dialog?");
  const [sent, setSent] = useState(0);
  const limit = 280;
  const over = text.length > limit;
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-2">
      <InputGroup invalid={over}>
        <InputGroupTextarea aria-label="Post an update" placeholder="Share an update…" value={text} onChange={(e) => setText(e.target.value)} />
        <InputGroupAddon align="block-end" className="justify-between border-t border-pui-border pt-2">
          <span className="flex items-center gap-1">
            <InputGroupButton size="icon" aria-label="Attach image">
              <ImageIcon />
            </InputGroupButton>
            <InputGroupButton size="xs">@ Mention</InputGroupButton>
          </span>
          <span className="flex items-center gap-2">
            <InputGroupText className={over ? "tabular-nums text-pui-danger-text" : "tabular-nums"} aria-live="polite">
              {text.length}/{limit}
            </InputGroupText>
            <InputGroupButton
              variant="solid"
              size="sm"
              disabled={!text.trim() || over}
              onClick={() => {
                setSent((n) => n + 1);
                setText("");
              }}
            >
              <SendIcon />
              Post
            </InputGroupButton>
          </span>
        </InputGroupAddon>
      </InputGroup>
      <p className="m-0 text-xs text-pui-muted-foreground">{sent ? `Posted ${sent} update${sent > 1 ? "s" : ""}.` : "Over 280 characters turns the whole group red and disables Post."}</p>
    </div>
  );
}

/** Secrets: masked by default, reveal and copy without leaving the field. */
function ApiKeyDemo() {
  const key = "sk_live_51Hx9QeL2vN8rTz4kWm7";
  const [shown, setShown] = useState(false);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 1400);
    return () => window.clearTimeout(t);
  }, [copied]);
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-1.5">
      <label htmlFor="ig-key" className="text-sm font-medium text-pui-foreground">
        Secret key
      </label>
      <InputGroup>
        <InputGroupAddon>
          <LockIcon />
        </InputGroupAddon>
        <InputGroupInput id="ig-key" readOnly type={shown ? "text" : "password"} value={key} className="font-mono text-[0.8125rem]" />
        <InputGroupAddon align="inline-end" className="-me-1.5">
          <InputGroupButton size="icon" aria-label={shown ? "Hide key" : "Show key"} aria-pressed={shown} onClick={() => setShown((s) => !s)}>
            <EyeIcon />
          </InputGroupButton>
          <InputGroupButton
            variant="soft"
            size="sm"
            tone={copied ? "success" : "neutral"}
            onClick={() => {
              void navigator.clipboard?.writeText(key).catch(() => undefined);
              setCopied(true);
            }}
          >
            {copied ? <CheckGlyph /> : <CopyGlyph />}
            {copied ? "Copied" : "Copy"}
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
      <p className="m-0 text-xs text-pui-muted-foreground">Rotate keys from Settings → Developers.</p>
    </div>
  );
}

const TAKEN = new Set(["admin", "maya", "design", "support", "team"]);

/** Async availability: spinner while checking, then a check or an error that turns the group red. */
function HandleDemo() {
  const [handle, setHandle] = useState("maya");
  const [state, setState] = useState<"idle" | "checking" | "ok" | "taken">("taken");
  useEffect(() => {
    if (!handle) return;
    const t = window.setTimeout(() => setState(TAKEN.has(handle.toLowerCase()) ? "taken" : "ok"), 600);
    return () => window.clearTimeout(t);
  }, [handle]);
  const status = !handle ? "idle" : state;
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-1.5">
      <label htmlFor="ig-handle" className="text-sm font-medium text-pui-foreground">
        Username
      </label>
      <InputGroup invalid={status === "taken"}>
        <InputGroupAddon>
          <InputGroupText>pulls.dev/@</InputGroupText>
        </InputGroupAddon>
        <InputGroupInput
          id="ig-handle"
          value={handle}
          aria-describedby="ig-handle-msg"
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => {
            setHandle(e.target.value.replace(/[^\w.-]/g, ""));
            setState("checking");
          }}
        />
        <InputGroupAddon align="inline-end">
          {status === "checking" ? <Spinner size="sm" label="Checking" /> : null}
          {status === "ok" ? <CheckGlyph className="text-pui-success-text" /> : null}
        </InputGroupAddon>
      </InputGroup>
      <p id="ig-handle-msg" aria-live="polite" className={status === "taken" ? "m-0 text-xs text-pui-danger-text" : "m-0 text-xs text-pui-muted-foreground"}>
        {status === "taken" ? `@${handle} is taken. Try @${handle}.studio` : status === "ok" ? `@${handle} is available.` : "Letters, numbers, dots and dashes."}
      </p>
    </div>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) =>
    `<InputGroup${props.size !== "md" ? ` size="${props.size}"` : ""}${props.invalid ? " invalid" : ""}${props.disabled ? " disabled" : ""}>\n  <InputGroupAddon>\n    <InputGroupText>${props.prefix || "https://"}</InputGroupText>\n  </InputGroupAddon>\n  <InputGroupInput aria-label="Website" placeholder="acme" />\n  <InputGroupAddon align="inline-end">\n    ${props.shortcut ? "<Kbd>⌘K</Kbd>" : "<InputGroupText>.com</InputGroupText>"}\n  </InputGroupAddon>\n</InputGroup>`,
  propsTable: [
    ...propDocs<InputGroupProps>()([
      { name: "size", type: '"sm" | "md" | "lg"', default: '"md"', description: "Height, padding and text size for the whole group." },
      { name: "invalid", type: "boolean", default: "false", description: "Danger border and ring; sets aria-invalid on the control." },
      { name: "disabled", type: "boolean", default: "false", description: "Disables the control and every InputGroupButton." },
    ]),
    ...propDocs<InputGroupAddonProps>()([
      { name: "align", type: '"inline-start" | "inline-end" | "block-start" | "block-end"', default: '"inline-start"', description: "InputGroupAddon: where it sits, whatever its markup order." },
    ]),
    ...propDocs<InputGroupButtonProps>()([
      { name: "variant", type: '"ghost" | "soft" | "solid" | "outline"', default: '"ghost"', description: "InputGroupButton: style." },
      { name: "tone", type: "Tone", default: '"neutral"', description: "InputGroupButton: color; primary by default for solid." },
      { name: "size", type: '"xs" | "sm" | "icon"', default: '"xs"', description: "InputGroupButton: compact sizes that fit inside the field." },
    ]),
    ...propDocs<InputGroupTextareaProps>()([
      { name: "maxHeight", type: "number", default: "192", description: "InputGroupTextarea: grows with its content up to this many px." },
    ]),
  ],
  keyboard: [
    { keys: "Tab", action: "Moves between the control and addon buttons in visual order" },
    { keys: "Enter / Space", action: "Activates an InputGroupButton" },
  ],
  a11y: [
    "The group has role=group; give it a label when the parts need one name.",
    "Addon text and icons are not focusable; pressing them focuses the control.",
    "Icon-only InputGroupButtons need an aria-label; toggles should set aria-pressed.",
    "invalid sets aria-invalid on the control; pair it with a message via aria-describedby.",
  ],
  reducedMotion: "Buttons skip the press spring; border and ring transitions stay as short color fades.",
  examples: [
    { title: "Composer with a toolbar", description: "Block-end addon: attach, mention, a live counter and Post.", Demo: ComposerDemo },
    { title: "Secret with reveal and copy", description: "Two inline-end buttons; the copy one confirms in place.", Demo: ApiKeyDemo },
    { title: "Async availability check", description: "Spinner while checking, then a check or a red group with a suggestion.", Demo: HandleDemo },
  ],
};

export default item;
