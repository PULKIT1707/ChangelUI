import {
  Badge,
  GradientText,
  IconButton,
  Kbd,
  Popover,
  PopoverContent,
  PopoverTrigger,
  ThemeSwitcher,
  ThemeToggle,
} from "changelui";
import { useIsClient } from "@pui-src/lib/use-is-client";
import type { Ref } from "react";
import { isMac, paletteShortcut } from "../lib/platform";
import { docHref, homeHref, type Route } from "../router";
import { MobileNav } from "./mobile-nav";

export function Logo() {
  return (
    <svg viewBox="0 0 32 32" className="size-7 shrink-0" aria-hidden="true">
      <rect width="32" height="32" rx="9" className="fill-pui-primary" />
      <path d="M11 22V10h6a4 4 0 0 1 0 8h-6" fill="none" strokeWidth={2.5} strokeLinecap="round" className="stroke-pui-primary-foreground" />
    </svg>
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

/** Site-wide preset picker: the same storage key the init script reads, so the choice survives reloads. */
function PresetPicker() {
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
        <ThemeSwitcher size="sm" showLabels className="grid grid-cols-5 gap-x-1 gap-y-2" />
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
          <PresetPicker />
          <ThemeToggle ref={themeToggleRef} variant="ghost" tone="neutral" size="sm" storageKey="pui-theme" attribute="both" />
        </div>
      </div>
    </header>
  );
}
