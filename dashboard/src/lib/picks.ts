import { CATEGORIES, type Category } from "../../../scripts/entries";
import { registryMeta } from "../registry/meta";
import type { RegistryMeta } from "../registry/types";

// Developer's Pick (#/picks): a curated showcase of the creative items. Pure data, no JSX and no
// router import, so it is testable on its own. The selection is derived from registry metadata,
// never hand-listed: anything new in text, effects or backgrounds joins automatically.

export const PICKS_TITLE = "Developer's Pick";
export const PICKS_TAGLINE = "Hand-picked showpieces that make people stop scrolling.";

/** Categories that are visual by definition (CATEGORY_BLURBS in lib/tags.ts). */
export const CREATIVE_CATEGORIES: readonly Category[] = ["text", "effects", "backgrounds"];
/** Charts that are showpieces rather than data plumbing. Every slug must exist in the registry (tested). */
export const CREATIVE_SHOWPIECES: ReadonlySet<string> = new Set(["morph-chart", "you-draw-it", "bar-race", "scrolly-chart", "chart-sonify"]);

export function isCreative(meta: Pick<RegistryMeta, "category" | "slug">): boolean {
  return CREATIVE_CATEGORIES.includes(meta.category) || CREATIVE_SHOWPIECES.has(meta.slug);
}

export function creativeItems<T extends RegistryMeta>(items: readonly T[]): T[] {
  return items.filter(isCreative);
}

/** "all" plus every category that has at least one creative item, in CATEGORIES order. */
export const PICK_FILTERS: readonly ("all" | Category)[] = [
  "all",
  ...CATEGORIES.filter((category) => creativeItems(registryMeta).some((meta) => meta.category === category)),
];

/** A filter outside PICK_FILTERS (e.g. "components") falls back to "all". */
export function clampPickFilter(filter: "all" | Category): "all" | Category {
  return PICK_FILTERS.includes(filter) ? filter : "all";
}

/** Hero picks, rendered large and first. */
export const FEATURED_PICKS = ["aurora-background", "dot-globe", "holo-card", "morphing-text", "flow-field", "you-draw-it"] as const;

const featuredSet: ReadonlySet<string> = new Set(FEATURED_PICKS);
export function isFeatured(slug: string): boolean {
  return featuredSet.has(slug);
}

/** One punchy line per pick (at most 64 characters, tested). */
export const PICK_HOOKS: Record<string, string> = {
  // text
  "circular-text": "Badges and seals that spin, faster on hover",
  "fancy-underline": "Underlines that draw, slide and squiggle",
  "flip-counter": "Split-flap boards that clack into place",
  "glitch-text": "Headlines that crackle like a broken signal",
  "gradient-text": "Type dipped in a slowly drifting rainbow",
  highlighter: "A marker that scribbles itself in view",
  "morphing-text": "Words that melt into each other like liquid",
  "number-ticker": "Stats that spring up to their final number",
  "rolling-number": "Odometer digits that roll to every price",
  "scramble-text": "Hacker-style text that decodes before your eyes",
  "scroll-text-reveal": "Apple-style paragraphs that light up as you read",
  "scroll-velocity-text": "Marquee rows that lean into your scroll speed",
  "sparkles-text": "Twinkling stars that dance around your words",
  "split-text": "Kinetic headlines, staggered letter by letter",
  terminal: "A terminal that types, streams and copies itself",
  "text-reveal": "Words that fade, blur and slide into place",
  "text-shimmer": "A light sweep for loading and AI moments",
  "typing-text": "A typewriter that types, pauses and deletes",
  "variable-proximity": "Letters that swell as your pointer gets close",
  "wavy-text": "Letters riding a sine wave",
  "word-rotate": "One headline, many words, smooth swaps",
  // effects
  "animated-beam": "Glowing pulses that wire your diagram together",
  "animated-list": "A live feed where every item springs in",
  "border-beam": "A beam of light chasing your card's border",
  "click-spark": "Every click bursts into sparks",
  confetti: "Celebrate every click with a burst",
  "cursor-trail": "A glowing ribbon that follows the pointer",
  "dot-globe": "A spinning dotted planet, zero WebGL",
  "expanding-cards": "Panels that grow open to tell their story",
  "flip-card": "A 3D card with a secret on the back",
  "gooey-button": "A liquid button that bubbles toward you",
  "holo-card": "Holographic foil that shifts as you tilt",
  "horizontal-scroll": "Scroll down, glide sideways",
  "image-trail": "Drag a trail of images behind the pointer",
  lens: "A magnifier that zooms into anything",
  magnetic: "Buttons that pull toward your cursor",
  marquee: "An endless scroller that pauses for you",
  "orbiting-circles": "Icons in a lazy orbit around a center",
  "page-transition": "Route changes that slide, wipe and flip",
  parallax: "Layered scenes with real depth",
  "pixel-reveal": "Content that dissolves in pixel by pixel",
  "proximity-glow": "Card borders that light up as you approach",
  reveal: "Blocks that glide in as they scroll into view",
  "scroll-progress": "A gradient bar that tracks the read",
  "scroll-stack": "Cards that pin and pile up as you scroll",
  "shine-border": "An animated gradient ring around anything",
  "smooth-cursor": "A buttery custom cursor on a spring",
  "spotlight-card": "A soft spotlight that follows the pointer",
  stagger: "Lists and grids that cascade into view",
  "sticker-peel": "A sticker whose corner begs to be peeled",
  "sticky-reveal": "Scroll storytelling with a pinned media panel",
  "tilt-card": "Cards that tilt toward you with a glare",
  "zoom-parallax": "One image zooms to fill the whole scene",
  // backgrounds
  "aurora-background": "Northern lights drifting behind your hero",
  beams: "Light beams raining down glowing rails",
  "dot-field": "Dots that scatter from your pointer",
  "dot-pattern": "A crisp dot grid with soft edges",
  "flickering-grid": "A flickering grid that spells out words",
  "flow-field": "Generative particles on a morphing current",
  "gradient-mesh": "A soft mesh gradient that breathes",
  "grid-pattern": "Blueprint lines with highlighted cells",
  halftone: "Print-style dots that swell near the pointer",
  "lava-lamp": "Blobs that melt together, lava-lamp style",
  "light-rays": "God rays fanning softly from the corner",
  "matrix-rain": "Falling glyphs straight out of the Matrix",
  meteors: "Shooting stars across your section",
  "noise-overlay": "Film grain for an analog finish",
  particles: "Particles that drift with your pointer",
  "retro-grid": "A synthwave floor racing to the horizon",
  ripple: "Rings that pulse out from the center",
  starfield: "Fly through the stars at warp speed",
  topography: "Living contour lines over shifting terrain",
  waves: "Layered waves drifting at their own pace",
  // charts
  "bar-race": "Rankings that race each other over time",
  "chart-sonify": "Hear the data: a chart you can listen to",
  "morph-chart": "One dataset morphing through seven charts",
  "scrolly-chart": "Scrollytelling: prose that drives the chart",
  "you-draw-it": "Guess the trend, then see how close you got",
};

/** The pick's hook, or its description for an item without one yet. */
export function hookFor(meta: Pick<RegistryMeta, "slug" | "description">): string {
  return PICK_HOOKS[meta.slug] ?? meta.description;
}

/**
 * Featured picks first (FEATURED_PICKS order), then the rest round-robin across categories in
 * CATEGORIES order, keeping registry order inside each category, so neighbors differ visually.
 */
export function orderPicks<T extends RegistryMeta>(items: readonly T[]): T[] {
  const featured = FEATURED_PICKS.flatMap((slug) => items.filter((item) => item.slug === slug));
  const queues = CATEGORIES.map((category) => items.filter((item) => item.category === category && !isFeatured(item.slug)));
  const rest: T[] = [];
  for (let round = 0; queues.some((queue) => round < queue.length); round++) {
    for (const queue of queues) {
      const item = queue[round];
      if (item) rest.push(item);
    }
  }
  return [...featured, ...rest];
}

/** "all" keeps everything; a category keeps only its items. Order is preserved. */
export function filterPicks<T extends RegistryMeta>(items: readonly T[], filter: "all" | Category): T[] {
  return filter === "all" ? [...items] : items.filter((item) => item.category === filter);
}

/** A random pick for "Surprise me"; undefined for an empty list. */
export function pickRandom<T>(items: readonly T[], random: () => number = Math.random): T | undefined {
  return items[Math.floor(random() * items.length)];
}
