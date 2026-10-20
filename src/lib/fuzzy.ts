// Fuzzy ranking for CommandMenu: exact prefix 100, word prefix 75, substring 50, subsequence
// 25 minus gaps, 0 for no match. Internal: not exported from the package.

/** Words of a field: split on non-alphanumerics and camelCase boundaries ("CopyButton" -> copy, button). */
function words(text: string): string[] {
  return text
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

/** Score of one field for a trimmed, lowercased query. */
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

/** Best score across the value and its keywords; keywords count slightly less than the value. */
export function fuzzyScore(value: string, query: string, keywords: readonly string[] = []): number {
  const q = query.trim().toLowerCase();
  if (q === "") return 1;
  let best = scoreField(q, value);
  for (const keyword of keywords) best = Math.max(best, scoreField(q, keyword) * 0.9);
  return best;
}
