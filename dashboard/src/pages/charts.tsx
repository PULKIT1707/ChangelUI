import { Badge, BarChart, cn, DotPattern } from "changelui";
import { springs } from "@pui-src/lib/motion";
import { usePrefersReducedMotion } from "@pui-src/lib/use-reduced-motion";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { BentoGrid, PlayAllSwitch } from "../components/bento-grid";
import { CategoryTiles } from "../components/category-tiles";
import { PlayAllContext } from "../components/lazy-mini";
import { CHART_CATALOG, CHART_INTENTS, intentInfo, type ChartIntent } from "../lib/chart-catalog";
import { CATEGORY_BLURBS } from "../lib/tags";
import { registry } from "../registry";
import type { RegistryEntry } from "../registry/types";
import { chartsHref, homeHref, itemHref, navigate } from "../router";

export interface ChartsPageProps {
  /** The chooser intent from `#/charts?intent=`, or null for every chart. */
  intent: ChartIntent | null;
}

interface ChartRow {
  slug: string;
  title: string;
  intents: readonly ChartIntent[];
  use: string;
  /** The registry entry once the chart is live. */
  entry: RegistryEntry | undefined;
}

/** Catalog rows joined with the registry; live charts the catalog does not know yet are appended. */
function useChartRows(): ChartRow[] {
  return useMemo(() => {
    const live = registry.filter((entry) => entry.category === "charts");
    const bySlug = new Map(live.map((entry) => [entry.slug, entry]));
    const rows: ChartRow[] = CHART_CATALOG.map((row) => {
      const entry = bySlug.get(row.slug);
      return { ...row, title: entry?.title ?? row.title, entry };
    });
    const known = new Set(CHART_CATALOG.map((row) => row.slug));
    for (const entry of live) {
      if (!known.has(entry.slug)) rows.push({ slug: entry.slug, title: entry.title, intents: [], use: entry.description, entry });
    }
    return rows;
  }, []);
}

const chipClass =
  "relative isolate inline-flex h-8 shrink-0 items-center gap-1.5 rounded-pui-full border px-3 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pui-ring";

/**
 * Single-select chip row (a radiogroup with roving focus). Arrow keys move and select, Home/End jump,
 * and the active pill glides between chips.
 */
function IntentChips({
  value,
  counts,
  onChange,
}: {
  value: ChartIntent | null;
  counts: Record<ChartIntent | "all", { live: number; total: number }>;
  onChange: (next: ChartIntent | null) => void;
}) {
  const reduced = usePrefersReducedMotion();
  const groupRef = useRef<HTMLDivElement>(null);
  const options: { id: ChartIntent | null; label: string }[] = [
    { id: null, label: "All" },
    ...CHART_INTENTS.map((intent) => ({ id: intent.id, label: intent.label })),
  ];
  const activeIndex = Math.max(0, options.findIndex((option) => option.id === value));

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const last = options.length - 1;
    let next: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") next = activeIndex === last ? 0 : activeIndex + 1;
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = activeIndex === 0 ? last : activeIndex - 1;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = last;
    if (next === null) return;
    event.preventDefault();
    const option = options[next];
    if (!option) return;
    onChange(option.id);
    groupRef.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[next]?.focus();
  };

  return (
    <LayoutGroup id="chart-intents">
      <div ref={groupRef} role="radiogroup" aria-label="What do you want to show?" onKeyDown={onKeyDown} className="flex flex-wrap gap-2">
        {options.map((option, index) => {
          const checked = index === activeIndex;
          const count = counts[option.id ?? "all"];
          return (
            <button
              key={option.id ?? "all"}
              type="button"
              role="radio"
              aria-checked={checked}
              tabIndex={checked ? 0 : -1}
              onClick={() => onChange(option.id)}
              className={cn(
                chipClass,
                checked
                  ? "border-transparent text-pui-primary-foreground"
                  : "border-pui-border text-pui-muted-foreground hover:border-pui-ring/40 hover:text-pui-foreground",
              )}
            >
              {checked ? (
                <motion.span
                  layoutId="chart-intent-pill"
                  aria-hidden="true"
                  transition={reduced ? { duration: 0 } : springs.snappy}
                  className="absolute inset-0 -z-10 rounded-pui-full bg-pui-primary shadow-pui-sm"
                />
              ) : null}
              <span>{option.label}</span>
              <span className={cn("text-xs tabular-nums", checked ? "text-pui-primary-foreground/80" : "text-pui-muted-foreground")}>
                {count.live}
                <span aria-hidden="true">/</span>
                <span className="sr-only"> live of </span>
                {count.total}
              </span>
            </button>
          );
        })}
      </div>
    </LayoutGroup>
  );
}

interface CoverageRow {
  id: ChartIntent;
  label: string;
  live: number;
  soon: number;
}

/** The chooser as a chart: live vs on-the-way charts per job. Clicking (or Enter on) a bar picks that job. */
function CoverageChart({ rows, onPick }: { rows: readonly ChartRow[]; onPick: (intent: ChartIntent) => void }) {
  const data = useMemo<CoverageRow[]>(
    () =>
      CHART_INTENTS.map((intent) => {
        const matching = rows.filter((row) => row.intents.includes(intent.id));
        const live = matching.filter((row) => row.entry !== undefined).length;
        return { id: intent.id, label: intent.label, live, soon: matching.length - live };
      }),
    [rows],
  );
  return (
    <BarChart
      title="Charts by job"
      description="Live now vs on the way. Click a bar to filter."
      titleAs="h2"
      data={data}
      x="label"
      layout="horizontal"
      mode="stacked"
      height={360}
      radius={5}
      legend="bottom"
      tooltip="axis"
      margin={{ left: 132 }}
      series={[
        { id: "live", y: "live", label: "Live now", color: "var(--pui-chart-1)" },
        { id: "soon", y: "soon", label: "On the way", color: "var(--pui-chart-3)" },
      ]}
      onItemClick={(_item, datum) => onPick(datum.id)}
      formatAnnouncement={({ index }) => {
        const row = data[index];
        return row ? `${row.label}: ${row.live} live, ${row.soon} on the way. Press Enter to filter.` : "";
      }}
    />
  );
}

function GuideRow({ row, current, reduced }: { row: ChartRow; current: ChartIntent | null; reduced: boolean }) {
  const live = row.entry !== undefined;
  return (
    <motion.li
      layout={!reduced}
      initial={reduced ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduced ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, scale: 0.98 }}
      transition={reduced ? { duration: 0 } : springs.smooth}
      className={cn(
        "group relative flex flex-col gap-1.5 rounded-pui-lg border p-4 transition-colors",
        live
          ? "border-pui-border bg-pui-surface hover:border-pui-ring/50 hover:shadow-pui-sm"
          : "border-dashed border-pui-border bg-pui-muted/30",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        {live && row.entry ? (
          <a
            href={itemHref("charts", row.slug)}
            className="rounded-pui-sm text-sm font-semibold text-pui-surface-foreground after:absolute after:inset-0 after:rounded-pui-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pui-ring"
          >
            {row.title}
          </a>
        ) : (
          <span className="text-sm font-semibold text-pui-muted-foreground">{row.title}</span>
        )}
        {live ? (
          <Badge size="sm" variant="soft" tone="success">
            Live
          </Badge>
        ) : (
          <Badge size="sm" variant="outline" tone="neutral">
            Soon
          </Badge>
        )}
      </div>
      <p className="text-pretty text-sm text-pui-muted-foreground">{row.use}</p>
      {row.intents.length > 0 ? (
        <ul aria-label="Also good for" className="relative z-10 mt-1 flex flex-wrap gap-1.5">
          {row.intents.map((id) => (
            <li key={id}>
              <a
                href={chartsHref(id)}
                aria-current={id === current ? "true" : undefined}
                className={cn(
                  "rounded-pui-full px-2 py-0.5 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pui-ring",
                  id === current ? "bg-pui-primary/12 text-pui-primary-text" : "bg-pui-muted text-pui-muted-foreground hover:text-pui-foreground",
                )}
              >
                {intentInfo(id).label}
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </motion.li>
  );
}

/**
 * `#/charts` (charts-roadmap 8.1): the chart chooser. Pick a job ("Compare categories",
 * "Distribution", ...) from the chips or the coverage chart, see the live charts for it as gallery
 * cards, and read one line on when to use each chart, including the ones still on the way.
 */
export function ChartsPage({ intent }: ChartsPageProps) {
  const reduced = usePrefersReducedMotion();
  const [playAll, setPlayAll] = useState(false);
  const rows = useChartRows();

  const counts = useMemo(() => {
    const tally = (list: readonly ChartRow[]) => ({ live: list.filter((row) => row.entry).length, total: list.length });
    const result = { all: tally(rows) } as Record<ChartIntent | "all", { live: number; total: number }>;
    for (const { id } of CHART_INTENTS) result[id] = tally(rows.filter((row) => row.intents.includes(id)));
    return result;
  }, [rows]);

  const matching = intent === null ? rows : rows.filter((row) => row.intents.includes(intent));
  const liveEntries = matching.flatMap((row) => (row.entry ? [row.entry] : []));
  // Live first, then the ones on the way, each in catalog order.
  const guide = [...matching.filter((row) => row.entry), ...matching.filter((row) => !row.entry)];
  const info = intent === null ? null : intentInfo(intent);
  const soonCount = matching.length - liveEntries.length;
  const pick = (next: ChartIntent | null) => navigate(chartsHref(next));

  return (
    <div className="flex flex-col gap-12 pb-16">
      <section className="relative isolate overflow-hidden border-b border-pui-border px-4 pb-10 pt-10 sm:px-8 sm:pt-14">
        <DotPattern mask="none" className="-z-10 text-pui-muted-foreground/40 [mask-image:radial-gradient(55%_75%_at_85%_10%,black,transparent)]" />
        <div className="grid items-center gap-10 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div>
            <nav aria-label="Breadcrumb" className="mb-4 text-sm text-pui-muted-foreground">
              <ol className="flex items-center gap-1.5">
                <li>
                  <a href={homeHref()} className="rounded-pui-sm hover:text-pui-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pui-ring">
                    Home
                  </a>
                </li>
                <li aria-hidden="true">/</li>
                <li aria-current="page" className="text-pui-foreground">
                  Charts
                </li>
              </ol>
            </nav>
            <h1 tabIndex={-1} className="text-3xl font-bold tracking-tight text-balance outline-none sm:text-4xl">
              Charts
            </h1>
            <p className="mt-3 max-w-xl text-pretty text-pui-muted-foreground sm:text-lg">
              {CATEGORY_BLURBS.charts} Start from what you want to show, and the chooser points you to the right chart.
            </p>
            <dl className="mt-6 flex flex-wrap gap-3 text-sm">
              <div className="flex items-center gap-2 rounded-pui-full border border-pui-border bg-pui-surface px-3 py-1.5">
                <span aria-hidden="true" className="relative flex size-2">
                  <span className="absolute inline-flex size-full rounded-full bg-pui-success opacity-60 motion-safe:animate-ping" />
                  <span className="relative inline-flex size-2 rounded-full bg-pui-success" />
                </span>
                <dt className="text-pui-muted-foreground">Live</dt>
                <dd className="font-semibold tabular-nums">{counts.all.live}</dd>
              </div>
              <div className="flex items-center gap-2 rounded-pui-full border border-pui-border bg-pui-surface px-3 py-1.5">
                <dt className="text-pui-muted-foreground">On the way</dt>
                <dd className="font-semibold tabular-nums">{counts.all.total - counts.all.live}</dd>
              </div>
              <div className="flex items-center gap-2 rounded-pui-full border border-pui-border bg-pui-surface px-3 py-1.5">
                <dt className="text-pui-muted-foreground">Jobs</dt>
                <dd className="font-semibold tabular-nums">{CHART_INTENTS.length}</dd>
              </div>
            </dl>
          </div>
          <div className="min-w-0 rounded-pui-xl border border-pui-border bg-pui-surface p-4 shadow-pui-sm sm:p-5">
            <CoverageChart rows={rows} onPick={pick} />
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-12 px-4 sm:px-8">
        <section aria-labelledby="chooser-heading" className="flex flex-col gap-4">
          <div>
            <h2 id="chooser-heading" className="text-xl font-semibold tracking-tight">
              What do you want to show?
            </h2>
            <p aria-live="polite" className="mt-1 min-h-5 text-sm text-pui-muted-foreground">
              {info ? `${info.blurb} ` : "Every chart in the suite. "}
              <span className="tabular-nums">
                {liveEntries.length} live{soonCount > 0 ? `, ${soonCount} on the way` : ""}.
              </span>
            </p>
          </div>
          <IntentChips value={intent} counts={counts} onChange={pick} />
        </section>

        <section aria-labelledby="live-heading">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
            <h2 id="live-heading" className="text-xl font-semibold tracking-tight">
              Live now
              <span className="ms-2 text-sm font-normal tabular-nums text-pui-muted-foreground">{liveEntries.length}</span>
            </h2>
            {liveEntries.length > 0 ? <PlayAllSwitch checked={playAll} onCheckedChange={setPlayAll} /> : null}
          </div>
          {liveEntries.length > 0 ? (
            <PlayAllContext.Provider value={playAll}>
              <BentoGrid items={liveEntries} label={info ? `Live charts for ${info.label.toLowerCase()}` : "Live charts"} showCategory={false} />
            </PlayAllContext.Provider>
          ) : (
            <p className="rounded-pui-xl border border-dashed border-pui-border px-6 py-10 text-center text-sm text-pui-muted-foreground">
              Nothing live for this job yet. {soonCount} {soonCount === 1 ? "chart is" : "charts are"} on the way, listed below.
            </p>
          )}
        </section>

        <section aria-labelledby="guide-heading">
          <div className="mb-4">
            <h2 id="guide-heading" className="text-xl font-semibold tracking-tight">
              Which chart?
            </h2>
            <p className="mt-1 text-sm text-pui-muted-foreground">
              One line on when to reach for each chart{info ? ` that helps with ${info.label.toLowerCase()}` : ""}. Tags jump to another job.
            </p>
          </div>
          <ul aria-label="Chart guide" className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
            <AnimatePresence mode="popLayout" initial={false}>
              {guide.map((row) => (
                <GuideRow key={row.slug} row={row} current={intent} reduced={reduced} />
              ))}
            </AnimatePresence>
          </ul>
        </section>

        <section aria-labelledby="more-categories" className="border-t border-pui-border pt-10">
          <h2 id="more-categories" className="mb-4 text-xl font-semibold tracking-tight">
            Keep exploring
          </h2>
          <CategoryTiles exclude="charts" />
        </section>
      </div>
    </div>
  );
}
