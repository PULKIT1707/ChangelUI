/**
 * Bento features. A signature feature grid: every card lights up as the pointer gets close, with an
 * integration hub wired by animated beams, a spinning dot globe, a live sparkline, a marquee of
 * frameworks and a keyboard-first card.
 *
 * Copy-only template. It is responsive to its container (container queries). Wrap your app in
 * <MotionConfig reducedMotion="user"> so Motion honors the OS setting; the library pieces used here
 * already fall back on their own.
 */
import { AnimatedBeam } from "changelui/animated-beam";
import { DotGlobe } from "changelui/dot-globe";
import { Kbd } from "changelui/kbd";
import { Marquee } from "changelui/marquee";
import { ProximityGlow, ProximityGlowItem } from "changelui/proximity-glow";
import { RollingNumber } from "changelui/rolling-number";
import { Sparkline } from "changelui/sparkline";
import { forwardRef, useEffect, useRef, useState, type ReactNode } from "react";

const GLYPHS = {
  bolt: "M13 2 4 14h7l-1 8 9-12h-7l1-8Z",
  db: "M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3Zm0 0v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3",
  mail: "M3 6h18v12H3zM3 7l9 6 9-6",
  chat: "M4 5h16v11H9l-5 4V5Z",
  card: "M3 6h18v12H3zM3 10h18",
  git: "M6 3v12M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM18 9c0 6-12 3-12 9",
} as const;

const Node = forwardRef<HTMLDivElement, { glyph: keyof typeof GLYPHS; label: string; hub?: boolean }>(function Node({ glyph, label, hub }, ref) {
  return (
    <div
      ref={ref}
      className={
        hub
          ? "relative z-10 grid size-16 place-items-center rounded-pui-xl border border-pui-primary/40 bg-pui-surface text-pui-primary-text shadow-pui-glow"
          : "relative z-10 grid size-11 place-items-center rounded-pui-full border border-pui-border bg-pui-surface text-pui-muted-foreground shadow-pui-sm"
      }
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" className={hub ? "size-7" : "size-5"} fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
        <path d={GLYPHS[glyph]} />
      </svg>
      <span className="sr-only">{label}</span>
    </div>
  );
});

function IntegrationsHub() {
  const container = useRef<HTMLDivElement>(null);
  const hub = useRef<HTMLDivElement>(null);
  const db = useRef<HTMLDivElement>(null);
  const mail = useRef<HTMLDivElement>(null);
  const chat = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const git = useRef<HTMLDivElement>(null);
  const left = [db, mail, chat] as const;
  const right = [card, git] as const;
  return (
    <div ref={container} className="relative flex items-center justify-between px-2 py-4" role="img" aria-label="Postgres, email and chat connect through the hub to billing and Git">
      <div className="flex flex-col gap-5">
        <Node ref={db} glyph="db" label="Postgres" />
        <Node ref={mail} glyph="mail" label="Email" />
        <Node ref={chat} glyph="chat" label="Chat" />
      </div>
      <Node ref={hub} glyph="bolt" label="Hub" hub />
      <div className="flex flex-col gap-10">
        <Node ref={card} glyph="card" label="Billing" />
        <Node ref={git} glyph="git" label="Git" />
      </div>
      {left.map((ref, i) => (
        <AnimatedBeam key={`l${i}`} containerRef={container} fromRef={ref} toRef={hub} curvature={(1 - i) * 28} duration={3} delay={i * 0.4} />
      ))}
      {right.map((ref, i) => (
        <AnimatedBeam key={`r${i}`} containerRef={container} fromRef={hub} toRef={ref} curvature={(i === 0 ? 1 : -1) * 20} duration={3} delay={1.2 + i * 0.4} />
      ))}
    </div>
  );
}

const CITIES = {
  sf: { lat: 37.77, lon: -122.42, label: "SFO" },
  ny: { lat: 40.71, lon: -74.0, label: "JFK" },
  ldn: { lat: 51.5, lon: -0.12, label: "LHR" },
  fra: { lat: 50.11, lon: 8.68, label: "FRA" },
  sin: { lat: 1.35, lon: 103.82, label: "SIN" },
  syd: { lat: -33.87, lon: 151.21, label: "SYD" },
  gru: { lat: -23.55, lon: -46.63, label: "GRU" },
};

function LiveRequests() {
  const [data, setData] = useState(() => Array.from({ length: 24 }, (_, i) => 40 + Math.round(Math.sin(i / 2) * 12 + i)));
  useEffect(() => {
    const id = window.setInterval(() => {
      setData((prev) => {
        const last = prev[prev.length - 1] ?? 50;
        const next = Math.max(20, Math.round(last + (Math.random() - 0.45) * 14));
        return [...prev.slice(1), next];
      });
    }, 1600);
    return () => window.clearInterval(id);
  }, []);
  const current = data[data.length - 1] ?? 0;
  return (
    <div className="flex flex-col gap-3">
      <p className="flex items-baseline gap-2">
        <RollingNumber value={current * 1000} format={{ notation: "compact", maximumFractionDigits: 1 }} className="text-3xl font-semibold tabular-nums" />
        <span className="text-xs text-pui-muted-foreground">requests / min</span>
      </p>
      <Sparkline data={data} variant="area" fluid height={72} label="Requests per minute" />
    </div>
  );
}

const SHORTCUTS = [
  { keys: ["⌘", "K"], label: "Command bar" },
  { keys: ["G", "D"], label: "Go to deploys" },
  { keys: ["⇧", "R"], label: "Redeploy" },
  { keys: ["?"], label: "All shortcuts" },
];

const STACK = ["React", "Next.js", "Remix", "Astro", "Vite", "Svelte", "Vue", "Solid", "Nuxt", "Qwik", "Bun", "Deno"];

function Card({ title, body, className, children }: { title: string; body: string; className?: string; children: ReactNode }) {
  return (
    <ProximityGlowItem className={`flex flex-col gap-4 overflow-hidden p-5 ${className ?? ""}`}>
      <div className="min-h-0 flex-1">{children}</div>
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="mt-1 text-sm text-pui-muted-foreground">{body}</p>
      </div>
    </ProximityGlowItem>
  );
}

export default function BentoFeatures() {
  return (
    <section className="@container bg-pui-background px-5 py-16 text-pui-foreground @3xl:px-8 @3xl:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <p className="text-sm font-semibold text-pui-primary-text">Platform</p>
          <h2 className="mt-2 text-balance text-3xl font-bold tracking-tight @xl:text-4xl">Everything you need to ship, in one place</h2>
          <p className="mt-4 text-pretty text-pui-muted-foreground">
            Connect your data, run it at the edge, and watch it live. Move your pointer across the grid.
          </p>
        </div>

        <ProximityGlow radius={280} className="grid gap-4 @3xl:grid-cols-3 @3xl:grid-rows-[auto_auto]">
          <Card title="Connect your stack" body="Two-way sync with 120+ sources. Events flow through one hub you can inspect." className="@3xl:col-span-2">
            <IntegrationsHub />
          </Card>
          <Card title="Global edge" body="Deployed to 38 regions. Requests land on the closest one in under 50 ms." className="@3xl:row-span-2">
            <div className="grid h-full place-items-center">
              <DotGlobe
                density={5000}
                dotSize={1}
                markers={Object.values(CITIES)}
                arcs={[
                  { from: CITIES.sf, to: CITIES.ldn },
                  { from: CITIES.ny, to: CITIES.fra },
                  { from: CITIES.ldn, to: CITIES.sin },
                  { from: CITIES.sin, to: CITIES.syd },
                  { from: CITIES.gru, to: CITIES.ny },
                ]}
                showLabels={false}
                label="Globe with seven edge regions connected by arcs"
                className="w-full max-w-72"
              />
            </div>
          </Card>
          <Card title="Real-time analytics" body="Every request, streamed. No sampling, no waiting for the batch job.">
            <LiveRequests />
          </Card>
          <Card title="Works with your framework" body="First-class adapters, typed end to end.">
            <div className="flex flex-col gap-2">
              <Marquee duration={24} gap="0.5rem">
                {STACK.slice(0, 6).map((name) => (
                  <span key={name} className="shrink-0 rounded-pui-full border border-pui-border bg-pui-muted px-3 py-1 text-xs font-medium">
                    {name}
                  </span>
                ))}
              </Marquee>
              <Marquee duration={28} gap="0.5rem" direction="right">
                {STACK.slice(6).map((name) => (
                  <span key={name} className="shrink-0 rounded-pui-full border border-pui-border bg-pui-muted px-3 py-1 text-xs font-medium">
                    {name}
                  </span>
                ))}
              </Marquee>
            </div>
          </Card>
          <Card title="Keyboard first" body="Every action has a shortcut, and the command bar finds the rest." className="@3xl:col-span-3">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-pui-muted-foreground">
              {SHORTCUTS.map((shortcut) => (
                <span key={shortcut.label} className="inline-flex items-center gap-2">
                  <span className="inline-flex gap-1">
                    {shortcut.keys.map((key) => (
                      <Kbd key={key} size="md">
                        {key}
                      </Kbd>
                    ))}
                  </span>
                  {shortcut.label}
                </span>
              ))}
            </div>
          </Card>
        </ProximityGlow>
      </div>
    </section>
  );
}
