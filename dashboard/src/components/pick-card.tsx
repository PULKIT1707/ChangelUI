import { Badge, cn, SpotlightCard } from "changelui";
import { useState } from "react";
import { analytics } from "../lib/analytics/client";
import type { PickSurface } from "../lib/analytics/events";
import { CATEGORY_SHORT } from "../lib/nav";
import type { RegistryEntry } from "../registry/types";
import { itemHref } from "../router";
import { LazyMini } from "./lazy-mini";
import { SparkleIcon } from "./sparkle-icon";

function ArrowIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="size-3.5 transition-transform duration-(--pui-duration-base) group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
    >
      <path d="M3 8h10M9 4l4 4-4 4" />
    </svg>
  );
}

export interface PickCardProps {
  entry: RegistryEntry;
  /** 0-based position in the visible list (analytics). */
  position: number;
  featured: boolean;
  surface: PickSurface;
  /** The one-line pitch under the preview. */
  hook: string;
}

/**
 * One Developer's Pick tile: a single link around a SpotlightCard with a live mini, the pick's hook
 * and an Explore cue. Hover or keyboard focus wakes a poster-mode mini, like BentoCard.
 */
export function PickCard({ entry, position, featured, surface, hook }: PickCardProps) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  return (
    <a
      href={itemHref(entry.category, entry.slug)}
      data-testid="pick-card"
      data-slug={entry.slug}
      data-featured={featured ? "true" : "false"}
      onClick={() =>
        analytics.track("devs_pick_card_clicked", { component: entry.slug, category: entry.category, position, featured, surface })
      }
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse" || event.pointerType === "pen") setHovered(true);
      }}
      onPointerLeave={() => setHovered(false)}
      onFocus={(event) => setFocused(event.currentTarget.matches(":focus-visible"))}
      onBlur={() => setFocused(false)}
      className="group block h-full rounded-pui-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pui-ring"
    >
      <SpotlightCard
        className={cn(
          "flex h-full flex-col gap-3 rounded-pui-xl border bg-pui-surface p-4 transition-shadow duration-(--pui-duration-base) group-hover:shadow-pui-md",
          featured ? "border-pui-primary/40" : "border-pui-border",
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <h3 className={cn("truncate font-semibold text-pui-surface-foreground", featured ? "text-base" : "text-sm")}>{entry.title}</h3>
          <div className="flex shrink-0 items-center gap-1.5">
            {featured ? (
              <Badge size="sm" variant="soft" tone="primary" className="gap-1">
                <SparkleIcon className="size-3" />
                Featured
              </Badge>
            ) : null}
            <Badge size="sm" variant="soft" tone="neutral">
              {CATEGORY_SHORT[entry.category]}
            </Badge>
          </div>
        </div>
        <LazyMini slug={entry.slug} load={entry.load} active={hovered || focused} replayOnPlay={entry.replayable} />
        <div className="flex items-end justify-between gap-3">
          <p className="line-clamp-2 min-w-0 text-xs text-pui-muted-foreground sm:text-sm">{hook}</p>
          <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-pui-primary-text">
            Explore
            <ArrowIcon />
          </span>
        </div>
      </SpotlightCard>
    </a>
  );
}
