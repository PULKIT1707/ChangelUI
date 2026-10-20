// Recently opened items for the command palette (design 9): localStorage `pui-dashboard-recent`
// holds a JSON array of at most 5 existing slugs. Anything else is ignored and overwritten.

export const RECENT_KEY = "pui-dashboard-recent";
export const MAX_RECENT = 5;

/** Returns the validated list, or null when the stored value is invalid. */
export function parseRecent(raw: string | null, validSlugs: ReadonlySet<string>): string[] | null {
  if (raw === null) return [];
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!Array.isArray(value) || value.length > MAX_RECENT) return null;
  if (!value.every((slug): slug is string => typeof slug === "string" && validSlugs.has(slug))) return null;
  return [...new Set(value)];
}

function read(): string | null {
  try {
    return window.localStorage.getItem(RECENT_KEY);
  } catch {
    return null;
  }
}

function write(slugs: readonly string[]): void {
  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(slugs));
  } catch {
    // Blocked storage: recent items simply are not remembered.
  }
}

export function readRecent(validSlugs: ReadonlySet<string>): string[] {
  return parseRecent(read(), validSlugs) ?? [];
}

/** Moves `slug` to the front and persists; an invalid stored value is replaced. */
export function addRecent(slug: string, validSlugs: ReadonlySet<string>): string[] {
  if (!validSlugs.has(slug)) return readRecent(validSlugs);
  const next = [slug, ...readRecent(validSlugs).filter((s) => s !== slug)].slice(0, MAX_RECENT);
  write(next);
  return next;
}
