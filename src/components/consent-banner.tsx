"use client";
import { AnimatePresence, motion } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { durations, easings, springs } from "../lib/motion";
import { blockReset, controlReset, focusRing, listReset } from "../lib/styles";
import { useLatestRef } from "../lib/use-latest-ref";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";
import { Button } from "./button";
import { Switch } from "./switch";

export interface ConsentCategory {
  id: string;
  label: string;
  description?: string;
  /** Always on (e.g. strictly necessary). Shown as "Always on" instead of a switch. */
  required?: boolean;
  /** Starting value for optional categories before any decision. Default false (opt-in). */
  defaultEnabled?: boolean;
}

export type ConsentChoices = Record<string, boolean>;
export type ConsentMethod = "accept-all" | "reject-all" | "custom";

export interface ConsentBannerProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "defaultValue" | "title"> {
  /** Default: necessary (required), preferences, analytics and marketing. */
  categories?: readonly ConsentCategory[];
  /** Default "Your privacy choices". */
  title?: React.ReactNode;
  /** Default: one plain sentence on what the categories do. */
  description?: React.ReactNode;
  /** Adds a policy link after the description. */
  policyHref?: string;
  /** Default "Privacy policy". */
  policyLabel?: string;
  /**
   * A stored decision (for example read from your own storage). When set, the banner starts as
   * the small reopen pill with these values. Default null: the banner is open.
   */
  defaultValue?: ConsentChoices | null;
  /** Called with every category's value and how the choice was made. The component stores nothing. */
  onDecide?: (choices: ConsentChoices, method: ConsentMethod) => void;
  /** "inline" renders in flow (previews, settings pages); the rest are fixed to the viewport. Default "bottom-left". */
  position?: "bottom-left" | "bottom-right" | "bottom" | "inline";
  /** Keep a reopen pill after a decision. Default true. */
  showPill?: boolean;
  /** Default "Privacy". */
  pillLabel?: string;
  /** Labels for the three equal-weight actions. */
  acceptLabel?: string;
  rejectLabel?: string;
  customizeLabel?: string;
  saveLabel?: string;
}

const DEFAULT_CATEGORIES: readonly ConsentCategory[] = [
  { id: "necessary", label: "Strictly necessary", description: "Sign-in, security and remembering this choice.", required: true },
  { id: "preferences", label: "Preferences", description: "Language, theme and layout you pick." },
  { id: "analytics", label: "Analytics", description: "Anonymous counts that show which pages work." },
  { id: "marketing", label: "Marketing", description: "Measuring campaigns and showing relevant offers." },
];

const positions = {
  "bottom-left": "fixed bottom-4 left-4 z-50 w-[min(26rem,calc(100vw-2rem))]",
  "bottom-right": "fixed right-4 bottom-4 z-50 flex w-[min(26rem,calc(100vw-2rem))] flex-col items-end",
  bottom: "fixed inset-x-4 bottom-4 z-50 mx-auto max-w-3xl",
  inline: "relative w-full max-w-md",
} as const;

function ShieldGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={cn(blockReset, className)}>
      <path d="M12 3l7 3v5.5c0 4.3-2.9 8-7 9.5-4.1-1.5-7-5.2-7-9.5V6l7-3z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

function initialChoices(categories: readonly ConsentCategory[], saved: ConsentChoices | null | undefined): ConsentChoices {
  const out: ConsentChoices = {};
  for (const c of categories) out[c.id] = c.required ? true : (saved?.[c.id] ?? c.defaultEnabled ?? false);
  return out;
}

/**
 * Honest consent in one surface: Reject all and Accept all carry equal weight, Customize expands
 * the categories inline (no second modal), the decision goes back to your app, and the banner then
 * shrinks into a small pill that reopens it. Ships no storage and no tracking of its own.
 */
export const ConsentBanner = React.forwardRef<HTMLDivElement, ConsentBannerProps>(function ConsentBanner(
  {
    categories = DEFAULT_CATEGORIES,
    title = "Your privacy choices",
    description = "We use a few cookies to run this site. Optional ones are off until you say yes, and you can change your mind any time.",
    policyHref,
    policyLabel = "Privacy policy",
    defaultValue = null,
    onDecide,
    position = "bottom-left",
    showPill = true,
    pillLabel = "Privacy",
    acceptLabel = "Accept all",
    rejectLabel = "Reject all",
    customizeLabel = "Customize",
    saveLabel = "Save choices",
    className,
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const id = React.useId();
  const [open, setOpen] = React.useState(defaultValue == null);
  const [decided, setDecided] = React.useState(defaultValue != null);
  const [expanded, setExpanded] = React.useState(false);
  const [choices, setChoices] = React.useState<ConsentChoices>(() => initialChoices(categories, defaultValue));
  const saved = React.useRef<ConsentChoices>(choices);
  const panelRef = React.useRef<HTMLElement>(null);
  const pillRef = React.useRef<HTMLButtonElement>(null);
  const focusNext = React.useRef<"pill" | "panel" | null>(null);
  const onDecideRef = useLatestRef(onDecide);

  const decide = (next: ConsentChoices, method: ConsentMethod) => {
    focusNext.current = panelRef.current?.contains(document.activeElement) ? "pill" : null;
    saved.current = next;
    setChoices(next);
    setDecided(true);
    setOpen(false);
    setExpanded(false);
    onDecideRef.current?.(next, method);
  };
  const all = (value: boolean): ConsentChoices => {
    const out: ConsentChoices = {};
    for (const c of categories) out[c.id] = c.required ? true : value;
    return out;
  };
  const reopen = () => {
    focusNext.current = "panel";
    setChoices(saved.current);
    setExpanded(true);
    setOpen(true);
  };
  const dismiss = () => {
    focusNext.current = "pill";
    setChoices(saved.current);
    setExpanded(false);
    setOpen(false);
  };

  const fade = reduced ? { duration: 0 } : { duration: durations.base, ease: easings.out };
  const middleLabel = expanded ? saveLabel : customizeLabel;

  return (
    <div ref={ref} data-state={open ? "open" : decided ? "pill" : "closed"} data-position={position} {...props} className={cn(blockReset, positions[position], className)}>
      <AnimatePresence mode="wait" initial={false}>
        {open ? (
          <motion.section
            key="panel"
            ref={panelRef}
            role="region"
            aria-labelledby={`${id}-t`}
            aria-describedby={`${id}-d`}
            tabIndex={-1}
            onAnimationComplete={() => {
              if (focusNext.current === "panel") {
                focusNext.current = null;
                panelRef.current?.focus({ preventScroll: true });
              }
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape" && decided) {
                event.stopPropagation();
                dismiss();
              }
            }}
            className={cn(blockReset, "w-full origin-bottom-left rounded-pui-xl border border-pui-border bg-pui-surface p-4 text-sm text-pui-surface-foreground shadow-pui-xl outline-hidden sm:p-5")}
            initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.92, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduced ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, scale: 0.6, y: 16, transition: { duration: durations.fast, ease: easings.inQuint } }}
            transition={reduced ? { duration: 0 } : springs.layout}
          >
            <div className={cn(blockReset, "flex gap-3")}>
              <span aria-hidden="true" className={cn(blockReset, "inline-flex size-9 shrink-0 items-center justify-center rounded-pui-lg bg-pui-primary/12 text-pui-primary-text")}>
                <ShieldGlyph className="size-5" />
              </span>
              <div className={cn(blockReset, "min-w-0")}>
                <h2 id={`${id}-t`} className={cn(blockReset, "text-base font-semibold text-pui-foreground")}>
                  {title}
                </h2>
                <p id={`${id}-d`} className={cn(blockReset, "mt-1 leading-relaxed text-pui-muted-foreground")}>
                  {description}
                  {policyHref ? (
                    <>
                      {" "}
                      <a href={policyHref} className={cn(blockReset, focusRing, "rounded-pui-sm font-medium text-pui-primary-text underline underline-offset-4")}>
                        {policyLabel}
                      </a>
                    </>
                  ) : null}
                </p>
              </div>
            </div>

            <motion.div
              id={`${id}-c`}
              initial={false}
              animate={expanded ? { height: "auto", opacity: 1 } : { height: 0, opacity: 0 }}
              transition={reduced ? { duration: 0 } : { height: springs.smooth, opacity: fade }}
              className={cn(blockReset, "overflow-hidden", !expanded && "invisible")}
              aria-hidden={expanded ? undefined : true}
            >
              <ul className={cn(listReset, "mt-4 divide-y divide-pui-border rounded-pui-lg border border-pui-border")}>
                {categories.map((c) => (
                  <li key={c.id} className={cn(blockReset, "flex items-center justify-between gap-4 px-3 py-2.5")}>
                    <div className={cn(blockReset, "min-w-0")}>
                      <p id={`${id}-${c.id}-l`} className={cn(blockReset, "font-medium text-pui-foreground")}>
                        {c.label}
                      </p>
                      {c.description ? (
                        <p id={`${id}-${c.id}-h`} className={cn(blockReset, "text-xs text-pui-muted-foreground")}>
                          {c.description}
                        </p>
                      ) : null}
                    </div>
                    {c.required ? (
                      <span className={cn(blockReset, "shrink-0 rounded-pui-full bg-pui-muted px-2 py-0.5 text-xs font-medium text-pui-muted-foreground")}>Always on</span>
                    ) : (
                      <Switch
                        size="sm"
                        checked={choices[c.id] ?? false}
                        onCheckedChange={(on) => setChoices((prev) => ({ ...prev, [c.id]: on }))}
                        aria-labelledby={`${id}-${c.id}-l`}
                        aria-describedby={c.description ? `${id}-${c.id}-h` : undefined}
                        tabIndex={expanded ? undefined : -1}
                      />
                    )}
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Equal weight: Reject and Accept share one style and size, nothing is buried. */}
            <div className={cn(blockReset, "mt-4 grid grid-cols-3 gap-2")}>
              <Button size="sm" variant="outline" tone="neutral" onClick={() => decide(all(false), "reject-all")}>
                {rejectLabel}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                tone="neutral"
                aria-expanded={expanded ? undefined : false}
                aria-controls={expanded ? undefined : `${id}-c`}
                onClick={() => (expanded ? decide({ ...choices }, "custom") : setExpanded(true))}
                className="underline-offset-4 hover:underline"
              >
                <span className={cn(blockReset, "grid")}>
                  {[customizeLabel, saveLabel].map((label) => (
                    <span key={label} aria-hidden={label === middleLabel ? undefined : true} className={cn(blockReset, "[grid-area:1/1]", label !== middleLabel && "invisible")}>
                      {label}
                    </span>
                  ))}
                </span>
              </Button>
              <Button size="sm" variant="outline" tone="neutral" onClick={() => decide(all(true), "accept-all")}>
                {acceptLabel}
              </Button>
            </div>
          </motion.section>
        ) : decided && showPill ? (
          <motion.button
            key="pill"
            ref={pillRef}
            type="button"
            aria-label={`${pillLabel}: change cookie choices`}
            onClick={reopen}
            onAnimationComplete={() => {
              if (focusNext.current === "pill") {
                focusNext.current = null;
                pillRef.current?.focus({ preventScroll: true });
              }
            }}
            className={cn(
              controlReset,
              focusRing,
              "inline-flex h-9 cursor-pointer items-center gap-2 rounded-pui-full border border-pui-border bg-pui-surface px-3.5 text-xs font-medium text-pui-surface-foreground shadow-pui-lg transition-colors hover:bg-pui-muted",
            )}
            initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduced ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, scale: 0.7, transition: { duration: durations.fast } }}
            transition={reduced ? { duration: 0 } : springs.bouncy}
          >
            <ShieldGlyph className="size-4 text-pui-primary-text" />
            {pillLabel}
          </motion.button>
        ) : null}
      </AnimatePresence>
    </div>
  );
});
