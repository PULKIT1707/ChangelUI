import { Badge, SpotlightCard } from "changelui";
import { useState } from "react";
import { CATEGORY_SHORT } from "../lib/nav";
import type { RegistryEntry } from "../registry/types";
import { itemHref } from "../router";
import { LazyMini } from "./lazy-mini";

/**
 * One bento tile: a single link around a SpotlightCard (design 10.3). Hover or keyboard focus wakes
 * its poster-mode mini.
 */
export function BentoCard({ entry, showCategory = true }: { entry: RegistryEntry; showCategory?: boolean }) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  return (
    <a
      href={itemHref(entry.category, entry.slug)}
      data-testid="bento-card"
      data-slug={entry.slug}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse" || event.pointerType === "pen") setHovered(true);
      }}
      onPointerLeave={() => setHovered(false)}
      onFocus={(event) => setFocused(event.currentTarget.matches(":focus-visible"))}
      onBlur={() => setFocused(false)}
      className="group block h-full rounded-pui-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pui-ring"
    >
      <SpotlightCard className="flex h-full flex-col gap-3 rounded-pui-xl border border-pui-border bg-pui-surface p-4 transition-shadow duration-(--pui-duration-base) group-hover:shadow-pui-md">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-semibold text-pui-surface-foreground">{entry.title}</span>
          {showCategory ? (
            <Badge size="sm" variant="soft" tone="neutral">
              {CATEGORY_SHORT[entry.category]}
            </Badge>
          ) : null}
        </div>
        <LazyMini slug={entry.slug} load={entry.load} active={hovered || focused} replayOnPlay={entry.replayable} />
      </SpotlightCard>
    </a>
  );
}
