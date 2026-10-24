import {
  AuroraBackground,
  Button,
  GradientText,
  SegmentedControl,
  SegmentedControlItem,
  TextShimmer,
} from "changelui";
import { usePrefersReducedMotion } from "@pui-src/lib/use-reduced-motion";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { PlayAllSwitch, spanClasses } from "../components/bento-grid";
import { PlayAllContext } from "../components/lazy-mini";
import { PickCard } from "../components/pick-card";
import { SparkleIcon } from "../components/sparkle-icon";
import { analytics } from "../lib/analytics/client";
import { CATEGORY_SHORT } from "../lib/nav";
import {
  creativeItems,
  filterPicks,
  hookFor,
  isFeatured,
  orderPicks,
  PICK_FILTERS,
  pickRandom,
  PICKS_TAGLINE,
  PICKS_TITLE,
} from "../lib/picks";
import { registry } from "../registry";
import { homeHref, itemHref, navigate, picksHref, type Filter } from "../router";

const picks = orderPicks(creativeItems(registry));
const categoryCount = PICK_FILTERS.length - 1;
// The last word of the title gets the gradient; the accessible text stays exactly PICKS_TITLE.
const titleSplit = PICKS_TITLE.lastIndexOf(" ") + 1;
const TITLE_LEAD = PICKS_TITLE.slice(0, titleSplit);
const TITLE_LAST = PICKS_TITLE.slice(titleSplit);

function DiceIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" aria-hidden="true" className="size-4">
      <rect x="2" y="2" width="12" height="12" rx="2.5" />
      <circle cx="5.5" cy="5.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="10.5" cy="10.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="8" cy="8" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

/**
 * Developer's Pick (#/picks): a curated showcase of the creative items (lib/picks.ts) with live
 * previews, featured hero tiles, category chips and a Surprise me button. Previews animate unless
 * the OS asks for reduced motion; "Animate all" is the pause control.
 */
export function PicksPage({ filter }: { filter: Filter }) {
  const reduced = usePrefersReducedMotion();
  const [playToggle, setPlayToggle] = useState<boolean | null>(null);
  const playAll = playToggle ?? !reduced;
  const visible = filterPicks(picks, filter);

  const changeFilter = (next: Filter) => {
    if (next === filter) return;
    analytics.track("devs_pick_filter_changed", { category: next });
    navigate(picksHref(next));
  };

  const surprise = () => {
    const pick = pickRandom(visible);
    if (!pick) return;
    analytics.track("devs_pick_surprise_clicked", { component: pick.slug, category: pick.category, filter });
    navigate(itemHref(pick.category, pick.slug));
  };

  return (
    <div className="flex flex-col gap-10 pb-16">
      <section aria-labelledby="picks-heading" className="relative isolate overflow-hidden border-b border-pui-border px-4 pb-12 pt-10 sm:px-8 sm:pt-14">
        <AuroraBackground intensity="subtle" className="-z-10" />
        <nav aria-label="Breadcrumb" className="mb-4 text-sm text-pui-muted-foreground">
          <ol className="flex items-center gap-1.5">
            <li>
              <a href={homeHref()} className="rounded-pui-sm hover:text-pui-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pui-ring">
                Home
              </a>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="text-pui-foreground">
              {PICKS_TITLE}
            </li>
          </ol>
        </nav>
        <div className="flex max-w-3xl flex-col gap-4">
          <TextShimmer as="p" className="text-sm font-medium">
            Curated showcase · live previews
          </TextShimmer>
          <h1 id="picks-heading" tabIndex={-1} className="text-4xl font-bold tracking-tight text-balance outline-none sm:text-5xl">
            {TITLE_LEAD}
            <GradientText>{TITLE_LAST}</GradientText>
          </h1>
          <p className="max-w-2xl text-pretty text-base text-pui-muted-foreground sm:text-lg">
            {PICKS_TAGLINE} Text that dances, effects that react to you and backgrounds that set the mood, all one import away.
          </p>
          <p className="text-sm tabular-nums text-pui-muted-foreground">
            {picks.length} creative picks across {categoryCount} categories
          </p>
          <div className="mt-2 flex flex-wrap gap-3">
            <Button size="lg" onClick={surprise} leadingIcon={<DiceIcon />}>
              Surprise me
            </Button>
            <Button asChild size="lg" variant="outline" tone="neutral">
              <a href={homeHref()}>Full gallery</a>
            </Button>
          </div>
        </div>
      </section>

      <section aria-labelledby="picks-gallery-heading" className="px-4 sm:px-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="picks-gallery-heading" className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
              <SparkleIcon className="size-5 text-pui-primary-text" />
              The picks
            </h2>
            <p aria-live="polite" className="text-sm text-pui-muted-foreground" data-testid="picks-count">
              {visible.length} {visible.length === 1 ? "pick" : "picks"}
            </p>
          </div>
          <div className="flex min-w-0 flex-col gap-3 sm:items-end">
            <div className="-mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
              <SegmentedControl aria-label="Filter the picks" value={filter} onValueChange={(next) => changeFilter(next as Filter)} size="sm">
                {PICK_FILTERS.map((value) => (
                  <SegmentedControlItem key={value} value={value}>
                    {value === "all" ? "All" : CATEGORY_SHORT[value]}
                  </SegmentedControlItem>
                ))}
              </SegmentedControl>
            </div>
            <PlayAllSwitch checked={playAll} onCheckedChange={setPlayToggle} />
          </div>
        </div>
        <PlayAllContext.Provider value={playAll}>
          <ul
            aria-label="Developer's picks"
            className="grid auto-rows-[200px] grid-flow-dense grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            <AnimatePresence mode="popLayout" initial={false}>
              {visible.map((entry, position) => {
                const featured = isFeatured(entry.slug);
                return (
                  <motion.li
                    key={entry.slug}
                    layout
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ type: "spring", stiffness: 400, damping: 35 }}
                    className={featured ? "sm:col-span-2 row-span-2" : spanClasses[entry.span ?? "1x1"]}
                  >
                    <PickCard entry={entry} position={position} featured={featured} surface="picks" hook={hookFor(entry)} />
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        </PlayAllContext.Provider>
      </section>
    </div>
  );
}
