import {
  Badge,
  Button,
  CopyButton,
  DotPattern,
  NumberTicker,
  SegmentedControl,
  SegmentedControlItem,
  TextShimmer,
  WordRotate,
} from "changelui";
import { useState } from "react";
import { CATEGORIES } from "../../../scripts/entries";
import { BentoGrid, PlayAllSwitch } from "../components/bento-grid";
import { CategoryTiles } from "../components/category-tiles";
import { PlayAllContext } from "../components/lazy-mini";
import { PickCard } from "../components/pick-card";
import { SparkleIcon } from "../components/sparkle-icon";
import { analytics } from "../lib/analytics/client";
import { CATEGORY_SHORT, INSTALL_COMMAND } from "../lib/nav";
import { creativeItems, FEATURED_PICKS, hookFor, PICKS_TITLE } from "../lib/picks";
import { registry } from "../registry";
import type { RegistryMeta } from "../registry/types";
import { templateMeta } from "../registry/templates";
import { categoryHref, docHref, FILTERS, homeHref, navigate, picksHref, templatesHref, type Filter } from "../router";

const count = (category: RegistryMeta["category"]) => registry.filter((entry) => entry.category === category).length;
const STAT_LABELS: Record<RegistryMeta["category"], string> = {
  components: "components",
  text: "text effects",
  effects: "motion effects",
  backgrounds: "backgrounds",
  charts: "charts",
  hooks: "hooks & utils",
};
const stats = CATEGORIES.filter((category) => count(category) > 0).map((category) => ({
  value: count(category),
  label: STAT_LABELS[category],
}));

const pickCount = creativeItems(registry).length;
/** The first three featured picks, teased on home in poster mode. */
const teaserPicks = FEATURED_PICKS.slice(0, 3).flatMap((slug) => registry.filter((entry) => entry.slug === slug));

/** Categories without items yet (a newly added one) get no filter chip. */
const VISIBLE_FILTERS = FILTERS.filter((value) => value === "all" || count(value) > 0);

export function Home({ filter }: { filter: Filter }) {
  const [playAll, setPlayAll] = useState(false);
  const items = filter === "all" ? registry : registry.filter((entry) => entry.category === filter);
  return (
    <div className="flex flex-col gap-12 pb-16">
      <section className="relative isolate overflow-hidden border-b border-pui-border px-4 pb-14 pt-16 sm:px-8 sm:pt-20">
        <DotPattern mask="radial" className="-z-10" />
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
          <TextShimmer as="p" className="text-sm font-medium">
            React · TypeScript · Tailwind CSS · Motion
          </TextShimmer>
          <h1 tabIndex={-1} className="text-4xl font-bold tracking-tight text-balance outline-none sm:text-5xl lg:text-6xl">
            Tiny, accessible React{" "}
            <WordRotate words={["components", "effects", "motion"]} className="text-pui-primary-text" />
          </h1>
          <p className="max-w-xl text-pretty text-base text-pui-muted-foreground sm:text-lg">
            {registry.length} small, import-friendly pieces. Use the package, import one subpath, or copy a single file.
          </p>
          <div className="flex w-full max-w-md items-center gap-2 rounded-pui-lg border border-pui-border bg-pui-surface py-1.5 pe-1.5 ps-4 text-left font-mono text-sm">
            <span aria-hidden="true" className="select-none text-pui-muted-foreground">
              $
            </span>
            <code className="min-w-0 flex-1 truncate">{INSTALL_COMMAND}</code>
            <CopyButton
              value={INSTALL_COMMAND}
              label="Copy install command"
              size="sm"
              variant="ghost"
              tone="neutral"
              onCopied={() => analytics.track("install_command_copied", { surface: "home" })}
            />
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <a href={categoryHref("components")}>Browse components</a>
            </Button>
            <Button asChild size="lg" variant="outline" tone="neutral">
              <a href={templatesHref()}>
                Templates
                <span className="rounded-pui-sm bg-pui-muted px-1.5 text-xs tabular-nums text-pui-muted-foreground">{templateMeta.length}</span>
              </a>
            </Button>
            <Button asChild size="lg" variant="ghost" tone="neutral">
              <a href={docHref("installation")}>Get started</a>
            </Button>
          </div>
          <dl className="mt-4 grid w-full grid-cols-3 gap-4 sm:grid-cols-6">
            {stats.map((stat) => (
              <div key={stat.label} className="flex flex-col items-center gap-0.5">
                <dt className="order-2 text-xs text-pui-muted-foreground">{stat.label}</dt>
                <dd className="order-1 text-3xl font-bold tabular-nums">
                  <NumberTicker value={stat.value} />
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section aria-labelledby="picks-teaser-heading" className="px-4 sm:px-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="picks-teaser-heading" className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
              <SparkleIcon className="size-5 text-pui-primary-text" />
              {PICKS_TITLE}
              <Badge tone="primary" size="sm">
                New
              </Badge>
            </h2>
            <p className="text-sm text-pui-muted-foreground">The showpieces we reach for first. Hover one to see it move.</p>
          </div>
          <Button asChild variant="outline" tone="neutral" className="self-start sm:self-auto">
            <a href={picksHref()}>Explore all {pickCount} picks</a>
          </Button>
        </div>
        <PlayAllContext.Provider value={false}>
          <ul aria-label="Featured picks" className="grid auto-rows-[220px] grid-cols-1 gap-4 md:grid-cols-3">
            {teaserPicks.map((entry, position) => (
              <li key={entry.slug}>
                <PickCard entry={entry} position={position} featured surface="home" hook={hookFor(entry)} />
              </li>
            ))}
          </ul>
        </PlayAllContext.Provider>
      </section>

      <section aria-labelledby="categories-heading" className="px-4 sm:px-8">
        <div className="mb-6">
          <h2 id="categories-heading" className="text-2xl font-semibold tracking-tight">
            Browse by category
          </h2>
          <p className="text-sm text-pui-muted-foreground">Every category has its own page, grouped by what the items do.</p>
        </div>
        <CategoryTiles />
      </section>

      <section id="gallery" aria-labelledby="gallery-heading" className="scroll-mt-20 px-4 sm:px-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="gallery-heading" className="text-2xl font-semibold tracking-tight">
              Gallery
            </h2>
            <p aria-live="polite" className="text-sm text-pui-muted-foreground" data-testid="gallery-count">
              {items.length} {items.length === 1 ? "item" : "items"}
            </p>
          </div>
          <div className="flex min-w-0 flex-col gap-3 sm:items-end">
            <div className="-mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
              <SegmentedControl
                aria-label="Filter the gallery"
                value={filter}
                onValueChange={(next) => navigate(homeHref(next as Filter))}
                size="sm"
              >
                {VISIBLE_FILTERS.map((value) => (
                  <SegmentedControlItem key={value} value={value}>
                    {value === "all" ? "All" : CATEGORY_SHORT[value]}
                  </SegmentedControlItem>
                ))}
              </SegmentedControl>
            </div>
            <PlayAllSwitch checked={playAll} onCheckedChange={setPlayAll} />
          </div>
        </div>
        <PlayAllContext.Provider value={playAll}>
          <BentoGrid items={items} label="Gallery items" />
        </PlayAllContext.Provider>
      </section>
    </div>
  );
}
