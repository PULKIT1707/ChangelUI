import {
  Badge,
  Button,
  PageTransition,
  supportsViewTransitions,
  type PageTransitionProps,
} from "changelui";
import { useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { landscape, SCENES } from "../../lib/demo-art";
import { ChartIcon, FolderIcon, HomeIcon, InboxIcon, SlidersIcon } from "../../lib/demo-icons";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  preset: NonNullable<PageTransitionProps["preset"]>;
  direction: NonNullable<PageTransitionProps["direction"]>;
  axis: NonNullable<PageTransitionProps["axis"]>;
  mode: NonNullable<PageTransitionProps["mode"]> | "preset default";
  distance: number;
  focusOnChange: boolean;
};
const defaults: DemoProps = { preset: "slide", direction: "auto", axis: "x", mode: "preset default", distance: 24, focusOnChange: false };
const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "preset", label: "Preset", options: ["slide", "fade", "scale", "blur", "flip", "wipe", "curtain", "view"] },
  { type: "select", prop: "direction", label: "Direction", options: ["auto", "forward", "back"] },
  { type: "select", prop: "axis", label: "Axis", options: ["x", "y"] },
  { type: "select", prop: "mode", label: "Mode", options: ["preset default", "wait", "popLayout", "sync"] },
  { type: "number", prop: "distance", label: "Distance (px)", min: 0, max: 80, step: 4 },
  { type: "boolean", prop: "focusOnChange", label: "Focus new h1" },
];

type Route = "/inbox" | "/projects" | "/projects/aurora" | "/insights" | "/settings";
const NAV: { path: Route; label: string; icon: ReactNode }[] = [
  { path: "/inbox", label: "Inbox", icon: <InboxIcon /> },
  { path: "/projects", label: "Projects", icon: <FolderIcon /> },
  { path: "/insights", label: "Insights", icon: <ChartIcon /> },
  { path: "/settings", label: "Settings", icon: <SlidersIcon /> },
];

function PageHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] font-medium uppercase tracking-wider text-pui-muted-foreground">{eyebrow}</span>
      <h1 className="m-0 text-lg font-semibold text-pui-foreground outline-none focus-visible:underline">{title}</h1>
    </div>
  );
}

const MESSAGES = [
  { from: "Mara Lin", subject: "Launch checklist is ready", time: "9:41" },
  { from: "Design", subject: "New icons for the sidebar", time: "8:12" },
  { from: "Billing", subject: "Invoice #2041 paid", time: "Yesterday" },
  { from: "Theo Park", subject: "Can we move standup?", time: "Mon" },
];
const PROJECTS = [
  { name: "Aurora", status: "On track", tone: "success" as const, progress: 72 },
  { name: "Lagoon", status: "At risk", tone: "warning" as const, progress: 38 },
  { name: "Ridge", status: "Planning", tone: "neutral" as const, progress: 12 },
];

function AppPage({ route, go }: { route: Route; go: (to: Route) => void }) {
  switch (route) {
    case "/inbox":
      return (
        <div className="flex flex-col gap-3">
          <PageHeading eyebrow="4 unread" title="Inbox" />
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
            {MESSAGES.map((m) => (
              <li key={m.subject} className="flex items-center gap-3 rounded-pui-md border border-pui-border bg-pui-surface px-3 py-2">
                <span className="grid size-7 shrink-0 place-items-center rounded-pui-full bg-pui-primary/15 text-[11px] font-semibold text-pui-primary" aria-hidden="true">
                  {m.from.charAt(0)}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-xs font-medium text-pui-foreground">{m.from}</span>
                  <span className="truncate text-xs text-pui-muted-foreground">{m.subject}</span>
                </span>
                <span className="text-[11px] text-pui-muted-foreground">{m.time}</span>
              </li>
            ))}
          </ul>
        </div>
      );
    case "/projects":
      return (
        <div className="flex flex-col gap-3">
          <PageHeading eyebrow="3 active" title="Projects" />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {PROJECTS.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => (p.name === "Aurora" ? go("/projects/aurora") : undefined)}
                className="flex flex-col gap-2 rounded-pui-md border border-pui-border bg-pui-surface p-3 text-left transition-colors hover:border-pui-primary/50 focus-visible:outline-2 focus-visible:outline-pui-ring"
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-pui-foreground">{p.name}</span>
                  <Badge tone={p.tone} size="sm">
                    {p.status}
                  </Badge>
                </span>
                <span className="h-1.5 overflow-hidden rounded-pui-full bg-pui-muted" aria-hidden="true">
                  <span className="block h-full rounded-pui-full bg-pui-primary" style={{ width: `${p.progress}%` }} />
                </span>
                <span className="text-[11px] text-pui-muted-foreground">{p.name === "Aurora" ? "Open project →" : `${p.progress}% done`}</span>
              </button>
            ))}
          </div>
        </div>
      );
    case "/projects/aurora":
      return (
        <div className="flex flex-col gap-3">
          <PageHeading eyebrow="Projects / Aurora" title="Aurora redesign" />
          <img src={landscape(SCENES[7]!, 4, 900, 300)} alt="" className="h-24 w-full rounded-pui-md object-cover" />
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              ["72%", "Done"],
              ["14", "Open tasks"],
              ["Oct 30", "Launch"],
            ].map(([value, label]) => (
              <div key={label} className="rounded-pui-md border border-pui-border bg-pui-surface p-2">
                <div className="text-sm font-semibold text-pui-foreground tabular-nums">{value}</div>
                <div className="text-[11px] text-pui-muted-foreground">{label}</div>
              </div>
            ))}
          </div>
        </div>
      );
    case "/insights":
      return (
        <div className="flex flex-col gap-3">
          <PageHeading eyebrow="Last 12 weeks" title="Insights" />
          <div className="flex h-32 items-end gap-1.5 rounded-pui-md border border-pui-border bg-pui-surface p-3" aria-hidden="true">
            {[38, 52, 44, 61, 58, 70, 66, 81, 74, 88, 84, 96].map((h, i) => (
              <span key={i} className="flex-1 rounded-t-pui-sm bg-pui-primary/80" style={{ height: `${h}%`, opacity: 0.45 + i * 0.05 }} />
            ))}
          </div>
          <p className="m-0 text-xs text-pui-muted-foreground">Weekly active teams up 18% since the redesign.</p>
        </div>
      );
    case "/settings":
      return (
        <div className="flex flex-col gap-3">
          <PageHeading eyebrow="Workspace" title="Settings" />
          {["Email digests", "Desktop notifications", "Weekly report"].map((label, i) => (
            <div key={label} className="flex items-center justify-between rounded-pui-md border border-pui-border bg-pui-surface px-3 py-2.5">
              <span className="text-sm text-pui-foreground">{label}</span>
              <span
                aria-hidden="true"
                className={`relative h-5 w-9 rounded-pui-full ${i === 1 ? "bg-pui-muted" : "bg-pui-primary"}`}
              >
                <span className={`absolute top-0.5 size-4 rounded-pui-full bg-pui-background shadow-pui-xs ${i === 1 ? "left-0.5" : "left-4.5"}`} />
              </span>
            </div>
          ))}
        </div>
      );
  }
}

function AppFrame({ props }: { props: DemoProps }) {
  const [stack, setStack] = useState<Route[]>(["/inbox"]);
  const route = stack[stack.length - 1]!;
  const go = (to: Route) => setStack((s) => (s[s.length - 1] === to ? s : [...s, to].slice(-20)));
  const back = () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
  const { mode, ...rest } = props;
  const [lastDirection, setLastDirection] = useState("—");
  return (
    <div className="flex w-full max-w-2xl flex-col overflow-hidden rounded-pui-xl border border-pui-border bg-pui-background shadow-pui-lg">
      <div className="flex items-center gap-2 border-b border-pui-border bg-pui-surface px-3 py-2">
        <span className="flex gap-1.5" aria-hidden="true">
          <span className="size-2.5 rounded-pui-full bg-pui-danger/70" />
          <span className="size-2.5 rounded-pui-full bg-pui-warning/70" />
          <span className="size-2.5 rounded-pui-full bg-pui-success/70" />
        </span>
        <Button size="sm" variant="ghost" onClick={back} disabled={stack.length < 2} aria-label="Back">
          ←
        </Button>
        <span className="flex-1 truncate rounded-pui-md bg-pui-muted px-2.5 py-1 font-mono text-xs text-pui-muted-foreground">app.example.com{route}</span>
      </div>
      <div className="flex min-h-80">
        <nav aria-label="Demo app" className="hidden w-40 shrink-0 flex-col gap-0.5 border-r border-pui-border p-2 sm:flex">
          {NAV.map((n) => {
            const active = route === n.path || route.startsWith(`${n.path}/`);
            return (
              <button
                key={n.path}
                type="button"
                aria-current={active ? "page" : undefined}
                onClick={() => go(n.path)}
                className="flex items-center gap-2 rounded-pui-md px-2.5 py-1.5 text-left text-sm text-pui-muted-foreground transition-colors hover:bg-pui-muted hover:text-pui-foreground focus-visible:outline-2 focus-visible:outline-pui-ring aria-[current=page]:bg-pui-primary/12 aria-[current=page]:font-medium aria-[current=page]:text-pui-primary [&_svg]:size-4"
              >
                {n.icon}
                {n.label}
              </button>
            );
          })}
        </nav>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex gap-1 overflow-x-auto border-b border-pui-border p-2 sm:hidden">
            {NAV.map((n) => (
              <Button key={n.path} size="sm" variant={route.startsWith(n.path) ? "soft" : "ghost"} onClick={() => go(n.path)}>
                {n.label}
              </Button>
            ))}
          </div>
          <PageTransition
            {...rest}
            mode={mode === "preset default" ? undefined : mode}
            routeKey={route}
            className="min-w-0 flex-1 overflow-hidden"
            layerClassName="p-4 bg-pui-background min-h-full"
          >
            <DirectionProbe onDirection={setLastDirection} />
            <AppPage route={route} go={go} />
          </PageTransition>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-pui-border bg-pui-surface px-3 py-1.5 font-mono text-[11px] text-pui-muted-foreground">
        <span>history: {stack.length}</span>
        <span aria-live="polite">last: {lastDirection}</span>
      </div>
    </div>
  );
}

/** Reads data-direction from the PageTransition root after each page mounts. */
function DirectionProbe({ onDirection }: { onDirection: (d: string) => void }) {
  const [el, setEl] = useState<HTMLSpanElement | null>(null);
  useEffect(() => {
    const dir = el?.closest("[data-direction]")?.getAttribute("data-direction");
    if (dir) onDirection(dir);
  }, [el, onDirection]);
  return <span ref={setEl} hidden />;
}

function Preview({ props }: { props: DemoProps }) {
  return <AppFrame props={props} />;
}

const STEPS = [
  { title: "Create your workspace", body: "Pick a name your team will recognise. You can change it later.", field: "Acme Studio" },
  { title: "Invite teammates", body: "Paste emails separated by commas. They get a magic link.", field: "mara@example.com, theo@example.com" },
  { title: "Choose a starter", body: "Start from a blank board or one of the templates.", field: "Product launch" },
  { title: "You're all set", body: "Your workspace is ready. Take the 2-minute tour or jump right in.", field: "" },
];

function OnboardingDemo() {
  const [step, setStep] = useState(0);
  const s = STEPS[step]!;
  return (
    <div className="flex w-full max-w-md flex-col gap-4 rounded-pui-xl border border-pui-border bg-pui-surface p-5 shadow-pui-md">
      <div className="flex gap-1.5" role="progressbar" aria-label="Onboarding progress" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={step + 1}>
        {STEPS.map((_, i) => (
          <span key={i} className={`h-1 flex-1 rounded-pui-full transition-colors duration-300 ${i <= step ? "bg-pui-primary" : "bg-pui-muted"}`} />
        ))}
      </div>
      <PageTransition routeKey={step} order={step} preset="slide" distance={40} className="min-h-36 overflow-hidden" focusOnChange="h3">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-pui-primary">
            Step {step + 1} of {STEPS.length}
          </span>
          <h3 className="m-0 text-lg font-semibold text-pui-foreground outline-none">{s.title}</h3>
          <p className="m-0 text-sm text-pui-muted-foreground">{s.body}</p>
          {s.field ? (
            <div className="mt-1 truncate rounded-pui-md border border-pui-border bg-pui-background px-3 py-2 text-sm text-pui-foreground">{s.field}</div>
          ) : null}
        </div>
      </PageTransition>
      <div className="flex justify-between">
        <Button variant="ghost" onClick={() => setStep((n) => Math.max(0, n - 1))} disabled={step === 0}>
          Back
        </Button>
        <Button onClick={() => setStep((n) => (n === STEPS.length - 1 ? 0 : n + 1))}>{step === STEPS.length - 1 ? "Start over" : "Continue"}</Button>
      </div>
    </div>
  );
}

const SECTIONS = [
  { id: "work", label: "Work", headline: "Interfaces that feel alive.", body: "Selected product work, 2019–2026." },
  { id: "about", label: "About", headline: "Designer who ships code.", body: "Motion, systems and the small details in between." },
  { id: "contact", label: "Contact", headline: "Let's build something.", body: "hello@example.com · Open to new projects in spring." },
];

function CurtainDemo() {
  const [id, setId] = useState("work");
  const s = SECTIONS.find((x) => x.id === id)!;
  return (
    <div className="flex w-full flex-col overflow-hidden rounded-pui-xl border border-pui-border bg-pui-background shadow-pui-md">
      <nav aria-label="Portfolio" className="flex items-center justify-between border-b border-pui-border px-4 py-2.5">
        <span className="font-semibold tracking-tight text-pui-foreground">studio/</span>
        <div className="flex gap-1">
          {SECTIONS.map((x) => (
            <Button key={x.id} size="sm" variant={x.id === id ? "soft" : "ghost"} aria-current={x.id === id ? "page" : undefined} onClick={() => setId(x.id)}>
              {x.label}
            </Button>
          ))}
        </div>
      </nav>
      <PageTransition routeKey={id} preset="curtain" className="h-56" layerClassName="h-full">
        <div className="flex h-56 flex-col justify-end gap-2 p-6">
          <span className="font-mono text-xs text-pui-muted-foreground">/{s.id}</span>
          <h3 className="m-0 text-3xl font-semibold tracking-tight text-pui-foreground sm:text-4xl">{s.headline}</h3>
          <p className="m-0 text-sm text-pui-muted-foreground">{s.body}</p>
        </div>
      </PageTransition>
    </div>
  );
}

const SLIDES = [0, 4, 2, 7, 5].map((scene, i) => ({ scene: SCENES[scene]!, seed: i + 11 }));

function WipeDemo() {
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState<"forward" | "back">("forward");
  const images = useMemo(() => SLIDES.map((s) => landscape(s.scene, s.seed, 960, 540)), []);
  const step = (delta: number) => {
    setDir(delta > 0 ? "forward" : "back");
    setIndex((i) => (i + delta + SLIDES.length) % SLIDES.length);
  };
  return (
    <div className="flex w-full flex-col gap-3">
      <PageTransition
        routeKey={index}
        preset="wipe"
        direction={dir}
        distance={60}
        className="aspect-video w-full overflow-hidden rounded-pui-xl border border-pui-border bg-pui-muted"
        layerClassName="size-full"
      >
        <figure className="relative m-0 size-full">
          <img src={images[index]} alt={`${SLIDES[index]!.scene.name} landscape`} className="size-full object-cover" />
          <figcaption className="absolute bottom-3 left-3 rounded-pui-full bg-pui-background/80 px-3 py-1 text-xs font-medium text-pui-foreground backdrop-blur-sm">
            {SLIDES[index]!.scene.name}
          </figcaption>
        </figure>
      </PageTransition>
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => step(-1)} aria-label="Previous photo">
          ←
        </Button>
        <span className="font-mono text-xs text-pui-muted-foreground" aria-live="polite">
          {index + 1} / {SLIDES.length}
        </span>
        <Button variant="outline" size="sm" onClick={() => step(1)} aria-label="Next photo">
          →
        </Button>
      </div>
    </div>
  );
}

const TABS = ["Overview", "Activity", "Billing"] as const;
const noopSubscribe = () => () => {};

function ViewDemo() {
  const [tab, setTab] = useState(0);
  const supported = useSyncExternalStore(noopSubscribe, supportsViewTransitions, () => false);
  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div role="tablist" aria-label="Account" className="flex gap-1 rounded-pui-lg bg-pui-muted p-1">
          {TABS.map((t, i) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === i}
              onClick={() => setTab(i)}
              className="rounded-pui-md px-3 py-1 text-sm text-pui-muted-foreground transition-colors focus-visible:outline-2 focus-visible:outline-pui-ring aria-selected:bg-pui-background aria-selected:text-pui-foreground aria-selected:shadow-pui-xs"
            >
              {t}
            </button>
          ))}
        </div>
        <Badge tone={supported ? "success" : "neutral"} size="sm">
          {supported ? "Native" : "Fade fallback"}
        </Badge>
      </div>
      <PageTransition routeKey={tab} order={tab} preset="view" distance={32} role="tabpanel" aria-label={TABS[tab]} className="overflow-hidden rounded-pui-lg border border-pui-border bg-pui-surface">
        <div className="flex min-h-32 flex-col gap-2 p-4">
          <h3 className="m-0 text-base font-semibold text-pui-foreground">{TABS[tab]}</h3>
          {tab === 0 ? <p className="m-0 text-sm text-pui-muted-foreground">Pro plan · 12 seats · renews Nov 4.</p> : null}
          {tab === 1 ? (
            <ul className="m-0 flex list-none flex-col gap-1 p-0 text-sm text-pui-muted-foreground">
              <li>Mara invited 2 people</li>
              <li>API key rotated</li>
              <li>Export finished (3.2 MB)</li>
            </ul>
          ) : null}
          {tab === 2 ? (
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-semibold text-pui-foreground tabular-nums">$144</span>
              <span className="text-sm text-pui-muted-foreground">/ month</span>
            </div>
          ) : null}
        </div>
      </PageTransition>
    </div>
  );
}

function FlipDemo() {
  const [face, setFace] = useState(0);
  const faces = [
    { title: "Sign in", cta: "Continue", alt: "No account? Create one" },
    { title: "Create account", cta: "Sign up", alt: "Have an account? Sign in" },
  ];
  const f = faces[face]!;
  return (
    <PageTransition routeKey={face} order={face} preset="flip" className="w-full max-w-xs" layerClassName="rounded-pui-xl border border-pui-border bg-pui-surface p-5 shadow-pui-md">
      <div className="flex flex-col gap-3">
        <h3 className="m-0 text-base font-semibold text-pui-foreground">{f.title}</h3>
        <div className="h-9 rounded-pui-md border border-pui-border bg-pui-background" aria-hidden="true" />
        <div className="h-9 rounded-pui-md border border-pui-border bg-pui-background" aria-hidden="true" />
        <Button className="w-full">{f.cta}</Button>
        <button type="button" onClick={() => setFace((x) => 1 - x)} className="text-center text-xs text-pui-primary underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-pui-ring">
          {f.alt}
        </button>
      </div>
    </PageTransition>
  );
}

const MINI_PAGES = [
  { icon: <HomeIcon />, bars: [70, 45, 60] },
  { icon: <FolderIcon />, bars: [40, 80, 55] },
  { icon: <ChartIcon />, bars: [85, 35, 65] },
];

function Mini() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setI((n) => (n + 1) % MINI_PAGES.length), 1800);
    return () => window.clearInterval(id);
  }, []);
  const p = MINI_PAGES[i]!;
  return (
    <div className="h-24 w-40 overflow-hidden rounded-pui-lg border border-pui-border bg-pui-background shadow-pui-sm" aria-hidden="true">
      <PageTransition routeKey={i} preset="slide" distance={28} className="size-full">
        <div className="flex h-24 flex-col gap-2 p-3">
          <span className="text-pui-primary [&_svg]:size-4">{p.icon}</span>
          {p.bars.map((w, k) => (
            <span key={k} className="h-1.5 rounded-pui-full bg-pui-muted" style={{ width: `${w}%` }} />
          ))}
        </div>
      </PageTransition>
    </div>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: ({ mode, ...props }) =>
    toJsx<Record<string, unknown>>(
      "PageTransition",
      { routeKey: "__KEY__", ...props, ...(mode === "preset default" ? {} : { mode }) },
      { routeKey: "", ...defaults, mode: undefined },
      "{page}",
      controls as ControlSpec<Record<string, unknown>>[],
    ).replace('routeKey="__KEY__"', "routeKey={pathname}"),
  propsTable: propDocs<PageTransitionProps>()([
    { name: "routeKey", type: "string | number", description: "Identifies the page; a new key plays the transition.", required: true },
    { name: "preset", type: '"slide" | "fade" | "scale" | "blur" | "flip" | "wipe" | "curtain" | "view"', default: '"slide"', description: '"view" uses the View Transitions API and falls back to "fade".' },
    { name: "direction", type: '"auto" | "forward" | "back"', default: '"auto"', description: "auto: back when returning to the previous page (or a lower order), else forward." },
    { name: "order", type: "number", description: "Page position in a sequence (steps, tabs) for direction=\"auto\"." },
    { name: "axis", type: '"x" | "y"', default: '"x"', description: "Axis for slide, flip, wipe and view." },
    { name: "distance", type: "number", default: "24", description: "Travel in px for slide, wipe and view." },
    { name: "mode", type: '"wait" | "popLayout" | "sync"', default: '"wait" ("popLayout" for wipe)', description: "How the old and new pages overlap. Curtain always waits." },
    { name: "focusOnChange", type: "boolean | string", default: "false", description: "Focus the new page's h1 (or a selector) after navigation." },
    { name: "layerClassName", type: "string", description: "Class for each page layer, e.g. a background for overlapping modes." },
    { name: "curtainClassName", type: "string", description: "Class for the curtain's front panel (default bg-pui-foreground)." },
    { name: "onExitComplete", type: "() => void", description: "Called when the old page has left." },
  ]),
  a11y: [
    "Exiting pages get inert and aria-hidden, so focus and screen readers only reach the new page.",
    "focusOnChange moves focus to the new h1 (tabindex=-1 is added if needed) without scrolling, the usual SPA route announcement.",
    "The first page renders statically on the server; nothing animates until the key changes.",
  ],
  reducedMotion: "Every preset becomes a 150ms crossfade in wait mode; view transitions are skipped.",
  examples: [
    { title: "Onboarding steps", description: "order makes Back slide the other way; focus moves to each step's heading.", Demo: OnboardingDemo },
    { title: "Card flip", description: 'preset="flip" between sign in and sign up.', Demo: FlipDemo },
    { title: "Curtain", description: "A two-tone panel sweeps up between portfolio sections.", Demo: CurtainDemo, wide: true },
    { title: "Wipe gallery", description: "popLayout: the next photo wipes over the last one, which drifts back.", Demo: WipeDemo },
    { title: "Native view transitions", description: 'preset="view" morphs with document.startViewTransition, with a fade fallback.', Demo: ViewDemo },
  ],
};
export default item;
