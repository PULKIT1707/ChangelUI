import { Badge, VanishInput, type VanishInputProps } from "changelui";
import { useState } from "react";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";
type DemoProps = {
  size: NonNullable<VanishInputProps["size"]>;
  interval: number;
  clearOnSubmit: boolean;
  withIcon: boolean;
  disabled: boolean;
};
const defaults: DemoProps = { size: "md", interval: 3200, clearOnSubmit: true, withIcon: true, disabled: false };
const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "size", label: "Size", options: ["md", "lg"] },
  { type: "number", prop: "interval", label: "Placeholder interval (ms)", min: 1200, max: 8000, step: 200 },
  { type: "boolean", prop: "clearOnSubmit", label: "Clear on submit" },
  { type: "boolean", prop: "withIcon", label: "Leading icon" },
  { type: "boolean", prop: "disabled", label: "Disabled" },
];
const SEARCHES = ["Search invoices, people or settings…", "Try “unpaid invoices from March”", "Try “who changed billing last week”", "Try “export team usage as CSV”"];
function SearchGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true" className="size-full">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}
function Preview({ props }: { props: DemoProps }) {
  const { withIcon, ...rest } = props;
  const [sent, setSent] = useState<string[]>(["overdue invoices", "seat usage by team", "billing contacts"]);
  return (
    <div className="flex w-full max-w-xl flex-col gap-4">
      <VanishInput {...rest} placeholders={SEARCHES} icon={withIcon ? <SearchGlyph /> : undefined} onSubmit={(v) => setSent((s) => [v, ...s.filter((x) => x !== v)].slice(0, 4))} />
      <div className="rounded-pui-xl border border-pui-border bg-pui-surface p-3 text-pui-surface-foreground">
        <p className="m-0 px-2 pb-2 text-xs font-medium text-pui-muted-foreground">Recent searches</p>
        <ul className="m-0 flex list-none flex-col p-0">
          {sent.map((s, i) => (
            <li key={s} className="flex items-center justify-between gap-3 rounded-pui-md px-2 py-1.5 text-sm">
              <span className="truncate">{s}</span>
              {i === 0 ? <Badge tone="primary">latest</Badge> : <span className="text-xs text-pui-muted-foreground">{i + 1}d ago</span>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
interface Message {
  id: number;
  from: "you" | "assistant";
  text: string;
}
/** A chat composer: the prompt dissolves as it is sent, then the bubble appears above. */
function ChatDemo() {
  const [messages, setMessages] = useState<Message[]>([{ id: 0, from: "assistant", text: "Hi! Ask me about your workspace." }]);
  const send = (text: string) => {
    const id = Date.now();
    setMessages((m) => [...m, { id, from: "you" as const, text }].slice(-4));
    setTimeout(() => setMessages((m) => [...m, { id: id + 1, from: "assistant" as const, text: `Looking into “${text}”…` }].slice(-4)), 700);
  };
  return (
    <div className="flex w-full flex-col gap-3 rounded-pui-xl border border-pui-border bg-pui-surface p-4 text-pui-surface-foreground">
      <ol className="m-0 flex h-44 list-none flex-col justify-end gap-2 overflow-hidden p-0" aria-label="Conversation">
        {messages.map((m) => (
          <li
            key={m.id}
            className={
              m.from === "you"
                ? "max-w-[80%] self-end rounded-pui-lg rounded-br-pui-sm bg-pui-primary px-3 py-2 text-sm text-pui-primary-foreground"
                : "max-w-[80%] self-start rounded-pui-lg rounded-bl-pui-sm bg-pui-muted px-3 py-2 text-sm text-pui-foreground"
            }
          >
            {m.text}
          </li>
        ))}
      </ol>
      <VanishInput aria-label="Message the assistant" submitLabel="Send message" placeholders={["Ask about usage this month", "Summarize yesterday’s incidents", "Draft a release note"]} sentMessage={() => "Message sent"} onSubmit={send} />
    </div>
  );
}
/** Large hero search with no rotation: one placeholder, Enter to go. */
function HeroDemo() {
  const [last, setLast] = useState("");
  return (
    <div className="flex w-full flex-col items-center gap-3 rounded-pui-xl bg-pui-muted/60 px-6 py-10 text-center">
      <p className="m-0 text-2xl font-semibold tracking-tight text-pui-foreground">How can we help?</p>
      <VanishInput size="lg" className="max-w-lg" placeholders={["Search help articles"]} icon={<SearchGlyph />} onSubmit={setLast} />
      <p className="m-0 h-5 text-sm text-pui-muted-foreground">{last ? `Showing results for “${last}”` : "Popular: refunds, SSO, API keys"}</p>
    </div>
  );
}
function Mini() {
  return (
    <div className="w-full max-w-60" aria-hidden="true" inert>
      <VanishInput placeholders={["Ask anything…"]} tabIndex={-1} />
    </div>
  );
}
const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: ({ size, interval, clearOnSubmit, withIcon, disabled }) => {
    const attrs = [
      `placeholders={["Search invoices…", "Try “unpaid invoices from March”"]}`,
      size !== "md" ? `size="${size}"` : "",
      interval !== 3200 ? `interval={${interval}}` : "",
      clearOnSubmit ? "" : "clearOnSubmit={false}",
      withIcon ? "icon={<SearchIcon />}" : "",
      disabled ? "disabled" : "",
      "onSubmit={(query) => search(query)}",
    ].filter(Boolean);
    return `<VanishInput\n  ${attrs.join("\n  ")}\n/>`;
  },
  propsTable: propDocs<VanishInputProps>()([
    { name: "placeholders", type: "string[]", default: "[]", description: "Example queries that rotate while the field is empty. The first is also the native placeholder." },
    { name: "interval", type: "number", default: "3200", description: "Milliseconds each placeholder stays." },
    { name: "onSubmit", type: "(value: string) => void", description: "Called with the trimmed text on Enter or the send button." },
    { name: "value", type: "string", description: "Controlled text. Pair with onValueChange." },
    { name: "defaultValue", type: "string", default: '""', description: "Initial text when uncontrolled." },
    { name: "onValueChange", type: "(value: string) => void", description: "Called on every edit." },
    { name: "clearOnSubmit", type: "boolean", default: "true", description: "Empty the field after submit; the text dissolves into particles." },
    { name: "size", type: '"md" | "lg"', default: '"md"', description: "Field height and text size." },
    { name: "submitLabel", type: "string", default: '"Send"', description: "Accessible name of the send button." },
    { name: "sentMessage", type: "(value: string) => string", default: "`Sent: ${value}`", description: "Polite announcement after a submit." },
    { name: "icon", type: "ReactNode", description: "Decorative icon at the start of the field." },
    { name: "inputClassName", type: "string", description: "Class for the native input; className styles the outer field." },
  ]),
  keyboard: [
    { keys: "Enter", action: "Send the text" },
    { keys: "Tab", action: "Move to the send button" },
  ],
  a11y: [
    "The field is a form with role=search; the first placeholder is the native placeholder, so the input has a hint even without aria-label.",
    "Rotating placeholders are aria-hidden and pause while the field has text or the tab is hidden.",
    "After a submit a polite status announces what was sent; focus stays in the field.",
    "The send button is disabled until there is text, and has its own accessible name.",
  ],
  reducedMotion: "The text clears instantly without particles, and placeholders swap without sliding.",
  examples: [
    { title: "Chat composer", description: "The prompt dissolves as it is sent, then the reply arrives.", Demo: ChatDemo },
    { title: "Help center hero", description: "Large size with a single placeholder.", Demo: HeroDemo },
  ],
};
export default item;
