/**
 * Auto-advancing feature tour. A vertical tablist where the active tab grows to show its copy and a
 * progress rail fills toward the next feature, beside a preview that crossfades between product
 * shots. Autoplay pauses while the pointer or focus is inside, in background tabs and on demand
 * (a real pause button, WCAG 2.2.2); under reduced motion it starts paused and panels swap instantly.
 *
 * Copy-only template. It is responsive to its container (container queries). Wrap your app in
 * <MotionConfig reducedMotion="user"> so Motion honors the OS setting; the library pieces used here
 * already fall back on their own.
 */
import { Avatar, AvatarGroup } from "changelui/avatar";
import { Badge } from "changelui/badge";
import { Sparkline } from "changelui/sparkline";
import { durations, easings, springs } from "changelui/motion-presets";
import { usePrefersReducedMotion } from "changelui/use-prefers-reduced-motion";
import { AnimatePresence, motion, useAnimationFrame, useMotionValue } from "motion/react";
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
/** Milliseconds each feature stays before the tour moves on. */
const INTERVAL = 6000;
interface Feature {
  id: string;
  title: string;
  body: string;
  preview: () => ReactNode;
}
function Window({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-pui-xl border border-pui-border bg-pui-surface text-pui-surface-foreground shadow-pui-lg">
      <div className="flex items-center gap-2 border-b border-pui-border px-4 py-2.5">
        <span className="flex gap-1.5" aria-hidden="true">
          <span className="size-2.5 rounded-full bg-pui-muted-foreground/30" />
          <span className="size-2.5 rounded-full bg-pui-muted-foreground/30" />
          <span className="size-2.5 rounded-full bg-pui-muted-foreground/30" />
        </span>
        <span className="text-xs font-medium text-pui-muted-foreground">{title}</span>
      </div>
      <div className="min-h-0 flex-1 p-4">{children}</div>
    </div>
  );
}
const BOARD = [
  { title: "Backlog", cards: ["Search filters", "Bulk export"] },
  { title: "In progress", cards: ["Offline drafts", "SSO for teams"] },
  { title: "Done", cards: ["Dark mode", "Audit log", "CSV import"] },
];
function PlanPreview() {
  return (
    <Window title="Roadmap · Q4">
      <div className="grid h-full grid-cols-3 gap-3">
        {BOARD.map((col, c) => (
          <div key={col.title} className="flex flex-col gap-2 rounded-pui-lg bg-pui-muted/50 p-2.5">
            <p className="flex items-center justify-between text-xs font-semibold text-pui-muted-foreground">
              {col.title}
              <span className="tabular-nums">{col.cards.length}</span>
            </p>
            {col.cards.map((card, i) => (
              <div key={card} className="rounded-pui-md border border-pui-border bg-pui-surface p-2.5 shadow-pui-xs">
                <p className="text-xs font-medium">{card}</p>
                <div className="mt-2 flex items-center justify-between">
                  <Badge size="sm" tone={c === 2 ? "success" : i === 0 ? "primary" : "neutral"} variant="soft">
                    {c === 2 ? "Shipped" : i === 0 ? "P1" : "P2"}
                  </Badge>
                  <Avatar size="xs" name={["Ada Park", "Lee Chen", "Mia Ruiz"][(c + i) % 3]} />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </Window>
  );
}
const SIGNUPS = [42, 48, 45, 53, 60, 58, 66, 71, 69, 78, 84, 90, 88, 97];
function TrackPreview() {
  return (
    <Window title="Insights · Last 14 days">
      <div className="flex h-full flex-col gap-4">
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Signups", value: "1,089", delta: "+18%" },
            { label: "Activation", value: "64%", delta: "+6 pts" },
            { label: "Churn", value: "1.9%", delta: "−0.4 pts" },
          ].map((s) => (
            <div key={s.label} className="rounded-pui-lg border border-pui-border p-3">
              <p className="text-xs text-pui-muted-foreground">{s.label}</p>
              <p className="mt-1 text-xl font-semibold tracking-tight tabular-nums">{s.value}</p>
              <p className="text-xs font-medium text-pui-success-text">{s.delta}</p>
            </div>
          ))}
        </div>
        <div className="min-h-0 flex-1 rounded-pui-lg border border-pui-border p-3">
          <p className="mb-2 text-xs font-medium text-pui-muted-foreground">Daily signups</p>
          <Sparkline data={SIGNUPS} variant="area" fluid height={96} interactive={false} label="Daily signups, rising from 42 to 97" />
        </div>
      </div>
    </Window>
  );
}
const DIFF: { kind: "ctx" | "add" | "del"; text: string }[] = [
  { kind: "ctx", text: "export function retry(fn, attempts = 3) {" },
  { kind: "del", text: "  return fn().catch(() => retry(fn, attempts - 1));" },
  { kind: "add", text: "  if (attempts <= 0) return fn();" },
  { kind: "add", text: "  return fn().catch(() => wait(backoff(attempts)).then(() =>" },
  { kind: "add", text: "    retry(fn, attempts - 1)));" },
  { kind: "ctx", text: "}" },
];
function ReviewPreview() {
  return (
    <Window title="Review · retry.ts">
      <div className="flex h-full flex-col gap-3">
        <div className="overflow-hidden rounded-pui-lg border border-pui-border font-mono text-[11px] leading-6">
          {DIFF.map((line, i) => (
            <div
              key={i}
              className={`flex gap-3 px-3 ${line.kind === "add" ? "bg-pui-success/12" : line.kind === "del" ? "bg-pui-danger/12" : ""}`}
            >
              <span className="w-3 shrink-0 text-pui-muted-foreground" aria-hidden="true">
                {line.kind === "add" ? "+" : line.kind === "del" ? "−" : ""}
              </span>
              <span className="truncate whitespace-pre">{line.text}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-2.5 rounded-pui-lg border border-pui-border p-3">
          <Avatar size="sm" name="Lee Chen" />
          <div className="min-w-0 text-xs">
            <p className="font-semibold">
              Lee Chen <span className="font-normal text-pui-muted-foreground">· 2m ago</span>
            </p>
            <p className="mt-0.5 text-pui-muted-foreground">Nice. Can we cap the backoff at 8 seconds so the toast does not hang?</p>
          </div>
        </div>
      </div>
    </Window>
  );
}
const STEPS = ["Build", "Unit tests", "Preview deploy", "Smoke tests", "Production"];
function ShipPreview() {
  return (
    <Window title="Deploys · web-app">
      <div className="flex h-full flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">v2.14.0</p>
            <p className="text-xs text-pui-muted-foreground">main · 3f9c2e1 · by Mia Ruiz</p>
          </div>
          <Badge tone="success" variant="soft">
            Live
          </Badge>
        </div>
        <ol className="flex flex-col gap-2">
          {STEPS.map((step, i) => (
            <li key={step} className="flex items-center gap-3 rounded-pui-md border border-pui-border px-3 py-2 text-xs">
              <span className="grid size-5 place-items-center rounded-full bg-pui-success text-pui-success-foreground" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" className="size-3">
                  <path d="m5 12.5 4.5 4.5L19 7.5" />
                </svg>
              </span>
              <span className="flex-1 font-medium">{step}</span>
              <span className="tabular-nums text-pui-muted-foreground">{["38s", "1m 12s", "54s", "22s", "41s"][i]}</span>
            </li>
          ))}
        </ol>
        <div className="mt-auto flex items-center justify-between text-xs text-pui-muted-foreground">
          <span>Shipped in 4m 07s</span>
          <AvatarGroup size="xs" max={3}>
            <Avatar name="Ada Park" />
            <Avatar name="Lee Chen" />
            <Avatar name="Mia Ruiz" />
          </AvatarGroup>
        </div>
      </div>
    </Window>
  );
}
const FEATURES: Feature[] = [
  { id: "plan", title: "Plan in one place", body: "Roadmaps, sprints and bugs share one board, so priorities never live in five tabs.", preview: PlanPreview },
  { id: "track", title: "See what moved", body: "Every launch gets a live scorecard. Spot the lift, or the dip, the day it happens.", preview: TrackPreview },
  { id: "review", title: "Review without meetings", body: "Inline comments on code, copy and designs, threaded where the work is.", preview: ReviewPreview },
  { id: "ship", title: "Ship on green", body: "Checks run on every change and promote themselves when they pass.", preview: ShipPreview },
];
function PlayPauseIcon({ playing }: { playing: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="size-3.5">
      {playing ? (
        <>
          <rect x="6" y="5" width="4" height="14" rx="1" />
          <rect x="14" y="5" width="4" height="14" rx="1" />
        </>
      ) : (
        <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" />
      )}
    </svg>
  );
}
export default function FeatureTabs() {
  const id = useId();
  const reduced = usePrefersReducedMotion();
  const [active, setActive] = useState(0);
  // null = the visitor has not chosen; reduced motion then means "start paused".
  const [userPlaying, setUserPlaying] = useState<boolean | null>(null);
  const [hovered, setHovered] = useState(false);
  const [focusWithin, setFocusWithin] = useState(false);
  const [visible, setVisible] = useState(true);
  const progress = useMotionValue(0);
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);
  const autoplay = userPlaying ?? !reduced;
  const running = autoplay && !hovered && !focusWithin && visible;
  useEffect(() => {
    const onChange = () => setVisible(!document.hidden);
    onChange();
    document.addEventListener("visibilitychange", onChange);
    return () => document.removeEventListener("visibilitychange", onChange);
  }, []);
  useAnimationFrame((_, delta) => {
    if (!running) return;
    // Clamp big gaps (a frozen tab) so the tour never skips a feature.
    const next = progress.get() + Math.min(delta, 100) / INTERVAL;
    if (next < 1) {
      progress.set(next);
      return;
    }
    progress.set(0);
    setActive((a) => (a + 1) % FEATURES.length);
  });
  const select = (index: number, focus = false) => {
    progress.set(0);
    setActive(index);
    if (focus) tabs.current[index]?.focus();
  };
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const last = FEATURES.length - 1;
    const map: Record<string, number> = {
      ArrowDown: active === last ? 0 : active + 1,
      ArrowRight: active === last ? 0 : active + 1,
      ArrowUp: active === 0 ? last : active - 1,
      ArrowLeft: active === 0 ? last : active - 1,
      Home: 0,
      End: last,
    };
    const next = map[event.key];
    if (next === undefined) return;
    event.preventDefault();
    select(next, true);
  };
  const feature = FEATURES[active]!;
  const Panel = feature.preview;
  const swap = reduced ? { duration: 0 } : { duration: durations.slow, ease: easings.out };
  return (
    <section
      aria-labelledby={`${id}-title`}
      className="@container bg-pui-background px-5 py-14 text-pui-foreground @3xl:px-8 @3xl:py-20"
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocus={() => setFocusWithin(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocusWithin(false);
      }}
    >
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col gap-4 @3xl:flex-row @3xl:items-end @3xl:justify-between">
          <div className="max-w-xl">
            <p className="text-sm font-semibold text-pui-primary-text">Product tour</p>
            <h2 id={`${id}-title`} className="mt-2 text-balance text-3xl font-bold tracking-tight @xl:text-4xl">
              From plan to production, in one workspace
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setUserPlaying(!autoplay)}
            className="inline-flex h-8 w-fit cursor-pointer items-center gap-2 rounded-full border border-pui-border bg-pui-surface px-3 text-xs font-medium text-pui-surface-foreground shadow-pui-xs transition-colors hover:bg-pui-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pui-ring"
          >
            <PlayPauseIcon playing={autoplay} />
            {autoplay ? "Pause tour" : "Play tour"}
          </button>
        </div>
        <div className="mt-10 grid gap-6 @3xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] @3xl:gap-10">
          <div role="tablist" aria-label="Features" aria-orientation="vertical" className="flex flex-col gap-1">
            {FEATURES.map((f, i) => {
              const selected = i === active;
              return (
                <button
                  key={f.id}
                  ref={(el) => {
                    tabs.current[i] = el;
                  }}
                  type="button"
                  role="tab"
                  id={`${id}-tab-${f.id}`}
                  aria-selected={selected}
                  aria-controls={`${id}-panel`}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => select(i)}
                  onKeyDown={onKeyDown}
                  className={`group relative cursor-pointer rounded-pui-lg py-4 ps-6 pe-4 text-start transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pui-ring ${selected ? "bg-pui-surface shadow-pui-sm ring-1 ring-pui-border" : "hover:bg-pui-muted/60"}`}
                >
                  {/* Progress rail: the track is always there, the fill only on the active tab. */}
                  <span aria-hidden="true" className="absolute inset-y-4 start-2.5 w-0.5 overflow-hidden rounded-full bg-pui-border">
                    {selected ? (
                      autoplay ? (
                        <motion.span className="absolute inset-0 origin-top rounded-full bg-pui-primary" style={{ scaleY: progress }} />
                      ) : (
                        <span className="absolute inset-0 rounded-full bg-pui-primary" />
                      )
                    ) : null}
                  </span>
                  <span className={`block text-base font-semibold transition-colors ${selected ? "text-pui-foreground" : "text-pui-muted-foreground group-hover:text-pui-foreground"}`}>
                    {f.title}
                  </span>
                  <AnimatePresence initial={false}>
                    {selected ? (
                      <motion.span
                        key="body"
                        className="block overflow-hidden"
                        initial={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
                        animate={reduced ? { opacity: 1 } : { height: "auto", opacity: 1 }}
                        exit={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
                        transition={reduced ? { duration: 0 } : springs.smooth}
                      >
                        <span className="block pt-1.5 text-sm text-pui-muted-foreground">{f.body}</span>
                      </motion.span>
                    ) : null}
                  </AnimatePresence>
                </button>
              );
            })}
          </div>
          <div
            id={`${id}-panel`}
            role="tabpanel"
            aria-labelledby={`${id}-tab-${feature.id}`}
            tabIndex={0}
            className="relative h-[22rem] rounded-pui-xl bg-[radial-gradient(120%_100%_at_100%_0%,color-mix(in_oklab,var(--pui-primary)_16%,transparent),transparent_60%)] p-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pui-ring @3xl:h-[24rem] @3xl:p-5"
          >
            <AnimatePresence initial={false} mode="popLayout">
              <motion.div
                key={feature.id}
                className="h-full"
                initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                exit={reduced ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.98, filter: "blur(4px)" }}
                transition={swap}
              >
                <Panel />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
        <p className="sr-only" aria-live="polite">
          {userPlaying === null ? "" : autoplay ? "Tour playing" : "Tour paused"}
        </p>
      </div>
    </section>
  );
}
