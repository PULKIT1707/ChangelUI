import { cn, Switch } from "changelui";
import { AnimatePresence, motion } from "motion/react";
import { useId } from "react";
import type { RegistryEntry, RegistryMeta } from "../registry/types";
import { BentoCard } from "./bento-card";

/** Literal span classes (never built dynamically). */
const spanClasses: Record<NonNullable<RegistryMeta["span"]>, string> = {
  "1x1": "",
  "2x1": "sm:col-span-2",
  "1x2": "row-span-2",
  "2x2": "sm:col-span-2 row-span-2",
};

export interface BentoGridProps {
  items: readonly RegistryEntry[];
  label: string;
  /** Hide the per-card category badge (category pages, where it is redundant). */
  showCategory?: boolean;
  className?: string;
}

/**
 * The bento gallery grid shared by home and the category pages. Filter changes animate with a
 * popLayout spring.
 */
export function BentoGrid({ items, label, showCategory = true, className }: BentoGridProps) {
  return (
    <ul
      aria-label={label}
      className={cn(
        "grid auto-rows-[180px] grid-flow-dense grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
        className,
      )}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        {items.map((entry) => (
          <motion.li
            key={entry.slug}
            layout
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 400, damping: 35 }}
            className={spanClasses[entry.span ?? "1x1"]}
          >
            <BentoCard entry={entry} showCategory={showCategory} />
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}

/** "Animate all" switch: turns poster mode off for the gallery (minis still only run near the viewport). */
export function PlayAllSwitch({ checked, onCheckedChange }: { checked: boolean; onCheckedChange: (next: boolean) => void }) {
  const id = useId();
  return (
    <div className="flex items-center gap-2">
      <Switch id={id} size="sm" checked={checked} onCheckedChange={onCheckedChange} />
      <label htmlFor={id} className="cursor-pointer select-none text-sm text-pui-muted-foreground">
        Animate all
      </label>
    </div>
  );
}
