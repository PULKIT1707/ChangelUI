import { Button, VoiceOrb, type VoiceOrbProps, type VoiceOrbState } from "changelui";
import { useEffect, useRef, useState } from "react";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = { state: VoiceOrbState; size: number; liveLevel: boolean; level: number };

const defaults: DemoProps = { state: "listening", size: 180, liveLevel: false, level: 0.5 };

const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "state", label: "State", options: ["idle", "listening", "thinking", "speaking"] },
  { type: "number", prop: "size", label: "Size (px)", min: 64, max: 240, step: 8 },
  { type: "boolean", prop: "liveLevel", label: "Pass a level" },
  { type: "number", prop: "level", label: "Level", min: 0, max: 1, step: 0.05 },
];

const CAPTIONS: Record<VoiceOrbState, string> = {
  idle: "Tap the mic and ask anything",
  listening: "Listening…",
  thinking: "Looking that up…",
  speaking: "Your next train leaves at 8:42 from platform 3.",
};

function Preview({ props }: { props: DemoProps }) {
  const { liveLevel, level, ...rest } = props;
  return (
    <div className="flex flex-col items-center gap-5">
      <VoiceOrb {...rest} level={liveLevel ? level : undefined} />
      <p className="m-0 h-5 text-sm text-pui-muted-foreground">{CAPTIONS[rest.state]}</p>
    </div>
  );
}

/** Push-to-talk flow: hold to listen, release to think, then the reply plays. */
function AssistantDemo() {
  const [state, setState] = useState<VoiceOrbState>("idle");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const start = () => {
    timers.current.forEach(clearTimeout);
    setState("listening");
  };
  const stop = () => {
    if (state !== "listening") return;
    setState("thinking");
    timers.current = [setTimeout(() => setState("speaking"), 1400), setTimeout(() => setState("idle"), 4600)];
  };
  return (
    <div className="mx-auto flex w-full max-w-xs flex-col items-center gap-4 rounded-pui-xl border border-pui-border bg-pui-surface p-6 text-pui-surface-foreground">
      <VoiceOrb state={state} size={128} />
      <p className="m-0 h-10 text-center text-sm text-pui-muted-foreground">{CAPTIONS[state]}</p>
      <Button
        className="w-full select-none"
        variant={state === "listening" ? "solid" : "outline"}
        onPointerDown={start}
        onPointerUp={stop}
        onPointerLeave={stop}
        onKeyDown={(e) => (e.key === " " || e.key === "Enter") && !e.repeat && start()}
        onKeyUp={(e) => (e.key === " " || e.key === "Enter") && stop()}
      >
        {state === "listening" ? "Release to send" : "Hold to talk"}
      </Button>
    </div>
  );
}

/** Real microphone level through a Web Audio analyser (asks for permission on click). */
function MicDemo() {
  const [level, setLevel] = useState(0);
  const [on, setOn] = useState(false);
  const [error, setError] = useState("");
  const stopRef = useRef<() => void>(() => {});
  useEffect(() => () => stopRef.current(), []);
  const toggle = async () => {
    if (on) {
      stopRef.current();
      setOn(false);
      setLevel(0);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const data = new Uint8Array(analyser.fftSize);
      let raf = 0;
      const read = () => {
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (const v of data) sum += ((v - 128) / 128) ** 2;
        setLevel(Math.min(1, Math.sqrt(sum / data.length) * 4));
        raf = requestAnimationFrame(read);
      };
      read();
      stopRef.current = () => {
        cancelAnimationFrame(raf);
        stream.getTracks().forEach((t) => t.stop());
        void ctx.close();
      };
      setError("");
      setOn(true);
    } catch {
      setError("Microphone unavailable or permission denied.");
    }
  };
  return (
    <div className="flex flex-col items-center gap-3">
      <VoiceOrb state={on ? "listening" : "idle"} level={on ? level : undefined} size={120} labels={{ idle: "Microphone off" }} />
      <Button size="sm" variant="outline" tone="neutral" onClick={() => void toggle()}>
        {on ? "Stop microphone" : "Use my microphone"}
      </Button>
      <p className="m-0 h-4 text-xs text-pui-muted-foreground">{error || (on ? "Audio stays in your browser." : "Nothing is recorded.")}</p>
    </div>
  );
}

function StatesDemo() {
  const states: VoiceOrbState[] = ["idle", "listening", "thinking", "speaking"];
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {states.map((s) => (
        <div key={s} className="flex flex-col items-center gap-2">
          <VoiceOrb state={s} size={72} />
          <span className="text-xs text-pui-muted-foreground capitalize">{s}</span>
        </div>
      ))}
    </div>
  );
}

function Mini() {
  return <VoiceOrb aria-hidden="true" state="speaking" size={96} />;
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: ({ state, size, liveLevel, level }) =>
    toJsx<Record<string, unknown>>(
      "VoiceOrb",
      { state, size, ...(liveLevel ? { level } : {}) },
      { state: "idle", size: 160 },
      undefined,
      controls as ControlSpec<Record<string, unknown>>[],
    ),
  propsTable: propDocs<VoiceOrbProps>()([
    { name: "state", type: '"idle" | "listening" | "thinking" | "speaking"', default: '"idle"', description: "What the assistant is doing." },
    { name: "level", type: "number", description: "Live audio level 0–1 (e.g. analyser RMS). Without it, a built-in rhythm is used." },
    { name: "size", type: "number", default: "160", description: "Diameter in px." },
    { name: "labels", type: "Partial<Record<state, string>>", description: "Screen-reader text per state." },
  ]),
  a11y: [
    "The orb is a status: its state label (Ready, Listening, Thinking, Speaking) is read politely on change.",
    "Color is never the only cue: size, ring and motion differ per state, and you can show a caption.",
    "Pass aria-hidden when a visible caption already says the same thing.",
  ],
  reducedMotion: "The orb stays still; states differ by size and a steady ring while listening.",
  examples: [
    { title: "Push to talk", description: "Hold the button (or Space) to listen, release to think and reply.", Demo: AssistantDemo },
    { title: "Live microphone level", description: "Feeds a Web Audio analyser into level.", Demo: MicDemo },
    { title: "All states", Demo: StatesDemo, wide: true },
  ],
};

export default item;
