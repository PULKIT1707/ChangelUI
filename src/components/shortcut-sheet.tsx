"use client";
import { AnimatePresence, motion } from "motion/react";
import * as React from "react";
import { useControllableState } from "../hooks/use-controllable-state";
import { cn } from "../lib/cn";
import { CheckIcon, SearchIcon } from "../lib/icons";
import { springs } from "../lib/motion";
import { blockReset, controlReset, listReset } from "../lib/styles";
import type { MotionSafeHTMLProps } from "../lib/types";
import { useIsClient } from "../lib/use-is-client";
import { useLatestRef } from "../lib/use-latest-ref";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./dialog";
export interface Shortcut {
  /**
   * Key combination: "+" joins keys pressed together, a space separates a sequence ("g i").
   * "mod" is ⌘ on Apple devices and Ctrl elsewhere. Pass an array for alternatives.
   */
  keys: string | readonly string[];
  label: string;
  /** Extra words to match in search. */
  keywords?: readonly string[];
}
export interface ShortcutGroup {
  title: string;
  shortcuts: readonly Shortcut[];
}
export type ShortcutPlatform = "auto" | "mac" | "other";
export interface ShortcutSheetProps extends Omit<MotionSafeHTMLProps<HTMLDivElement>, "title"> {
  groups: readonly ShortcutGroup[];
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Global key that toggles the sheet, ignored while typing in a field. false turns it off. Default "?". */
  hotkey?: string | false;
  /** Optional trigger element (rendered as the dialog trigger). */
  trigger?: React.ReactElement;
  /** Default "Keyboard shortcuts". */
  title?: React.ReactNode;
  /** Default "Press any combination to find it. Search by name or key." */
  description?: React.ReactNode;
  /** Default "Search shortcuts". */
  searchPlaceholder?: string;
  /** Key symbols to show. "auto" detects Apple devices after mount. Default "auto". */
  platform?: ShortcutPlatform;
  /** Shown when nothing matches the search. */
  emptyText?: React.ReactNode;
  /**
   * While open, stop modifier combos (⌘/Ctrl/Alt + key) from reaching the page, so trying a
   * shortcut lights it up instead of running it. Browser-reserved keys still go through. Default true.
   */
  captureKeys?: boolean;
}
const MAC_SYMBOLS: Record<string, string> = { mod: "⌘", meta: "⌘", ctrl: "⌃", alt: "⌥", shift: "⇧" };
const OTHER_SYMBOLS: Record<string, string> = { mod: "Ctrl", meta: "Win", ctrl: "Ctrl", alt: "Alt", shift: "Shift" };
const COMMON_SYMBOLS: Record<string, string> = {
  enter: "↵",
  escape: "Esc",
  esc: "Esc",
  backspace: "⌫",
  delete: "Del",
  tab: "Tab",
  space: "Space",
  up: "↑",
  down: "↓",
  left: "←",
  right: "→",
  pageup: "PgUp",
  pagedown: "PgDn",
};
const KEY_NAMES: Record<string, string> = {
  mod: "Command",
  meta: "Command",
  ctrl: "Control",
  alt: "Option",
  shift: "Shift",
  enter: "Enter",
  up: "Up arrow",
  down: "Down arrow",
  left: "Left arrow",
  right: "Right arrow",
};
/** Normalizes a KeyboardEvent.key into the token names used in `keys`. */
function eventToken(key: string): string {
  const k = key.toLowerCase();
  if (k === "control") return "ctrl";
  if (k === "os" || k === "meta") return "meta";
  if (k === " " || k === "spacebar") return "space";
  if (k.startsWith("arrow")) return k.slice(5);
  if (k === "esc") return "escape";
  return k;
}
function resolveToken(token: string, mac: boolean): string {
  const t = token.toLowerCase();
  if (t === "mod") return mac ? "meta" : "ctrl";
  if (t === "esc") return "escape";
  return t;
}
/** "mod+k" -> [["mod","k"]], "g i" -> [["g"],["i"]]. A literal "+" key is written "plus". */
function parseCombo(combo: string): string[][] {
  return combo
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((step) => step.split("+").map((k) => (k === "plus" ? "+" : k)));
}
function keyLabel(token: string, mac: boolean): string {
  const t = token.toLowerCase();
  const symbol = (mac ? MAC_SYMBOLS : OTHER_SYMBOLS)[t] ?? COMMON_SYMBOLS[t];
  if (symbol) return symbol;
  return token.length === 1 ? token.toUpperCase() : token.charAt(0).toUpperCase() + token.slice(1);
}
function spokenCombo(combo: string, mac: boolean): string {
  return parseCombo(combo)
    .map((step) => step.map((k) => (mac ? KEY_NAMES[k.toLowerCase()] : undefined) ?? keyLabel(k, mac)).join(" "))
    .join(", then ");
}
function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);
}
function detectMac(): boolean {
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  const platform = nav.userAgentData?.platform ?? nav.platform ?? "";
  return /mac|iphone|ipad|ipod/i.test(platform);
}
/** All alternatives of a shortcut as combo strings. */
function combosOf(shortcut: Shortcut): readonly string[] {
  return typeof shortcut.keys === "string" ? [shortcut.keys] : shortcut.keys;
}
/**
 * A keyboard shortcut cheat sheet that teaches by doing: press ? to open it, then hold any keys
 * and the matching key caps light up and the shortcut row checks itself. Searchable by name or
 * key, grouped, platform aware (⌘ on Apple devices, Ctrl elsewhere) and built on Dialog, so it
 * traps focus, restores it on close and dismisses with Escape.
 */
export const ShortcutSheet = React.forwardRef<HTMLDivElement, ShortcutSheetProps>(function ShortcutSheet(
  {
    groups,
    open: openProp,
    defaultOpen = false,
    onOpenChange,
    hotkey = "?",
    trigger,
    title = "Keyboard shortcuts",
    description = "Press any combination to find it. Search by name or key.",
    searchPlaceholder = "Search shortcuts",
    platform = "auto",
    emptyText,
    captureKeys = true,
    className,
    ...props
  },
  ref,
) {
  const [open, setOpen] = useControllableState({ value: openProp, defaultValue: defaultOpen, onChange: onOpenChange, name: "open" });
  const isClient = useIsClient();
  const mac = platform === "mac" || (platform === "auto" && isClient && detectMac());
  const reduced = usePrefersReducedMotion();
  const [query, setQuery] = React.useState("");
  const [pressed, setPressed] = React.useState<ReadonlySet<string>>(() => new Set());
  const latest = useLatestRef({ open, hotkey });
  const searchId = React.useId();
  // Global hotkey: toggles the sheet unless the user is typing somewhere.
  React.useEffect(() => {
    if (hotkey === false) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat || isEditable(event.target)) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key !== latest.current.hotkey) return;
      event.preventDefault();
      setOpen((v) => !v);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hotkey, latest, setOpen]);
  // While open, track held keys so caps can light up.
  React.useEffect(() => {
    if (!open) {
      setPressed(new Set());
      setQuery("");
      return;
    }
    const down = (event: KeyboardEvent) => {
      const token = eventToken(event.key);
      const modifier = token === "meta" || token === "ctrl" || token === "alt" || token === "shift";
      if (captureKeys && !modifier && (event.metaKey || event.ctrlKey || event.altKey)) {
        // Practice mode: the combo lights up here instead of firing app shortcuts underneath.
        event.preventDefault();
        event.stopPropagation();
      }
      setPressed((prev) => {
        if (prev.has(token)) return prev;
        const next = new Set(prev);
        next.add(token);
        return next;
      });
    };
    const up = (event: KeyboardEvent) => {
      const token = eventToken(event.key);
      // macOS swallows keyup for other keys while ⌘ is held: releasing ⌘ clears everything.
      if (token === "meta") return setPressed(new Set());
      setPressed((prev) => {
        if (!prev.has(token)) return prev;
        const next = new Set(prev);
        next.delete(token);
        return next;
      });
    };
    const clear = () => setPressed(new Set());
    window.addEventListener("keydown", down, true);
    window.addEventListener("keyup", up, true);
    window.addEventListener("blur", clear);
    return () => {
      window.removeEventListener("keydown", down, true);
      window.removeEventListener("keyup", up, true);
      window.removeEventListener("blur", clear);
    };
  }, [open, captureKeys]);
  const needle = query.trim().toLowerCase();
  const filtered = React.useMemo(() => {
    return groups
      .map((group) => {
        if (!needle) return group;
        const groupHit = group.title.toLowerCase().includes(needle);
        const shortcuts = group.shortcuts.filter((s) => {
          if (groupHit) return true;
          const hay = [s.label, ...(s.keywords ?? []), ...combosOf(s).flatMap((c) => parseCombo(c).flat().map((k) => keyLabel(k, mac)))]
            .join(" ")
            .toLowerCase();
          return hay.includes(needle) || combosOf(s).some((c) => c.toLowerCase().includes(needle));
        });
        return { ...group, shortcuts };
      })
      .filter((group) => group.shortcuts.length > 0);
  }, [groups, needle, mac]);
  const count = filtered.reduce((n, g) => n + g.shortcuts.length, 0);
  const isHeld = (token: string) => pressed.has(resolveToken(token, mac));
  /**
   * A single-step combo matches when exactly its keys are held. Shift may also be held for a
   * symbol key ("?" is Shift+/ on most layouts).
   */
  const matches = (combo: string) => {
    const steps = parseCombo(combo);
    const first = steps[0];
    if (steps.length !== 1 || !first || pressed.size === 0 || !first.every(isHeld)) return false;
    const wanted = new Set(first.map((k) => resolveToken(k, mac)));
    const symbol = first.some((k) => k.length === 1 && !/[a-z0-9]/i.test(k));
    for (const token of pressed) if (!wanted.has(token) && !(symbol && token === "shift")) return false;
    return true;
  };
  const press = reduced ? { duration: 0 } : springs.press;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent ref={ref} size="xl" {...props} className={cn("p-0", className)}>
        <div className={cn(blockReset, "flex flex-col gap-4 border-b border-pui-border p-5 pb-4")}>
          <DialogHeader className="mb-0">
            <DialogTitle>{title}</DialogTitle>
            {description ? <DialogDescription>{description}</DialogDescription> : null}
          </DialogHeader>
          <div className={cn(blockReset, "relative")}>
            <SearchIcon aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-pui-muted-foreground" />
            <label htmlFor={searchId} className="sr-only">
              {searchPlaceholder}
            </label>
            <input
              id={searchId}
              type="search"
              data-autofocus=""
              value={query}
              placeholder={searchPlaceholder}
              autoComplete="off"
              spellCheck={false}
              onChange={(event) => setQuery(event.target.value)}
              className={cn(
                controlReset,
                "h-10 w-full rounded-pui-md border border-pui-input bg-pui-background ps-9 pe-3 text-sm text-pui-foreground placeholder:text-pui-muted-foreground outline-hidden focus-visible:border-pui-ring focus-visible:shadow-[0_0_0_3px_color-mix(in_oklab,var(--pui-ring)_25%,transparent)]",
              )}
            />
          </div>
        </div>
        <p className="sr-only" aria-live="polite">
          {needle ? `${count} ${count === 1 ? "shortcut" : "shortcuts"} found` : ""}
        </p>
        <div className={cn(blockReset, "max-h-[min(60dvh,32rem)] overflow-y-auto p-5 pt-4")}>
          {filtered.length === 0 ? (
            <div className={cn(blockReset, "py-10 text-center text-sm text-pui-muted-foreground")}>
              {emptyText ?? (
                <>
                  No shortcuts match <span className="font-medium text-pui-foreground">“{query.trim()}”</span>
                </>
              )}
            </div>
          ) : (
            <div className={cn(blockReset, "gap-x-8", filtered.length > 1 && "sm:columns-2")}>
              {filtered.map((group) => (
                <section key={group.title} className={cn(blockReset, "mb-5 break-inside-avoid")} aria-label={group.title}>
                  <h3 className={cn(blockReset, "mb-1.5 text-xs font-semibold uppercase tracking-wide text-pui-muted-foreground")}>{group.title}</h3>
                  <ul className={cn(listReset, "flex flex-col")}>
                    {group.shortcuts.map((shortcut) => {
                      const combos = combosOf(shortcut);
                      const hit = combos.some(matches);
                      return (
                        <li
                          key={shortcut.label}
                          data-matched={hit ? "" : undefined}
                          className={cn(
                            blockReset,
                            "relative flex min-h-9 items-center justify-between gap-3 rounded-pui-md px-2 py-1 text-sm transition-colors duration-(--pui-duration-fast)",
                            hit ? "bg-pui-primary/10 text-pui-foreground" : "text-pui-foreground",
                          )}
                        >
                          <span className={cn(blockReset, "flex min-w-0 items-center gap-1.5")}>
                            <AnimatePresence initial={false}>
                              {hit ? (
                                <motion.span
                                  key="check"
                                  aria-hidden="true"
                                  initial={{ scale: 0, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  exit={{ scale: 0, opacity: 0 }}
                                  transition={reduced ? { duration: 0 } : springs.bouncy}
                                  className={cn(blockReset, "flex size-4 items-center justify-center rounded-full bg-pui-primary text-pui-primary-foreground")}
                                >
                                  <CheckIcon className="size-3" />
                                </motion.span>
                              ) : null}
                            </AnimatePresence>
                            <span className={cn(blockReset, "truncate")}>{shortcut.label}</span>
                          </span>
                          <span className={cn(blockReset, "flex shrink-0 items-center gap-1.5")}>
                            <span className="sr-only">{combos.map((c) => spokenCombo(c, mac)).join(" or ")}</span>
                            {combos.map((combo, ci) => (
                              <React.Fragment key={combo}>
                                {ci > 0 ? <span aria-hidden="true" className="text-xs text-pui-muted-foreground">or</span> : null}
                                <span aria-hidden="true" className={cn(blockReset, "flex items-center gap-1")}>
                                  {parseCombo(combo).map((step, si) => (
                                    <React.Fragment key={si}>
                                      {si > 0 ? <span className="text-[0.6875rem] text-pui-muted-foreground">then</span> : null}
                                      <span className={cn(blockReset, "flex items-center gap-0.5")}>
                                        {step.map((key, ki) => {
                                          const held = isHeld(key);
                                          return (
                                            <motion.kbd
                                              key={`${key}-${ki}`}
                                              data-pressed={held ? "" : undefined}
                                              animate={held ? { y: 1, scale: 0.94 } : { y: 0, scale: 1 }}
                                              transition={press}
                                              className={cn(
                                                blockReset,
                                                "inline-flex h-6 min-w-6 items-center justify-center rounded-pui-sm border border-b-2 px-1.5 font-mono text-xs font-medium leading-none transition-colors duration-(--pui-duration-fast)",
                                                held
                                                  ? "border-pui-primary bg-pui-primary text-pui-primary-foreground"
                                                  : "border-pui-border bg-pui-muted text-pui-muted-foreground",
                                              )}
                                            >
                                              {keyLabel(key, mac)}
                                            </motion.kbd>
                                          );
                                        })}
                                      </span>
                                    </React.Fragment>
                                  ))}
                                </span>
                              </React.Fragment>
                            ))}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>
        <div className={cn(blockReset, "flex items-center justify-between gap-3 border-t border-pui-border bg-pui-muted/40 px-5 py-2.5 text-xs text-pui-muted-foreground")}>
          <span>
            {hotkey ? (
              <>
                Press <kbd className={cn(blockReset, "rounded-pui-sm border border-pui-border bg-pui-surface px-1 font-mono")}>{hotkey}</kbd> any time to open
              </>
            ) : null}
          </span>
          <span className="tabular-nums">
            {count} {count === 1 ? "shortcut" : "shortcuts"}
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
});
