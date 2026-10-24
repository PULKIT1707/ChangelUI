import { PromptInput, SegmentedControl, SegmentedControlItem, type PromptInputProps, type PromptInputStatus } from "changelui";
import { useEffect, useRef, useState } from "react";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";
type DemoProps = {
  status: PromptInputStatus;
  suggestions: boolean;
  allowAttachments: boolean;
  maxLength: number;
  disabled: boolean;
};
const defaults: DemoProps = { status: "idle", suggestions: true, allowAttachments: true, maxLength: 0, disabled: false };
const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "status", label: "Status", options: ["idle", "submitted", "streaming"] },
  { type: "boolean", prop: "suggestions", label: "Suggestions" },
  { type: "boolean", prop: "allowAttachments", label: "Attachments" },
  { type: "number", prop: "maxLength", label: "Max length (0 = none)", min: 0, max: 500, step: 20 },
  { type: "boolean", prop: "disabled", label: "Disabled" },
];
const starters = ["Summarize this document", "Draft a reply to the client", "Find bugs in my code"];
function Preview({ props }: { props: DemoProps }) {
  const [sent, setSent] = useState<string | null>(null);
  return (
    <div className="flex w-full max-w-xl flex-col gap-3">
      <PromptInput
        status={props.status}
        onStop={() => setSent("Stopped")}
        suggestions={props.suggestions ? starters : undefined}
        allowAttachments={props.allowAttachments}
        accept="image/*,.pdf,.txt,.md,.csv"
        maxFileSize={10 * 1024 * 1024}
        maxLength={props.maxLength || undefined}
        disabled={props.disabled}
        onSubmit={({ text, files }) => setSent(`${text || "(no text)"}${files.length ? ` + ${files.length} file${files.length === 1 ? "" : "s"}` : ""}`)}
      />
      <p className="m-0 text-xs text-pui-muted-foreground" aria-live="polite">
        {sent ? `Sent: ${sent}` : "Enter sends, Shift+Enter adds a line. Paste or drop files to attach."}
      </p>
    </div>
  );
}
function Mini() {
  return (
    <div aria-hidden="true" className="pointer-events-none w-64">
      <PromptInput defaultValue="Plan a 3-day trip to Lisbon" textareaProps={{ tabIndex: -1 }} />
    </div>
  );
}
interface Message {
  id: number;
  role: "user" | "assistant";
  text: string;
}
const reply =
  "Here's a quick plan: start with the Alfama walk in the morning, take tram 28 to Estrela after lunch, and end the day with sunset at the Miradouro da Senhora do Monte.";
/** Chat: submitted → streaming → idle, with a working Stop button. */
function ChatDemo() {
  const [messages, setMessages] = useState<Message[]>([{ id: 0, role: "assistant", text: "Hi! Ask me anything about your trip." }]);
  const [status, setStatus] = useState<PromptInputStatus>("idle");
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  useEffect(() => () => clearInterval(timer.current), []);
  const stop = () => {
    clearInterval(timer.current);
    setStatus("idle");
  };
  const send = ({ text }: { text: string }) => {
    const id = Date.now();
    setMessages((m) => [...m, { id, role: "user", text }, { id: id + 1, role: "assistant", text: "" }]);
    setStatus("submitted");
    let i = 0;
    timer.current = setTimeout(() => {
      setStatus("streaming");
      timer.current = setInterval(() => {
        i += 3;
        setMessages((m) => m.map((msg) => (msg.id === id + 1 ? { ...msg, text: reply.slice(0, i) } : msg)));
        if (i >= reply.length) stop();
      }, 30);
    }, 600);
  };
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-3 rounded-pui-xl border border-pui-border bg-pui-background p-4">
      <ol className="m-0 flex max-h-64 list-none flex-col gap-2 overflow-auto p-0" aria-label="Conversation">
        {messages.map((m) => (
          <li
            key={m.id}
            className={
              m.role === "user"
                ? "max-w-[80%] self-end rounded-pui-lg bg-pui-primary px-3 py-2 text-sm text-pui-primary-foreground"
                : "max-w-[85%] self-start rounded-pui-lg bg-pui-muted px-3 py-2 text-sm text-pui-foreground"
            }
          >
            {m.text || <span className="text-pui-muted-foreground">Thinking…</span>}
          </li>
        ))}
      </ol>
      <PromptInput status={status} onSubmit={send} onStop={stop} placeholder="Ask about Lisbon…" allowAttachments={false} />
    </div>
  );
}
/** Footer slot: a model and mode picker next to the send button. */
function ToolbarDemo() {
  const [mode, setMode] = useState("chat");
  return (
    <div className="mx-auto w-full max-w-lg">
      <PromptInput
        placeholder={mode === "search" ? "Search the web…" : mode === "code" ? "Describe the change…" : "Message the assistant…"}
        footer={
          <SegmentedControl size="sm" value={mode} onValueChange={setMode} aria-label="Mode">
            <SegmentedControlItem value="chat">Chat</SegmentedControlItem>
            <SegmentedControlItem value="search">Search</SegmentedControlItem>
            <SegmentedControlItem value="code">Code</SegmentedControlItem>
          </SegmentedControl>
        }
      />
    </div>
  );
}
/** Images only, at most 3, with the rejection reason shown under the field. */
function ImagesDemo() {
  return (
    <div className="mx-auto w-full max-w-lg">
      <PromptInput
        label="Describe the edit"
        placeholder="Attach up to 3 screenshots and describe the bug…"
        accept="image/*"
        maxFiles={3}
        maxFileSize={5 * 1024 * 1024}
        maxRows={4}
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
    const attrs = ["status={status}", "onSubmit={({ text, files }) => send(text, files)}", "onStop={stop}"];
    if (props.suggestions) attrs.push('suggestions={["Summarize this document", "Find bugs in my code"]}');
    if (!props.allowAttachments) attrs.push("allowAttachments={false}");
    else attrs.push('accept="image/*,.pdf"');
    if (props.maxLength) attrs.push(`maxLength={${props.maxLength}}`);
    if (props.disabled) attrs.push("disabled");
    return `const [status, setStatus] = useState<PromptInputStatus>("idle");
<PromptInput
  ${attrs.join("\n  ")}
/>`;
  },
  propsTable: propDocs<PromptInputProps>()([
    { name: "onSubmit", type: "({ text, files }) => void | boolean | Promise", description: "Enter or Send. Return false to keep the text and files." },
    { name: "status", type: '"idle" | "submitted" | "streaming"', default: '"idle"', description: "submitted spins; streaming turns Send into Stop." },
    { name: "onStop", type: "() => void", description: "Stop button and Escape while streaming." },
    { name: "value", type: "string", description: "The text (defaultValue, onValueChange)." },
    { name: "suggestions", type: "string[]", description: "Starter pills shown while the field is empty." },
    { name: "onSuggestionSelect", type: "(s) => void", description: "Default fills the field and focuses it." },
    { name: "allowAttachments", type: "boolean", default: "true", description: "Paperclip, paste and drop." },
    { name: "accept", type: "string", description: 'Input accept syntax: "image/*,.pdf".' },
    { name: "maxFiles", type: "number", default: "10", description: "Most attachments." },
    { name: "maxFileSize", type: "number", description: "Largest file in bytes." },
    { name: "onFilesRejected", type: "(files, message) => void", description: "Refused by type, size or count." },
    { name: "onFilesChange", type: "(files) => void", description: "Whenever attachments change." },
    { name: "footer", type: "ReactNode", description: "Slot left of Send: model pickers, tool toggles." },
    { name: "maxRows", type: "number", default: "8", description: "Rows before the field scrolls." },
    { name: "maxLength", type: "number", description: "Counter appears at 80% of the limit." },
    { name: "label", type: "string", default: '"Message"', description: "Accessible name of the field." },
  ]),
  keyboard: [
    { keys: "Enter", action: "Send (ignored while an IME is composing)" },
    { keys: "Shift+Enter", action: "New line" },
    { keys: "Escape", action: "Stop generating (while streaming)" },
  ],
  a11y: [
    "A real <form>; the field is labelled and the icon buttons have names (Attach files, Send message, Stop generating).",
    "Attachments are a labelled list, each with a 24px remove button; adds, removals and refusals are announced.",
    "Rejection reasons are linked to the field with aria-describedby.",
  ],
  reducedMotion: "Chips, pills and the send/stop icon swap without scale or rotation; the busy ring spins slower.",
  examples: [
    { title: "Streaming chat", description: "submitted → streaming → idle with a working Stop.", Demo: ChatDemo, wide: true },
    { title: "Mode picker in the footer", description: "footer slot with a SegmentedControl.", Demo: ToolbarDemo },
    { title: "Screenshots only", description: 'accept="image/*", maxFiles={3}, maxRows={4}.', Demo: ImagesDemo },
  ],
};
export default item;
