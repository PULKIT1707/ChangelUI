import { PresenceCursors, type PresenceCursorsProps, type PresenceUser } from "changelui";
import { useEffect, useRef, useState } from "react";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";
type DemoProps = {
  updatesPerSecond: number;
  idleAfter: number;
  showStack: boolean;
  stackPosition: NonNullable<PresenceCursorsProps["stackPosition"]>;
};
const defaults: DemoProps = { updatesPerSecond: 6, idleAfter: 4000, showStack: true, stackPosition: "top-right" };
const controls: ControlSpec<DemoProps>[] = [
  { type: "number", prop: "updatesPerSecond", label: "Network updates / s", min: 1, max: 30, step: 1 },
  { type: "number", prop: "idleAfter", label: "Idle after (ms)", min: 1000, max: 10000, step: 500 },
  { type: "boolean", prop: "showStack", label: "Avatar stack" },
  { type: "select", prop: "stackPosition", label: "Stack corner", options: ["top-right", "bottom-left"] },
];
interface Walker {
  id: string;
  name: string;
  status?: string;
  /** Path: center, radius and speed of a Lissajous loop. */
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  speed: number;
  phase: number;
  /** Seconds of each 20 s cycle spent still (to show idle). */
  rest?: number;
}
const TEAM: Walker[] = [
  { id: "avery", name: "Avery Chen", status: "Editing “Q3 goals”", cx: 0.32, cy: 0.42, rx: 0.16, ry: 0.18, speed: 0.6, phase: 0 },
  { id: "sam", name: "Sam Okafor", cx: 0.66, cy: 0.58, rx: 0.2, ry: 0.16, speed: 0.45, phase: 2 },
  { id: "noor", name: "Noor Haddad", status: "typing…", cx: 0.55, cy: 0.3, rx: 0.12, ry: 0.08, speed: 0.9, phase: 4, rest: 12 },
  // Wanders past the right edge now and then, so the edge pin shows up.
  { id: "lee", name: "Lee Park", cx: 0.86, cy: 0.72, rx: 0.32, ry: 0.12, speed: 0.35, phase: 1 },
  { id: "mika", name: "Mika Laine", cx: 0.2, cy: 0.78, rx: 0.08, ry: 0.06, speed: 0.7, phase: 3 },
];
function positionAt(w: Walker, t: number): { x: number; y: number } {
  const cycle = t % 20;
  const moving = w.rest ? Math.min(cycle, 20 - w.rest) : t;
  const s = (w.rest ? Math.floor(t / 20) * (20 - w.rest) + moving : t) * w.speed + w.phase;
  return { x: w.cx + Math.cos(s) * w.rx, y: w.cy + Math.sin(s * 1.7) * w.ry };
}
/** Simulated collaborators: positions arrive in bursts like a real socket, the component smooths them. */
function useTeam(hz: number, team: Walker[] = TEAM): PresenceUser[] {
  const [users, setUsers] = useState<PresenceUser[]>(() => team.map((w) => ({ id: w.id, name: w.name, status: w.status, ...positionAt(w, 0) })));
  useEffect(() => {
    const start = performance.now();
    const id = window.setInterval(() => {
      const t = (performance.now() - start) / 1000;
      setUsers(team.map((w) => ({ id: w.id, name: w.name, status: w.status, ...positionAt(w, t) })));
    }, 1000 / Math.max(1, hz));
    return () => window.clearInterval(id);
  }, [hz, team]);
  return users;
}
const NOTES = [
  { text: "Ship saved views", x: "10%", y: "16%", tone: "bg-pui-warning/25" },
  { text: "Faster search", x: "40%", y: "12%", tone: "bg-pui-info/20" },
  { text: "Fix checkout jump", x: "62%", y: "38%", tone: "bg-pui-danger/15" },
  { text: "Timeline layout", x: "18%", y: "54%", tone: "bg-pui-success/20" },
  { text: "Usage alerts", x: "48%", y: "66%", tone: "bg-pui-primary/15" },
];
function Board() {
  return (
    <div className="absolute inset-0 bg-pui-muted/40 bg-[radial-gradient(var(--pui-border)_1px,transparent_1px)] bg-size-[18px_18px]">
      <p className="absolute left-4 top-3 m-0 text-sm font-semibold text-pui-foreground">Q3 planning board</p>
      {NOTES.map((n) => (
        <div
          key={n.text}
          className={`absolute w-36 rounded-pui-md border border-pui-border p-3 text-sm font-medium text-pui-foreground shadow-pui-sm ${n.tone}`}
          style={{ left: n.x, top: n.y }}
        >
          {n.text}
        </div>
      ))}
    </div>
  );
}
function Preview({ props }: { props: DemoProps }) {
  const users = useTeam(props.updatesPerSecond);
  const [me, setMe] = useState<string>("Move over the board");
  return (
    <div className="flex w-full max-w-3xl flex-col gap-2">
      <PresenceCursors
        users={users}
        idleAfter={props.idleAfter}
        showStack={props.showStack}
        stackPosition={props.stackPosition}
        onLocalMove={(p) => setMe(p ? `You: ${Math.round(p.x * 100)}%, ${Math.round(p.y * 100)}%` : "Move over the board")}
        className="h-96 w-full rounded-pui-xl border border-pui-border"
      >
        <Board />
      </PresenceCursors>
      <div className="flex justify-between gap-3 text-xs text-pui-muted-foreground tabular-nums">
        <span>{me}</span>
        <span>Hover or click an avatar to spotlight that cursor.</span>
      </div>
    </div>
  );
}
/** Your pointer on the left is sent at a low rate with latency; the right side smooths it. */
function EchoDemo() {
  const [remote, setRemote] = useState<PresenceUser[]>([]);
  const last = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => {
    // 8 updates per second plus 120 ms of fake latency, like a busy socket.
    const id = window.setInterval(() => {
      const p = last.current;
      window.setTimeout(() => setRemote(p ? [{ id: "you", name: "You (remote view)", color: "var(--pui-chart-2)", ...p }] : []), 120);
    }, 125);
    return () => window.clearInterval(id);
  }, []);
  return (
    <div className="grid w-full grid-cols-2 gap-2">
      <PresenceCursors users={[]} showStack={false} onLocalMove={(p) => (last.current = p)} className="h-44 cursor-crosshair rounded-pui-lg border border-dashed border-pui-border bg-pui-surface">
        <p className="m-0 p-3 text-xs text-pui-muted-foreground">Move here</p>
      </PresenceCursors>
      <PresenceCursors users={remote} showStack={false} idleAfter={0} className="h-44 rounded-pui-lg border border-pui-border bg-pui-muted/40">
        <p className="m-0 p-3 text-xs text-pui-muted-foreground">What teammates see (8 Hz, 120 ms late)</p>
      </PresenceCursors>
    </div>
  );
}
const DOC_TEAM: Walker[] = [
  { id: "ri", name: "Rina", status: "commenting", cx: 0.3, cy: 0.35, rx: 0.1, ry: 0.04, speed: 0.5, phase: 0 },
  { id: "jo", name: "Jo", cx: 0.62, cy: 0.62, rx: 0.14, ry: 0.05, speed: 0.4, phase: 2 },
];
/** In a document, bottom-left stack and status chips. */
function DocDemo() {
  const users = useTeam(5, DOC_TEAM);
  return (
    <PresenceCursors users={users} stackPosition="bottom-right" className="h-44 w-full rounded-pui-lg border border-pui-border bg-pui-surface">
      <div className="flex flex-col gap-2 p-4 text-sm leading-relaxed text-pui-surface-foreground">
        <p className="m-0 font-semibold">Launch brief</p>
        <p className="m-0 text-pui-muted-foreground">We are shipping saved views to every workspace on the 14th. Support macros go out the day before.</p>
      </div>
    </PresenceCursors>
  );
}
function Mini() {
  return (
    <div className="relative h-28 w-full max-w-56 overflow-hidden rounded-pui-lg border border-pui-border bg-pui-muted/40" aria-hidden="true">
      {[
        { x: "22%", y: "28%", name: "Avery", color: "var(--pui-chart-1)" },
        { x: "60%", y: "56%", name: "Sam", color: "var(--pui-chart-4)" },
      ].map((c) => (
        <div key={c.name} className="absolute" style={{ left: c.x, top: c.y, color: c.color }}>
          <svg viewBox="0 0 20 22" className="size-4" fill="currentColor">
            <path d="M2.2 1.6c-.4-.2-.8.2-.7.6l5 17.2c.1.5.8.6 1.1.1l2.9-5.2c.1-.2.3-.3.5-.3l5.9-.6c.5 0 .7-.7.3-1L2.2 1.6Z" />
          </svg>
          <span className="absolute left-3 top-3.5 rounded-full px-1.5 text-[10px] font-semibold" style={{ background: c.color, color: "var(--pui-background)" }}>
            {c.name}
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
  snippet: ({ idleAfter, showStack, stackPosition }) => {
    const attrs = [idleAfter !== 6000 ? `idleAfter={${idleAfter}}` : "", showStack ? "" : "showStack={false}", stackPosition !== "top-right" ? `stackPosition="${stackPosition}"` : ""].filter(Boolean);
    return `// users: [{ id, name, x, y, status? }] with x / y as 0..1 fractions, from your socket
<PresenceCursors
  users={users}
  onLocalMove={(point) => socket.send({ type: "cursor", point })}${attrs.map((a) => `\n  ${a}`).join("")}
  className="h-[32rem] rounded-xl border"
>
  <Whiteboard />
</PresenceCursors>`;
  },
  propsTable: propDocs<PresenceCursorsProps>()([
    { name: "users", type: "{ id, name, x, y, color?, textColor?, status?, avatar? }[]", required: true, description: "Remote people. x and y are 0–1 fractions; outside that range pins them to the edge." },
    { name: "children", type: "ReactNode", description: "The shared surface." },
    { name: "onLocalMove", type: "(point | null) => void", description: "Local pointer as fractions, once per frame at most; null on leave." },
    { name: "idleAfter", type: "number", default: "6000", description: "ms without movement before a cursor dims and folds its chip. 0 disables." },
    { name: "showStack", type: "boolean", default: "true", description: "Avatar stack of everyone here." },
    { name: "stackPosition", type: '"top-right" | "top-left" | "bottom-right" | "bottom-left"', default: '"top-right"', description: "Corner for the stack." },
    { name: "maxAvatars", type: "number", default: "4", description: "Avatars before a +N chip." },
    { name: "stackLabel", type: "string", default: '"People here"', description: "Accessible name of the avatar list." },
  ]),
  a11y: [
    "Cursors are decorative and hidden from assistive tech; the avatar stack is a labelled list that says who is here, their status and whether they are idle.",
    "Each avatar is a toggle button: hover or focus previews a spotlight on that cursor, click pins it (aria-pressed).",
    "Chip text uses the page background color on chart-token fills, so contrast holds in light and dark themes.",
    "No network code inside: positions come in through props and onLocalMove hands yours out.",
  ],
  reducedMotion: "Cursors jump to each update instead of gliding, and chips appear without scaling.",
  examples: [
    { title: "Smoothing a slow socket", description: "Left: your pointer. Right: the same cursor delivered at 8 Hz with latency.", Demo: EchoDemo, wide: true },
    { title: "In a document", description: "Status chips and a bottom-right stack.", Demo: DocDemo },
  ],
};
export default item;
