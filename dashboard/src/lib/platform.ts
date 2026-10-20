// Client-only platform sniffing for shortcut labels (design 10.3). Call it only after
// useIsClient() is true, so a server render and hydration never disagree.

type NavigatorLike = Pick<Navigator, "platform" | "userAgent">;

export function isMac(nav: NavigatorLike | undefined = typeof navigator === "undefined" ? undefined : navigator): boolean {
  if (!nav) return false;
  return /mac|iphone|ipad|ipod/i.test(nav.platform || nav.userAgent);
}

/** Visible shortcut label for the command palette. */
export function paletteShortcut(mac: boolean): string {
  return mac ? "⌘K" : "Ctrl K";
}
