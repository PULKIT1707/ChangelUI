import { ChatMessage, ChatScroller, PromptInput, type ChatScrollerProps } from "changelui";
import { useEffect, useRef, useState } from "react";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  threshold: number;
  initialScroll: NonNullable<ChatScrollerProps["initialScroll"]>;
  history: boolean;
  speed: number;
};

const defaults: DemoProps = { threshold: 48, initialScroll: "bottom", history: true, speed: 40 };

const controls: ControlSpec<DemoProps>[] = [
  { type: "number", prop: "threshold", label: "Bottom threshold (px)", min: 0, max: 200, step: 8 },
  { type: "select", prop: "initialScroll", label: "Initial scroll", options: ["bottom", "top"] },
  { type: "boolean", prop: "history", label: "Load older on scroll" },
  { type: "number", prop: "speed", label: "Stream speed (ms/word)", min: 10, max: 200, step: 10 },
];

type Msg = { id: string; from: "user" | "assistant"; content: string; streaming?: boolean };

const SEED: Msg[] = [
  { id: "m1", from: "user", content: "Our onboarding drop-off doubled after the redesign. Where should I look first?" },
  {
    id: "m2",
    from: "assistant",
    content:
      "Start with the step where people stall. Compare **time on step** and **exit rate** for the old and new flows:\n\n- Step 2 (workspace name) went from 14s to 41s\n- Step 3 (invite team) has a 38% exit rate, up from 19%\n\nThe invite step now blocks progress. Making it skippable is the quickest test.",
  },
  { id: "m3", from: "user", content: "Makes sense. Can you draft the copy for a skip link?" },
  { id: "m4", from: "assistant", content: "Try **“I’ll invite people later”**. It names the action, keeps the door open and doesn’t sound like a dead end." },
];

const OLDER: Msg[][] = [
  [
    { id: "o1", from: "user", content: "Can you pull last month’s funnel numbers?" },
    { id: "o2", from: "assistant", content: "Done. 12,480 sign-ups, 7,310 finished onboarding (58.6%)." },
  ],
  [
    { id: "o3", from: "user", content: "Hi! I’m prepping the growth review." },
    { id: "o4", from: "assistant", content: "Happy to help. What do you want to cover?" },
  ],
];

const REPLY =
  "Here’s a plan for the A/B test. **Variant B** adds the skip link under the invite form and moves invites to a banner on the dashboard. Measure completion at day 1 and day 7, plus invites sent within a week so the change doesn’t just move the drop-off later. With 3,000 sign-ups a week you’ll reach significance in about 10 days. I’d also tag the banner clicks so you can see whether people come back to invite once they’ve seen the product working with their own data.";

function useStream(speed: number) {
  const [messages, setMessages] = useState<Msg[]>(SEED);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearInterval(timer.current), []);
  const streaming = messages.some((m) => m.streaming);
  const send = (text: string) => {
    const words = REPLY.split(" ");
    const id = `r${Date.now()}`;
    setMessages((m) => [...m, { id: `u${Date.now()}`, from: "user", content: text }, { id, from: "assistant", content: "", streaming: true }]);
    let i = 0;
    window.clearInterval(timer.current);
    timer.current = window.setInterval(() => {
      i++;
      setMessages((m) => m.map((msg) => (msg.id === id ? { ...msg, content: words.slice(0, i).join(" "), streaming: i < words.length } : msg)));
      if (i >= words.length) window.clearInterval(timer.current);
    }, speed);
  };
  const stop = () => {
    window.clearInterval(timer.current);
    setMessages((m) => m.map((msg) => (msg.streaming ? { ...msg, streaming: false } : msg)));
  };
  return { messages, setMessages, send, stop, streaming };
}

function Preview({ props }: { props: DemoProps }) {
  const { messages, setMessages, send, stop, streaming } = useStream(props.speed);
  const [pages, setPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [sentKey, setSentKey] = useState(0);
  const loadOlder = () => {
    setLoading(true);
    window.setTimeout(() => {
      setMessages((m) => [...(OLDER[pages] ?? []), ...m]);
      setPages((p) => p + 1);
      setLoading(false);
    }, 700);
  };
  return (
    <div className="flex h-[30rem] w-full max-w-xl flex-col overflow-hidden rounded-pui-xl border border-pui-border bg-pui-background shadow-pui-sm">
      <div className="flex items-center justify-between border-b border-pui-border px-4 py-2.5">
        <p className="text-sm font-medium text-pui-foreground">Growth review</p>
        <p className="text-xs text-pui-muted-foreground">Scroll up while it streams</p>
      </div>
      <ChatScroller
        key={props.initialScroll}
        className="flex-1"
        contentClassName="gap-5 px-4 py-4"
        threshold={props.threshold}
        initialScroll={props.initialScroll}
        scrollKey={sentKey}
        hasOlder={props.history && pages < OLDER.length}
        loadingOlder={loading}
        onLoadOlder={loadOlder}
        startOfHistory={<span>Start of the conversation</span>}
      >
        {messages.map((m) => (
          <ChatMessage key={m.id} from={m.from} content={m.content} streaming={m.streaming} author={m.from === "assistant" ? { name: "Analyst" } : undefined} />
        ))}
      </ChatScroller>
      <div className="border-t border-pui-border p-3">
        <PromptInput
          placeholder="Ask a follow-up…"
          status={streaming ? "streaming" : "idle"}
          onStop={stop}
          onSubmit={({ text }) => {
            send(text || "Plan the A/B test for the skip link.");
            setSentKey((k) => k + 1);
          }}
        />
      </div>
    </div>
  );
}

function Mini() {
  return (
    <div aria-hidden="true" className="pointer-events-none relative w-64 overflow-hidden rounded-pui-lg border border-pui-border bg-pui-background p-3">
      <div className="flex flex-col gap-2 text-[0.6875rem]">
        <p className="self-end rounded-pui-lg bg-pui-primary px-2 py-1 text-pui-primary-foreground">Where do people drop off?</p>
        <p className="text-pui-foreground">Step 3, the invite step, has a 38% exit rate…</p>
        <p className="text-pui-muted-foreground">Making it skippable is the quickest test.</p>
      </div>
      <span className="absolute inset-x-0 bottom-2 mx-auto flex w-fit items-center gap-1 rounded-pui-full border border-pui-primary/30 bg-pui-surface px-2.5 py-1 text-[0.625rem] font-medium text-pui-primary-text shadow-pui-md">↓ 2 new messages</span>
    </div>
  );
}

const TICKS = ["Deploy started", "Build cached (14s)", "Migrations ran", "Health checks passing", "Traffic at 25%", "Traffic at 50%", "Traffic at 100%", "Deploy finished"];

/** Any content works: a status feed that keeps appending, with the pill counting what you missed. */
function FeedDemo() {
  const [count, setCount] = useState(3);
  useEffect(() => {
    if (count >= TICKS.length) return;
    const t = window.setTimeout(() => setCount((c) => c + 1), 1400);
    return () => window.clearTimeout(t);
  }, [count]);
  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-2">
      <ChatScroller aria-label="Deploy updates" className="h-48 rounded-pui-lg border border-pui-border bg-pui-muted/30" contentClassName="gap-2 p-3">
        {TICKS.slice(0, count).map((t, i) => (
          <div key={t} className="rounded-pui-md border border-pui-border bg-pui-surface px-3 py-2 text-sm text-pui-foreground shadow-pui-xs">
            <span className="me-2 font-mono text-xs text-pui-muted-foreground">{`12:0${i}`}</span>
            {t}
          </div>
        ))}
      </ChatScroller>
      <button type="button" onClick={() => setCount(1)} className="self-end text-xs font-medium text-pui-primary-text underline-offset-2 hover:underline">
        Replay
      </button>
    </div>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) =>
    `<ChatScroller\n  className="h-[30rem]"${props.threshold !== 48 ? `\n  threshold={${props.threshold}}` : ""}${props.initialScroll !== "bottom" ? `\n  initialScroll="${props.initialScroll}"` : ""}\n  scrollKey={lastSentId} // jump down when the person sends${props.history ? "\n  hasOlder={hasOlder}\n  loadingOlder={loading}\n  onLoadOlder={loadOlder} // prepend; the view stays put" : ""}\n>\n  {messages.map((m) => (\n    <ChatMessage key={m.id} from={m.from} content={m.content} streaming={m.streaming} />\n  ))}\n</ChatScroller>`,
  propsTable: propDocs<ChatScrollerProps>()([
    { name: "children", type: "ReactNode", description: "Messages, oldest first, each with a stable key." },
    { name: "threshold", type: "number", default: "48", description: "px from the bottom that still counts as following." },
    { name: "initialScroll", type: '"bottom" | "top"', default: '"bottom"', description: "Where the view starts." },
    { name: "scrollKey", type: "Key", description: "Change it to jump to the latest and follow again." },
    { name: "onLoadOlder", type: "() => void", description: "Called near the top while hasOlder and not loadingOlder." },
    { name: "loadingOlder", type: "boolean", default: "false", description: "Shows a loading row at the top." },
    { name: "hasOlder", type: "boolean", default: "false", description: "More history exists." },
    { name: "startOfHistory", type: "ReactNode", description: "Top row once there's no more history." },
    { name: "onStickChange", type: "(stuck: boolean) => void", description: "Following the latest turned on or off." },
    { name: "jumpLabel", type: "(unread: number) => ReactNode", description: 'Pill text. Default "N new messages" / "Jump to latest".' },
    { name: "viewportClassName", type: "string", description: "Classes for the scrolling element (the ref target)." },
    { name: "contentClassName", type: "string", description: "Classes for the content column, e.g. gap and padding." },
    { name: "aria-label", type: "string", default: '"Conversation"', description: "Name of the log region." },
  ]),
  keyboard: [
    { keys: "Tab", action: "Focus the conversation, then the jump pill when it shows" },
    { keys: "↑ / ↓ / Page Up / Page Down", action: "Scroll the history (stops following)" },
    { keys: "Enter / Space", action: "Jump to the latest" },
  ],
  a11y: [
    'The viewport is a focusable role="log" region with additions-only announcements, so streaming tokens don\'t flood screen readers.',
    "The jump pill is a real button with the unread count in its name.",
    "Loading older messages is a polite status.",
  ],
  reducedMotion: "Jumps are instant instead of smooth; the pill fades without sliding.",
  examples: [{ title: "Live status feed", description: "Any markup works. Scroll up and the pill counts new updates.", Demo: FeedDemo }],
};

export default item;
