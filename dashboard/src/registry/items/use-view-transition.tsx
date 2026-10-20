import {
  Badge,
  Button,
  supportsViewTransitions,
  useViewTransition,
  type UseViewTransitionOptions,
  type ViewTransitionRunOptions,
} from "changelui";
import { useId, useMemo, useRef, useState, useSyncExternalStore, type MouseEvent } from "react";
import { landscape, SCENES } from "../../lib/demo-art";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  duration: number;
  easing: "emphasized" | "out" | "spring" | "linear";
  morph: boolean;
  respectReducedMotion: boolean;
};
const defaults: DemoProps = { duration: 450, easing: "emphasized", morph: true, respectReducedMotion: true };
const controls: ControlSpec<DemoProps>[] = [
  { type: "number", prop: "duration", label: "Duration (ms)", min: 150, max: 1500, step: 50 },
  { type: "select", prop: "easing", label: "Easing", options: ["emphasized", "out", "spring", "linear"] },
  { type: "boolean", prop: "morph", label: "Shared elements" },
  { type: "boolean", prop: "respectReducedMotion", label: "Respect reduced motion" },
];
const EASE: Record<DemoProps["easing"], string> = {
  emphasized: "cubic-bezier(0.2, 0, 0, 1)",
  out: "cubic-bezier(0.22, 1, 0.36, 1)",
  spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
  linear: "linear",
};

const noopSubscribe = () => () => {};
function useSupported() {
  return useSyncExternalStore(noopSubscribe, supportsViewTransitions, () => false);
}
/** View transition names must be unique idents; useId output isn't one. */
function useIdent(prefix: string) {
  return `${prefix}-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
}

function SupportBadge() {
  const supported = useSupported();
  return (
    <Badge tone={supported ? "success" : "neutral"} size="sm">
      {supported ? "View Transitions supported" : "No API: instant updates"}
    </Badge>
  );
}

const PLACES = [
  { scene: 0, title: "Dawn ridge", meta: "6 km · 420 m climb", body: "Leave by 5am for first light at the eastern lookout. The last kilometre is a scramble, so bring gloves." },
  { scene: 4, title: "Lagoon", meta: "Kayak · 2 h", body: "Clear shallow water with a reef 200 m out. Rentals open at 8 and the wind picks up after noon." },
  { scene: 3, title: "Night valley", meta: "Stargazing · Oct–Mar", body: "Zero light pollution and a guided tour every clear night. Dress warm; it drops below freezing." },
  { scene: 5, title: "Rose hills", meta: "Bloom trail · April", body: "Spring bloom trails, best in the second week of April. Weekday mornings are the quietest." },
];

function Gallery({ duration, easing, morph, respectReducedMotion }: DemoProps) {
  const run = useViewTransition({ respectReducedMotion });
  const [open, setOpen] = useState<number | null>(null);
  const scope = useIdent("pui-demo-gallery");
  const images = useMemo(() => PLACES.map((p, i) => landscape(SCENES[p.scene]!, i + 3, 800, 520)), []);
  const lastTrigger = useRef<HTMLButtonElement | null>(null);
  const backRef = useRef<HTMLButtonElement | null>(null);
  const name = (part: string, i: number) => (morph ? `${scope}-${part}-${i}` : undefined);
  const show = (i: number | null) => {
    const handle = run(() => setOpen(i), { name: scope });
    void handle.finished.then(() => (i === null ? lastTrigger.current?.focus() : backRef.current?.focus()));
  };
  const css = `
:root[data-pui-view-transition="${scope}"]::view-transition-group(*),
:root[data-pui-view-transition="${scope}"]::view-transition-old(*),
:root[data-pui-view-transition="${scope}"]::view-transition-new(*) {
  animation-duration: ${duration}ms;
  animation-timing-function: ${EASE[easing]};
}
:root[data-pui-view-transition="${scope}"]::view-transition-old(*.${scope}-photo),
:root[data-pui-view-transition="${scope}"]::view-transition-new(*.${scope}-photo) {
  height: 100%;
  object-fit: cover;
}`;
  const place = open === null ? null : PLACES[open]!;
  return (
    <div className="flex w-full max-w-2xl flex-col gap-3">
      <style>{css}</style>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-pui-muted-foreground">{open === null ? "Pick a trip" : "Trip details"}</span>
        <SupportBadge />
      </div>
      <div className="min-h-[22rem] rounded-pui-xl border border-pui-border bg-pui-surface p-3">
        {place === null || open === null ? (
          <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0">
            {PLACES.map((p, i) => (
              <li key={p.title}>
                <button
                  type="button"
                  onClick={(e) => {
                    lastTrigger.current = e.currentTarget;
                    show(i);
                  }}
                  className="group flex w-full flex-col gap-2 rounded-pui-lg p-1.5 text-left transition-colors hover:bg-pui-muted focus-visible:outline-2 focus-visible:outline-pui-ring"
                >
                  <img
                    src={images[i]}
                    alt=""
                    className="aspect-[16/10] w-full rounded-pui-md object-cover"
                    style={{ viewTransitionName: name("photo", i), viewTransitionClass: morph ? `${scope}-photo` : undefined }}
                  />
                  <span className="flex flex-col px-1">
                    <span className="w-fit text-sm font-semibold text-pui-foreground" style={{ viewTransitionName: name("title", i) }}>
                      {p.title}
                    </span>
                    <span className="w-fit text-xs text-pui-muted-foreground" style={{ viewTransitionName: name("meta", i) }}>
                      {p.meta}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <article className="flex flex-col gap-3">
            <img
              src={images[open]}
              alt={`${place.title} landscape`}
              className="aspect-[16/7] w-full rounded-pui-lg object-cover"
              style={{ viewTransitionName: name("photo", open), viewTransitionClass: morph ? `${scope}-photo` : undefined }}
            />
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-0.5">
                <h3 className="m-0 w-fit text-2xl font-semibold tracking-tight text-pui-foreground" style={{ viewTransitionName: name("title", open) }}>
                  {place.title}
                </h3>
                <span className="w-fit text-sm text-pui-muted-foreground" style={{ viewTransitionName: name("meta", open) }}>
                  {place.meta}
                </span>
              </div>
              <Button ref={backRef} size="sm" variant="outline" onClick={() => show(null)}>
                Back
              </Button>
            </div>
            <p className="m-0 text-sm leading-relaxed text-pui-muted-foreground">{place.body}</p>
          </article>
        )}
      </div>
    </div>
  );
}

function Preview({ props }: { props: DemoProps }) {
  return <Gallery {...props} />;
}

const INITIAL = ["Design review", "Ship onboarding", "Fix flaky test", "Write changelog", "Plan Q4", "Update icons", "Customer call"];

function ListDemo() {
  const run = useViewTransition();
  const scope = useIdent("pui-demo-list");
  const [items, setItems] = useState(INITIAL.map((label, id) => ({ id, label, done: id % 3 === 1 })));
  const nextId = useRef(INITIAL.length);
  const update = (fn: (list: typeof items) => typeof items) => run(() => setItems(fn), { name: scope });
  return (
    <div className="flex w-full max-w-sm flex-col gap-3">
      <style>{`:root[data-pui-view-transition="${scope}"]::view-transition-group(*){animation-duration:420ms;animation-timing-function:cubic-bezier(0.2,0,0,1)}`}</style>
      <div className="flex flex-wrap gap-1.5">
        <Button size="sm" variant="outline" onClick={() => update((l) => [...l].sort(() => Math.random() - 0.5))}>
          Shuffle
        </Button>
        <Button size="sm" variant="outline" onClick={() => update((l) => [...l].sort((a, b) => a.label.localeCompare(b.label)))}>
          Sort A–Z
        </Button>
        <Button size="sm" variant="outline" onClick={() => update((l) => [...l].sort((a, b) => Number(a.done) - Number(b.done)))}>
          Open first
        </Button>
        <Button size="sm" variant="soft" onClick={() => update((l) => [{ id: nextId.current++, label: `New task ${nextId.current - INITIAL.length}`, done: false }, ...l].slice(0, 9))}>
          Add
        </Button>
      </div>
      <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
        {items.map((it) => (
          <li
            key={it.id}
            style={{ viewTransitionName: `${scope}-${it.id}` }}
            className="flex items-center gap-2 rounded-pui-md border border-pui-border bg-pui-surface px-3 py-2"
          >
            <button
              type="button"
              aria-pressed={it.done}
              aria-label={`Mark ${it.label} ${it.done ? "open" : "done"}`}
              onClick={() => update((l) => l.map((x) => (x.id === it.id ? { ...x, done: !x.done } : x)))}
              className="grid size-4 shrink-0 place-items-center rounded-pui-sm border border-pui-border text-[10px] text-pui-primary-foreground focus-visible:outline-2 focus-visible:outline-pui-ring aria-pressed:border-pui-primary aria-pressed:bg-pui-primary"
            >
              {it.done ? "✓" : ""}
            </button>
            <span className={`flex-1 text-sm ${it.done ? "text-pui-muted-foreground line-through" : "text-pui-foreground"}`}>{it.label}</span>
            <button
              type="button"
              aria-label={`Remove ${it.label}`}
              onClick={() => update((l) => l.filter((x) => x.id !== it.id))}
              className="rounded-pui-sm px-1 text-pui-muted-foreground hover:text-pui-danger focus-visible:outline-2 focus-visible:outline-pui-ring"
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

const STEPS = ["Account", "Profile", "Billing", "Review"];

function DirectionalDemo() {
  const run = useViewTransition();
  const scope = useIdent("pui-demo-tabs");
  const [index, setIndex] = useState(0);
  const go = (next: number) => {
    if (next === index) return;
    const dir = next > index ? "forward" : "back";
    const options: ViewTransitionRunOptions = { name: `${scope}-${dir}`, types: [dir] };
    run(() => setIndex(next), options);
  };
  const panel = `${scope}-panel`;
  const css = `
@keyframes ${scope}-out-l { to { transform: translateX(-40px); opacity: 0 } }
@keyframes ${scope}-out-r { to { transform: translateX(40px); opacity: 0 } }
@keyframes ${scope}-in-r { from { transform: translateX(40px); opacity: 0 } }
@keyframes ${scope}-in-l { from { transform: translateX(-40px); opacity: 0 } }
:root[data-pui-view-transition="${scope}-forward"]::view-transition-old(${panel}) { animation: 180ms cubic-bezier(0.64,0,0.78,0) both ${scope}-out-l }
:root[data-pui-view-transition="${scope}-forward"]::view-transition-new(${panel}) { animation: 380ms cubic-bezier(0.2,0,0,1) 60ms both ${scope}-in-r }
:root[data-pui-view-transition="${scope}-back"]::view-transition-old(${panel}) { animation: 180ms cubic-bezier(0.64,0,0.78,0) both ${scope}-out-r }
:root[data-pui-view-transition="${scope}-back"]::view-transition-new(${panel}) { animation: 380ms cubic-bezier(0.2,0,0,1) 60ms both ${scope}-in-l }`;
  return (
    <div className="flex w-full max-w-sm flex-col gap-3">
      <style>{css}</style>
      <ol className="m-0 flex list-none gap-1 p-0">
        {STEPS.map((s, i) => (
          <li key={s} className="flex-1">
            <button
              type="button"
              aria-current={i === index ? "step" : undefined}
              onClick={() => go(i)}
              className="flex w-full flex-col gap-1 rounded-pui-md px-1 py-1 text-left text-xs text-pui-muted-foreground focus-visible:outline-2 focus-visible:outline-pui-ring aria-[current=step]:text-pui-foreground"
            >
              <span className={`h-1 rounded-pui-full ${i <= index ? "bg-pui-primary" : "bg-pui-muted"}`} />
              {s}
            </button>
          </li>
        ))}
      </ol>
      <div className="overflow-hidden rounded-pui-lg border border-pui-border bg-pui-surface">
        <div style={{ viewTransitionName: panel }} className="flex min-h-28 flex-col gap-1.5 p-4">
          <span className="text-xs text-pui-primary">
            Step {index + 1} of {STEPS.length}
          </span>
          <h3 className="m-0 text-base font-semibold text-pui-foreground">{STEPS[index]}</h3>
          <p className="m-0 text-sm text-pui-muted-foreground">Each run gets a name per direction, so the CSS slides forward or back.</p>
        </div>
      </div>
      <div className="flex justify-between">
        <Button size="sm" variant="ghost" disabled={index === 0} onClick={() => go(index - 1)}>
          Back
        </Button>
        <Button size="sm" disabled={index === STEPS.length - 1} onClick={() => go(index + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}

const MOODS = [
  { name: "Daybreak", scene: 0, tone: "Warm, soft light" },
  { name: "Midnight", scene: 3, tone: "Cool, deep blues" },
  { name: "Lagoon", scene: 4, tone: "Fresh teal water" },
];

function RevealDemo() {
  const run = useViewTransition();
  const card = useIdent("pui-demo-reveal");
  const [mood, setMood] = useState(0);
  const images = useMemo(() => MOODS.map((m, i) => landscape(SCENES[m.scene]!, i + 21, 800, 600)), []);
  const reveal = (event: MouseEvent<HTMLButtonElement>) => {
    const box = event.currentTarget.closest("[data-reveal-card]")!.getBoundingClientRect();
    // Keyboard clicks (detail 0) have no pointer position: reveal from the center.
    const keyboard = event.detail === 0;
    const x = keyboard ? box.width / 2 : event.clientX - box.left;
    const y = keyboard ? box.height / 2 : event.clientY - box.top;
    const radius = Math.hypot(Math.max(x, box.width - x), Math.max(y, box.height - y));
    const handle = run(() => setMood((m) => (m + 1) % MOODS.length));
    void handle.ready.then((animated) => {
      if (!animated) return;
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 600, easing: "cubic-bezier(0.2, 0, 0, 1)", pseudoElement: `::view-transition-new(${card})` },
      );
    });
  };
  const m = MOODS[mood]!;
  return (
    <div
      data-reveal-card=""
      style={{ viewTransitionName: card }}
      className="relative flex aspect-[4/3] w-full max-w-sm flex-col justify-end overflow-hidden rounded-pui-xl border border-pui-border shadow-pui-md"
    >
      <style>{`::view-transition-old(${card}),::view-transition-new(${card}){animation:none;mix-blend-mode:normal}`}</style>
      <img src={images[mood]} alt="" className="absolute inset-0 size-full object-cover" />
      <div className="relative flex items-end justify-between gap-3 bg-gradient-to-t from-pui-background/90 to-transparent p-4 pt-12">
        <div className="flex flex-col">
          <span className="text-lg font-semibold text-pui-foreground">{m.name}</span>
          <span className="text-xs text-pui-muted-foreground">{m.tone}</span>
        </div>
        <Button size="sm" onClick={reveal}>
          Next mood
        </Button>
      </div>
    </div>
  );
}

function Mini() {
  return (
    <div className="flex items-center gap-3" aria-hidden="true">
      <span className="grid h-12 w-10 grid-rows-2 gap-1 rounded-pui-md border border-pui-border bg-pui-surface p-1">
        <span className="rounded-pui-sm bg-pui-primary/70" />
        <span className="rounded-pui-sm bg-pui-muted" />
      </span>
      <svg viewBox="0 0 40 12" className="w-10 text-pui-muted-foreground" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3">
        <path d="M2 6h32M30 2l5 4-5 4" strokeDasharray="none" />
      </svg>
      <span className="flex h-16 w-24 flex-col gap-1 rounded-pui-md border border-pui-border bg-pui-surface p-1.5">
        <span className="h-8 rounded-pui-sm bg-pui-primary/70" />
        <span className="h-1.5 w-2/3 rounded-pui-full bg-pui-muted" />
        <span className="h-1.5 w-1/2 rounded-pui-full bg-pui-muted" />
      </span>
    </div>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) =>
    [
      `const run = useViewTransition(${props.respectReducedMotion ? "" : "{ respectReducedMotion: false }"});`,
      "",
      '<button onClick={() => run(() => setOpen(id), { name: "gallery" })}>',
      `  <img style={{ viewTransitionName: \`photo-\${id}\` }} src={src} alt="" />`,
      "</button>;",
      "",
      "/* CSS: tune just this transition */",
      ':root[data-pui-view-transition="gallery"]::view-transition-group(*) {',
      `  animation-duration: ${props.duration}ms;`,
      `  animation-timing-function: ${EASE[props.easing]};`,
      "}",
    ].join("\n"),
  propsTable: [
    ...propDocs<UseViewTransitionOptions>()([
      { name: "respectReducedMotion", type: "boolean", default: "true", description: "Run updates instantly when the user prefers reduced motion." },
    ]),
    { name: "run(update, options?)", type: "(update: () => void, options?) => ViewTransitionHandle", description: "Stable. Runs update inside document.startViewTransition, or directly when unsupported." },
    ...propDocs<ViewTransitionRunOptions>()([
      { name: "name", type: "string", description: 'Sets data-pui-view-transition="<name>" on <html> during the run, for scoped CSS.' },
      { name: "types", type: "string[]", description: "View transition types where supported (:active-view-transition-type())." },
      { name: "sync", type: "boolean", default: "true", description: "Wrap the update in flushSync so React commits before the snapshot." },
    ]),
    { name: "handle", type: "{ skipped, ready: Promise<boolean>, finished: Promise<void>, skipTransition() }", description: "Promises never reject; ready resolves false when nothing animates." },
    { name: "supportsViewTransitions()", type: "() => boolean", description: "Feature check; false on the server." },
  ],
  a11y: [
    "View transitions are visual only: the DOM updates at once, so screen readers get the new content immediately.",
    "Move focus yourself after big swaps (the gallery focuses Back, then returns focus to the card).",
    "Reduced motion skips the transition entirely by default.",
  ],
  reducedMotion: "Updates apply instantly with no snapshot or animation (unless respectReducedMotion is false).",
  examples: [
    { title: "Reorder a list", description: "Each row has its own viewTransitionName, so shuffles and sorts glide.", Demo: ListDemo },
    { title: "Directional steps", description: "A per-direction name (and types) picks the forward or back slide in CSS.", Demo: DirectionalDemo },
    { title: "Circle reveal with ready", description: "Animate ::view-transition-new from the click point once handle.ready resolves.", Demo: RevealDemo },
  ],
};
export default item;
