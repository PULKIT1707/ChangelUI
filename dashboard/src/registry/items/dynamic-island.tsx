import {
  Button,
  DynamicIsland,
  DynamicIslandView,
  usePrefersReducedMotion,
  type DynamicIslandProps,
} from "changelui";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

const STATES = ["idle", "timer", "music", "call", "upload", "thinking"] as const;
type IslandState = (typeof STATES)[number];

type DemoProps = {
  state: IslandState;
  autoCycle: boolean;
};

const defaults: DemoProps = { state: "music", autoCycle: false };

const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "state", label: "State", options: STATES },
  { type: "boolean", prop: "autoCycle", label: "Auto cycle" },
];

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = String(seconds % 60).padStart(2, "0");
  return `${m}:${s}`;
}

/** Elapsed seconds since mount, ticking once a second. */
function useSeconds(start = 0) {
  const [seconds, setSeconds] = useState(start);
  useEffect(() => {
    const id = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, []);
  return seconds;
}

function Equalizer() {
  const reduced = usePrefersReducedMotion();
  return (
    <span aria-hidden="true" className="flex h-4 items-end gap-[3px]">
      {[0.55, 1, 0.7, 0.9].map((peak, i) => (
        <motion.span
          key={i}
          className="w-[3px] origin-bottom rounded-full bg-pui-success"
          style={{ height: "100%" }}
          initial={{ scaleY: 0.35 }}
          animate={reduced ? { scaleY: peak * 0.7 } : { scaleY: [0.3, peak, 0.45, peak * 0.8, 0.3] }}
          transition={reduced ? { duration: 0 } : { duration: 1.1 + i * 0.17, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </span>
  );
}

function AlbumArt({ size = "size-6" }: { size?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`${size} shrink-0 rounded-md bg-[conic-gradient(from_200deg,var(--pui-gradient-1),var(--pui-gradient-2),var(--pui-gradient-3),var(--pui-gradient-1))]`}
    />
  );
}

function PulseDot({ className }: { className: string }) {
  const reduced = usePrefersReducedMotion();
  return (
    <span aria-hidden="true" className="relative flex size-2.5">
      {reduced ? null : (
        <motion.span
          className={`absolute inset-0 rounded-full ${className}`}
          animate={{ scale: [1, 2.2], opacity: [0.6, 0] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
        />
      )}
      <span className={`relative size-2.5 rounded-full ${className}`} />
    </span>
  );
}

function ThinkingDots() {
  const reduced = usePrefersReducedMotion();
  return (
    <span aria-hidden="true" className="flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="size-1.5 rounded-full bg-pui-shimmer-fg"
          animate={reduced ? { opacity: 0.7 } : { opacity: [0.25, 1, 0.25], y: [0, -2, 0] }}
          transition={reduced ? { duration: 0 } : { duration: 1, repeat: Infinity, delay: i * 0.16 }}
        />
      ))}
    </span>
  );
}

function UploadRing({ progress }: { progress: number }) {
  const r = 8;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 20 20" className="size-5 -rotate-90" aria-hidden="true">
      <circle cx="10" cy="10" r={r} fill="none" stroke="currentColor" strokeOpacity={0.2} strokeWidth={2.5} />
      <motion.circle
        cx="10"
        cy="10"
        r={r}
        fill="none"
        stroke="var(--pui-info)"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeDasharray={c}
        animate={{ strokeDashoffset: c * (1 - progress) }}
        transition={{ type: "spring", stiffness: 120, damping: 20 }}
      />
    </svg>
  );
}

function MusicPlayer() {
  const seconds = useSeconds(74);
  const length = 214;
  const t = seconds % length;
  return (
    <div className="flex w-72 flex-col gap-3">
      <div className="flex items-center gap-3">
        <AlbumArt size="size-12" />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-semibold">Midnight Signals</span>
          <span className="truncate text-xs text-pui-shimmer-fg/60">Low Orbit</span>
        </div>
        <Equalizer />
      </div>
      <div className="flex items-center gap-2 text-[11px] tabular-nums text-pui-shimmer-fg/60">
        <span>{formatTime(t)}</span>
        <span className="relative h-1 flex-1 overflow-hidden rounded-full bg-pui-shimmer-fg/15">
          <motion.span
            className="absolute inset-y-0 left-0 rounded-full bg-pui-shimmer-fg"
            animate={{ width: `${(t / length) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </span>
        <span>-{formatTime(length - t)}</span>
      </div>
      <div className="flex items-center justify-center gap-6 text-pui-shimmer-fg">
        {["Previous", "Pause", "Next"].map((label) => (
          <button
            key={label}
            type="button"
            aria-label={label}
            className="grid size-8 cursor-pointer place-items-center rounded-full transition-colors hover:bg-pui-shimmer-fg/10 focus-visible:outline-2 focus-visible:outline-pui-ring"
          >
            <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden="true">
              {label === "Pause" ? (
                <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" />
              ) : label === "Next" ? (
                <path d="M6 5.5v13l9-6.5zM16 5h2.5v14H16z" />
              ) : (
                <path d="M18 5.5v13L9 12zM5.5 5H8v14H5.5z" />
              )}
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}

function CallPanel() {
  return (
    <div className="flex w-72 items-center gap-3">
      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-pui-primary text-sm font-semibold text-pui-primary-foreground">
        AL
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-xs text-pui-shimmer-fg/60">Incoming call</span>
        <span className="truncate text-sm font-semibold">Ada Lovelace</span>
      </div>
      <button
        type="button"
        aria-label="Decline"
        className="grid size-10 cursor-pointer place-items-center rounded-full bg-pui-danger text-pui-danger-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pui-ring"
      >
        <svg viewBox="0 0 24 24" className="size-4 rotate-[135deg]" fill="currentColor" aria-hidden="true">
          <path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z" />
        </svg>
      </button>
      <button
        type="button"
        aria-label="Accept"
        className="grid size-10 cursor-pointer place-items-center rounded-full bg-pui-success text-pui-success-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pui-ring"
      >
        <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden="true">
          <path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z" />
        </svg>
      </button>
    </div>
  );
}

function Island({ state, ...props }: { state: IslandState } & Omit<DynamicIslandProps, "state">) {
  const seconds = useSeconds();
  const [upload, setUpload] = useState(0.18);
  useEffect(() => {
    if (state !== "upload") return;
    const id = window.setInterval(() => setUpload((p) => (p >= 1 ? 0.08 : Math.min(1, p + 0.09))), 600);
    return () => window.clearInterval(id);
  }, [state]);
  return (
    <DynamicIsland state={state} {...props}>
      <DynamicIslandView name="idle" label="Idle" className="min-w-24 px-5">
        <span aria-hidden="true" className="size-2 rounded-full bg-pui-shimmer-fg/30" />
      </DynamicIslandView>
      <DynamicIslandView name="timer" label={`Recording, ${formatTime(seconds)}`} className="gap-3 px-4">
        <PulseDot className="bg-pui-danger" />
        <span className="font-medium tabular-nums">{formatTime(seconds)}</span>
      </DynamicIslandView>
      <DynamicIslandView name="music" label="Now playing: Midnight Signals" expanded={<MusicPlayer />} className="w-56 justify-between ps-2 pe-3">
        <AlbumArt />
        <span className="truncate text-xs font-medium text-pui-shimmer-fg/80">Midnight Signals</span>
        <Equalizer />
      </DynamicIslandView>
      <DynamicIslandView name="call" label="Incoming call from Ada Lovelace" expanded={<CallPanel />} className="w-60 justify-between ps-1.5 pe-3">
        <span className="grid size-6 place-items-center rounded-full bg-pui-primary text-[10px] font-semibold text-pui-primary-foreground">
          AL
        </span>
        <span className="text-xs font-medium">Ada Lovelace</span>
        <PulseDot className="bg-pui-success" />
      </DynamicIslandView>
      <DynamicIslandView name="upload" label={`Uploading, ${Math.round(upload * 100)}%`} className="gap-2.5 ps-2 pe-4">
        <UploadRing progress={upload} />
        <span className="text-xs font-medium">Uploading</span>
        <span className="w-8 text-right text-xs tabular-nums text-pui-shimmer-fg/70">{Math.round(upload * 100)}%</span>
      </DynamicIslandView>
      <DynamicIslandView name="thinking" label="Assistant is thinking" className="gap-2.5 px-4">
        <svg viewBox="0 0 24 24" className="size-4 text-pui-primary" fill="currentColor" aria-hidden="true">
          <path d="M12 2.5l1.9 5.6 5.6 1.9-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.9zM18.5 15l.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9z" />
        </svg>
        <span className="text-xs font-medium">Thinking</span>
        <ThinkingDots />
      </DynamicIslandView>
    </DynamicIsland>
  );
}

function Preview({ props }: { props: DemoProps }) {
  const [state, setState] = useState<IslandState>(props.state);
  const [synced, setSynced] = useState(props.state);
  if (synced !== props.state) {
    setSynced(props.state);
    setState(props.state);
  }
  useEffect(() => {
    if (!props.autoCycle) return;
    const id = window.setInterval(
      () => setState((s) => STATES[(STATES.indexOf(s) + 1) % STATES.length] ?? "idle"),
      2600,
    );
    return () => window.clearInterval(id);
  }, [props.autoCycle]);
  return (
    <div className="flex w-full max-w-xl flex-col items-center gap-8">
      <div className="relative flex h-44 w-full max-w-md items-start justify-center overflow-visible rounded-[2.5rem] border border-pui-border bg-pui-muted/60 pt-4 shadow-pui-sm">
        <Island state={state} />
        <span className="absolute bottom-4 text-xs text-pui-muted-foreground">
          {state === "music" || state === "call" ? "Click the island to expand it" : "Pick a state below"}
        </span>
      </div>
      <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="Island state">
        {STATES.map((s) => (
          <Button
            key={s}
            size="sm"
            variant={s === state ? "solid" : "outline"}
            tone={s === state ? "primary" : "neutral"}
            aria-pressed={s === state}
            onClick={() => setState(s)}
            className="capitalize"
          >
            {s}
          </Button>
        ))}
      </div>
    </div>
  );
}

const MINI_STATES: IslandState[] = ["idle", "timer", "music", "upload", "thinking"];

function Mini() {
  const [i, setI] = useState(2);
  useEffect(() => {
    const id = window.setInterval(() => setI((n) => (n + 1) % MINI_STATES.length), 2200);
    return () => window.clearInterval(id);
  }, []);
  return (
    <div aria-hidden="true" className="pointer-events-none">
      <Island state={MINI_STATES[i] ?? "idle"} />
    </div>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: ({ state }) =>
    [
      `<DynamicIsland state="${state}">`,
      '  <DynamicIslandView name="idle" label="Idle">',
      "    <Dot />",
      "  </DynamicIslandView>",
      '  <DynamicIslandView name="timer" label={`Recording, ${time}`}>',
      "    <PulseDot /> {time}",
      "  </DynamicIslandView>",
      "  <DynamicIslandView",
      '    name="music"',
      '    label="Now playing: Midnight Signals"',
      "    expanded={<MusicPlayer />}",
      "  >",
      "    <AlbumArt /> Midnight Signals <Equalizer />",
      "  </DynamicIslandView>",
      "</DynamicIsland>",
    ].join("\n"),
  propsTable: propDocs<DynamicIslandProps & { name: string; label: string; expandedClassName: string }>()([
    { name: "state", type: "string", description: "Name of the DynamicIslandView to show.", required: true },
    { name: "expanded", type: "boolean", description: "Controlled expanded state (views with `expanded` content)." },
    { name: "defaultExpanded", type: "boolean", default: "false", description: "Uncontrolled initial expanded state." },
    { name: "onExpandedChange", type: "(expanded: boolean) => void", description: "Called on expand and collapse." },
    { name: "position", type: '"inline" | "top"', default: '"inline"', description: "top pins the island to the top center of the viewport." },
    { name: "expandLabel", type: "string", default: '"Show details"', description: "Screen reader hint on an expandable compact view." },
    { name: "name", type: "string", description: "View: matched against state.", required: true },
    { name: "label", type: "string", description: "View: announced politely when it becomes active." },
    { name: "expandedClassName", type: "string", description: "View: classes for the expanded wrapper (pass `expanded` content to enable)." },
  ]),
  keyboard: [
    { keys: "Enter / Space", action: "Expand a view that has expanded content" },
    { keys: "Escape", action: "Collapse and return focus to the compact view" },
  ],
  a11y: [
    "A visually hidden role=status region announces each view's label as the state changes.",
    "Expandable views render as a button with aria-expanded; focus moves into the expanded panel and back.",
  ],
  reducedMotion: "Views crossfade in 150ms; no size spring, blur or squash.",
};

export default item;
