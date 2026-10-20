/**
 * Changelog. Release notes on a timeline: version badges, dates, a type filter with live counts,
 * entries that fade up as they scroll into view, tagged change lists, a copyable link per release
 * and a subscribe box. The newest release is marked "Latest" and pulses on the rail.
 *
 * Copy-only template. It is responsive to its container (container queries). Feed RELEASES from
 * your CMS or GitHub releases. Wrap your app in <MotionConfig reducedMotion="user">.
 */
import { Badge } from "changelui/badge";
import { Button } from "changelui/button";
import { CopyButton } from "changelui/copy-button";
import { Input } from "changelui/input";
import { Reveal } from "changelui/reveal";
import { SegmentedControl, SegmentedControlItem } from "changelui/segmented-control";
import { Timeline, TimelineItem } from "changelui/timeline";
import { springs } from "changelui/motion-presets";
import { usePrefersReducedMotion } from "changelui/use-prefers-reduced-motion";
import { AnimatePresence, motion } from "motion/react";
import { useId, useState, type FormEvent } from "react";

type Kind = "feature" | "improvement" | "fix";
type Filter = "all" | Kind;

interface Change {
  kind: Kind;
  text: string;
}

interface Release {
  version: string;
  date: string;
  title: string;
  summary: string;
  changes: Change[];
  highlight?: { from: string; to: string };
}

const RELEASES: Release[] = [
  {
    version: "3.2.0",
    date: "2026-10-14",
    title: "Branching workflows and a visual debugger",
    summary: "Workflows can now fork on any condition, retry failed steps with backoff and be replayed step by step.",
    changes: [
      { kind: "feature", text: "If / else and switch blocks in the workflow editor" },
      { kind: "feature", text: "Step-by-step replay with inputs and outputs for every run" },
      { kind: "improvement", text: "Retries use exponential backoff with jitter by default" },
      { kind: "fix", text: "Webhook triggers no longer fire twice after a redeploy" },
    ],
    highlight: { from: "var(--pui-gradient-1)", to: "var(--pui-gradient-2)" },
  },
  {
    version: "3.1.4",
    date: "2026-09-30",
    title: "Faster dashboards",
    summary: "Large dashboards render up to 3x faster thanks to incremental query caching.",
    changes: [
      { kind: "improvement", text: "Incremental caching for queries over 1M rows" },
      { kind: "improvement", text: "Charts stream in as each query finishes" },
      { kind: "fix", text: "Time zone offsets on weekly rollups" },
    ],
  },
  {
    version: "3.1.0",
    date: "2026-09-12",
    title: "Shared links and comments",
    summary: "Share a live dashboard with anyone, pin comments to a data point and get notified on replies.",
    changes: [
      { kind: "feature", text: "Public links with expiry and optional password" },
      { kind: "feature", text: "Comments pinned to chart points" },
      { kind: "fix", text: "CSV export kept the wrong column order" },
    ],
    highlight: { from: "var(--pui-gradient-2)", to: "var(--pui-gradient-3)" },
  },
  {
    version: "3.0.2",
    date: "2026-08-28",
    title: "Polish and fixes",
    summary: "A round of small fixes reported by the community. Thank you for the issues.",
    changes: [
      { kind: "fix", text: "Keyboard focus lost after closing the share dialog" },
      { kind: "fix", text: "Dark mode contrast of disabled inputs" },
      { kind: "improvement", text: "Command palette remembers recent actions" },
    ],
  },
];

const KIND_LABEL: Record<Kind, string> = { feature: "New", improvement: "Improved", fix: "Fixed" };
const KIND_TONE: Record<Kind, "primary" | "info" | "success"> = { feature: "primary", improvement: "info", fix: "success" };

const DATE = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });

function RssIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round">
      <path d="M3 3a10 10 0 0 1 10 10M3 7a6 6 0 0 1 6 6" />
      <circle cx="3.5" cy="12.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export default function Changelog() {
  const reduced = usePrefersReducedMotion();
  const id = useId();
  const [filter, setFilter] = useState<Filter>("all");
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const count = (kind: Filter) =>
    kind === "all" ? RELEASES.length : RELEASES.filter((release) => release.changes.some((change) => change.kind === kind)).length;
  const shown = RELEASES.filter((release) => filter === "all" || release.changes.some((change) => change.kind === filter));

  const subscribe = (event: FormEvent) => {
    event.preventDefault();
    if (email.includes("@")) setSubscribed(true);
  };

  return (
    <section className="@container bg-pui-background px-5 py-16 text-pui-foreground @3xl:px-8 @3xl:py-24">
      <div className="mx-auto grid max-w-6xl gap-10 @5xl:grid-cols-[16rem_1fr] @5xl:gap-16">
        <aside className="flex flex-col gap-6 @5xl:sticky @5xl:top-8 @5xl:self-start">
          <div className="flex flex-col gap-3">
            <h2 className="text-3xl font-bold tracking-tight @xl:text-4xl">Changelog</h2>
            <p className="text-pretty text-pui-muted-foreground">New features, improvements and fixes, every couple of weeks.</p>
          </div>
          <SegmentedControl aria-label="Filter releases" size="sm" value={filter} onValueChange={(v) => setFilter(v as Filter)} className="w-fit flex-wrap">
            {(["all", "feature", "improvement", "fix"] as const).map((kind) => (
              <SegmentedControlItem key={kind} value={kind}>
                {kind === "all" ? "All" : KIND_LABEL[kind]}
                <span className="ms-1.5 text-xs tabular-nums opacity-60">{count(kind)}</span>
              </SegmentedControlItem>
            ))}
          </SegmentedControl>
          <form onSubmit={subscribe} className="flex flex-col gap-2 rounded-pui-xl border border-pui-border bg-pui-surface p-4">
            <label htmlFor={`${id}-email`} className="text-sm font-semibold">
              Get release notes by email
            </label>
            <AnimatePresence mode="wait" initial={false}>
              {subscribed ? (
                <motion.p
                  key="done"
                  initial={{ opacity: 0, scale: reduced ? 1 : 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={reduced ? { duration: 0.15 } : springs.bouncy}
                  className="rounded-pui-md bg-pui-success/12 px-3 py-2 text-sm text-pui-success-text"
                  role="status"
                >
                  Subscribed. See you next release.
                </motion.p>
              ) : (
                <motion.div key="form" exit={{ opacity: 0 }} className="flex flex-col gap-2">
                  <Input id={`${id}-email`} type="email" size="sm" placeholder="you@company.com" value={email} onChange={(event) => setEmail(event.target.value)} />
                  <Button type="submit" size="sm">
                    Subscribe
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
            <a href="#" onClick={(event) => event.preventDefault()} className="mt-1 flex items-center gap-1.5 text-xs text-pui-muted-foreground no-underline hover:text-pui-foreground">
              <RssIcon />
              RSS feed
            </a>
          </form>
        </aside>

        <Timeline animate="inView" aria-label="Releases" className="min-w-0">
          {shown.map((release, index) => {
            const latest = release.version === RELEASES[0]?.version;
            const anchor = `v${release.version.replaceAll(".", "-")}`;
            const changes = release.changes.filter((change) => filter === "all" || change.kind === filter);
            return (
              <TimelineItem
                key={release.version}
                id={anchor}
                status={latest ? "current" : "complete"}
                dateTime={release.date}
                time={DATE.format(new Date(`${release.date}T00:00:00Z`))}
                title={
                  <span className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" tone="neutral" className="font-pui-mono">
                      v{release.version}
                    </Badge>
                    {latest ? (
                      <Badge tone="primary" variant="solid" size="sm" dot pulse>
                        Latest
                      </Badge>
                    ) : null}
                  </span>
                }
              >
                <Reveal preset="fade-up" delay={Math.min(index, 2) * 0.05} className="mt-3 flex flex-col gap-4 pb-6">
                  {release.highlight ? (
                    <div
                      aria-hidden="true"
                      className="relative h-36 overflow-hidden rounded-pui-xl border border-pui-border @xl:h-44"
                      style={{ background: `linear-gradient(135deg, ${release.highlight.from}, ${release.highlight.to})` }}
                    >
                      <div className="absolute inset-x-6 bottom-0 h-3/4 rounded-t-pui-lg border border-b-0 border-pui-border/50 bg-pui-surface/90 p-3 shadow-pui-lg">
                        <div className="flex gap-1.5">
                          <span className="size-2 rounded-full bg-pui-danger/70" />
                          <span className="size-2 rounded-full bg-pui-warning/70" />
                          <span className="size-2 rounded-full bg-pui-success/70" />
                        </div>
                        <div className="mt-3 grid grid-cols-3 gap-2">
                          <span className="h-10 rounded-pui-md bg-pui-muted" />
                          <span className="h-10 rounded-pui-md bg-pui-primary/20" />
                          <span className="h-10 rounded-pui-md bg-pui-muted" />
                        </div>
                      </div>
                    </div>
                  ) : null}
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-xl font-semibold tracking-tight">{release.title}</h3>
                    <CopyButton value={`https://example.com/changelog#${anchor}`} label={`Copy link to v${release.version}`} size="sm" variant="ghost" />
                  </div>
                  <p className="text-pretty text-pui-muted-foreground">{release.summary}</p>
                  <ul className="flex flex-col gap-2">
                    {changes.map((change) => (
                      <li key={change.text} className="flex items-start gap-3 text-sm">
                        <Badge size="sm" variant="soft" tone={KIND_TONE[change.kind]} className="mt-px w-20 shrink-0 justify-center">
                          {KIND_LABEL[change.kind]}
                        </Badge>
                        <span>{change.text}</span>
                      </li>
                    ))}
                  </ul>
                </Reveal>
              </TimelineItem>
            );
          })}
        </Timeline>
      </div>
    </section>
  );
}
