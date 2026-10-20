// Redundant encodings (charts-roadmap 4.2): SVG pattern fills for bars and areas, and matching
// dash rhythms for lines, so a series is never identified by color alone (WCAG 1.4.1). The tile
// ink is the page background at partial opacity, so a pattern reads on any series color, in
// light and dark mode alike.
import { CHART_PATTERNS, type ChartPattern } from "./color";

type Pattern = Exclude<ChartPattern, "none">;

const TILE = 7;
const INK = "var(--pui-background)";

function tile(p: Pattern) {
  switch (p) {
    case "diagonal":
      return <path d={`M-1,1 l2,-2 M0,${TILE} l${TILE},-${TILE} M${TILE - 1},${TILE + 1} l2,-2`} stroke={INK} strokeWidth={1.6} />;
    case "dots":
      return <circle cx={TILE / 2} cy={TILE / 2} r={1.35} fill={INK} />;
    case "vertical":
      return <path d={`M${TILE / 2},0 V${TILE}`} stroke={INK} strokeWidth={1.6} />;
    case "cross":
      return <path d={`M0,0 L${TILE},${TILE} M${TILE},0 L0,${TILE}`} stroke={INK} strokeWidth={1.1} />;
    case "grid":
      return <path d={`M${TILE / 2},0 V${TILE} M0,${TILE / 2} H${TILE}`} stroke={INK} strokeWidth={1.1} />;
  }
}

/** `<pattern>` defs for every CHART_PATTERNS entry, with ids `${idPrefix}-${name}`. */
export function ChartPatterns({ idPrefix, opacity = 0.55 }: { idPrefix: string; opacity?: number }) {
  return (
    <defs aria-hidden="true">
      {CHART_PATTERNS.map((p) => (
        <pattern key={p} id={`${idPrefix}-${p}`} width={TILE} height={TILE} patternUnits="userSpaceOnUse">
          <g opacity={opacity}>{tile(p)}</g>
        </pattern>
      ))}
    </defs>
  );
}

/** The fill url for a pattern rendered by <ChartPatterns idPrefix>. */
export function patternFill(idPrefix: string, pattern: Pattern): string {
  return `url(#${idPrefix}-${pattern})`;
}

/** Dash rhythm per pattern for line series (round caps turn short dashes into dots). */
export function patternDash(pattern: Pattern | null): string | undefined {
  switch (pattern) {
    case "diagonal":
      return "7 4";
    case "dots":
      return "0.5 5";
    case "vertical":
      return "2.5 3.5";
    case "cross":
      return "10 4 1 4";
    case "grid":
      return "4 3 1 3";
    default:
      return undefined;
  }
}
