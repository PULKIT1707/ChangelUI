import { GridPattern, SegmentedControl, SegmentedControlItem } from "changelui";
import { useState } from "react";
import type { Category } from "../../../scripts/entries";
import { BentoGrid, PlayAllSwitch } from "../components/bento-grid";
import { CategoryTiles } from "../components/category-tiles";
import { PlayAllContext } from "../components/lazy-mini";
import { CATEGORY_LABELS } from "../lib/nav";
import { CATEGORY_BLURBS, groupByTag, tagSlug } from "../lib/tags";
import { registry } from "../registry";
import { categoryHref, homeHref, navigate } from "../router";

export interface CategoryPageProps {
  category: Category;
  /** A tag slug from the route, or null for every tag. */
  tag: string | null;
}

/**
 * `#/<category>` (roadmap I-4): the category gallery with tag chips. "All" shows one section per tag
 * (off-screen sections skip layout and paint through content-visibility); a chip narrows it to one tag.
 */
export function CategoryPage({ category, tag }: CategoryPageProps) {
  const [playAll, setPlayAll] = useState(false);
  const items = registry.filter((entry) => entry.category === category);
  const groups = groupByTag(category, items);
  const selected = groups.find((group) => tagSlug(group.tag) === tag) ?? null;
  const label = CATEGORY_LABELS[category];
  const shown = selected ? selected.items.length : items.length;

  return (
    <div className="flex flex-col gap-10 pb-16">
      <section className="relative isolate overflow-hidden border-b border-pui-border px-4 pb-10 pt-10 sm:px-8 sm:pt-14">
        <GridPattern mask="none" className="-z-10 [mask-image:radial-gradient(60%_80%_at_15%_0%,black,transparent)]" />
        <nav aria-label="Breadcrumb" className="mb-4 text-sm text-pui-muted-foreground">
          <ol className="flex items-center gap-1.5">
            <li>
              <a href={homeHref()} className="rounded-pui-sm hover:text-pui-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pui-ring">
                Home
              </a>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="text-pui-foreground">
              {label}
            </li>
          </ol>
        </nav>
        <h1 tabIndex={-1} className="text-3xl font-bold tracking-tight text-balance outline-none sm:text-4xl">
          {label}
        </h1>
        <p className="mt-3 max-w-2xl text-pretty text-pui-muted-foreground sm:text-lg">{CATEGORY_BLURBS[category]}</p>
        <p className="mt-2 text-sm tabular-nums text-pui-muted-foreground">
          {items.length} {items.length === 1 ? "item" : "items"} in {groups.length} {groups.length === 1 ? "group" : "groups"}
        </p>
      </section>

      <div className="flex flex-col gap-10 px-4 sm:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="-mx-4 min-w-0 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
            <SegmentedControl
              aria-label={`Filter ${label.toLowerCase()} by group`}
              value={selected ? tagSlug(selected.tag) : "all"}
              onValueChange={(next) => navigate(categoryHref(category, next === "all" ? null : next))}
              size="sm"
            >
              <SegmentedControlItem value="all">
                All <span className="ms-1 tabular-nums text-pui-muted-foreground">{items.length}</span>
              </SegmentedControlItem>
              {groups.map((group) => (
                <SegmentedControlItem key={group.tag} value={tagSlug(group.tag)}>
                  {group.tag} <span className="ms-1 tabular-nums text-pui-muted-foreground">{group.items.length}</span>
                </SegmentedControlItem>
              ))}
            </SegmentedControl>
          </div>
          <div className="flex shrink-0 items-center gap-4">
            <p aria-live="polite" className="text-sm tabular-nums text-pui-muted-foreground">
              {shown} {shown === 1 ? "item" : "items"}
            </p>
            <PlayAllSwitch checked={playAll} onCheckedChange={setPlayAll} />
          </div>
        </div>

        <PlayAllContext.Provider value={playAll}>
          {selected ? (
            <BentoGrid items={selected.items} label={`${selected.tag} ${label.toLowerCase()}`} showCategory={false} />
          ) : (
            groups.map((group) => {
              const id = `group-${tagSlug(group.tag)}`;
              return (
                <section
                  key={group.tag}
                  aria-labelledby={id}
                  className="[contain-intrinsic-size:auto_600px] [content-visibility:auto]"
                >
                  <div className="mb-4 flex items-baseline justify-between gap-3">
                    <h2 id={id} className="text-xl font-semibold tracking-tight">
                      {group.tag}
                      <span className="ms-2 text-sm font-normal tabular-nums text-pui-muted-foreground">{group.items.length}</span>
                    </h2>
                    {groups.length > 1 ? (
                      <a
                        href={categoryHref(category, tagSlug(group.tag))}
                        className="rounded-pui-sm text-sm text-pui-primary-text hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pui-ring"
                      >
                        Only {group.tag.toLowerCase()}
                      </a>
                    ) : null}
                  </div>
                  <BentoGrid items={group.items} label={`${group.tag} ${label.toLowerCase()}`} showCategory={false} />
                </section>
              );
            })
          )}
        </PlayAllContext.Provider>

        <section aria-labelledby="more-categories" className="border-t border-pui-border pt-10">
          <h2 id="more-categories" className="mb-4 text-xl font-semibold tracking-tight">
            Keep exploring
          </h2>
          <CategoryTiles exclude={category} />
        </section>
      </div>
    </div>
  );
}
