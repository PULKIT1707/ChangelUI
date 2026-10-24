import { Button, ChatMessage, type ChatFeedback, type ChatMessageProps } from "changelui";
import { useEffect, useRef, useState } from "react";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  variant: NonNullable<ChatMessageProps["variant"]>;
  showActions: NonNullable<ChatMessageProps["showActions"]>;
  streaming: boolean;
  branches: boolean;
};

const defaults: DemoProps = { variant: "default", showActions: "always", streaming: false, branches: true };

const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "variant", label: "Variant", options: ["default", "bubble"] },
  { type: "select", prop: "showActions", label: "Actions", options: ["always", "hover"] },
  { type: "boolean", prop: "streaming", label: "Streaming" },
  { type: "boolean", prop: "branches", label: "Alternatives" },
];

const ASK = "How do I debounce a search input in React without a library?";

const REPLIES = [
  `Keep the input **controlled** and debounce only the *query* you act on:

\`\`\`tsx
const [text, setText] = useState("");
const [query, setQuery] = useState("");
useEffect(() => {
  const t = setTimeout(() => setQuery(text), 300);
  return () => clearTimeout(t);
}, [text]);
\`\`\`

- The input stays instant, so typing never lags.
- \`query\` changes at most every 300ms, so fetches stay calm.`,
  `Use a small \`useDebouncedValue(value, delay)\` hook:

1. Store the latest value in state.
2. Start a timer on every change and clear the previous one.
3. Return the settled value and fetch from it.

> Tip: cancel stale requests with an \`AbortController\` so a slow early response can’t overwrite a newer one.`,
];

function Preview({ props }: { props: DemoProps }) {
  const [branch, setBranch] = useState(0);
  const [feedback, setFeedback] = useState<ChatFeedback>("up");
  const full = REPLIES[props.branches ? branch : 0] ?? "";
  const shown = props.streaming ? full.slice(0, Math.floor(full.length * 0.55)) : full;
  return (
    <div className="flex w-full max-w-xl flex-col gap-5">
      <ChatMessage from="user" content={ASK} variant={props.variant} showActions={props.showActions} />
      <ChatMessage
        content={shown}
        author={{ name: "Pulls Assistant" }}
        variant={props.variant}
        showActions={props.showActions}
        streaming={props.streaming}
        onRetry={() => setBranch((b) => (b + 1) % REPLIES.length)}
        feedback={feedback}
        onFeedbackChange={setFeedback}
        branch={props.branches ? branch : 0}
        branchCount={props.branches ? REPLIES.length : 1}
        onBranchChange={setBranch}
      />
    </div>
  );
}

function Mini() {
  return (
    <div aria-hidden="true" className="pointer-events-none flex w-72 flex-col gap-3">
      <ChatMessage from="user" content="Summarize this PR" copyText={false} />
      <ChatMessage content={"Adds **retry with backoff** to the uploader and a `maxAttempts` option."} avatar={false} streaming />
    </div>
  );
}

const STREAM = `Here’s a quick checklist before you deploy:

1. Run \`npm run typecheck\` and the tests.
2. Bump the version in **package.json**.
3. Tag the release:

\`\`\`sh
git tag v2.4.0 && git push --tags
\`\`\`

Then watch the error rate for ten minutes.`;

/** Streams token by token; Regenerate adds an alternative and the switcher pages between them. */
function StreamingDemo() {
  const [replies, setReplies] = useState<string[]>([]);
  const [branch, setBranch] = useState(0);
  const [length, setLength] = useState(0);
  const timer = useRef<number | undefined>(undefined);
  const streaming = replies.length > 0 && branch === replies.length - 1 && length < (replies[branch]?.length ?? 0);
  useEffect(() => {
    if (!streaming) return;
    timer.current = window.setTimeout(() => setLength((n) => n + 3 + Math.floor(Math.random() * 5)), 28);
    return () => window.clearTimeout(timer.current);
  }, [streaming, length]);
  const start = () => {
    const variant = replies.length % 2 === 0 ? STREAM : STREAM.replace("quick checklist", "short list").replace("ten minutes", "a full traffic cycle");
    setReplies((r) => [...r, variant]);
    setBranch(replies.length);
    setLength(0);
  };
  const current = replies[branch] ?? "";
  const text = branch === replies.length - 1 ? current.slice(0, length) : current;
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4">
      <ChatMessage from="user" content="What should I check before deploying?" />
      {replies.length ? (
        <ChatMessage
          content={text}
          streaming={streaming}
          avatar={false}
          onRetry={start}
          branch={branch}
          branchCount={replies.length}
          onBranchChange={setBranch}
          showActions="always"
        />
      ) : (
        <div className="flex justify-start">
          <Button size="sm" onClick={start}>
            Generate reply
          </Button>
        </div>
      )}
    </div>
  );
}

/** A reply that was cut off: the error sits under the partial text with an inline Retry. */
function ErrorDemo() {
  const [failed, setFailed] = useState(true);
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4">
      <ChatMessage from="user" content="Translate the onboarding email into Spanish." />
      <ChatMessage
        avatar={false}
        content={failed ? "Asunto: Bienvenido a bordo\n\nHola Ana, gracias por unirte. En los próximos" : "Asunto: Bienvenido a bordo\n\nHola Ana, gracias por unirte. En los próximos días te enviaremos consejos para sacar el máximo partido a tu cuenta."}
        error={failed ? "Connection lost. The reply was cut off." : undefined}
        onRetry={() => setFailed((f) => !f)}
        showActions="always"
      />
    </div>
  );
}

/** Support chat: bubbles on both sides, a centered system note and timestamps. */
function SupportDemo() {
  const [now] = useState(() => Date.now());
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-3 rounded-pui-xl border border-pui-border bg-pui-background p-4">
      <ChatMessage from="system" content="**Jordan** from Billing joined the conversation" />
      <ChatMessage variant="bubble" author={{ name: "Jordan" }} timestamp={now - 4 * 60_000} content="Hi! I can see two charges on Oct 3. The second is a pending authorization and will drop off in 1–3 days." copyText={false} />
      <ChatMessage from="user" variant="bubble" timestamp={now - 2 * 60_000} content="Got it, thanks. Can I get an invoice for the first one?" copyText={false} />
      <ChatMessage
        variant="bubble"
        author={{ name: "Jordan" }}
        timestamp={now - 60_000}
        content="Sent to your billing email. You can also download it from [Billing → Invoices](#invoices)."
        copyText={false}
      />
    </div>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) =>
    `<ChatMessage from="user" content={question} />\n<ChatMessage\n  content={reply}${props.streaming ? "\n  streaming" : ""}${props.variant !== "default" ? `\n  variant="${props.variant}"` : ""}${props.showActions !== "hover" ? `\n  showActions="${props.showActions}"` : ""}\n  onRetry={regenerate}\n  feedback={feedback}\n  onFeedbackChange={setFeedback}${props.branches ? "\n  branch={branch}\n  branchCount={replies.length}\n  onBranchChange={setBranch}" : ""}\n/>`,
  propsTable: propDocs<ChatMessageProps>()([
    { name: "from", type: '"user" | "assistant" | "system"', default: '"assistant"', description: "User bubbles sit right, assistant replies left, system notes center." },
    { name: "content", type: "string", description: "Light markdown: **bold**, *italic*, `code`, fences, lists, quotes, ### headings, safe links." },
    { name: "children", type: "ReactNode", description: "Custom body instead of content." },
    { name: "streaming", type: "boolean", default: "false", description: "Caret at the end of the text; actions wait until it ends." },
    { name: "author", type: "{ name, avatarUrl? }", description: "Name and avatar shown on assistant replies." },
    { name: "avatar", type: "ReactNode | false", description: "Custom avatar, or false for none." },
    { name: "timestamp", type: "number | string | Date", description: "Shown beside the name as a <time>." },
    { name: "variant", type: '"default" | "bubble"', default: '"default"', description: "bubble wraps assistant replies too." },
    { name: "copyText", type: "string | false", description: "What Copy writes (default: content); false hides Copy." },
    { name: "onRetry", type: "() => void", description: "Shows Regenerate, and Retry next to an error." },
    { name: "feedback", type: '"up" | "down" | null', description: "Thumbs state (defaultFeedback, onFeedbackChange shows the buttons)." },
    { name: "branch", type: "number", default: "0", description: "Current alternative (0-based) with branchCount and onBranchChange." },
    { name: "actions", type: "ReactNode", description: "Extra buttons in the action bar." },
    { name: "showActions", type: '"hover" | "always"', default: '"hover"', description: "Hover also reveals on focus; touch screens always show them." },
    { name: "error", type: "ReactNode", description: "Error line under the message (role=alert)." },
  ]),
  keyboard: [
    { keys: "Tab", action: "Reveals the action bar and moves through its buttons" },
    { keys: "Enter / Space", action: "Copy, regenerate, rate or switch the alternative" },
  ],
  a11y: [
    "Each message is an <article> named after its author; aria-busy while streaming.",
    "The caret is aria-hidden; announce new replies from the chat list (role=log), not per message.",
    "Thumbs are toggle buttons with aria-pressed; the switcher reads “Response 2 of 3”.",
    "Markdown renders as real elements (code, lists, links) and never injects HTML; only http, mailto and relative links are kept.",
  ],
  reducedMotion: "The caret holds still, alternatives and icon swaps fade instead of sliding or popping.",
  examples: [
    { title: "Streaming with alternatives", description: "Generate, then Regenerate: each reply becomes a branch.", Demo: StreamingDemo },
    { title: "Cut-off reply", description: "Error under the partial text, with Retry.", Demo: ErrorDemo },
    { title: "Support chat", description: "Bubble variant, a system note and timestamps.", Demo: SupportDemo },
  ],
};

export default item;
