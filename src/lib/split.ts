// Grapheme-safe text splitting for the text effects (roadmap W6). Internal: not exported.
// Intl.Segmenter keeps emoji, flags and combining accents in one unit; engines without it fall back
// to Array.from, which at least keeps surrogate pairs together.

let segmenter: Intl.Segmenter | null | undefined;

function getSegmenter(): Intl.Segmenter | null {
  if (segmenter === undefined) {
    segmenter = typeof Intl !== "undefined" && "Segmenter" in Intl ? new Intl.Segmenter(undefined, { granularity: "grapheme" }) : null;
  }
  return segmenter;
}

/** Splits text into user-perceived characters. */
export function splitGraphemes(text: string): string[] {
  const seg = getSegmenter();
  if (!seg) return Array.from(text);
  const out: string[] = [];
  for (const part of seg.segment(text)) out.push(part.segment);
  return out;
}

export interface WordToken {
  text: string;
  /** True for a run of whitespace between words. */
  space: boolean;
}

/** Splits text into words and the whitespace runs between them, in order. */
export function splitWords(text: string): WordToken[] {
  return text
    .split(/(\s+)/)
    .filter((part) => part.length > 0)
    .map((part) => ({ text: part, space: /^\s+$/.test(part) }));
}
