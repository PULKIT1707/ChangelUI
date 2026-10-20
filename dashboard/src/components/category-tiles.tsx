import { cn, SpotlightCard } from "changelui";
import type { ReactNode } from "react";
import { CATEGORIES, type Category } from "../../../scripts/entries";
import { CATEGORY_LABELS } from "../lib/nav";
import { CATEGORY_BLURBS, groupByTag } from "../lib/tags";
import { registry } from "../registry";
import { categoryHref } from "../router";

const iconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
  className: "size-5",
} as const;

/** Small line glyphs per category (decorative). */
const CATEGORY_ICONS: Record<Category, ReactNode> = {
  components: (
    <svg {...iconProps}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="3.5" />
      <rect x="3.5" y="13.5" width="17" height="7" rx="1.5" />
    </svg>
  ),
  text: (
    <svg {...iconProps}>
      <path d="M4 19 9 5l5 14M5.8 14h6.4" />
      <path d="M15.5 12.5a2.75 2.75 0 1 1 0 5.5 2.75 2.75 0 0 1 0-5.5Zm2.75 0V19" />
    </svg>
  ),
  effects: (
    <svg {...iconProps}>
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
      <path d="M12 8.5 13.2 10.8 15.5 12l-2.3 1.2L12 15.5l-1.2-2.3L8.5 12l2.3-1.2Z" />
      <path d="m5.6 5.6 1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4" />
    </svg>
  ),
  backgrounds: (
    <svg {...iconProps}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="3" />
      <path d="M3.5 9.5h17M3.5 14.5h17M9.5 3.5v17M14.5 3.5v17" opacity="0.55" />
    </svg>
  ),
  charts: (
    <svg {...iconProps}>
      <path d="M4 20h16" />
      <path d="M7 16v-4M12 16V7M17 16v-6" strokeWidth={2.5} />
    </svg>
  ),
  hooks: (
    <svg {...iconProps}>
      <path d="M8 4c-2 0-2.5 1-2.5 2.5v2c0 1.5-.8 2.5-2 3.5 1.2 1 2 2 2 3.5v2C5.5 19 6 20 8 20" />
      <path d="M16 4c2 0 2.5 1 2.5 2.5v2c0 1.5.8 2.5 2 3.5-1.2 1-2 2-2 3.5v2c0 1.5-.5 2.5-2.5 2.5" />
    </svg>
  ),
};

export interface CategoryTilesProps {
  /** Leave one category out (the current category page). */
  exclude?: Category;
  className?: string;
}

/** Category entry points for home and the category pages: label, count, blurb and top tags. */
export function CategoryTiles({ exclude, className }: CategoryTilesProps) {
  const categories = CATEGORIES.filter(
    (category) => category !== exclude && registry.some((entry) => entry.category === category),
  );
  return (
    <ul className={cn("grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3", className)}>
      {categories.map((category) => {
        const items = registry.filter((entry) => entry.category === category);
        const tags = groupByTag(category, items).slice(0, 4);
        return (
          <li key={category}>
            <a
              href={categoryHref(category)}
              className="group block h-full rounded-pui-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pui-ring"
            >
              <SpotlightCard className="flex h-full flex-col gap-3 rounded-pui-xl border border-pui-border bg-pui-surface p-5 transition-[box-shadow,translate] duration-(--pui-duration-base) ease-(--pui-ease-out) group-hover:-translate-y-0.5 group-hover:shadow-pui-md motion-reduce:group-hover:translate-y-0">
                <div className="flex items-center gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-pui-lg bg-pui-primary/10 text-pui-primary-text ring-1 ring-pui-primary/15 ring-inset">
                    {CATEGORY_ICONS[category]}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-semibold text-pui-surface-foreground">{CATEGORY_LABELS[category]}</span>
                    <span className="text-xs tabular-nums text-pui-muted-foreground">
                      {items.length} {items.length === 1 ? "item" : "items"}
                    </span>
                  </span>
                  <svg
                    viewBox="0 0 16 16"
                    aria-hidden="true"
                    className="size-4 shrink-0 text-pui-muted-foreground transition-transform duration-(--pui-duration-base) ease-(--pui-ease-out) group-hover:translate-x-0.5 group-hover:text-pui-foreground motion-reduce:transition-none"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.75}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 8h10M9 4l4 4-4 4" />
                  </svg>
                </div>
                <p className="text-pretty text-sm text-pui-muted-foreground">{CATEGORY_BLURBS[category]}</p>
                <ul aria-label="Groups" className="mt-auto flex flex-wrap gap-1.5">
                  {tags.map((group) => (
                    <li
                      key={group.tag}
                      className="rounded-pui-full border border-pui-border px-2 py-0.5 text-xs text-pui-muted-foreground"
                    >
                      {group.tag}
                    </li>
                  ))}
                </ul>
              </SpotlightCard>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
