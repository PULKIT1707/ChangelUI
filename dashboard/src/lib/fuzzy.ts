// Command palette ranking (design 10.3): exact prefix 100, word prefix 75, substring 50,
// subsequence 25 minus gaps. At most 30 results; ties are broken by title.

export const MAX_RESULTS = 30;

/** Words of a field: split on non-alphanumerics and camelCase boundaries ("CopyButton" -> copy, button). */
function words(text: string): string[] {
  return text
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

/** Score of one field for an already-trimmed, lowercased query; 0 means no match. */
export function scoreField(query: string, field: string): number {
  if (query === "") return 0;
  const text = field.toLowerCase();
  if (text.startsWith(query)) return 100;
  if (words(field).some((word) => word.startsWith(query))) return 75;
  if (text.includes(query)) return 50;
  let gaps = 0;
  let last = -1;
  for (const ch of query) {
    const next = text.indexOf(ch, last + 1);
    if (next === -1) return 0;
    if (last !== -1) gaps += next - last - 1;
    last = next;
  }
  const score = 25 - gaps;
  return score > 0 ? score : 0;
}

export interface Searchable {
  title: string;
  /** Other fields searched alongside the title (slug, keywords, category). */
  fields: readonly string[];
}

export interface Ranked<T> {
  item: T;
  score: number;
}

export function fuzzySearch<T extends Searchable>(items: readonly T[], rawQuery: string, limit = MAX_RESULTS): Ranked<T>[] {
  const query = rawQuery.trim().toLowerCase();
  if (query === "") return [];
  const ranked: Ranked<T>[] = [];
  for (const item of items) {
    const score = Math.max(scoreField(query, item.title), ...item.fields.map((field) => scoreField(query, field)));
    if (score > 0) ranked.push({ item, score });
  }
  ranked.sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title));
  return ranked.slice(0, limit);
}
