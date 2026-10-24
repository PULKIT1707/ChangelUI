import {
  Badge,
  GradientText,
  IconButton,
  Kbd,
  Popover,
  PopoverContent,
  PopoverTrigger,
  THEME_PRESETS,
  ThemeSwitcher,
  ThemeToggle,
} from "changelui";
import { useIsClient } from "@pui-src/lib/use-is-client";
import { useEffect, useRef, useState, type Ref } from "react";
import { analytics } from "../lib/analytics/client";
import type { ThemeMode } from "../lib/analytics/events";
import { isMac, paletteShortcut } from "../lib/platform";
import { docHref, homeHref, type Route } from "../router";
import { MobileNav } from "./mobile-nav";

const REPO_URL = "https://github.com/PULKIT1707/ChangelUI";

/** ChangelUI mark: an open "C" arc with a spark where the change lands. */
export function Logo() {
  return (
    <svg viewBox="0 0 32 32" className="size-7 shrink-0" aria-hidden="true">
      <defs>
        <linearGradient id="changelui-logo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" style={{ stopColor: "var(--pui-primary)" }} />
          <stop offset="100%" style={{ stopColor: "var(--pui-chart-2, var(--pui-primary))" }} />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#changelui-logo)" />
      <path d="M21.5 10.5a8 8 0 1 0 0 11" fill="none" strokeWidth={3} strokeLinecap="round" className="stroke-pui-primary-foreground" />
      <circle cx="23" cy="16" r="2" className="fill-pui-primary-foreground" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden="true">
      <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.7 5.4-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-3.5 text-pui-warning" fill="currentColor" aria-hidden="true">
      <path d="m12 2.5 2.9 6.1 6.6.8-4.9 4.5 1.3 6.6L12 17.2l-5.9 3.3 1.3-6.6-4.9-4.5 6.6-.8L12 2.5Z" />
    </svg>
  );
}

/** "Star on GitHub" link with the live star count (hidden until GitHub answers). */
function GitHubStar() {
  const [stars, setStars] = useState<number | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch("https://api.github.com/repos/PULKIT1707/ChangelUI")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { stargazers_count?: number } | null) => {
        if (!cancelled && typeof data?.stargazers_count === "number") setStars(data.stargazers_count);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  return (
    <a
      href={REPO_URL}
      target="_blank"
      rel="noreferrer"
      aria-label={stars === null ? "Star ChangelUI on GitHub" : `Star ChangelUI on GitHub (${stars} stars)`}
      className="flex h-9 items-center gap-1.5 rounded-pui-md border border-pui-border bg-pui-surface px-2.5 text-sm font-medium text-pui-foreground transition-colors hover:bg-pui-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pui-ring"
    >
      <GitHubIcon />
      <StarIcon />
      <span className="hidden sm:inline">Star</span>
      {stars !== null ? <span className="tabular-nums text-pui-muted-foreground">{stars}</span> : null}
    </a>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function PaletteIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
      <path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.8-.9 1.8-1.9 0-.5-.2-.9-.5-1.3-.3-.3-.5-.8-.5-1.3 0-1 .8-1.8 1.8-1.8H17a4 4 0 0 0 4-4c0-4.3-4-7.7-9-7.7Z" />
      <circle cx="7.5" cy="11" r="1" fill="currentColor" />
      <circle cx="10.5" cy="7.5" r="1" fill="currentColor" />
      <circle cx="15" cy="7.5" r="1" fill="currentColor" />
    </svg>
  );
}

const PRESET_STORAGE_KEY = "pui-theme-preset";

/** The stored preset name, or "default"; an unknown stored value is never sent as-is. */
function readStoredPreset(): string {
  try {
    const stored = window.localStorage.getItem(PRESET_STORAGE_KEY) ?? "default";
    return (THEME_PRESETS as readonly string[]).includes(stored) ? stored : "default";
  } catch {
    return "default";
  }
}

/** Site-wide preset picker: the same storage key the init script reads, so the choice survives reloads. */
function PresetPicker() {
  const presetRef = useRef("default");
  useEffect(() => {
    presetRef.current = readStoredPreset();
  }, []);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <IconButton variant="ghost" tone="neutral" size="sm" aria-label="Theme preset">
          <PaletteIcon />
        </IconButton>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[19rem] p-3">
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <p className="text-sm font-semibold">Theme preset</p>
          <a href={docHref("themes")} className="text-xs font-medium text-pui-primary-text hover:underline">
            Customize
          </a>
        </div>
        <ThemeSwitcher
          size="sm"
          showLabels
          className="grid grid-cols-5 gap-x-1 gap-y-2"
          onValueChange={(to) => {
            analytics.track("theme_preset_switched", { from: presetRef.current, to });
            presetRef.current = to;
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

export interface TopBarProps {
  route: Route;
  onSearch: () => void;
  themeToggleRef: Ref<HTMLButtonElement>;
}

/** Sticky, blurred top bar (design 10.3). The shortcut label is read only on the client. */
export function TopBar({ route, onSearch, themeToggleRef }: TopBarProps) {
  const isClient = useIsClient();
  const shortcut = isClient ? paletteShortcut(isMac()) : null;
  const themeRef = useRef<ThemeMode>("light");
  useEffect(() => {
    themeRef.current = document.documentElement.classList.contains("dark") ? "dark" : "light";
  }, []);
  return (
    <header className="sticky top-0 z-40 h-14 border-b border-pui-border bg-pui-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-pui-background/70">
      <div className="flex h-full items-center gap-2 px-3 sm:px-4">
        <MobileNav route={route} />
        <a
          href={homeHref()}
          className="flex min-w-0 items-center gap-2 rounded-pui-md px-1 py-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pui-ring"
        >
          <Logo />
          <GradientText className="text-base font-semibold tracking-tight">ChangelUI</GradientText>
          <Badge variant="outline" tone="neutral" size="sm" className="hidden sm:inline-flex">
            v1.0.0
          </Badge>
        </a>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={onSearch}
            aria-haspopup="dialog"
            aria-keyshortcuts="Meta+K Control+K"
            className="flex h-9 items-center gap-2 rounded-pui-md border border-pui-border bg-pui-surface px-2.5 text-sm text-pui-muted-foreground transition-colors hover:text-pui-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pui-ring sm:w-56"
          >
            <SearchIcon />
            <span className="hidden sm:inline">Search…</span>
            <span className="sr-only sm:hidden">Search</span>
            {shortcut ? (
              <Kbd size="sm" className="ml-auto hidden sm:inline-flex">
                {shortcut}
              </Kbd>
            ) : null}
          </button>
          <GitHubStar />
          <PresetPicker />
          <ThemeToggle
            ref={themeToggleRef}
            variant="ghost"
            tone="neutral"
            size="sm"
            storageKey="pui-theme"
            attribute="both"
            onThemeChange={(to) => {
              analytics.track("theme_switched", { from: themeRef.current, to });
              themeRef.current = to;
            }}
          />
        </div>
      </div>
    </header>
  );
}
