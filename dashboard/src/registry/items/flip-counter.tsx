import { Button, FlipCounter, type FlipCounterProps } from "changelui";
import { useEffect, useState } from "react";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type Mode = "clock" | "counter" | "board";
type DemoProps = {
  mode: Mode;
  variant: NonNullable<FlipCounterProps["variant"]>;
  size: NonNullable<FlipCounterProps["size"]>;
  flipMs: number;
  staggerMs: number;
  maxSteps: number;
};

const defaults: DemoProps = { mode: "clock", variant: "solid", size: "md", flipMs: 300, staggerMs: 40, maxSteps: 6 };

const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "mode", label: "Demo", options: ["clock", "counter", "board"] },
  { type: "select", prop: "variant", label: "Variant", options: ["solid", "surface"] },
  { type: "select", prop: "size", label: "Size", options: ["sm", "md", "lg"] },
  { type: "number", prop: "flipMs", label: "Flip (ms)", min: 120, max: 1000, step: 20 },
  { type: "number", prop: "staggerMs", label: "Stagger (ms)", min: 0, max: 200, step: 10 },
  { type: "number", prop: "maxSteps", label: "Max steps", min: 1, max: 12, step: 1 },
];

const pad = (n: number) => String(n).padStart(2, "0");

function useClock(): string {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    const first = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);
  if (!now) return "00:00:00";
  return `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

function Clock(props: Omit<DemoProps, "mode">) {
  const time = useClock();
  return <FlipCounter value={time} {...props} className="text-pui-foreground" />;
}

function Counter(props: Omit<DemoProps, "mode">) {
  const [value, setValue] = useState(1280);
  return (
    <div className="flex flex-col items-center gap-5">
      <FlipCounter value={value} minLength={5} announce {...props} />
      <div className="flex flex-wrap justify-center gap-2">
        <Button size="sm" variant="outline" tone="neutral" onClick={() => setValue((v) => Math.max(0, v - 1))}>
          −1
        </Button>
        <Button size="sm" variant="soft" onClick={() => setValue((v) => v + 1)}>
          +1
        </Button>
        <Button size="sm" variant="soft" onClick={() => setValue((v) => v + 25)}>
          +25
        </Button>
        <Button size="sm" variant="outline" tone="neutral" onClick={() => setValue(Math.floor(Math.random() * 99999))}>
          Random
        </Button>
      </div>
    </div>
  );
}

const cities = ["LISBON", "TOKYO", "BERLIN", "NAIROBI", "SYDNEY", "LIMA", "OSLO", "SEOUL"];

function useCycle<T>(list: readonly T[], ms: number): T {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setI((n) => (n + 1) % list.length), ms);
    return () => clearInterval(id);
  }, [list.length, ms]);
  return list[i] as T;
}

function Board(props: Omit<DemoProps, "mode">) {
  const city = useCycle(cities, 3200);
  return <FlipCounter value={city} charset="alpha" minLength={7} {...props} />;
}

function Preview({ props }: { props: DemoProps }) {
  const { mode, ...rest } = props;
  return (
    <div className="flex w-full flex-col items-center gap-3 py-6">
      {mode === "clock" ? <Clock {...rest} /> : mode === "counter" ? <Counter {...rest} /> : <Board {...rest} />}
    </div>
  );
}

const flights = [
  { code: "PU 204", gate: "A12", cities: ["PARIS", "ROME", "MADRID"] },
  { code: "PU 771", gate: "B03", cities: ["DUBAI", "DELHI", "DOHA"] },
  { code: "PU 115", gate: "C21", cities: ["QUITO", "BOGOTA", "LIMA"] },
];

function DeparturesDemo() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 4000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="w-full overflow-x-auto rounded-pui-lg border border-pui-border bg-pui-muted p-4 text-pui-foreground">
      <div className="mb-3 flex items-center justify-between text-xs font-semibold tracking-[0.2em] uppercase opacity-70">
        <span>Departures</span>
        <span>Gate</span>
      </div>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {flights.map((f, i) => (
          <li key={f.code} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-3">
              <span className="w-14 font-pui-mono text-xs opacity-70">{f.code}</span>
              <FlipCounter
                value={f.cities[(tick + i) % f.cities.length] ?? ""}
                charset="alpha"
                minLength={6}
                size="sm"
                staggerMs={30}
              />
            </span>
            <FlipCounter value={f.gate} charset="alnum" size="sm" />
          </li>
        ))}
      </ul>
    </div>
  );
}

function CountdownDemo() {
  const [left, setLeft] = useState(3 * 86400 + 7 * 3600 + 42 * 60 + 9);
  useEffect(() => {
    const id = window.setInterval(() => setLeft((s) => (s > 0 ? s - 1 : 3 * 86400)), 1000);
    return () => clearInterval(id);
  }, []);
  const parts = [
    { label: "Days", value: Math.floor(left / 86400) },
    { label: "Hours", value: Math.floor((left % 86400) / 3600) },
    { label: "Minutes", value: Math.floor((left % 3600) / 60) },
    { label: "Seconds", value: left % 60 },
  ];
  return (
    <div className="flex w-full flex-wrap items-start justify-center gap-4 py-2">
      {parts.map((p) => (
        <div key={p.label} className="flex flex-col items-center gap-1.5">
          <FlipCounter value={pad(p.value)} size="sm" className="text-4xl" />
          <span className="text-[11px] font-medium tracking-widest text-pui-muted-foreground uppercase">{p.label}</span>
        </div>
      ))}
    </div>
  );
}

function ScoreDemo() {
  const [home, setHome] = useState(2);
  const [away, setAway] = useState(1);
  return (
    <div className="flex w-full flex-col items-center gap-4">
      <div className="flex items-center gap-4">
        <span className="text-sm font-semibold text-pui-muted-foreground">HOME</span>
        <FlipCounter value={home} minLength={2} variant="surface" />
        <span className="text-2xl text-pui-muted-foreground">:</span>
        <FlipCounter value={away} minLength={2} variant="surface" />
        <span className="text-sm font-semibold text-pui-muted-foreground">AWAY</span>
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="soft" onClick={() => setHome((v) => v + 1)}>
          Home scores
        </Button>
        <Button size="sm" variant="soft" tone="neutral" onClick={() => setAway((v) => v + 1)}>
          Away scores
        </Button>
      </div>
    </div>
  );
}

function Mini() {
  const time = useClock();
  return <FlipCounter value={time.slice(3)} size="sm" className="text-3xl" />;
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: ({ mode, ...props }) => {
    const value = mode === "clock" ? "{time}" : mode === "counter" ? "{count}" : "{city}";
    const extra = mode === "board" ? { charset: "alpha", minLength: 7 } : mode === "counter" ? { minLength: 5 } : {};
    return toJsx<Record<string, unknown>>(
      "FlipCounter",
      { value, ...extra, ...props },
      { value: undefined, variant: "solid", size: "md", flipMs: 300, staggerMs: 40, maxSteps: 6 },
    ).replace(`value="${value}"`, `value=${value}`);
  },
  propsTable: propDocs<FlipCounterProps>()([
    { name: "value", type: "string | number", description: "What the board shows. Change it and each tile flips to its new character.", required: true },
    { name: "charset", type: '"digits" | "alpha" | "alnum" | string', default: '"digits"', description: "Order each tile cycles through. Characters outside it flip straight to the target." },
    { name: "flipMs", type: "number", default: "300", description: "One flip; steps of a longer path run a little faster." },
    { name: "staggerMs", type: "number", default: "40", description: "Delay between neighbouring tiles starting." },
    { name: "maxSteps", type: "number", default: "6", description: "Most intermediate flips on the way to a new character." },
    { name: "minLength", type: "number", default: "0", description: "Pads with blank tiles on the left." },
    { name: "separators", type: "string", default: '":.,/-"', description: "Characters drawn as plain separators instead of tiles." },
    { name: "variant", type: '"solid" | "surface"', default: '"solid"', description: "Inverted board tiles or card-surface tiles." },
    { name: "size", type: '"sm" | "md" | "lg"', default: '"md"', description: "Font size; tiles are sized in em, so className text sizes work too." },
    { name: "announce", type: "boolean", default: "false", description: "Announce changes politely to screen readers." },
  ]),
  a11y: [
    "Screen readers read the value once from an sr-only copy; the tiles are aria-hidden.",
    "announce adds aria-live=\"polite\"; leave it off for clocks that change every second.",
  ],
  reducedMotion: "Tiles swap to the new character instantly.",
  examples: [
    { title: "Departures board", description: "alpha tiles cycling through destinations, with alnum gates.", Demo: DeparturesDemo, wide: true },
    { title: "Countdown", description: "Days, hours, minutes and seconds, each two tiles.", Demo: CountdownDemo },
    { title: "Scoreboard", description: "Surface tiles that flip when a team scores.", Demo: ScoreDemo },
  ],
};
export default item;
