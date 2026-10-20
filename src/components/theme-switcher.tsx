"use client";

import { motion } from "motion/react";
import * as React from "react";
import { flushSync } from "react-dom";
import { useControllableState } from "../hooks/use-controllable-state";
import { cn } from "../lib/cn";
import { composeEventHandlers, mergeRefs } from "../lib/compose";
import { springs } from "../lib/motion";
import { RovingFocusProvider, useRovingFocus, useRovingItem } from "../lib/roving-focus";
import { blockReset, controlReset, disabledStyles, focusRing } from "../lib/styles";
import type { Size } from "../lib/types";
import { useIsClient } from "../lib/use-is-client";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

/** The 10 presets in themes.css, in display order. */
export const THEME_PRESETS = [
  "default",
  "midnight",
  "sunset",
  "forest",
  "mono",
  "neon",
  "pastel",
  "glass",
  "ocean",
  "rose",
] as const;

export type ThemePresetTransition = "none" | "fade" | "circle";
/** "html" (default), an element, a ref to one, or null to only report the value. */
export type ThemePresetTarget = "html" | HTMLElement | React.RefObject<HTMLElement | null> | null;

export interface ThemeSwitcherPreset {
  name: string;
  /** Accessible and tooltip name. Default: the name, capitalized. */
  label?: string;
}

export interface UseThemePresetOptions {
  value?: string;
  /** Used when nothing is stored. Default "default". */
  defaultValue?: string;
  onValueChange?: (preset: string) => void;
  /** Where data-pui-theme is set. Default "html". */
  target?: ThemePresetTarget;
  /** localStorage key; null disables persistence. Default "pui-theme-preset". */
  storageKey?: string | null;
  /** Default "circle" (a reveal from the chosen swatch via the View Transitions API). */
  transition?: ThemePresetTransition;
}

export interface UseThemePresetResult {
  preset: string;
  /** Switches the preset. `origin` (an element or a point) centers the circle reveal. */
  setPreset: (preset: string, origin?: Element | { x: number; y: number } | null) => void;
}

export interface ThemeSwitcherProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange" | "defaultValue">,
    UseThemePresetOptions {
  /** Presets to offer. Default THEME_PRESETS. Custom names work when your CSS defines them. */
  presets?: readonly (string | ThemeSwitcherPreset)[];
  /** Swatch size. Default "md". */
  size?: Size;
  /** Visible names under the swatches (otherwise a tooltip on hover and focus). Default false. */
  showLabels?: boolean;
  disabled?: boolean;
}

const PRESET_NAME = /^[a-z0-9-]{1,32}$/;
const isPresetName = (value: unknown): value is string => typeof value === "string" && PRESET_NAME.test(value);

// Storage with an in-memory fallback when localStorage throws (blocked or private mode).
const memory = new Map<string, string>();
const listeners = new Set<() => void>();

function readStored(key: string | null): string | null {
  if (key === null) return null;
  let value: string | null | undefined = memory.get(key);
  if (value === undefined) {
    try {
      value = window.localStorage.getItem(key);
    } catch {
      value = null;
    }
  }
  return isPresetName(value) ? value : null;
}

function writeStored(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
    memory.delete(key);
  } catch {
    memory.set(key, value);
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function resolveTarget(target: ThemePresetTarget): HTMLElement | null {
  if (target === null) return null;
  if (target === "html") return document.documentElement;
  if ("current" in target) return target.current;
  return target;
}

function applyPreset(el: HTMLElement | null, preset: string): void {
  if (!el) return;
  // "default" is theme.css itself, so the attribute is removed instead of pinning the default island.
  if (preset === "default") el.removeAttribute("data-pui-theme");
  else el.setAttribute("data-pui-theme", preset);
}

type TransitionDocument = Document & {
  startViewTransition?: (update: () => void) => { ready: Promise<void>; finished: Promise<void> };
};

const presetLabel = (name: string) =>
  name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

/**
 * The active theme preset (data-pui-theme) with storage, cross-instance sync and an optional
 * view-transition reveal. ThemeSwitcher is built on it; use it for your own picker UI.
 */
export function useThemePreset({
  value,
  defaultValue = "default",
  onValueChange,
  target = "html",
  storageKey = "pui-theme-preset",
  transition = "circle",
}: UseThemePresetOptions = {}): UseThemePresetResult {
  const isClient = useIsClient();
  const reduced = usePrefersReducedMotion();
  const stored = React.useSyncExternalStore(
    subscribe,
    () => readStored(storageKey),
    () => null,
  );
  const controlled = value !== undefined;
  const [chosen, setChosen] = useControllableState<string | undefined>({
    value,
    defaultValue: undefined,
    onChange: (next) => {
      if (next !== undefined) onValueChange?.(next);
    },
    name: "preset",
  });
  const preset = chosen ?? stored ?? defaultValue;

  // Skipped during hydration (server snapshots), so the init script's preset is never overwritten.
  React.useEffect(() => {
    if (isClient) applyPreset(resolveTarget(target), preset);
  }, [isClient, preset, target]);

  const setPreset = React.useCallback(
    (next: string, origin?: Element | { x: number; y: number } | null) => {
      if (!isPresetName(next) || next === preset) return;
      const commit = () => {
        setChosen(next);
        if (!controlled && storageKey !== null) writeStored(storageKey, next);
      };
      const doc = document as TransitionDocument;
      const el = resolveTarget(target);
      if (transition === "none" || reduced || el === null || typeof doc.startViewTransition !== "function") {
        commit();
        return;
      }
      const root = document.documentElement;
      let x = window.innerWidth / 2;
      let y = window.innerHeight / 2;
      if (origin && "getBoundingClientRect" in origin) {
        const rect = origin.getBoundingClientRect();
        x = rect.left + rect.width / 2;
        y = rect.top + rect.height / 2;
      } else if (origin) {
        x = origin.x;
        y = origin.y;
      }
      const circle = transition === "circle";
      // Reuses ThemeToggle's attribute: the default root crossfade is disabled during a circle reveal.
      if (circle) root.setAttribute("data-pui-theme-transition", "");
      const cleanup = () => root.removeAttribute("data-pui-theme-transition");
      const viewTransition = doc.startViewTransition(() => {
        flushSync(commit);
        if (!controlled) applyPreset(el, next);
      });
      if (!circle) return;
      const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
      viewTransition.ready
        .then(() => {
          root.animate(
            { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
            { duration: 450, easing: "cubic-bezier(0.22, 1, 0.36, 1)", pseudoElement: "::view-transition-new(root)" },
          );
        })
        .catch(cleanup);
      viewTransition.finished.then(cleanup, cleanup);
    },
    [preset, setChosen, controlled, storageKey, target, transition, reduced],
  );

  return { preset, setPreset };
}

interface SwitcherContextValue {
  id: string;
  value: string;
  select: (value: string, origin: Element | null) => void;
  disabled: boolean;
  size: Size;
  showLabels: boolean;
}

const SwitcherContext = React.createContext<SwitcherContextValue | null>(null);

const swatchSizes: Record<Size, string> = { sm: "size-5", md: "size-7", lg: "size-9" };
const gaps: Record<Size, string> = { sm: "gap-1.5", md: "gap-2", lg: "gap-3" };

/**
 * Theme preset picker (roadmap W1): swatch dots rendered in each preset's own tokens, a sliding
 * ring, roving arrow keys and an optional circle reveal. Sets data-pui-theme; pair with ThemeToggle
 * for light/dark and import changelui/themes.css.
 */
export const ThemeSwitcher = React.forwardRef<HTMLDivElement, ThemeSwitcherProps>(function ThemeSwitcher(
  {
    presets = THEME_PRESETS,
    value: valueProp,
    defaultValue,
    onValueChange,
    target,
    storageKey,
    transition,
    size = "md",
    showLabels = false,
    disabled = false,
    className,
    onKeyDown,
    onFocus,
    "aria-label": ariaLabel = "Theme preset",
    ...props
  },
  ref,
) {
  const id = React.useId();
  const containerRef = React.useRef<HTMLDivElement>(null);
  const mergedRef = React.useMemo(() => mergeRefs(containerRef, ref), [ref]);
  const { preset, setPreset } = useThemePreset({
    value: valueProp,
    defaultValue,
    onValueChange,
    target,
    storageKey,
    transition,
  });
  const items = React.useMemo(
    () =>
      presets
        .map((p) => (typeof p === "string" ? { name: p, label: presetLabel(p) } : { name: p.name, label: p.label ?? presetLabel(p.name) }))
        .filter((p) => isPresetName(p.name)),
    [presets],
  );
  const { containerProps, value: rovingValue } = useRovingFocus({
    orientation: "both",
    selectedKey: preset,
    onActivate: (key) => {
      const el = containerRef.current?.querySelector(`[data-key="${key}"]`) ?? null;
      setPreset(key, el);
    },
  });
  const context = React.useMemo<SwitcherContextValue>(
    () => ({ id, value: preset, select: (next, origin) => setPreset(next, origin), disabled, size, showLabels }),
    [id, preset, setPreset, disabled, size, showLabels],
  );
  return (
    <RovingFocusProvider value={rovingValue}>
      <SwitcherContext.Provider value={context}>
        <div
          ref={mergedRef}
          role="radiogroup"
          aria-label={ariaLabel}
          aria-disabled={disabled || undefined}
          data-size={size}
          data-disabled={disabled ? "" : undefined}
          {...props}
          {...containerProps}
          tabIndex={containerProps.tabIndex}
          onKeyDown={composeEventHandlers(onKeyDown, containerProps.onKeyDown)}
          onFocus={composeEventHandlers(onFocus, containerProps.onFocus)}
          className={cn(blockReset, "inline-flex flex-wrap items-start", gaps[size], focusRing, className)}
        >
          {items.map((item) => (
            <ThemeSwatch key={item.name} name={item.name} label={item.label} />
          ))}
        </div>
      </SwitcherContext.Provider>
    </RovingFocusProvider>
  );
});

function ThemeSwatch({ name, label }: { name: string; label: string }) {
  const group = React.useContext(SwitcherContext);
  if (!group) throw new Error("[changelui] ThemeSwatch must be used inside ThemeSwitcher");
  const reduced = usePrefersReducedMotion();
  const checked = group.value === name;
  const localRef = React.useRef<HTMLButtonElement>(null);
  const roving = useRovingItem(name, { ref: localRef, disabled: group.disabled });
  return (
    <button
      ref={localRef}
      type="button"
      role="radio"
      aria-checked={checked}
      aria-label={group.showLabels ? undefined : label}
      data-state={checked ? "checked" : "unchecked"}
      data-preset={name}
      disabled={group.disabled}
      tabIndex={roving.tabIndex}
      data-roving-item={roving["data-roving-item"]}
      data-key={roving["data-key"]}
      onFocus={roving.onFocus}
      onClick={(event) => group.select(name, event.currentTarget)}
      className={cn(
        controlReset,
        "group/swatch relative inline-flex cursor-pointer flex-col items-center gap-1.5 rounded-pui-full outline-none",
        group.showLabels && "rounded-pui-md px-1 pt-1 pb-0.5",
        disabledStyles,
      )}
    >
      <span className={cn(blockReset, "relative inline-flex rounded-pui-full p-[3px]")}>
        {/* The swatch is an island of the preset itself, so it shows that preset's real tokens. */}
        <span
          data-pui-theme={name}
          aria-hidden="true"
          className={cn(
            blockReset,
            "relative block overflow-hidden rounded-pui-full bg-pui-primary shadow-pui-sm ring-1 ring-pui-foreground/10 transition-transform duration-(--pui-duration-fast) ease-pui-out motion-reduce:transition-none",
            "group-hover/swatch:scale-110 group-active/swatch:scale-95",
            swatchSizes[group.size],
          )}
        >
          <span className={cn(blockReset, "absolute inset-0 block bg-pui-gradient-2 [clip-path:polygon(100%_0,100%_100%,0_100%)]")} />
          <span className={cn(blockReset, "absolute inset-[32%] block rounded-pui-full bg-pui-background ring-1 ring-pui-border")} />
        </span>
        {checked ? (
          <motion.span
            layoutId={`${group.id}-ring`}
            transition={reduced ? { duration: 0 } : springs.snappy}
            aria-hidden="true"
            className={cn(blockReset, "absolute inset-0 block rounded-pui-full border-2 border-pui-foreground")}
          />
        ) : null}
        <span
          aria-hidden="true"
          className={cn(
            blockReset,
            "pointer-events-none absolute inset-0 block rounded-pui-full opacity-0 outline-2 outline-offset-2 outline-pui-ring group-focus-visible/swatch:opacity-100",
          )}
        />
      </span>
      {group.showLabels ? (
        <span
          className={cn(
            blockReset,
            "text-xs font-medium transition-colors duration-(--pui-duration-fast)",
            checked ? "text-pui-foreground" : "text-pui-muted-foreground group-hover/swatch:text-pui-foreground",
          )}
        >
          {label}
        </span>
      ) : (
        <span
          aria-hidden="true"
          className={cn(
            blockReset,
            "pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 block -translate-x-1/2 translate-y-1 whitespace-nowrap rounded-pui-sm bg-pui-foreground px-1.5 py-0.5 text-[11px] font-medium text-pui-background opacity-0 shadow-pui-md transition-[opacity,translate] duration-(--pui-duration-fast) ease-pui-out motion-reduce:transition-none",
            "group-hover/swatch:translate-y-0 group-hover/swatch:opacity-100 group-focus-visible/swatch:translate-y-0 group-focus-visible/swatch:opacity-100",
          )}
        >
          {label}
        </span>
      )}
    </button>
  );
}
