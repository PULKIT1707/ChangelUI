"use client";
import { AnimatePresence, motion } from "motion/react";
import * as React from "react";
import { useControllableState } from "../hooks/use-controllable-state";
import { cn } from "../lib/cn";
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, ExternalLinkIcon } from "../lib/icons";
import { djb2 } from "../lib/ids";
import { easings } from "../lib/motion";
import { blockReset, controlReset, focusRing, listReset } from "../lib/styles";
import { toneClasses } from "../lib/tone";
import type { Tone } from "../lib/types";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "./hover-card";

export interface CitationSource {
  title: string;
  url: string;
  /** The passage the claim relies on, shown as a quote in the preview. */
  snippet?: string;
  /** Default: the URL's host without "www.". */
  site?: string;
  /** Small square image (favicon). Default: a lettered mark tinted from the site name. */
  icon?: string;
  /** Free text, e.g. "Mar 4, 2026". */
  date?: string;
}

export interface InlineCitationProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
  /** One source, or several backing the same claim (the preview pages through them). */
  source: CitationSource | readonly CitationSource[];
  /** Number shown in the chip, e.g. 1 for [1]. Default: the site name is shown instead. */
  index?: number;
  /** Delay before the preview opens on hover or keyboard focus. Default 200 ms. */
  openDelayMs?: number;
}

export interface SourcesProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onToggle"> {
  sources: readonly CitationSource[];
  open?: boolean;
  /** Default false. */
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Button text. Default `Used ${count} sources`. */
  label?: (count: number) => React.ReactNode;
}

/** Host without "www.", or the raw string for invalid URLs. */
export function citationSite(source: CitationSource): string {
  if (source.site) return source.site;
  try {
    return new URL(source.url).hostname.replace(/^www\./, "");
  } catch {
    return source.url;
  }
}

const isSourceList = (value: CitationSource | readonly CitationSource[]): value is readonly CitationSource[] => Array.isArray(value);

const MARK_TONES: Tone[] = ["primary", "info", "success", "warning", "danger"];

function SiteMark({ source, className }: { source: CitationSource; className?: string }) {
  const site = citationSite(source);
  if (source.icon) {
    return <img src={source.icon} alt="" aria-hidden="true" className={cn(blockReset, "block shrink-0 rounded-pui-sm bg-pui-muted object-cover", className)} />;
  }
  const tone = MARK_TONES[djb2(site) % MARK_TONES.length] ?? "primary";
  return (
    <span
      aria-hidden="true"
      className={cn(
        blockReset,
        toneClasses[tone],
        "flex shrink-0 items-center justify-center rounded-pui-sm bg-(--pui-tone)/15 font-semibold text-(--pui-tone-text) uppercase",
        className,
      )}
    >
      {site.charAt(0)}
    </span>
  );
}

/**
 * Citation chip for AI answers and articles. Sits inline after a claim, links to the source and
 * previews it on hover or keyboard focus: site, title, date and the quoted passage, so readers can
 * check a claim without leaving the page. Several sources on one claim page inside the preview.
 */
export const InlineCitation = React.forwardRef<HTMLAnchorElement, InlineCitationProps>(function InlineCitation(
  { source, index, openDelayMs = 200, className, ...props },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const list = React.useMemo<readonly CitationSource[]>(() => (isSourceList(source) ? source : [source]), [source]);
  const [page, setPage] = React.useState(0);
  const [direction, setDirection] = React.useState(1);
  const first = list[0];
  if (!first) return null;
  const current = list[Math.min(page, list.length - 1)] ?? first;
  const more = list.length - 1;
  const chipText = index !== undefined ? String(index) : citationSite(first);
  const go = (delta: number) => {
    setDirection(delta);
    setPage((p) => (p + delta + list.length) % list.length);
  };
  const name = `Source${index !== undefined ? ` ${index}` : ""}: ${first.title}${more > 0 ? `, and ${more} more` : ""}`;
  return (
    <HoverCard openDelayMs={openDelayMs} closeDelayMs={180} onOpenChange={(open) => {
        if (!open) setPage(0);
      }}>
      <HoverCardTrigger asChild>
        <a
          ref={ref}
          href={first.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={name}
          {...props}
          className={cn(
            blockReset,
            focusRing,
            "mx-0.5 inline-flex h-[1.35em] max-w-[14em] cursor-pointer items-center gap-[0.3em] rounded-pui-full border border-pui-border bg-pui-muted px-[0.5em] align-[0.1em] font-pui-sans text-[0.72em] leading-none font-medium text-pui-muted-foreground no-underline transition-colors duration-(--pui-duration-fast) hover:border-pui-primary/40 hover:bg-pui-primary/12 hover:text-pui-primary-text data-[state=open]:border-pui-primary/40 data-[state=open]:bg-pui-primary/12 data-[state=open]:text-pui-primary-text",
            className,
          )}
        >
          <span className={cn(blockReset, "truncate tabular-nums")}>{chipText}</span>
          {more > 0 ? <span className={cn(blockReset, "opacity-70")}>+{more}</span> : null}
        </a>
      </HoverCardTrigger>
      <HoverCardContent side="top" className="w-80 p-0">
        <div className={cn(blockReset, "flex flex-col")}>
          <div className={cn(blockReset, "relative overflow-hidden")}>
            <AnimatePresence initial={false} mode="popLayout" custom={direction}>
              <motion.div
                key={page}
                initial={reduced ? false : { opacity: 0, x: direction * 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={reduced ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, x: direction * -24 }}
                transition={{ duration: 0.22, ease: easings.out }}
                className={cn(blockReset, "flex flex-col gap-2 p-3.5")}
              >
                <span className={cn(blockReset, "flex items-center gap-2 text-xs text-pui-muted-foreground")}>
                  <SiteMark source={current} className="size-5 text-[0.65rem]" />
                  <span className={cn(blockReset, "truncate font-medium text-pui-foreground")}>{citationSite(current)}</span>
                  {current.date ? (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className={cn(blockReset, "shrink-0")}>{current.date}</span>
                    </>
                  ) : null}
                </span>
                <a
                  href={current.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    blockReset,
                    focusRing,
                    "rounded-pui-sm text-sm leading-snug font-semibold text-pui-foreground no-underline hover:text-pui-primary-text hover:underline",
                  )}
                >
                  {current.title}
                </a>
                {current.snippet ? (
                  <blockquote
                    className={cn(
                      blockReset,
                      "line-clamp-4 border-s-2 border-pui-primary/40 ps-2.5 text-xs leading-relaxed text-pui-muted-foreground",
                    )}
                  >
                    {current.snippet}
                  </blockquote>
                ) : null}
              </motion.div>
            </AnimatePresence>
          </div>
          <div className={cn(blockReset, "flex items-center justify-between gap-2 border-t border-pui-border px-2 py-1.5")}>
            {list.length > 1 ? (
              <span className={cn(blockReset, "flex items-center gap-1")}>
                <button type="button" aria-label="Previous source" onClick={() => go(-1)} className={pagerButton}>
                  <ChevronLeftIcon className="size-3.5" />
                </button>
                <span aria-live="polite" className={cn(blockReset, "min-w-8 text-center text-xs tabular-nums text-pui-muted-foreground")}>
                  {page + 1}/{list.length}
                </span>
                <button type="button" aria-label="Next source" onClick={() => go(1)} className={pagerButton}>
                  <ChevronRightIcon className="size-3.5" />
                </button>
              </span>
            ) : (
              <span />
            )}
            <a
              href={current.url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                blockReset,
                focusRing,
                "inline-flex items-center gap-1 rounded-pui-sm px-1.5 py-1 text-xs font-medium text-pui-primary-text no-underline hover:underline",
              )}
            >
              Open source
              <ExternalLinkIcon className="size-3" />
              <span className={cn(blockReset, "sr-only")}>(opens in a new tab)</span>
            </a>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
});

const pagerButton = cn(
  controlReset,
  focusRing,
  "flex size-7 cursor-pointer items-center justify-center rounded-pui-md text-pui-muted-foreground transition-colors hover:bg-pui-muted hover:text-pui-foreground",
);

/**
 * "Used 6 sources" disclosure for the end of an AI answer: stacked site marks on the button, a
 * numbered grid of sources inside. Numbers match InlineCitation indexes when you pass the same order.
 */
export const Sources = React.forwardRef<HTMLDivElement, SourcesProps>(function Sources(
  { sources, open: openProp, defaultOpen = false, onOpenChange, label, className, ...props },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const id = React.useId();
  const [open, setOpen] = useControllableState<boolean>({ value: openProp, defaultValue: defaultOpen, onChange: onOpenChange, name: "open" });
  const count = sources.length;
  const marks = sources.slice(0, 4);
  return (
    <div ref={ref} {...props} className={cn(blockReset, "flex w-full min-w-0 flex-col gap-2 text-sm", className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        onClick={() => setOpen(!open)}
        className={cn(
          controlReset,
          focusRing,
          "inline-flex h-8 cursor-pointer items-center gap-2 self-start rounded-pui-full border border-pui-border bg-pui-surface ps-1.5 pe-3 text-xs font-medium text-pui-foreground shadow-pui-xs transition-colors hover:bg-pui-muted",
        )}
      >
        <span aria-hidden="true" className={cn(blockReset, "flex -space-x-1.5")}>
          {marks.map((source, i) => (
            <motion.span
              key={`${source.url}-${i}`}
              initial={false}
              animate={{ x: open && !reduced ? i * 2 : 0 }}
              transition={{ duration: 0.2, ease: easings.out }}
              className={cn(blockReset, "flex rounded-pui-sm ring-2 ring-pui-surface")}
            >
              <SiteMark source={source} className="size-5 text-[0.6rem]" />
            </motion.span>
          ))}
        </span>
        {label ? label(count) : `Used ${count} ${count === 1 ? "source" : "sources"}`}
        <ChevronDownIcon
          className={cn("size-3.5 text-pui-muted-foreground transition-transform duration-(--pui-duration-base) ease-pui-out motion-reduce:transition-none", open && "rotate-180")}
        />
      </button>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            key="list"
            id={`${id}-list`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={reduced ? { duration: 0 } : { duration: 0.26, ease: easings.out }}
            className={cn(blockReset, "overflow-hidden")}
          >
            <ol className={cn(listReset, "grid gap-2 p-0.5 sm:grid-cols-2")}>
              {sources.map((source, i) => (
                <motion.li
                  key={`${source.url}-${i}`}
                  initial={reduced ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22, ease: easings.out, delay: reduced ? 0 : Math.min(i, 8) * 0.03 }}
                  className={cn(blockReset, "min-w-0")}
                >
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      blockReset,
                      focusRing,
                      "flex h-full min-w-0 flex-col gap-1.5 rounded-pui-md border border-pui-border bg-pui-surface p-2.5 text-pui-foreground no-underline transition-[border-color,background-color] hover:border-pui-primary/40 hover:bg-pui-primary/5",
                    )}
                  >
                    <span className={cn(blockReset, "flex min-w-0 items-center gap-1.5 text-xs text-pui-muted-foreground")}>
                      <span className={cn(blockReset, "tabular-nums")}>{i + 1}</span>
                      <SiteMark source={source} className="size-4 text-[0.55rem]" />
                      <span className={cn(blockReset, "truncate")}>{citationSite(source)}</span>
                    </span>
                    <span className={cn(blockReset, "line-clamp-2 text-xs leading-snug font-medium")}>{source.title}</span>
                  </a>
                </motion.li>
              ))}
            </ol>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
});
