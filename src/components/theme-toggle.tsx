"use client";

import * as React from "react";
import { flushSync } from "react-dom";
import { useControllableState } from "../hooks/use-controllable-state";
import { useMediaQuery } from "../hooks/use-media-query";
import { cn } from "../lib/cn";
import { MoonIcon, SunIcon } from "../lib/icons";
import { useIsClient } from "../lib/use-is-client";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";
import { IconButton, type IconButtonProps } from "./icon-button";

export type ThemeName = "light" | "dark" | "system";
export type ThemeAttribute = "class" | "data-theme" | "both";

export interface ThemeToggleProps extends Omit<IconButtonProps, "aria-label" | "children"> {
  theme?: ThemeName;
  /** Default "system" (or the stored theme). */
  defaultTheme?: ThemeName;
  onThemeChange?: (theme: ThemeName) => void;
  /** A click advances through the list; with two themes it toggles light/dark. Default ["light", "dark"]. */
  themes?: ThemeName[];
  /** localStorage key; null disables persistence. Default "pui-theme". */
  storageKey?: string | null;
  /** What to set on <html>. Default "both". */
  attribute?: ThemeAttribute;
  /** false: only report the theme (the consumer applies it, e.g. next-themes). Default true. */
  applyToDocument?: boolean;
  /** "view": circular reveal through the View Transitions API when supported. Default "view". */
  transition?: "view" | "none";
}

const DARK_QUERY = "(prefers-color-scheme: dark)";
const DEFAULT_THEMES: ThemeName[] = ["light", "dark"];

const isThemeName = (value: unknown): value is ThemeName =>
  value === "light" || value === "dark" || value === "system";

// Storage with an in-memory fallback when localStorage throws (blocked or private mode).
const memory = new Map<string, string>();
const storageListeners = new Set<() => void>();

function readStored(key: string | null): ThemeName | null {
  if (key === null) return null;
  let value: string | null | undefined = memory.get(key);
  if (value === undefined) {
    try {
      value = window.localStorage.getItem(key);
    } catch {
      value = null;
    }
  }
  return isThemeName(value) ? value : null;
}

function writeStored(key: string, value: ThemeName): void {
  try {
    window.localStorage.setItem(key, value);
    memory.delete(key);
  } catch {
    memory.set(key, value);
  }
  for (const listener of storageListeners) listener();
}

function subscribeStorage(listener: () => void): () => void {
  storageListeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    storageListeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function applyTheme(resolved: "light" | "dark", attribute: ThemeAttribute): void {
  const root = document.documentElement;
  if (attribute !== "data-theme") {
    root.classList.remove(resolved === "dark" ? "light" : "dark");
    root.classList.add(resolved);
  }
  if (attribute !== "class") root.setAttribute("data-theme", resolved);
}

type TransitionDocument = Document & {
  startViewTransition?: (update: () => void) => { ready: Promise<void>; finished: Promise<void> };
};

/**
 * Light/dark (or light/dark/system) switch with storage, system tracking and a circular
 * view-transition reveal (design 7.1 #32). Pair it with getThemeInitScript() to avoid a flash.
 */
export const ThemeToggle = React.forwardRef<HTMLButtonElement, ThemeToggleProps>(function ThemeToggle(
  {
    theme: themeProp,
    defaultTheme = "system",
    onThemeChange,
    themes = DEFAULT_THEMES,
    storageKey = "pui-theme",
    attribute = "both",
    applyToDocument = true,
    transition = "view",
    onClick,
    className,
    ...props
  },
  ref,
) {
  const isClient = useIsClient();
  const reduced = usePrefersReducedMotion();
  const systemDark = useMediaQuery(DARK_QUERY);
  const stored = React.useSyncExternalStore(
    subscribeStorage,
    () => readStored(storageKey),
    () => null,
  );
  const controlled = themeProp !== undefined;
  const [chosen, setChosen] = useControllableState<ThemeName | undefined>({
    value: themeProp,
    defaultValue: undefined,
    onChange: (next) => {
      if (next !== undefined) onThemeChange?.(next);
    },
    name: "theme",
  });
  const theme: ThemeName = chosen ?? stored ?? defaultTheme;
  const resolved = theme === "system" ? (systemDark ? "dark" : "light") : theme;
  const twoThemes = themes.length <= 2;
  const next: ThemeName = twoThemes
    ? resolved === "dark"
      ? "light"
      : "dark"
    : (themes[(themes.indexOf(theme) + 1) % themes.length] ?? themes[0] ?? "light");
  const nextResolved = next === "system" ? (systemDark ? "dark" : "light") : next;

  // Skipped during hydration (server snapshots), so the init script's theme is never overwritten.
  React.useEffect(() => {
    if (applyToDocument && isClient) applyTheme(resolved, attribute);
  }, [applyToDocument, isClient, resolved, attribute]);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    if (event.defaultPrevented) return;
    const commit = () => {
      setChosen(next);
      if (!controlled && storageKey !== null) writeStored(storageKey, next);
    };
    const doc = document as TransitionDocument;
    if (transition !== "view" || reduced || !applyToDocument || typeof doc.startViewTransition !== "function") {
      commit();
      return;
    }
    const root = document.documentElement;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    root.setAttribute("data-pui-theme-transition", "");
    const cleanup = () => root.removeAttribute("data-pui-theme-transition");
    const viewTransition = doc.startViewTransition(() => {
      flushSync(commit);
      if (!controlled) applyTheme(nextResolved, attribute);
    });
    viewTransition.ready
      .then(() => {
        root.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
          { duration: 450, easing: "cubic-bezier(0.22, 1, 0.36, 1)", pseudoElement: "::view-transition-new(root)" },
        );
      })
      .catch(cleanup);
    viewTransition.finished.then(cleanup, cleanup);
  };

  const label = twoThemes ? "Dark mode" : isClient ? `Theme: ${theme}. Switch to ${next}` : "Theme";
  return (
    <IconButton
      ref={ref}
      {...props}
      aria-label={label}
      aria-pressed={twoThemes && isClient ? resolved === "dark" : undefined}
      data-theme-value={isClient ? theme : undefined}
      onClick={handleClick}
      className={cn("overflow-hidden", className)}
    >
      <SunIcon
        data-pui-theme-icon="sun"
        className="size-4 transition-[rotate,scale,opacity] duration-(--pui-duration-slow) ease-pui-out motion-reduce:transition-none in-[.dark]:-rotate-90 in-[.dark]:scale-0 in-[.dark]:opacity-0 in-data-[theme=dark]:-rotate-90 in-data-[theme=dark]:scale-0 in-data-[theme=dark]:opacity-0"
      />
      <MoonIcon
        data-pui-theme-icon="moon"
        className="absolute size-4 rotate-90 scale-0 opacity-0 transition-[rotate,scale,opacity] duration-(--pui-duration-slow) ease-pui-out motion-reduce:transition-none in-[.dark]:rotate-0 in-[.dark]:scale-100 in-[.dark]:opacity-100 in-data-[theme=dark]:rotate-0 in-data-[theme=dark]:scale-100 in-data-[theme=dark]:opacity-100"
      />
    </IconButton>
  );
});
